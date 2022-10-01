import { CleanupExecutor, Entity, ListenArray, ListenValue, Part, PHANTOM_CLEANUP_TARGET, TypedKey } from "kotae-util";

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
    readonly [PHANTOM_CLEANUP_TARGET]!: never;

    readonly text: ListenValue<string>;
    readonly checked = new ListenValue(this, false);

    constructor(parent: Part | null, text: string) {
        super(parent);

        this.text = new ListenValue(this, text);
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

    protected override preFinalize(cx: CleanupExecutor) {
        cx.register(this, [], () => {
            // Remove from items list
            const ir_list = this.getIrList();
            if (!ir_list.is_condemned) {
                ir_list.items.remove(this.parent_entity);
            }

            // Decrement checked count
            if (this.checked.value) {
                ir_list.checked_count.value -= 1;
            }

            this.markFinalized();
        });
    }
}
