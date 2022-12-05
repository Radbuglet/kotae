import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../../util/hooks";
import { BlockRegistry, IrBlock, ScryBlock, IrLine, IrFrame } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./../registry";

export function createKind(parent: Part | null) {
	const kind = new Entity(parent, "scry block kind");
	kind.add(ScryBlockView, [BLOCK_VIEW_KEY]);
	kind.add({
		name: "Latex Scry Block",
		description: "don't know how to write a symbol? search for it!",
		icon: null!,
	}, [BLOCK_KIND_INFO_KEY]);
	kind.add((parent) => {
		const instance = new Entity(parent, "scry block");
		const instance_ir = instance.add(new IrBlock(instance, kind), [IrBlock.KEY]);
		const instance_text = instance.add(new ScryBlock(instance), [ScryBlock.KEY]);
		instance.setFinalizer(() => {
			instance_text.destroy();
			instance_ir.destroy();
		});

		return instance;
	}, [BLOCK_FACTORY_KEY]);

	return kind;
}

function ScryBlockView({ target }: EntityViewProps) {
	const target_ir = target.get(ScryBlock.KEY);
	const text = useListenable(target_ir.text);

	const block_ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		block_ref.current!.focus();
	}, []);


	return <div
            ref={block_ref}
	>
            wheeeeeeeeeeeeeeeeeeeeeeeeeeee!
	</div>;
}

