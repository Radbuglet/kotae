use std::{
	any::TypeId,
	mem::{self, ManuallyDrop, MaybeUninit},
	ptr,
};

pub fn leak_alloc<'a, T>(val: T) -> &'a mut T {
	Box::leak(Box::new(val))
}

pub trait PointeeCastExt {
	type Pointee: ?Sized;

	fn as_byte_ptr(&self) -> *const u8;

	unsafe fn cast_ref_via_ptr<F, R>(&self, f: F) -> &R
	where
		R: ?Sized,
		F: FnOnce(*const Self::Pointee) -> *const R;

	unsafe fn cast_mut_via_ptr<F, R>(&mut self, f: F) -> &mut R
	where
		R: ?Sized,
		F: FnOnce(*mut Self::Pointee) -> *mut R;

	unsafe fn try_cast_ref_via_ptr<F, R, E>(&self, f: F) -> Result<&R, E>
	where
		R: ?Sized,
		F: FnOnce(*const Self::Pointee) -> Result<*const R, E>;

	unsafe fn try_cast_mut_via_ptr<F, R, E>(&mut self, f: F) -> Result<&mut R, E>
	where
		R: ?Sized,
		F: FnOnce(*mut Self::Pointee) -> Result<*mut R, E>;
}

impl<T: ?Sized> PointeeCastExt for T {
	type Pointee = T;

	fn as_byte_ptr(&self) -> *const u8 {
		self as *const Self as *const u8
	}

	unsafe fn cast_ref_via_ptr<F, R>(&self, f: F) -> &R
	where
		R: ?Sized,
		F: FnOnce(*const Self::Pointee) -> *const R,
	{
		&*f(self)
	}

	unsafe fn cast_mut_via_ptr<F, R>(&mut self, f: F) -> &mut R
	where
		R: ?Sized,
		F: FnOnce(*mut Self::Pointee) -> *mut R,
	{
		&mut *f(self)
	}

	unsafe fn try_cast_ref_via_ptr<F, R, E>(&self, f: F) -> Result<&R, E>
	where
		R: ?Sized,
		F: FnOnce(*const Self::Pointee) -> Result<*const R, E>,
	{
		Ok(&*f(self)?)
	}

	unsafe fn try_cast_mut_via_ptr<F, R, E>(&mut self, f: F) -> Result<&mut R, E>
	where
		R: ?Sized,
		F: FnOnce(*mut Self::Pointee) -> Result<*mut R, E>,
	{
		Ok(&mut *f(self)?)
	}
}

pub const unsafe fn entirely_unchecked_transmute<A, B>(a: A) -> B {
	union Punny<A, B> {
		a: ManuallyDrop<A>,
		b: ManuallyDrop<B>,
	}

	let punned = Punny {
		a: ManuallyDrop::new(a),
	};

	ManuallyDrop::into_inner(punned.b)
}

pub const fn must_be_unsized<T: ?Sized>() -> bool {
	mem::size_of::<*mut T>() != mem::size_of::<*mut ()>()
}

pub const unsafe fn sizealign_checked_transmute<A, B>(a: A) -> B {
	assert!(mem::size_of::<A>() == mem::size_of::<B>());
	assert!(mem::align_of::<A>() >= mem::align_of::<B>());

	entirely_unchecked_transmute(a)
}

pub unsafe trait OffsetOfReprC {
	type OffsetArray: AsRef<[usize]>;

	fn offsets() -> Self::OffsetArray;
}

macro_rules! impl_tup_offsets {
    ($($para:ident:$field:tt),*) => {
        unsafe impl<$($para,)*> OffsetOfReprC for ($($para,)*) {
            type OffsetArray = [usize; 0 $(+ {
                ignore!($para);
                1
            })*];

            #[allow(unused)]  // For empty tuples.
            fn offsets() -> Self::OffsetArray {
                let tup = MaybeUninit::<Self>::uninit();
                let tup_base = tup.as_ptr();

                [$(
                    unsafe {
                        ptr::addr_of!((*tup_base).$field) as usize - tup_base as usize
                    }
                ),*]
            }
        }
    };
}

impl_tuples!(impl_tup_offsets);

pub trait All {}

impl<T: ?Sized> All for T {}

pub fn runtime_unify<A: 'static, B: 'static>(a: A) -> B {
	assert_eq!(TypeId::of::<A>(), TypeId::of::<B>());

	unsafe { sizealign_checked_transmute(a) }
}

pub fn runtime_unify_ref<A: ?Sized + 'static, B: ?Sized + 'static>(a: &A) -> &B {
	assert_eq!(TypeId::of::<A>(), TypeId::of::<B>());

	unsafe { sizealign_checked_transmute(a) }
}

pub fn runtime_unify_mut<A: ?Sized + 'static, B: ?Sized + 'static>(a: &mut A) -> &mut B {
	assert_eq!(TypeId::of::<A>(), TypeId::of::<B>());

	unsafe { sizealign_checked_transmute(a) }
}
