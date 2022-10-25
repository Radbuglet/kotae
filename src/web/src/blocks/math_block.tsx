import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../util/hooks";
import { IrBlock, IrFrame, IrLine, MathBlock, BlockRegistry } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./registry";
//import { MathfieldElement } from "mathlive";
//import { MathfieldComponent } from "react-mathlive";
import MathView, { MathViewRef } from 'react-math-view';
import "../../styles/MathBlock.css";

export function createKind(parent: Part | null) {
	const kind = new Entity(parent, "math block kind");
	kind.add(MathBlockView, [BLOCK_VIEW_KEY]);
	kind.add({
		name: "Math Block",
		description: "A block for writing math",
		icon: null!,
	}, [BLOCK_KIND_INFO_KEY]);
	kind.add((parent) => {
		const instance = new Entity(parent, "math block");
		const instance_ir = instance.add(new IrBlock(instance, kind), [IrBlock.KEY]);
		const instance_math = instance.add(new MathBlock(instance), [MathBlock.KEY]);
		instance.setFinalizer(() => {
			instance_math.destroy();
			instance_ir.destroy();
		});

		return instance;
	}, [BLOCK_FACTORY_KEY]);

	return kind;
}

function MathBlockView({ target }: EntityViewProps) {
	const target_ir = target.get(MathBlock.KEY);
	const math = useListenable(target_ir.math);

	const focusMe = useListenable(target_ir.focusMe);

	const block_ref = React.useRef<HTMLDivElement>(null);
	const math_ref = React.useRef<MathViewRef>(null);

	const [prevVal, setPrevVal] = React.useState(math);

	React.useEffect(() => {
		math_ref.current!.focus();
		console.log("focusing!", focusMe);
	}, [focusMe]);

	const handleKeydown = (e) => {
		console.log(prevVal)
		if (e.key == "Backspace") { // FIXME TODO for some reason this leaks once it triggers then you delete the entire block. :shrug:
			if (math_ref.current!.selection.ranges[0][0] !== 0 || prevVal !== "") return;

			const line_ir = target_ir.deepGet(IrLine.KEY);
			const frame_ir = target_ir.deepGet(IrFrame.KEY);
			const ind = frame_ir.lines.indexOf(line_ir.parent_entity);

			if (frame_ir.lines.value.length === 1) return;

			if (math !== "") return;

			line_ir.destroy()

			if (ind !== 0) {
				const prev_line_ir = frame_ir.lines.value[ind - 1].deepGet(IrLine.KEY);
				prev_line_ir.blocks.value[0].get(MathBlock.KEY).focusMe.value += 1

			}
		}

		if (e.key == "ArrowUp") {
			const line_ir = target_ir.deepGet(IrLine.KEY);
			const frame_ir = target_ir.deepGet(IrFrame.KEY);
			const ind = frame_ir.lines.indexOf(line_ir.parent_entity);

			if (frame_ir.lines.value.length === 1) return;

			if (ind !== 0) {
				const prev_line_ir = frame_ir.lines.value[ind - 1].deepGet(IrLine.KEY);
				prev_line_ir.blocks.value[0].get(MathBlock.KEY).focusMe.value += 1 // FIXME this doesn't work for mix and matching blocks

			}
		}

		if (e.key == "ArrowDown") {
			const line_ir = target_ir.deepGet(IrLine.KEY);
			const frame_ir = target_ir.deepGet(IrFrame.KEY);
			const ind = frame_ir.lines.indexOf(line_ir.parent_entity);

			if (frame_ir.lines.value.length === 1) return;

			if (ind !== frame_ir.lines.value.length - 1) {
				const prev_line_ir = frame_ir.lines.value[ind + 1].deepGet(IrLine.KEY);
				prev_line_ir.blocks.value[0].get(MathBlock.KEY).focusMe.value += 1

			}
		}

		//if (e.key == "ArrowLeft") {
		//    if (math_ref.current!.selection.ranges[0][0] !== 0 && prevVal !== "") return;
		//    const line_ir = target_ir.deepGet(IrLine.KEY);
		//    const frame_ir = target_ir.deepGet(IrFrame.KEY);
		//    const ind = frame_ir.lines.indexOf(line_ir.parent_entity);

		//    if (frame_ir.lines.value.length === 1) return;

		//    if (ind !== 0) {
		//        const prev_line_ir = frame_ir.lines.value[ind-1].deepGet(IrLine.KEY);
		//        prev_line_ir.blocks.value[0].get(MathBlock.KEY).focusMe.value += 1

		//    }
		//}
	}

	return <div
		className="outline-none"
		ref={block_ref}
	>
		<MathView
			//value={""}
			defaultValue={math} // FIXME idk if this actually works
			// but having a controlled value means that pressing ( no longer works.
			// instead, it instantly collapses the virtual ).

			ref={math_ref}
			onBlur={(e) => {
				//if (!target_ir.is_alive) return;

				//if (!target_ir.on_initialize.value) {
				//    target_ir.on_initialize.value = false;
				//}
			}}
			onChange={(e) => {
				//console.log("blurin the math field");
				target_ir.math.value = e.target.value;
			}}
			onInput={(e) => {
				if (e.inputType === "insertLineBreak") {
					e.preventDefault();
					//e.stopPropagation();
					const frame_ir = target_ir.deepGet(IrFrame.KEY)
					const line = new Entity(frame_ir, "line");
					const line_ir = line.add(new IrLine(line), [IrLine.KEY]);
					line.setFinalizer(() => {
						line_ir.destroy();
					});

					frame_ir.lines.push(line)
					const kind = target_ir.deepGet(BlockRegistry.KEY).kinds[1]!; // FIXME todo
					const block = kind.get(BLOCK_FACTORY_KEY)(line_ir);
					line_ir.blocks.push(block)

				}
			}}

			onKeyDown={(e) => {
				handleKeydown(e)
				//setPrevVal(math)
				//console.log(math, "ss")
			}}

			//smartMode={true}
			smartFence={true}
			smartSuperscript={false}
			mathModeSpace={"\\;"}
		//className="math-field"
		//style={{
		//    backgroundColor: "red",
		//}}
		/>
	</div>;
}


