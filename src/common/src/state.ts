import { Entity, ListenArray, ListenValue, Part, PartOrRoot, TypedKey } from "kotae-util";

export class IrTodoList extends Part {
    static readonly KEY = new TypedKey<IrTodoList>();

    readonly title = this.ensureChild(new ListenValue("untitled todo list"));
    readonly items = this.ensureChild(new ListenArray<Entity>());
    readonly checked_count = this.ensureChild(new ListenValue(0));

    addItem(item: Entity) {
        this.ensureChild(item);
        this.items.push(item);
    }

    removeItem(index: number) {
        const removed = this.items.remove(index);
        removed?.destroy();
    }

    removeChecked() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items.value[i]!;
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

    constructor(parent: PartOrRoot = Part.DEFAULT_ORPHANAGE) {
        super(parent);

        this.checked.on_changed.connect(new_value => {
            this.deepGet(IrTodoList.KEY).checked_count.value += new_value ? 1 : -1;
        }).ensureParent(this);
    }

    flipChecked() {
        this.checked.value = !this.checked.value;
    }
}
