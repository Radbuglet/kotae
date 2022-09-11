use std::{
	fmt,
	marker::PhantomData,
	sync::atomic::{AtomicU64, Ordering::Relaxed},
};

use derive_where::derive_where;
use itertools::Itertools;
use thiserror::Error;

use crate::{
	debug::{error::ResultExt, type_id::NamedTypeId},
	mem::ptr::{runtime_unify_ref, PointeeCastExt},
};

use super::lock::{LRefCell, Session};

// === TypedKey === //

pub trait KeyProxyFor: 'static {
	type Target: ?Sized + 'static;
}

#[derive_where(Debug, Copy, Clone, Hash, Eq, PartialEq)]
#[repr(transparent)]
pub struct TypedKey<T: ?Sized + 'static> {
	_ty: PhantomData<fn(T) -> T>,
	raw: RawTypedKey,
}

impl<T: ?Sized + 'static> Default for TypedKey<T> {
	fn default() -> Self {
		Self::instance()
	}
}

impl<T: ?Sized + 'static> TypedKey<T> {
	// === Raw conversions === //

	pub unsafe fn from_raw_unchecked(raw: RawTypedKey) -> Self {
		Self {
			_ty: PhantomData,
			raw,
		}
	}

	pub fn raw(self) -> RawTypedKey {
		self.raw
	}

	// === Constructors === //

	pub fn instance() -> Self {
		Self {
			_ty: PhantomData,
			raw: RawTypedKey::Instance(NamedTypeId::of::<T>()),
		}
	}

	pub fn proxy<P>() -> Self
	where
		P: ?Sized + KeyProxyFor<Target = T>,
	{
		Self {
			_ty: PhantomData,
			raw: RawTypedKey::Proxy(NamedTypeId::of::<P>()),
		}
	}

	pub fn dynamic() -> Self {
		static ID_GEN: AtomicU64 = AtomicU64::new(0);

		let id = ID_GEN
			.fetch_update(Relaxed, Relaxed, |val| {
				Some(
					val.checked_add(1)
						.expect("cannot create more than u64::MAX dynamic keys!"),
				)
			})
			.unwrap();

		Self {
			_ty: PhantomData,
			raw: RawTypedKey::Runtime(id),
		}
	}
}

#[derive(Debug, Copy, Clone, Hash, Eq, PartialEq)]
pub enum RawTypedKey {
	Instance(NamedTypeId),
	Proxy(NamedTypeId),
	Runtime(u64),
}

impl<T: ?Sized + 'static> From<TypedKey<T>> for RawTypedKey {
	fn from(key: TypedKey<T>) -> Self {
		key.raw()
	}
}

// === Provider === //

// Standard traits
pub trait ProviderTarget<'r> {
	type SpecificProvider: ProviderTargetSpecific<'r>; // Typically either `Self` or `!`.

	fn as_specific_provider(&mut self) -> Option<&mut Self::SpecificProvider>;

	fn propose_in<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, value: &'r T);

	fn propose<T: ?Sized + 'static>(&mut self, value: &'r T) {
		self.propose_in(TypedKey::instance(), value)
	}
}

pub trait ProviderTargetSpecific<'r> {
	fn desired_key(&self) -> RawTypedKey;
	fn is_target_set(&self) -> bool;
	fn set_target<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, value: &'r T);
	unsafe fn set_target_unchecked<T: ?Sized + 'static>(&mut self, value: &'r T);
}

pub trait Provider {
	fn provide<'r, U>(&'r self, target: &mut U)
	where
		U: ?Sized + ProviderTarget<'r>;
}

pub trait DynProvider {
	fn provide_dyn<'r>(&'r self, target: &mut DynamicProviderTarget<'r>);

	fn key_list(&self) -> Vec<RawTypedKey>;
}

impl<T: ?Sized + Provider> DynProvider for T {
	fn provide_dyn<'r>(&'r self, target: &mut DynamicProviderTarget<'r>) {
		self.provide(target);
	}

	fn key_list(&self) -> Vec<RawTypedKey> {
		let mut list = KeyListProviderTarget::default();
		self.provide(&mut list);
		list.0
	}
}

// Standard targets
#[repr(C)]
pub struct StaticProviderTarget<'r, D: ?Sized + 'static> {
	key: TypedKey<D>,
	is_set: bool,
	value: Option<&'r D>,
}

