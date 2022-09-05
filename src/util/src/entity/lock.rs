use std::{
	borrow::Borrow,
	cell::{Cell, RefCell, UnsafeCell},
	fmt,
	marker::PhantomData,
	mem,
	num::{NonZeroU8, NonZeroUsize},
	ops::{Deref, DerefMut},
	rc::{Rc, Weak},
	sync::{Mutex, MutexGuard},
};

use bitvec::{array::BitArray, order::Lsb0};
use thiserror::Error;

use crate::{
	debug::{
		error::ResultExt,
		label::{DebugLabel, SerializedDebugLabel},
	},
	mem::guard::DropGuard,
};

// === Borrow States === //

#[derive(Debug, Clone, Error)]
#[error("allocated more than 255 unique locks concurrently")]
#[non_exhaustive]
pub struct LockCreationError;

#[derive(Debug, Copy, Clone, Hash, Eq, PartialEq)]
pub enum BorrowMutability {
	Immutable,
	Mutable,
}

impl BorrowMutability {
	pub fn invert(self) -> Self {
		use BorrowMutability::*;

		match self {
			Immutable => Mutable,
			Mutable => Immutable,
		}
	}

	fn adjective(self) -> &'static str {
		use BorrowMutability::*;

		match self {
			Immutable => "immutable",
			Mutable => "mutable",
		}
	}

	fn adverb(self) -> &'static str {
		use BorrowMutability::*;

		match self {
			Immutable => "immutably",
			Mutable => "mutably",
		}
	}
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum BorrowState {
	Immutable(Option<NonZeroUsize>),
	Mutable,
}

impl BorrowState {
	pub fn from_mutability(mode: BorrowMutability) -> Self {
		match mode {
			BorrowMutability::Immutable => Self::Immutable(None),
			BorrowMutability::Mutable => Self::Mutable,
		}
	}
	pub fn new_immutable_known(count: NonZeroUsize) -> Self {
		Self::Immutable(Some(count))
	}

	pub fn mutability(&self) -> BorrowMutability {
		match self {
			Self::Immutable(_) => BorrowMutability::Immutable,
			Self::Mutable => BorrowMutability::Mutable,
		}
	}

	pub fn block_count(&self) -> Option<NonZeroUsize> {
		match self {
			Self::Immutable(count) => *count,
			Self::Mutable => Some(NonZeroUsize::new(1).unwrap()),
		}
	}
}

#[derive(Debug, Clone, Error)]
pub struct BorrowError {
	pub offending: BorrowState,
}

impl fmt::Display for BorrowError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		let block_count = self.offending.block_count().map(|v| v.get());

		write!(
			f,
			"failed to borrow {desired_adv}, blocked by {block_count} {block_adj} acquisition{block_plural}",
			desired_adv = self.offending.mutability().invert().adverb(),
			block_count = match &block_count {
				Some(count) => count as &dyn fmt::Display,
				None => &"an indeterminate number of" as &dyn fmt::Display,
			},
			block_adj = self.offending.mutability().adjective(),
			block_plural = if self.offending.block_count() == Some(NonZeroUsize::new(1).unwrap()) { "" } else { "s" },
		)
	}
}

#[derive(Debug, Clone, Error)]
pub struct LockAcquireError {
	pub violations: Vec<(Lock, BorrowError)>,
}

impl fmt::Display for LockAcquireError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		write!(
			f,
			"failed to acquire {} lock{}:",
			self.violations.len(),
			if self.violations.len() == 1 { "" } else { "s" }
		)?;

		for (lock, error) in &self.violations {
			write!(f, "\n- {lock:?}: {error:?}")?;
		}

		Ok(())
	}
}

// === Global Lock Tracking === //

const BV_SZ_FOR_BYTE: usize = bitvec::mem::elts::<usize>(256);

type ReservedBV = BitArray<[usize; BV_SZ_FOR_BYTE], Lsb0>;

