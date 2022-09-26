import { Entity, ListenValue, Part, TypedKey } from "kotae-util";

export class TodoList extends Part {
    readonly list_name = this.ensureChild(new ListenValue("untitled todo list"));
    readonly items: Entity[] = [];

    randomizeName() {
        this.list_name.value = `my list #${Math.floor(Math.random() * 1000)}`;
    }

    checkAll() {
        for (const item of this.items) {
            const base_item = item.get(BaseTodoItem.key);

            base_item.is_checked.value = true;
        }
    }
}

export class BaseTodoItem extends Part {
    static readonly key = new TypedKey<BaseTodoItem>();
    readonly is_checked = this.ensureChild(new ListenValue(false));

    flipChecked() {
        this.is_checked.value = !this.is_checked.value;
    }
}
