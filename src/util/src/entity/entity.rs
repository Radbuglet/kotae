use std::{
	any::TypeId,
	collections::HashMap,
	fmt,
	mem::ManuallyDrop,
	sync::{Arc, RwLock, Weak},
};

use once_cell::sync::OnceCell;
use thiserror::Error;

use crate::{
	debug::{error::ResultExt, type_id::NamedTypeId},
	mem::{
		inline::BoxableInlineStore,
		ptr::{
			leak_alloc, must_be_unsized, sizealign_checked_transmute, All, OffsetOfReprC,
			PointeeCastExt,
		},
	},
};

use super::lock::{LRefCell, Lock, Session};

// === ComponentList === //

// ComponentList
pub unsafe trait ComponentList: Sized + 'static {
	type Bundle: Sized + 'static;

	fn to_bundle(self) -> Self::Bundle;
	fn write_comp_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize);
}

macro_rules! impl_component_list {
    ($($para:ident:$field:tt),*) => {
        unsafe impl<$($para: ComponentList),*> ComponentList for ($($para,)*) {
            type Bundle = ( $(<$para as ComponentList>::Bundle,)* );

            fn to_bundle(self) -> Self::Bundle {
                ( $(self.$field.to_bundle(),)* )
            }

            #[allow(unused)] // For tuples of arity 0
            fn write_comp_offset_map(&self, builder: &mut ArchetypeBuilder, base_offset: usize) {
                let field_offsets = <Self::Bundle as OffsetOfReprC>::offsets();
                let mut i = 0;

                $(
                    <$para as ComponentList>::write_comp_offset_map(
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

// UnsizingList
pub unsafe trait UnsizingList<T>: Sized + 'static {
	fn write_alias_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize);
}

unsafe impl<T: 'static, R: ?Sized + 'static> UnsizingList<T> for fn(&T) -> &R {
	fn write_alias_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize) {
		builder.push_unsized(offset, *self)
	}
}

macro_rules! impl_unsizing_list {
	($($para:ident:$field:tt),*) => {
		unsafe impl<_T, $($para: UnsizingList<_T>),*> UnsizingList<_T> for ($($para,)*) {
			#[allow(unused)] // For tuples of arity 0
			fn write_alias_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize) {
				$( self.$field.write_alias_offset_map(builder, offset); )*
			}
		}
	};
}

impl_tuples!(impl_unsizing_list);

// Providers
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

	fn write_comp_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize) {
		builder.push_sized::<T>(offset);
	}
}

pub struct UnsizedComp<T, L>(pub T, pub L);

unsafe impl<T: 'static, L: UnsizingList<T>> ComponentList for UnsizedComp<T, L> {
	type Bundle = T;

	fn to_bundle(self) -> Self::Bundle {
		self.0
	}

	fn write_comp_offset_map(&self, builder: &mut ArchetypeBuilder, offset: usize) {
		builder.push_sized::<T>(offset);
		self.1.write_alias_offset_map(builder, offset);
	}
}

// === Archetype Entry === //

union ArchetypeEntry {
	sized: usize,
	unsizer: ManuallyDrop<UnsizedArchetypeEntry>,
}

type DynCasterInlined = BoxableInlineStore<fn(&()) -> &dyn All>;
type DynExecutorInlined = BoxableInlineStore<DynExecutor<dyn All>>;

type DynExecutor<T> = unsafe fn(*const u8, &DynCasterInlined) -> *const T;

struct UnsizedArchetypeEntry {
	offset: usize,
	caster: DynCasterInlined,
	executor: DynExecutorInlined,
}

// === Archetype === //

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
            ArchetypeEntry {
				sized: offset,
			},
        );
	}

	fn push_unsized<I, T: ?Sized + 'static>(&mut self, offset: usize, caster: fn(&I) -> &T) {
		assert!(must_be_unsized::<T>());

		unsafe fn executor<I, T: ?Sized>(comp: *const u8, caster: &DynCasterInlined) -> *const T {
			let comp = &*comp.cast::<I>();
			let caster = caster.decode_maybe_boxed::<fn(&I) -> &T>();

			(caster)(comp)
		}

		#[rustfmt::skip]
        self.entries.insert(
            NamedTypeId::of::<T>(),
            ArchetypeEntry {
				unsizer: ManuallyDrop::new(UnsizedArchetypeEntry {
					offset,
					caster: DynCasterInlined::new_maybe_boxed(caster),
					executor: DynExecutorInlined::new_maybe_boxed::<DynExecutor<T>>(executor::<I, T>)
				})
			},
        );
	}

	fn finalize(self) -> Archetype {
		Archetype {
			entries: self.entries,
		}
	}
}

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

		if !must_be_unsized::<T>() {
			let offset = unsafe { entry.sized };

			let header = header.cast::<u8>();
			let ptr = unsafe {
				sizealign_checked_transmute::<*const u8, *const T>(header.wrapping_add(offset))
			};

			Some(ptr)
		} else {
			Some(unsafe {
				let unsizer = &entry.unsizer;
				let ptr = header.cast::<u8>().wrapping_add(unsizer.offset);
				let executor = unsizer.executor.decode_maybe_boxed::<DynExecutor<T>>();
				let casted = (executor)(ptr, &unsizer.caster);
				casted
			})
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

				sample_bundle.write_comp_offset_map(&mut builder, bundle_offset);
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
	use std::any::Any;

	use crate::entity::{BorrowMutability, Lock, SessionGuard};

	use super::*;

	#[test]
	fn entity_basic_test() {
		// Create session
		let lock = Lock::new("lock");

		let session = SessionGuard::new_tls();
		let s = session.handle();

		s.acquire_locks([(lock, BorrowMutability::Mutable)]);

		// Create entity
		let my_entity = Entity::new((
			SizedComp(3i32),
			SizedComp::new_lrw(lock, 4u32),
			UnsizedComp(8usize, (|x| x as &dyn Any) as fn(&usize) -> &dyn Any),
		));

		assert!(my_entity.try_get::<i32>().is_ok());
		assert!(my_entity.try_get::<u32>().is_err());
		assert_eq!(*my_entity.get::<i32>(), 3);
		assert_eq!(
			my_entity.get::<dyn Any>().downcast_ref::<usize>().copied(),
			Some(8)
		);

		my_entity.use_mut(s, |val: &mut u32| {
			*val += 1;
			assert_eq!(*val, 5);
		});
	}
}