struct LockDB {
	labels: [SerializedDebugLabel; 256],
	reserved: ReservedBV,
	borrows: [BorrowStateCell; 256],
}

impl LockDB {
	fn get() -> MutexGuard<'static, Self> {
		static DB: Mutex<LockDB> = Mutex::new(LockDB {
			labels: arr![None; 256],
			reserved: ReservedBV {
				_ord: PhantomData::<Lsb0>,
				// Least significant byte corresponds to the `0..usize::BITS` range.
				data: arr![
					i => if i == 0 { 1 } else { 0 };
					BV_SZ_FOR_BYTE
				],
			},
			borrows: arr![BorrowStateCell::new(); 256],
		});

		DB.lock()
			.expect("detected crash in LockDB's critical section")
	}
}

#[derive(Debug, Clone, Default)]
struct BorrowStateCell(isize);

impl BorrowStateCell {
	const fn new() -> Self {
		Self(0)
	}

	fn state(&self) -> Option<BorrowState> {
		match self.0 {
			-1 => Some(BorrowState::Mutable),
			0 => None,
			v @ 1..=isize::MAX => Some(BorrowState::new_immutable_known(
				NonZeroUsize::new(v as usize).unwrap(),
			)),
			_ => unreachable!(),
		}
	}

	fn can_borrow_ref(&self) -> Result<(), BorrowError> {
		let state = self.state();

		if !matches!(state, Some(BorrowState::Mutable)) {
			Ok(())
		} else {
			Err(BorrowError {
				offending: state.unwrap(),
			})
		}
	}

	fn can_borrow_mut(&self) -> Result<(), BorrowError> {
		let state = self.state();

		if let Some(borrowed_state) = state {
			// Error if this cell is borrowed.
			Err(BorrowError {
				offending: borrowed_state,
			})
		} else {
			Ok(())
		}
	}

	fn can_borrow_as(&self, mode: BorrowMutability) -> Result<(), BorrowError> {
		match mode {
			BorrowMutability::Immutable => self.can_borrow_ref(),
			BorrowMutability::Mutable => self.can_borrow_mut(),
		}
	}

	fn borrow_ref(&mut self) {
		debug_assert!(self.can_borrow_ref().is_ok());
		self.0 = self.0.checked_add(1).expect(
			"`borrow_ref` failed due to overflow. This was likely caused by a memory leak.",
		);
	}

	fn borrow_mut(&mut self) {
		debug_assert!(self.can_borrow_mut().is_ok());
		self.0 = -1;
	}

	fn borrow_as(&mut self, mode: BorrowMutability) {
		match mode {
			BorrowMutability::Immutable => self.borrow_ref(),
			BorrowMutability::Mutable => self.borrow_mut(),
		}
	}

	fn release_ref(&mut self) {
		debug_assert!(matches!(self.state(), Some(BorrowState::Immutable(_))));
		self.0 -= 1;
	}

	fn release_mut(&mut self) {
		debug_assert!(matches!(self.state(), Some(BorrowState::Mutable)));
		self.0 = 0;
	}

	fn release_as(&mut self, mode: BorrowMutability) {
		match mode {
			BorrowMutability::Immutable => self.release_ref(),
			BorrowMutability::Mutable => self.release_mut(),
		}
	}
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

impl Default for SessionGuardState {
	fn default() -> Self {
		Self {
			label: Default::default(),
			lock_states: arr![Cell::new(0xFF); 256],
		}
	}
}

impl SessionGuardState {
	fn local_lock_mode(&self, i: u8) -> Option<BorrowMutability> {
		match self.lock_states[i as usize].get() {
			0xFF => None,
			0 => Some(BorrowMutability::Mutable),
			v if v == i as u8 => Some(BorrowMutability::Immutable),
			_ => unreachable!(),
		}
	}
}

impl Drop for SessionGuardState {
	fn drop(&mut self) {
		let mut db = LockDB::get();

		// Release global borrows
		for i in 1..=0xFF {
			if let Some(mode) = self.local_lock_mode(i) {
				db.borrows[i as usize].release_as(mode);
			}
		}
	}
}

#[derive(Debug, Clone)]
pub struct SessionGuard(Rc<SessionGuardState>);

impl SessionGuard {
	pub fn new_tls() -> Self {
		LOCAL_GUARD.with(|local| {
			let mut local = local.borrow_mut();

			if let Some(reused) = local.upgrade() {
				Self(reused)
			} else {
				let owned = Rc::new(Default::default());
				*local = Rc::downgrade(&owned);
				Self(owned)
			}
		})
	}

