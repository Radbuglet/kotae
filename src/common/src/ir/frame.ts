import { assert, Entity, IReadonlyListenSet, ListenSet, Part, TypedKey } from "kotae-util";
import { IrBoard } from "./board";

export class IrFrame extends Part {
    static readonly KEY = new TypedKey<IrFrame>("IrFrame");

    private readonly linked_to_ = new ListenSet<Entity>(this);
    private readonly dependents = new Set<Entity>();

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

    protected override onDestroy() {
        // Remove from parent board
        const board_ir = this.deepGet(IrBoard.KEY);

        if (!board_ir.is_condemned) {
            board_ir.frames.delete(this.parent_entity);
        }

        // Remove links
        for (const dependent of this.dependents) {
            dependent.get(IrFrame.KEY).linked_to_.delete(this.parent_entity);
        }

        // Finalize self
        this.linked_to_.destroy();
    }
}