impl<'r, D: ?Sized + 'static> StaticProviderTarget<'r, D> {
	pub fn new(key: TypedKey<D>) -> Self {
		Self {
			key,
			is_set: false,
			value: None,
		}
	}

	pub fn provided_value(&self) -> Option<&'r D> {
		self.value
	}
}

impl<'r, D: ?Sized + 'static> StaticProviderTarget<'r, D> {
	pub fn as_dynamic_provider(&mut self) -> &mut DynamicProviderTarget<'r> {
		unsafe {
			// Safety: we're both `repr(C)`, the first field `TypedKey<D>` is `repr(transparent)`
			// w.r.t. `RawTypedKey`, and the second field of both structures are booleans.
			self.cast_mut_via_ptr(|p| p as *mut DynamicProviderTarget)
		}
	}
}

impl<'r, D: ?Sized + 'static> ProviderTarget<'r> for StaticProviderTarget<'r, D> {
	type SpecificProvider = Self;

	fn as_specific_provider(&mut self) -> Option<&mut Self::SpecificProvider> {
		Some(self)
	}

	fn propose_in<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, value: &'r T) {
		if self.key.raw() != key.raw() {
			return;
		}

		debug_assert!(
			!self.is_target_set(),
			"More than one component with the key {key:?} was provided."
		);

		self.set_target(key, value);
	}
}

impl<'r, D: ?Sized + 'static> ProviderTargetSpecific<'r> for StaticProviderTarget<'r, D> {
	fn desired_key(&self) -> RawTypedKey {
		self.key.raw()
	}

	fn is_target_set(&self) -> bool {
		self.is_set
	}

	fn set_target<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, value: &'r T) {
		assert_eq!(self.key.raw(), key.raw());

		unsafe {
			// Safety: in this case, the unchecked variant is entirely safe.
			self.set_target_unchecked(value);
		}
	}

	unsafe fn set_target_unchecked<T: ?Sized + 'static>(&mut self, value: &'r T) {
		self.value = Some(runtime_unify_ref(value));
		self.is_set = true;
	}
}

#[repr(C)]
pub struct DynamicProviderTarget<'r> {
	_ty: PhantomData<&'r ()>,
	key: RawTypedKey,
	is_set: bool,
}

impl<'r> DynamicProviderTarget<'r> {
	pub unsafe fn as_static_provider_unchecked<D: ?Sized + 'static>(
		&mut self,
	) -> &mut StaticProviderTarget<'r, D> {
		// Safety: provided by caller
		self.cast_mut_via_ptr(|p| p as *mut StaticProviderTarget<'r, D>)
	}

	pub fn as_static_provider<D: ?Sized + 'static>(
		&mut self,
		key: TypedKey<D>,
	) -> &mut StaticProviderTarget<'r, D> {
		assert_eq!(self.key, key.raw());

		unsafe { self.as_static_provider_unchecked() }
	}
}

impl<'r> ProviderTarget<'r> for DynamicProviderTarget<'r> {
	type SpecificProvider = Self;

	fn as_specific_provider(&mut self) -> Option<&mut Self::SpecificProvider> {
		Some(self)
	}

	fn propose_in<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, value: &'r T) {
		if self.key == key.raw() {
			self.as_static_provider(key).propose_in(key, value);
		}
	}
}

impl<'r> ProviderTargetSpecific<'r> for DynamicProviderTarget<'r> {
	fn desired_key(&self) -> RawTypedKey {
		self.key
	}

	fn is_target_set(&self) -> bool {
		self.is_set
	}

	fn set_target<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, value: &'r T) {
		self.as_static_provider(key).set_target(key, value);
	}

	unsafe fn set_target_unchecked<T: ?Sized + 'static>(&mut self, value: &'r T) {
		self.as_static_provider_unchecked::<T>()
			.set_target_unchecked(value);
	}
}

#[derive(Debug, Default)]
pub struct KeyListProviderTarget(pub Vec<RawTypedKey>);

impl<'a> ProviderTarget<'a> for KeyListProviderTarget {
	type SpecificProvider = DynamicProviderTarget<'a>; // TODO: This should become `!` once it stabilizes.

	fn as_specific_provider(&mut self) -> Option<&mut Self::SpecificProvider> {
		None
	}

