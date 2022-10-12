import { assert, Entity, Part, TypedKey } from "kotae-util";
import { IrLine } from "./line";

export class IrBlock extends Part {
    static readonly KEY = new TypedKey<IrBlock>("IrBlock");

    constructor(parent: Part | null, readonly kind: Entity) {
        super(parent);
    }

    protected override onDestroy() {
        // Remove from parent frame
        const line_ir = this.deepGet(IrLine.KEY);

        if (!line_ir.is_condemned) {
            line_ir.blocks.remove(this.parent_entity);
        }
    }
}

export class BlockRegistry extends Part {
    static readonly KEY = new TypedKey<BlockRegistry>("BlockRegistry");

    private readonly kinds_: Entity[] = [];

    get kinds(): readonly Entity[] {
        return this.kinds_;
    }

    registerKind(kind: Entity) {
        assert(kind.parent === this);

        this.kinds_.push(kind);
    }

    protected override onDestroy() {
        for (const kind of this.kinds_) {
            kind.destroy();
        }
    }
}

export const IrBlockKind = new TypedKey<IrBlockKind>("IrBlockKind");

export interface IrBlockKind {
    readonly uuid: string;
    readonly friendly_name: string;

    construct(parent_line_ir: IrLine): Entity;
}
