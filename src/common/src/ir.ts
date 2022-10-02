import { Entity, IReadonlyListenSet, ListenArray, ListenSet, Part, TypedKey } from "kotae-util";

export class IrDocument extends Part {
    static readonly KEY = new TypedKey<IrDocument>("IrDocument");

    readonly frames = new ListenSet<Entity>(this);
}

export class IrFrame extends Part {
    static readonly KEY = new TypedKey<IrFrame>("IrFrame");

    private readonly linked_to_ = new ListenSet<Entity>(this);
    private readonly link_target_for = new ListenSet<Entity>(this);
    readonly lines = new ListenArray<IrLine>(this);

    // We don't want users accidentally modifying `linked_to_` without first going through
    // `linkTo`/`unlinkFrom`.
    get linked_to(): IReadonlyListenSet<Entity> {
        return this.linked_to_;
    }

    linkTo(target: Entity, bidi: boolean) {
        if (this.linked_to_.add(target)) {
            const target_ir = target.get(IrFrame.KEY);
            target_ir.link_target_for.add(this.parent_entity);
        }

        if (bidi) {
            target
                .get(IrFrame.KEY)
                .linkTo(this.parent_entity, false);
        }
    }

    unlinkFrom(target: Entity, bidi: boolean) {
        if (this.linked_to_.delete(target)) {
            target
                .get(IrFrame.KEY)
                .link_target_for
                .delete(this.parent_entity);
        }

        if (bidi) {
            target
                .get(IrFrame.KEY)
                .unlinkFrom(this.parent_entity, false);
        }
    }

    mergeLines(target: IrLine, and_its: "prev" | "next") {
        // Find the target line
        let target_idx = this.lines.indexOf(target);
        if (and_its === "prev") target_idx -= 1;
        if (target_idx < 0) return;  // Handles `prev` underflow and not-found simultaneously.

        const mergee_idx = target_idx + 1;
        if (mergee_idx >= this.lines.length) return;

        const mergee = this.lines.value[mergee_idx]!;

        // Merge the mergee into the target
        for (const block of mergee.blocks.value) {
            target.blocks.push(block);
        }
        mergee.blocks.clear();

        // Destroy the old line
        mergee.destroy();
    }
}

export class IrLine extends Part {
    readonly blocks = new ListenArray(this);
}

export class IrBlock extends Part {
    static readonly KEY = new TypedKey<IrBlock>("IrBlock");
}
