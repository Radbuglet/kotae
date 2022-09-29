import { CleanupExecutor, Entity, ListenArray, ListenValue, Part, TypedKey } from "kotae-util";

export interface IrFactory {
  createEdge()
}


export class IrDocument extends Part {

    constructor(
	parent: Part | null,
	readonly created_date: Date,
	title: string,
    ) {
	super(parent);
	this.title = new ListenValue<string>(this, title);
    }

    //readonly author = new ListenValue<string>(this, "untitled");

    readonly title: ListenValue<string>;
    readonly frames = new ListenArray<Entity>(this);

    addFrame(frame: Entity) {
	this.frames.push(frame);
    }

    linkFrames(frame_a: Entity, frame_b: Entity, bidi: boolean) {
	
    }
}

export class IrFrame extends Part {
    constructor ( parent: Part | null, ) {
	super(parent);
    }

    readonly edges = new ListenArray<Entity>(this);
    readonly lines = new ListenArray<Entity>(this);
}

export class IrEdge extends Part {
    constructor ( parent: Part | null, a: Entity, b: Entity) {
	super(parent);

	const [a, b] = [a, b].sort((a, b) => a.part_id - b.part_id);
	this.a = new ListenValue<Entity>(this, a);
	this.b = new ListenValue<Entity>(this, b);

    }
}

export class IrLine extends Part {


}

************



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

    removeSelf() {
        this.getIrList().removeItem(this.parent_entity);
    }

    protected override onDestroy(cx: CleanupExecutor) {
        if (this.checked.value) {
            this.getIrList().checked_count.value -= 1;
        }
    }
}
