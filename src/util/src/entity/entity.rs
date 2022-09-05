use std::{
	any::TypeId,
	collections::HashMap,
	fmt, mem,
	sync::{Arc, RwLock, Weak},
};

use once_cell::sync::OnceCell;
use thiserror::Error;

use crate::{
	debug::{error::ResultExt, type_id::NamedTypeId},
	mem::{
		inline::InlineStore,
		ptr::{leak_alloc, sizealign_checked_transmute, OffsetOfReprC, PointeeCastExt},
	},
};

use super::lock::{LRefCell, Lock, Session};

// === ComponentList === //

pub unsafe trait ComponentList: Sized + 'static {
	type Bundle;

	fn to_bundle(self) -> Self::Bundle;
	fn write_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize);
}

macro_rules! impl_component_list {
    ($($para:ident:$field:tt),*) => {
        unsafe impl<$($para: ComponentList),*> ComponentList for ($($para,)*) {
            type Bundle = ( $(<$para as ComponentList>::Bundle,)* );

            fn to_bundle(self) -> Self::Bundle {
                ( $(self.$field.to_bundle(),)* )
            }

            #[allow(unused)]
            fn write_offset_map(&self, builder: &mut ArchetypeBuilder, base_offset: usize) {
                let field_offsets = <Self::Bundle as OffsetOfReprC>::offsets();
                let mut i = 0;

                $(
                    <$para as ComponentList>::write_offset_map(
						&self.$field,
						builder,
						base_offset + field_offsets[i],
					);
                    i += 1;
                )*
            }
        }
    };
}

impl_tuples!(impl_component_list);

#[derive(Default)]
pub struct SizedComp<T>(pub T);

impl<T> From<T> for SizedComp<T> {
	fn from(val: T) -> Self {
		Self(val)
	}
}

pub type SizedCompRw<T> = SizedComp<LRefCell<T>>;

impl<T> SizedCompRw<T> {
	pub fn new_lrw(lock: Lock, value: T) -> Self {
		Self(LRefCell::new(lock, value))
	}
}

unsafe impl<T: 'static> ComponentList for SizedComp<T> {
	type Bundle = T;

	fn to_bundle(self) -> Self::Bundle {
		self.0
	}

	fn write_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize) {
		builder.push_sized::<T>(offset);
	}
}

// === Archetype === //

type ArchetypeEntry = InlineStore<usize>;
type ArchetypeEntryRepointer<T> = (usize, fn(*const u8) -> *const T);

struct Archetype {
	entries: HashMap<NamedTypeId, ArchetypeEntry>,
}

impl fmt::Debug for Archetype {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		f.debug_struct("Archetype")
			.field("entries", &self.entries.keys().collect::<Vec<_>>())
			.finish_non_exhaustive()
	}
}

impl Archetype {
	fn access<T: ?Sized + 'static>(&self, header: *const EntityHeader) -> Option<*const T> {
		let entry = self.entries.get(&TypeId::of::<T>())?;

		if mem::size_of::<*const T>() == mem::size_of::<usize>() {
			let offset = *unsafe { entry.decode::<usize>() };

			let header = header.cast::<u8>();
			let ptr = unsafe {
				sizealign_checked_transmute::<*const u8, *const T>(header.wrapping_add(offset))
			};

			Some(ptr)
		} else {
			let (offset, translator) = *unsafe { entry.decode::<ArchetypeEntryRepointer<T>>() };

			Some((translator)(header.cast::<u8>().wrapping_add(offset)))
		}
	}
}

pub struct ArchetypeBuilder {
	entries: HashMap<NamedTypeId, ArchetypeEntry>,
}

impl ArchetypeBuilder {
	fn new() -> Self {
		Self {
			entries: Default::default(),
		}
	}

	fn push_sized<T: 'static>(&mut self, offset: usize) {
		#[rustfmt::skip]
        self.entries.insert(
            NamedTypeId::of::<T>(),
            InlineStore::new(offset),
        );
	}

	fn push_unsized<T: ?Sized + 'static>(
		&mut self,
		offset: usize,
		repointer: fn(*const u8) -> *const T,
	) {
		#[rustfmt::skip]
        self.entries.insert(
            NamedTypeId::of::<T>(),
            InlineStore::new::<ArchetypeEntryRepointer<T>>((offset, repointer)),
        );
	}

	fn finalize(self) -> Archetype {
		Archetype {
			entries: self.entries,
		}
	}
}

// === ArchetypeDB === //

#[derive(Default)]
struct ArchetypeDB {
	archetypes: RwLock<HashMap<TypeId, &'static Archetype>>,
}

impl ArchetypeDB {
	fn get() -> &'static Self {
		static DB: OnceCell<ArchetypeDB> = OnceCell::new();

