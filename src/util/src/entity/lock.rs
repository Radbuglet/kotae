use std::cell::{Cell, UnsafeCell};

// === Session === //

#[derive(Copy, Clone)]
pub struct Session<'a> {
    // ## Format
    //
    // - `lock_id`: acquired immutably
    // - `0`: acquired mutably
    // - `0xFF`: unacquired
    //
    // The only special lock is lock ID `0`, which is `ALWAYS_UNACQUIRED`.
    locks: &'a [Cell<u8>; 256],
}

// === Lock === //

#[derive(Copy, Clone)]
pub struct Lock(u8);

impl Lock {
    pub const ALWAYS_UNACQUIRED: Self = Self(0);

    pub fn has_ref(self, session: Session) -> bool {
        Self::has_ref_inner(session.locks[self.0 as usize].get())
    }

    pub fn has_mut(self, session: Session) -> bool {
        Self::has_mut_inner(session.locks[self.0 as usize].get())
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
    pub fn use_ref<F, R>(&self, session: Session, f: F) -> R
    where
        F: FnOnce(&T) -> R,
    {
        let lock_id = self.lock.get();
        let lock_state = session.locks[lock_id as usize].get();

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
        let lock_state = session.locks[lock_id as usize].get();

        if !Lock::has_mut_inner(lock_state) {
            loop {}
        }

        self.lock.set(Lock::ALWAYS_UNACQUIRED.0);

        let res = f(unsafe { &mut *self.value.get() });

        self.lock.set(lock_id);

        res
    }
}