	fn propose_in<T: ?Sized + 'static>(&mut self, key: TypedKey<T>, _value: &'a T) {
		self.0.push(key.raw());
	}
}

// === ProviderExt === //

#[derive_where(Clone)]
#[derive(Error)]
pub struct MissingComponentError<'a, P: ?Sized + DynProvider> {
	target: &'a P,
	request: RawTypedKey,
}

impl<P: ?Sized + DynProvider> fmt::Debug for MissingComponentError<'_, P> {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		f.debug_struct("MissingComponentError")
			.field("request", &self.request)
			.finish_non_exhaustive()
	}
}

impl<P: ?Sized + DynProvider> fmt::Display for MissingComponentError<'_, P> {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		write!(f, "failed to fetch component under key {:?}", self.request)?;

		let keys = self.target.key_list();

		if keys.is_empty() {
			write!(f, "; provider has no entries.")?;
		} else {
			write!(
				f,
				"; provider exposes components: {}",
				keys.iter().map(|v| format!("{v:?}")).format(",")
			)?;
		}

		Ok(())
	}
}

pub trait ProviderExt: DynProvider {
	fn try_get_in<T: ?Sized + 'static>(
		&self,
		key: TypedKey<T>,
	) -> Result<&T, MissingComponentError<'_, Self>>;

	fn try_get<T: ?Sized + 'static>(&self) -> Result<&T, MissingComponentError<Self>> {
		self.try_get_in(TypedKey::instance())
	}

	fn has_in<T: ?Sized + 'static>(&self, key: TypedKey<T>) -> bool {
		self.try_get_in(key).is_ok()
	}

	fn has<T: ?Sized + 'static>(&self) -> bool {
		self.has_in(TypedKey::<T>::instance())
	}

	fn get_in<T: ?Sized + 'static>(&self, key: TypedKey<T>) -> &T {
		self.try_get_in(key).unwrap_pretty()
	}

	fn get<T: ?Sized + 'static>(&self) -> &T {
		self.get_in(TypedKey::instance())
	}

	fn use_ref_in<T, F, R>(&self, session: Session, key: TypedKey<LRefCell<T>>, f: F) -> R
	where
		T: ?Sized + 'static,
		F: FnOnce(&T) -> R,
	{
		self.get_in(key).use_ref(session, |v| f(v))
	}

	fn use_ref<T, F, R>(&self, session: Session, f: F) -> R
	where
		T: ?Sized + 'static,
		F: FnOnce(&T) -> R,
	{
		self.use_ref_in(session, TypedKey::instance(), f)
	}

	fn use_mut_in<T, F, R>(&self, session: Session, key: TypedKey<LRefCell<T>>, f: F) -> R
	where
		T: ?Sized + 'static,
		F: FnOnce(&mut T) -> R,
	{
		self.get_in(key).use_mut(session, |v| f(v))
	}

	fn use_mut<T, F, R>(&self, session: Session, f: F) -> R
	where
		T: ?Sized + 'static,
		F: FnOnce(&mut T) -> R,
	{
		self.use_mut_in(session, TypedKey::instance(), f)
	}
}

impl<P: ?Sized + DynProvider> ProviderExt for P {
	fn try_get_in<T: ?Sized + 'static>(
		&self,
		key: TypedKey<T>,
	) -> Result<&T, MissingComponentError<'_, Self>> {
		let mut target = StaticProviderTarget::new(key);
		self.provide_dyn(target.as_dynamic_provider());
		target.provided_value().ok_or(MissingComponentError {
			target: self,
			request: key.raw(),
		})
	}
}

// === Tests === //

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn static_example() {
		struct Foo {
			a: u32,
			b: i32,
			c: String,
		}

		impl Provider for Foo {
			fn provide<'r, U>(&'r self, target: &mut U)
			where
				U: ?Sized + ProviderTarget<'r>,
			{
				target.propose(&self.a);
				target.propose(&self.b);
				target.propose::<String>(&self.c);
				target.propose::<str>(&self.c);
			}
		}

		let foo = Foo {
			a: 3,
			b: 4,
			c: "foo".to_string(),
		};

		let bar = &foo as &dyn DynProvider;

		assert_eq!(*bar.get::<u32>(), 3);
		assert_eq!(*bar.get::<i32>(), 4);
		assert_eq!(bar.get::<String>(), "foo");
		assert_eq!(bar.get::<str>(), "foo");
	}
}