		DB.get_or_init(Self::default)
	}

	fn get_archetype<C: ComponentList>(sample_bundle: &C) -> &'static Archetype {
		let db = Self::get();

		let arch_id = TypeId::of::<C>();
		let map_guard = db.archetypes.read().expect("ArchetypeDB poisoned");

		if let Some(archetype) = map_guard.get(&arch_id) {
			*archetype
		} else {
			drop(map_guard);
			let mut map_guard = db.archetypes.write().expect("ArchetypeDB poisoned");

			*map_guard.entry(arch_id).or_insert_with(|| {
				let mut builder = ArchetypeBuilder::new();
				let [_, bundle_offset] = <(EntityHeader, C::Bundle)>::offsets();

				sample_bundle.write_offset_map(&mut builder, bundle_offset);
				leak_alloc(builder.finalize())
			})
		}
	}
}

// === Error Types === //

#[derive(Debug, Clone, Error)]
pub struct MissingComponentError {
	arch: &'static Archetype,
	comp: NamedTypeId,
}

impl fmt::Display for MissingComponentError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		writeln!(f, "missing component of type {:?}", self.comp)?;
		write!(f, "available components: ")?;
		if self.arch.entries.is_empty() {
			write!(f, "none")?;
		} else {
			let mut iter = self.arch.entries.keys();
			write!(f, "{:?}", iter.next().unwrap())?;

			for key in iter {
				write!(f, ", {key:?}")?;
			}

			writeln!(f, ".")?;
		}

		Ok(())
	}
}

// === Entity Core === //

pub unsafe trait AnyEntity {}

#[repr(C)]
pub struct Entity<T: ComponentList> {
	header: EntityHeader,
	bundle: T::Bundle,
}

struct EntityHeader {
	archetype: &'static Archetype,
}

impl<T: ComponentList> Entity<T> {
	pub fn new(list: T) -> Self {
		Self {
			header: EntityHeader {
				archetype: ArchetypeDB::get_archetype::<T>(&list),
			},
			bundle: list.to_bundle(),
		}
	}
}

unsafe impl<T: ComponentList> AnyEntity for Entity<T> {}

// === Entity Access === //

pub type ArcEntity = Arc<dyn AnyEntity + Send + Sync>;
pub type WeakArcEntity = Weak<dyn AnyEntity + Send + Sync>;

impl<T: ComponentList> Entity<T> {
	pub fn new_arc(list: T) -> Arc<Self> {
		Arc::new(Entity::new(list))
	}
}

pub trait EntityView: AnyEntity {
	// === Base === //

	fn try_get_raw<T: ?Sized + 'static>(&self) -> Result<*const T, MissingComponentError> {
		let header = unsafe { self.cast_ref_via_ptr(|ptr| ptr as *const EntityHeader) };

		header
			.archetype
			.access(header)
			.ok_or_else(|| MissingComponentError {
				arch: header.archetype,
				comp: NamedTypeId::of::<T>(),
			})
	}

	fn get_raw<T: ?Sized + 'static>(&self) -> *const T {
		self.try_get_raw::<T>().unwrap_pretty()
	}

	fn try_get<T: ?Sized + 'static>(&self) -> Result<&T, MissingComponentError> {
		unsafe { self.try_cast_ref_via_ptr(|_| self.try_get_raw::<T>()) }
	}

	fn get<T: ?Sized + 'static>(&self) -> &T {
		self.try_get().unwrap_pretty()
	}

	fn has<T: ?Sized + 'static>(&self) -> bool {
		self.try_get::<T>().is_ok()
	}

	// === RwLock integration === //

	// TODO: Allow heterogeneous multi-borrow
	fn use_ref<T, F, R>(&self, session: Session, f: F) -> R
	where
		T: ?Sized + 'static,
		F: FnOnce(&T) -> R,
	{
		self.get::<LRefCell<T>>().use_ref(session, f)
	}

	fn use_mut<T, F, R>(&self, session: Session, f: F) -> R
	where
		T: ?Sized + 'static,
		F: FnOnce(&mut T) -> R,
	{
		self.get::<LRefCell<T>>().use_mut(session, f)
	}
}

impl<T: ?Sized + AnyEntity> EntityView for T {}

// === Unit Tests === //

#[cfg(test)]
mod tests {
	use crate::entity::{BorrowMutability, LRefCell, Lock, SessionGuard};

	use super::*;

	#[test]
	fn entity_basic_test() {
		// Create session
		let lock = Lock::new("lock");

		let session = SessionGuard::new_tls();
		let s = session.handle();

		s.acquire_locks([(lock, BorrowMutability::Mutable)]);

		// Create entity
		let my_entity = Entity::new((SizedComp(3i32), SizedComp(LRefCell::new(lock, 4u32))));

		assert!(my_entity.try_get::<i32>().is_ok());
		assert!(my_entity.try_get::<u32>().is_err());
		assert_eq!(*my_entity.get::<i32>(), 3);

		my_entity.use_mut(s, |val: &mut u32| {
			*val += 1;
			assert_eq!(*val, 5);
		});
	}
}
