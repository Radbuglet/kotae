use std::{
	cell::{Cell, RefCell, UnsafeCell},
	fmt,
	marker::PhantomData,
	num::NonZeroU8,
	rc::{Rc, Weak},
	sync::{Mutex, MutexGuard},
};

use bitvec::{array::BitArray, order::Lsb0};
use thiserror::Error;

use crate::debug::{
	error::ResultExt,
	label::{DebugLabel, SerializedDebugLabel},
};

// === Global Lock Tracking === //

const BV_SZ_FOR_BYTE: usize = bitvec::mem::elts::<usize>(256);

type ReservedBV = BitArray<[usize; BV_SZ_FOR_BYTE], Lsb0>;

struct LockDB {
	labels: [SerializedDebugLabel; 256],
	reserved: ReservedBV,
	borrows: [isize; 256],
}

impl LockDB {
	fn get() -> MutexGuard<'static, Self> {
		static DB: Mutex<LockDB> = Mutex::new(LockDB {
			labels: arr![None; 256],
			reserved: ReservedBV {
				_ord: PhantomData,
				// Least significant byte corresponds to the `0..usize::BITS` range.
				data: arr![
					i => if i == 0 { 1 } else { 0 };
					BV_SZ_FOR_BYTE
				],
			},
			borrows: [0; 256],
		});

		DB.lock()
			.expect("detected crash in LockDB's critical section")
	}
}

// === Borrow States === //

#[derive(Debug, Clone, Error)]
#[error("allocated more than 255 unique locks concurrently")]
#[non_exhaustive]
pub struct LockCreationError;

#[derive(Debug, Copy, Clone, Hash, Eq, PartialEq)]
pub enum BorrowMutability {
	Mutable,
	Immutable,
}

// === Session === //

thread_local! {
	static LOCAL_GUARD: RefCell<Weak<SessionGuardState>> = RefCell::new(Weak::new());
}

struct SessionGuardState {
	// The debug label for the session.
	label: RefCell<SerializedDebugLabel>,

	// ## Format
	//
	// - `lock_id`: acquired immutably
	// - `0`: acquired mutably
	// - `0xFF`: unacquired
	//
	// The only special lock is lock ID `0`, which is `ALWAYS_UNACQUIRED`.
	lock_states: [Cell<u8>; 256],
}

impl fmt::Debug for SessionGuardState {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		f.debug_struct("SessionGuardState")
			.field("label", &self.label)
			.finish_non_exhaustive()
	}
}

#[derive(Debug)]
pub struct SessionGuard(Rc<SessionGuardState>);

impl SessionGuard {
	pub fn new() -> Self {
		LOCAL_GUARD.with(|local| {
			let mut local = local.borrow_mut();

			if let Some(reused) = local.upgrade() {
				Self(reused)
			} else {
				let owned = Rc::new(SessionGuardState {
					label: RefCell::new(None),
					lock_states: arr![Cell::new(0xFF); 256],
				});
				*local = Rc::downgrade(&owned);
				Self(owned)
			}
		})
	}

	pub fn handle(&self) -> Session {
		Session(&self.0)
	}
}

#[derive(Debug, Copy, Clone)]
pub struct Session<'a>(&'a SessionGuardState);

impl Session<'_> {
	pub fn debug_label(&self) -> SerializedDebugLabel {
		self.0.label.borrow().clone()
	}

	pub fn set_debug_label<L: DebugLabel>(&self, label: L) {
		*self.0.label.borrow_mut() = label.serialize_label();
	}

	pub fn acquire_locks<I>(iter: I) {
		let mut db = LockDB::get();
	}
}

// === Lock === //

#[derive(Copy, Clone)]
pub struct Lock(NonZeroU8);

impl Lock {
	pub fn try_new<L: DebugLabel>(label: L) -> Result<Self, LockCreationError> {
		let label = label.serialize_label();
		let mut db = LockDB::get();

		let id = db.reserved.first_zero().ok_or(LockCreationError)?;
		db.reserved.set(id, true);
		db.labels[id] = label;

		let id = NonZeroU8::new(id as u8).unwrap();
		Ok(Self(id))
	}

	pub fn new<L: DebugLabel>(label: L) -> Self {
		Self::try_new(label).unwrap_pretty()
	}

	pub fn has_ref(self, session: Session) -> bool {
		Self::has_ref_inner(session.0.lock_states[self.0.get() as usize].get())
	}

	pub fn has_mut(self, session: Session) -> bool {
		Self::has_mut_inner(session.0.lock_states[self.0.get() as usize].get())
	}

	fn has_ref_inner(state: u8) -> bool {
		state != 0xFF
	}

	fn has_mut_inner(state: u8) -> bool {
		state == 0
	}
}

pub struct LRefCell<T: ?Sized> {
	lock: Cell<u8>, // TODO: Make atomic
	value: UnsafeCell<T>,
}

impl<T: ?Sized> LRefCell<T> {
	// TODO: Use drop guards for panic protection.

	pub fn use_ref<F, R>(&self, session: Session, f: F) -> R
	where
		F: FnOnce(&T) -> R,
	{
		let lock_id = self.lock.get();
		let lock_state = session.0.lock_states[lock_id as usize].get();

		if !Lock::has_ref_inner(lock_state) {
			loop {}
		}

		self.lock.set(lock_state); // The lock state also points to the proper immutable borrow mode

		let res = f(unsafe { &*self.value.get() });

		self.lock.set(lock_id);

		res
	}

	pub fn use_mut<F, R>(&self, session: Session, f: F) -> R
	where
		F: FnOnce(&mut T) -> R,
	{
		let lock_id = self.lock.get();
		let lock_state = session.0.lock_states[lock_id as usize].get();

		if !Lock::has_mut_inner(lock_state) {
			loop {}
		}

		self.lock.set(0);
		let res = f(unsafe { &mut *self.value.get() });
		self.lock.set(lock_id);

		res
	}
}
