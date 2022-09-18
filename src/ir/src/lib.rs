use mid_util::prim::{entity::new_dangling_weak_entity_arc, prelude::*};
use std::fmt::Debug;

pub struct BaseNode {
	parent: WeakArcEntity,
	children: Vec<ArcEntity>,
	index_in_parent: usize,
}

impl BaseNode {
	pub fn parent(&self) -> &WeakArcEntity {
		&self.parent
	}

	pub fn children(&self) -> &[ArcEntity] {
		&self.children
	}

	pub fn set_parent(&mut self, s: Session, me: ArcEntity, new_parent: Option<ArcEntity>) {
		// Remove from old parent.
		if let Some(parent) = self.parent.upgrade() {
			parent.use_mut(s, |parent: &mut Self| {
				// Remove from parent set
				parent.children.swap_remove(self.index_in_parent);

				// Update index of relocated node
				if let Some(moved) = parent.children.get(self.index_in_parent) {
					moved.use_mut(s, |moved: &mut Self| {
						moved.index_in_parent = self.index_in_parent;
					});
				}
			});
		}

		// Add into new parent
		self.parent = match &new_parent {
			Some(parent) => ArcEntity::downgrade(parent),
			None => new_dangling_weak_entity_arc(),
		};

		if let Some(new_parent) = new_parent {
			new_parent.use_mut(s, |new_parent: &mut Self| {
				self.index_in_parent = new_parent.children.len();
				new_parent.children.push(me);
			});
		}
	}
}

#[derive(Debug)]
pub struct ThreadStartNode {
	pub color: String,
	pub icon: &'static str,
}
