import { Part, TypedKey } from "kotae-util";
import { IrLine } from "./line";

export class IrBlock extends Part {
    static readonly KEY = new TypedKey<IrBlock>("IrBlock");

    protected override onDestroy() {
        // Remove from parent frame
        const line_ir = this.deepGet(IrLine.KEY);

        if (!line_ir.is_condemned) {
            line_ir.blocks.remove(this.parent_entity);
        }
    }
}
