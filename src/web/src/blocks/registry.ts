import { BlockRegistry } from "kotae-common";
import { Entity, Part, TypedKey } from "kotae-util";
import React from "react";
import { EntityViewProps } from "../util/hooks";

import * as TextBlock from "./text_block";
import * as MathBlock from "./math_block";

export const BLOCK_VIEW_KEY = new TypedKey<React.FC<EntityViewProps>>("BLOCK_VIEW_KEY");

export const BLOCK_KIND_INFO_KEY = new TypedKey<BlockKindInfo>("BlockKindInfo");
export type BlockKindInfo = Readonly<{
    name: string,
    description: string,
    icon: React.ReactInstance,  // FIXME
}>;

export const BLOCK_FACTORY_KEY = new TypedKey<BlockFactory>("BlockFactory");
export type BlockFactory = (parent: Part | null) => Entity;

export function createRegistry(parent: Part | null) {
    const block_registry = new BlockRegistry(parent);
    block_registry.registerKind(TextBlock.createKind(block_registry));
    block_registry.registerKind(MathBlock.createKind(block_registry));

    return block_registry;
}
