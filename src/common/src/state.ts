import { Entity, ListenValue, Part, PartOrRoot, TypedKey } from "kotae-util";

export class IrTodoList extends Part {
    static readonly KEY = new TypedKey<IrTodoList>();

    readonly title = this.ensureChild(new ListenValue("untitled todo list"));
    readonly items: Entity[] = [];

    addItem(item: Entity) {
        this.ensureChild(item);
        this.items.push(item);
    }

    removeItem(index: number) {
        const removed = this.items.splice(index, 1)[0];
        removed?.destroy();
    }

    removeChecked() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i]!;
            const item_ir = item.get(IrTodoItem.KEY);

            if (item_ir.checked.value) {
                this.removeItem(i);
            }
        }
    }
}

export class IrTodoItem extends Part {
    static readonly KEY = new TypedKey<IrTodoItem>();

    readonly text = this.ensureChild(new ListenValue("my todo item"));
    readonly checked = this.ensureChild(new ListenValue(false));
}
