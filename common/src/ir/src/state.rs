use mid_util::prim::prelude::*;

use crate::notify::{IrNotifier, IrNotifyCategory};

pub struct IrTodoList {
	items: Vec<ArcEntity>,
}

impl IrTodoList {
	pub fn push_item(
		&mut self,
		s: Session,
		me: &ArcEntity,
		notifier: &mut IrNotifier,
		item: ArcEntity,
	) {
		self.items.push(item);
		notifier.notify(s, IrNotifyCategory::UpdateDocument, me);
	}

	pub fn remove_item(
		&mut self,
		s: Session,
		me: &ArcEntity,
		notifier: &mut IrNotifier,
		index: usize,
	) {
		self.items.remove(index);
		notifier.notify(s, IrNotifyCategory::UpdateDocument, me);
	}
}

pub struct IrBaseTodoItem {
	is_checked: bool,
}

impl IrBaseTodoItem {
	pub fn set_checked(
		&mut self,
		s: Session,
		me: &ArcEntity,
		notifier: &mut IrNotifier,
		checked: bool,
	) {
		self.is_checked = checked;
		notifier.notify(s, IrNotifyCategory::UpdateItem, me);
	}
}
