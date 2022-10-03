import { Entity, ListenArray, Part, TypedKey } from "kotae-util";
import { IrFrame } from "./frame";

export class IrLine extends Part {
    static readonly KEY = new TypedKey<IrLine>("IrLine");

    readonly blocks = new ListenArray<Entity>(this);

    protected override onDestroy() {
        // Destroy child blocks
        for (const block of this.blocks.value) {
            block.destroy();
        }

        // Remove from parent frame
        const frame_ir = this.deepGet(IrFrame.KEY);

        if (!frame_ir.is_condemned) {
            frame_ir.lines.remove(this.parent_entity);
        }

        // Finalize self
        this.blocks.destroy();
    }
}
