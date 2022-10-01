import { CleanupExecutor, Entity, ListenArray, ListenValue, Part, TypedKey } from "kotae-util";

export class IrTodoList extends Part {
    static readonly KEY = new TypedKey<IrTodoList>();

    readonly title = new ListenValue(this, "untitled todo list");
    readonly items = new ListenArray<Entity>(this);
    readonly checked_count = new ListenValue(this, 0);

    constructor(parent: Part | null) {
        super(parent);
    }

    addItem(item: Entity) {
        this.items.push(item);
    }

    removeChecked() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items.values[i]!;
            const item_ir = item.get(IrTodoItem.KEY);

            if (item_ir.checked.value) {
                item.destroy();
            }
        }
    }
}

export class IrTodoItem extends Part {
    static readonly KEY = new TypedKey<IrTodoItem>();

    readonly text = new ListenValue(this, "my todo item");
    readonly checked = new ListenValue(this, false);

    constructor(parent: Part | null) {
        super(parent);

        this.checked.on_changed.connect(this, new_value => {
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

    protected override onDestroy(cx: CleanupExecutor) {
        const ir_list = this.getIrList();

        cx.register(this, [ir_list], () => {
            // Remove from items list
            ir_list.items.remove(this.parent_entity);

            // Decrement checked count
            ir_list.checked_count.value -= 1;

            this.markFinalized();
        });
    }
}
