use std::fmt;

use super::{entity::TypedKey, prelude::*};

pub struct DirtyQueue {
	key: TypedKey<DirtyFlag>,
	gen: u64,
	targets: Vec<ArcEntity>,
}

impl fmt::Debug for DirtyQueue {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		f.debug_struct("DirtyQueue")
			.field("key", &self.key)
			.finish_non_exhaustive()
	}
}

impl DirtyQueue {
	pub fn new(key: TypedKey<DirtyFlag>) -> Self {
		Self {
			key,
			targets: Vec::new(),
			gen: 0,
		}
	}

	pub fn mark(&mut self, s: Session, target: &ArcEntity) {
		let mut gen = target.get_in(self.key).gen.borrow_mut(s);

		if *gen < self.gen {
			*gen = self.gen;
			self.targets.push(target.clone());
		}
	}

	pub fn target(&self) -> &[ArcEntity] {
		&self.targets
	}

	pub fn clear_targets(&mut self, _s: Session) {
		self.targets.clear();
		self.gen = self
			.gen
			.checked_add(1)
			.expect("DirtyQueue cleared too many times");
	}
}

#[derive(Debug)]
pub struct DirtyFlag {
	gen: LRefCell<u64>,
}

impl DirtyFlag {
	pub fn new(lock: Lock) -> Self {
		Self {
			gen: LRefCell::new(lock, 0),
		}
	}
}
