use std::mem::{self, ManuallyDrop};

use crate::mem::ptr::PointeeCastExt;

pub union InlineStore<H> {
	zst: (),
	_placeholder: ManuallyDrop<H>,
}

impl<H> InlineStore<H> {
	pub fn can_accommodate<T>() -> bool {
		// Alignment
		mem::align_of::<H>() >= mem::align_of::<T>()
            // Size
            && mem::size_of::<H>() >= mem::size_of::<T>()
	}

	pub fn new<T>(value: T) -> Self {
		Self::try_new(value).ok().unwrap()
	}

	pub fn try_new<T>(value: T) -> Result<Self, T> {
		if Self::can_accommodate::<T>() {
			let mut target = Self { zst: () };

			unsafe {
				(&mut target as *mut Self).cast::<T>().write(value);
			}

			Ok(target)
		} else {
			Err(value)
		}
	}

	pub unsafe fn try_decode<T>(&self) -> Option<&T> {
		if Self::can_accommodate::<T>() {
			Some(self.decode())
		} else {
			None
		}
	}

	pub unsafe fn decode<T>(&self) -> &T {
		assert!(Self::can_accommodate::<T>());

		// Safety: provided by caller
		self.cast_ref_via_ptr(|ptr| ptr as *const T)
	}
}