	pub fn new_unique() -> Self {
		Self(Rc::new(Default::default()))
	}

	pub fn handle(&self) -> Session {
		Session(&self.0)
	}
}

#[derive(Debug, Copy, Clone)]
pub struct Session<'a>(&'a SessionGuardState);

impl Session<'_> {
	pub fn debug_label(self) -> SerializedDebugLabel {
		self.0.label.borrow().clone()
	}

	pub fn set_debug_label<L: DebugLabel>(self, label: L) {
		*self.0.label.borrow_mut() = label.serialize_label();
	}

	pub fn try_acquire_locks<I>(self, locks: I) -> Result<(), LockAcquireError>
	where
		I: IntoIterator<Item = (Lock, BorrowMutability)>,
	{
		// Front-load user code and enter non-reentrant critical section
		let locks = locks.into_iter().collect::<Vec<_>>();
		let mut db = LockDB::get();

		// Check for violations
		let mut violations = Vec::new();

		for (lock, mode) in locks.iter().copied() {
			// Assuming this lock is borrowed by this session, either we've already acquired that
			// lock as that given state already, in which case ignore the request, or we've acquired
			// it as the opposite mutability, in which case we report the error.
			if self.local_lock_mode(lock) == Some(mode) {
				continue;
			}

			if let Err(err) = db.borrows[lock.index()].can_borrow_as(mode) {
				violations.push((lock, dbg!(err)));
			}
		}

		// Process violations
		if !violations.is_empty() {
			return Err(LockAcquireError { violations });
		}

		// Apply locks
		for (lock, mode) in locks.iter().copied() {
			// Ignore locks that are already in the correct state.
			if self.local_lock_mode(lock) == Some(mode) {
				continue;
			}

			// Acquire in DB
			db.borrows[lock.index()].borrow_as(mode);

			// Acquire locally
			let cell_state = match mode {
				BorrowMutability::Immutable => lock.0.get(),
				BorrowMutability::Mutable => 0,
			};

			self.0.lock_states[lock.index()].set(cell_state);
		}

		Ok(())
	}

	pub fn acquire_locks<I>(self, iter: I)
	where
		I: IntoIterator<Item = (Lock, BorrowMutability)>,
	{
		self.try_acquire_locks(iter).unwrap_pretty()
	}

	pub fn can_access_ref(self, lock: Lock) -> bool {
		Lock::has_ref_inner(self.0.lock_states[lock.index()].get())
	}

	pub fn can_access_mut(self, lock: Lock) -> bool {
		Lock::has_mut_inner(self.0.lock_states[lock.index()].get())
	}

	pub fn local_lock_mode(self, lock: Lock) -> Option<BorrowMutability> {
		self.0.local_lock_mode(lock.0.get())
	}
}

// === Lock === //

#[derive(Copy, Clone)]
pub struct Lock(NonZeroU8);

impl fmt::Debug for Lock {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		f.debug_struct("Lock")
			.field("id", &self.0)
			.field("label", LockDB::get().labels[self.index()].borrow())
			.finish()
	}
}

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

	pub fn global_borrow_state(self) -> Option<BorrowState> {
		LockDB::get().borrows[self.index()].state()
	}

	pub fn unreserve(self) {
		let mut db = LockDB::get();
		db.reserved.set(self.index(), false);
	}

	fn has_ref_inner(state: u8) -> bool {
		state != 0xFF
	}

	fn has_mut_inner(state: u8) -> bool {
		state == 0
	}

	fn index(self) -> usize {
		self.0.get().into()
	}
}

