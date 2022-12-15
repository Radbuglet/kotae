import { BlockRegistry } from "kotae-common";
import { Entity, Part, TypedKey } from "kotae-util";
import React from "react";
import { EntityViewProps } from "../util/hooks";

import * as TextBlock from "./blocks/text_block";
import * as MathBlock from "./blocks/math_block";
import * as ScryBlock from "./blocks/latex_scry";
import * as SlateBlock from "./blocks/slate_block";

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
	// the order of these is key!!! Because we access them by index. 
	block_registry.registerKind(SlateBlock.createKind(block_registry))
	block_registry.registerKind(MathBlock.createKind(block_registry));
	block_registry.registerKind(ScryBlock.createKind(block_registry));
	block_registry.registerKind(TextBlock.createKind(block_registry));

	return block_registry;
}
