import { Dismounter, dismountIfPresent, dismountRootIfPresent, Entity, ListenArray, ListenValue, Part, registerCompDismounter, TypedKey } from "kotae-util";

export class IrTodoList extends Part {
    static readonly KEY = new TypedKey<IrTodoList>();

    readonly title = new ListenValue("untitled todo list");
    readonly items = new ListenArray<Entity>();
    readonly checked_count = new ListenValue(0);

    constructor(parent: Part | null) {
        super(parent);

        registerCompDismounter(this, cx => {
            for (const item of this.items.value) {
                dismountIfPresent(item, cx);
            }
        });
    }

    addItem(item: Entity) {
        this.items.push(item);
    }

    removeItem(index: number) {
        const item = this.items.remove(index);
        dismountRootIfPresent(item);
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

    readonly text = new ListenValue("my todo item");
    readonly checked = new ListenValue(false);

    constructor(parent: Part | null) {
        super(parent);

        this.checked.on_changed.connect(new_value => {
            this.getListState()
                .checked_count
                .value += new_value ? 1 : -1;
        });

        registerCompDismounter(this, () => {
            if (this.checked.value) {
                this.getListState().checked_count.value -= 1;
            }
        });
    }

    private getListState(): IrTodoList {
        return this.deepGet(IrTodoList.KEY);
    }

    flipChecked() {
        this.checked.value = !this.checked.value;
    }

    removeSelf() {
        const list_ir = this.getListState();

        for (let i = 0; i < list_ir.items.length; i++) {
            const item = list_ir.items.value[i]!;

            if (item === this.parent_entity) {
                list_ir.removeItem(i);
            }
        }
    }
}
