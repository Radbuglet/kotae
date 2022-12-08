import React from "react";

import { Entity, Part } from "kotae-util";
import { EntityViewProps } from "../../util/hooks";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "../registry";
import { IrBlock, SlateBlock } from "kotae-common";

export function createKind(parent: Part | null): Entity {
    const kind = new Entity(parent, "slate block kind");

    kind.add({
        name: "Slate Block",
        description: "Text block",
        icon: null!,
    }, [BLOCK_KIND_INFO_KEY]);

    kind.add((parent) => {
        const block = new Entity(parent, "slate block");
        const block_ir = block.add(new IrBlock(block, kind), [IrBlock.KEY]);
        const block_text = block.add(new SlateBlock(block), [SlateBlock.KEY]);

		block.setFinalizer(() => {
			block_text.destroy();
			block_ir.destroy();
		});

        return block;
    }, [BLOCK_FACTORY_KEY]);

    kind.add(SlateBlockView, [BLOCK_VIEW_KEY]);

    return kind;
}

export function SlateBlockView({ target }: EntityViewProps) {
    return <h1>Hello, I am a slate block.</h1>;
}
