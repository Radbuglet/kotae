use std::cell::UnsafeCell;

use derive_where::derive_where;

use super::ptr::PointeeCastExt;

pub unsafe trait UnsafeCellLike {
	type Inner: ?Sized;

	fn get_ptr(&self) -> *mut Self::Inner;

	fn into_inner(self) -> Self::Inner
	where
		Self::Inner: Sized;

	fn get_mut(&mut self) -> &mut Self::Inner {
		unsafe {
			let ptr = self.get_ptr();
			self.cast_mut_via_ptr(|_| ptr)
		}
	}

	unsafe fn get_ref_unchecked(&self) -> &Self::Inner {
		self.cast_ref_via_ptr(|_| self.get_ptr())
	}

	unsafe fn get_mut_unchecked(&self) -> &mut Self::Inner {
		&mut *self.get_ptr()
	}
}

unsafe impl<T: ?Sized> UnsafeCellLike for UnsafeCell<T> {
	type Inner = T;

	fn get_ptr(&self) -> *mut Self::Inner {
		self.get()
	}

	fn into_inner(self) -> Self::Inner
	where
		Self::Inner: Sized,
	{
		self.into_inner()
	}
}

#[derive_where(Debug; T: Sized)]
#[derive(Default)]
pub struct SyncUnsafeCell<T: ?Sized>(UnsafeCell<T>);

unsafe impl<T: Send + Sync> Sync for SyncUnsafeCell<T> {}

impl<T> SyncUnsafeCell<T> {
	pub const fn new(value: T) -> Self {
		Self(UnsafeCell::new(value))
	}
}

impl<T> From<T> for SyncUnsafeCell<T> {
	fn from(value: T) -> Self {
		Self::new(value)
	}
}

unsafe impl<T: ?Sized> UnsafeCellLike for SyncUnsafeCell<T> {
	type Inner = T;

	fn get_ptr(&self) -> *mut Self::Inner {
		self.0.get()
	}

	fn into_inner(self) -> Self::Inner
	where
		Self::Inner: Sized,
	{
		self.0.into_inner()
	}
}
