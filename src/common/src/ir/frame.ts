import { assert, Entity, IReadonlyListenSet, ArrayExt, ListenArray, ListenSet, Part, TypedKey } from "kotae-util";
import { IrBoard } from "./board";
import { IrLine } from "./line";

export class IrFrame extends Part {
    static readonly KEY = new TypedKey<IrFrame>("IrFrame");

    private readonly linked_to_ = new ListenSet<Entity>(this);
    private readonly dependents = new Set<Entity>();
    readonly lines = new ListenArray<Entity>(this);

    get linked_to(): IReadonlyListenSet<Entity> {
        return this.linked_to_;
    }

    linkTo(target: Entity, bidi: boolean) {
        assert(target !== this.parent_entity);

        const target_ir = target.get(IrFrame.KEY);

        if (this.linked_to_.add(target.parent_entity)) {
            target_ir.dependents.add(this.parent_entity);
        }

        if (bidi) {
            target_ir.linkTo(this.parent_entity, false);
        }
    }

    unlinkFrom(target: Entity, bidi: boolean) {
        const target_ir = target.get(IrFrame.KEY);

        if (this.linked_to_.delete(target)) {
            target_ir.dependents.delete(this.parent_entity);
        }

        if (bidi) {
            target_ir.unlinkFrom(this.parent_entity, false);
        }
    }

    mergeLines(target_index: number, rel: "next" | "prev") {
        assert(ArrayExt.isValidIndex(this.lines.value, target_index));

        // Get indices
        if (rel === "prev") target_index -= 1;
        if (target_index < 0) return;

        const mergee_index = target_index + 1;
        if (mergee_index >= this.lines.length) return;

        const target = this.lines.value[target_index]!;
        const mergee = this.lines.value[mergee_index]!;
        const target_ir = target.get(IrLine.KEY);
        const mergee_ir = mergee.get(IrLine.KEY);

        // Move mergee blocks to target line
        for (const block of mergee_ir.blocks.value) {
            block.parent = target_ir;
            target_ir.blocks.push(block);
        }

        // Destroy mergee
        mergee_ir.blocks.clear();
        mergee.destroy();
    }

    protected override onDestroy() {
        // Destroy lines
        for (const line of this.lines.value) {
            line.destroy();
        }

        // Remove from parent board
        const board_ir = this.deepGet(IrBoard.KEY);

        if (!board_ir.is_condemned) {
            board_ir.frames.delete(this.parent_entity);

            for (const dependent of this.dependents) {
                dependent.get(IrFrame.KEY).linked_to_.delete(this.parent_entity);
            }
        }

        // Finalize self
        this.linked_to_.destroy();
        this.lines.destroy();
    }
}
