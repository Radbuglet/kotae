import { CleanupExecutor, Entity, ListenArray, ListenValue, Part, TypedKey } from "kotae-util";

export class IrTodoList extends Part {
    static readonly KEY = new TypedKey<IrTodoList>();

    readonly title = new ListenValue("untitled todo list");
    readonly items = new ListenArray<Entity>();
    readonly checked_count = new ListenValue(0);

    constructor(parent: Part | null) {
        super(parent);
    }

    addItem(item: Entity) {
        this.items.push(item);
    }

    removeItemAt(index: number) {
        const item = this.items.remove(index);
        item?.destroy();
    }

    removeItem(item: Entity) {
        this.removeItemAt(this.items.value.indexOf(item));
    }

    removeChecked() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items.value[i]!;
            const item_ir = item.get(IrTodoItem.KEY);

            if (item_ir.checked.value) {
                this.removeItemAt(i);
            }
        }
    }
}

export class IrTodoItem extends Part {
    static readonly KEY = new TypedKey<IrTodoItem>();

    readonly text = new ListenValue("my todo item");
    readonly checked = new ListenValue(false);

    constructor(parent: Part | null) {
        super(parent);

        this.checked.on_changed.connect(new_value => {
            this.getIrList()
                .checked_count
                .value += new_value ? 1 : -1;
        });
    }

    private getIrList(): IrTodoList {
        return this.deepGet(IrTodoList.KEY);
    }

    flipChecked() {
        this.checked.value = !this.checked.value;
    }

    removeSelf() {
        this.getIrList().removeItem(this.parent_entity);
    }

    protected override onDestroy(cx: CleanupExecutor) {
        if (this.checked.value) {
            this.getIrList().checked_count.value -= 1;
        }
    }
}