// === LRefCell === //

pub struct LRefCell<T: ?Sized> {
	lock: Cell<u8>, // TODO: Make atomic
	value: UnsafeCell<T>,
}

impl<T: ?Sized> LRefCell<T> {
	// === Cell management === //

	pub fn new(lock: Lock, value: T) -> Self
	where
		T: Sized,
	{
		Self {
			lock: Cell::new(lock.0.get()),
			value: UnsafeCell::new(value),
		}
	}

	pub fn as_ptr(&self) -> *mut T {
		self.value.get()
	}

	pub fn get_mut(&mut self) -> &mut T {
		self.value.get_mut()
	}

	pub fn into_inner(self) -> T
	where
		T: Sized,
	{
		self.value.into_inner()
	}

	// === Borrowing primitives === //

	pub fn use_ref<F, R>(&self, session: Session, f: F) -> R
	where
		F: FnOnce(&T) -> R,
	{
		let lock_id = self.lock.get();
		let lock_state = session.0.lock_states[lock_id as usize].get();

		// Validate borrow
		if !Lock::has_ref_inner(lock_state) {
			#[cold]
			#[inline(never)]
			fn bad_ref_borrow() -> ! {
				// TODO: Provide more details
				panic!("failed to borrow `LRefCell` immutably");
			}

			bad_ref_borrow();
		}

		// Acquire lock
		self.lock.set(lock_state); // The lock state also points to the proper immutable borrow mode
		let _unacquire_guard = DropGuard::new((), |()| {
			self.lock.set(lock_id);
		});

		// Run inner section
		// N.B. we force immutable critical sections to be wrapped by function calls to ensure that
		// `_reset_guards` are destroyed in the reverse order in which they were created. This is
		// important because top-level guards transitioning from unborrowed to immutable might write
		// back an unborrowed state while other immutable guards still have an active reference to
		// the cell.
		f(unsafe { &*self.value.get() })

		// `_reset_guard` is dropped
	}

	pub fn borrow_mut<'a>(&'a self, session: Session<'a>) -> LRefMut<'a, T> {
		let lock_id = self.lock.get();
		let lock_state = session.0.lock_states[lock_id as usize].get();

		// Validate borrow
		if !Lock::has_mut_inner(lock_state) {
			#[cold]
			#[inline(never)]
			fn bad_mut_borrow() -> ! {
				// TODO: Provide more details
				panic!("failed to borrow `LRefCell` mutably");
			}

			bad_mut_borrow();
		}

		// Acquire lock
		// N.B. here, however, it is perfectly fine to return the guard directly to the user. This is
		// because there can be only one mutable borrow of a cell at a given time, making the write-
		// back always valid.
		self.lock.set(0);
		LRefMut {
			old_state: lock_state,
			cell: self,
		}
	}

	pub fn use_mut<F, R>(&self, session: Session, f: F) -> R
	where
		F: FnOnce(&mut T) -> R,
	{
		let mut guard = self.borrow_mut(session);
		f(&mut guard)
	}

	// === Aliases === //

	pub fn replace(&self, session: Session, value: T) -> T
	where
		T: Sized,
	{
		self.use_mut(session, |dst| mem::replace(dst, value))
	}

	pub fn replace_with<F>(&self, session: Session, f: F) -> T
	where
		F: FnOnce(&mut T) -> T,
		T: Sized,
	{
		self.use_mut(session, |dst| {
			let value = (f)(dst);
			mem::replace(dst, value)
		})
	}
}

pub struct LRefMut<'a, T: ?Sized> {
	old_state: u8,
	cell: &'a LRefCell<T>,
}

impl<'a, T: ?Sized> Deref for LRefMut<'a, T> {
	type Target = T;

