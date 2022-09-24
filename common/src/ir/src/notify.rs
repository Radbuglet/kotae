use mid_util::prim::{prelude::*, signal::DirtyQueue};

#[derive(Debug)]
pub struct IrNotifier {
	items: DirtyQueue,
	misc: DirtyQueue,
}

#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq)]
pub enum IrNotifyCategory {
	UpdateItem,
	UpdateDocument,
}

impl IrNotifier {
	pub fn notify(&mut self, s: Session, category: IrNotifyCategory, element: &ArcEntity) {
		use IrNotifyCategory::*;

		match category {
			UpdateItem => self.items.mark(s, element),
			UpdateDocument => self.misc.mark(s, element),
		}
	}
}