	fn deref(&self) -> &Self::Target {
		unsafe { &*self.cell.value.get() }
	}
}

impl<'a, T: ?Sized> DerefMut for LRefMut<'a, T> {
	fn deref_mut(&mut self) -> &mut Self::Target {
		unsafe { &mut *self.cell.value.get() }
	}
}

impl<'a, T: ?Sized> Drop for LRefMut<'a, T> {
	fn drop(&mut self) {
		self.cell.lock.set(self.old_state);
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn lock_acquisition() {
		let lock_1 = Lock::new("lock_1");
		let lock_2 = Lock::new("lock_2");

		let session = SessionGuard::new_tls();
		let s = session.handle();

		assert_eq!(lock_1.global_borrow_state(), None);
		assert_eq!(lock_2.global_borrow_state(), None);

		s.acquire_locks([(lock_1, BorrowMutability::Mutable)]);

		assert_eq!(lock_1.global_borrow_state(), Some(BorrowState::Mutable));
		assert_eq!(lock_2.global_borrow_state(), None);

		assert!(dbg!(s.try_acquire_locks([
			(lock_1, BorrowMutability::Immutable),
			(lock_2, BorrowMutability::Immutable),
		]))
		.is_err());

		assert_eq!(lock_1.global_borrow_state(), Some(BorrowState::Mutable));
		assert_eq!(lock_2.global_borrow_state(), None);

		s.acquire_locks([
			(lock_1, BorrowMutability::Mutable),
			(lock_2, BorrowMutability::Immutable),
		]);

		assert_eq!(lock_1.global_borrow_state(), Some(BorrowState::Mutable));
		assert_eq!(
			lock_2.global_borrow_state(),
			Some(BorrowState::new_immutable_known(
				NonZeroUsize::new(1).unwrap()
			))
		);

		s.acquire_locks([
			(lock_1, BorrowMutability::Mutable),
			(lock_2, BorrowMutability::Immutable),
		]);

		assert_eq!(lock_1.global_borrow_state(), Some(BorrowState::Mutable));
		assert_eq!(
			lock_2.global_borrow_state(),
			Some(BorrowState::new_immutable_known(
				NonZeroUsize::new(1).unwrap()
			))
		);

		let session_2 = SessionGuard::new_tls();
		let s2 = session_2.handle();

		assert!(s2.can_access_ref(lock_1));
		assert!(s2.can_access_mut(lock_1));

		assert!(s2.can_access_ref(lock_2));
		assert!(!s2.can_access_mut(lock_2));

		drop(session);

		assert_eq!(lock_1.global_borrow_state(), Some(BorrowState::Mutable));
		assert_eq!(
			lock_2.global_borrow_state(),
			Some(BorrowState::new_immutable_known(
				NonZeroUsize::new(1).unwrap()
			))
		);

		let session_3 = SessionGuard::new_unique();
		let s3 = session_3.handle();

		assert!(s3
			.try_acquire_locks([(lock_1, BorrowMutability::Mutable)])
			.is_err());

		assert!(s3
			.try_acquire_locks([(lock_1, BorrowMutability::Immutable)])
			.is_err());

		s3.acquire_locks([(lock_2, BorrowMutability::Immutable)]);

		assert_eq!(lock_1.global_borrow_state(), Some(BorrowState::Mutable));
		assert_eq!(
			lock_2.global_borrow_state(),
			Some(BorrowState::new_immutable_known(
				NonZeroUsize::new(2).unwrap()
			))
		);

		drop(session_2);

		assert_eq!(lock_1.global_borrow_state(), None);
		assert_eq!(
			lock_2.global_borrow_state(),
			Some(BorrowState::new_immutable_known(
				NonZeroUsize::new(1).unwrap()
			))
		);

		drop(session_3);

		assert_eq!(lock_1.global_borrow_state(), None);
		assert_eq!(lock_2.global_borrow_state(), None);
	}
}
