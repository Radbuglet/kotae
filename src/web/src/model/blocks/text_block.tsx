import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../../util/hooks";
import { BlockRegistry, IrBlock, TextBlock, IrLine, IrFrame } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./../registry";

export function createKind(parent: Part | null) {
	const kind = new Entity(parent, "text block kind");
	kind.add(TextBlockView, [BLOCK_VIEW_KEY]);
	kind.add({
		name: "Text Block",
		description: "You know what this is :)",
		icon: null!,
	}, [BLOCK_KIND_INFO_KEY]);
	kind.add((parent) => {
		const instance = new Entity(parent, "text block");
		const instance_ir = instance.add(new IrBlock(instance, kind), [IrBlock.KEY]);
		const instance_text = instance.add(new TextBlock(instance), [TextBlock.KEY]);
		instance.setFinalizer(() => {
			instance_text.destroy();
			instance_ir.destroy();
		});

		return instance;
	}, [BLOCK_FACTORY_KEY]);

	return kind;
}

function TextBlockView({ target }: EntityViewProps) {
	const target_ir = target.get(TextBlock.KEY);
	const text = useListenable(target_ir.text);

	const block_ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		block_ref.current!.focus();
	}, []);

	const handleKeydown = (e: React.KeyboardEvent) => {
		//console.log(e)
		if (e.key === "Enter") {
			e.preventDefault();
			//e.stopPropagation();
			const frame_ir = target_ir.deepGet(IrFrame.KEY)
			const line = new Entity(frame_ir, "line");
			const line_ir = line.add(new IrLine(line), [IrLine.KEY]);
			line.setFinalizer(() => {
				line_ir.destroy();
			});

			frame_ir.lines.push(line)
			const kind = target_ir.deepGet(BlockRegistry.KEY).kinds[0]!; // FIXME todo
			const block = kind.get(BLOCK_FACTORY_KEY)(line_ir);
			line_ir.blocks.push(block)
		}


		//if (e.key == "Backspace") {
		//    const pos = getCaretPosition(block_ref.current!)
		//    if (pos !== 0 || text !== "") return;

		//    const line_ir = target_ir.deepGet(IrLine.KEY);
		//    const frame_ir = target_ir.deepGet(IrFrame.KEY);
		//    const ind = frame_ir.lines.indexOf(line_ir.parent_entity);

		//    if (frame_ir.lines.value.length === 1) return;

		//    line_ir.destroy()

		//    if (ind !== 0) {
		//        const prev_line_ir = frame_ir.lines.value[ind-1].deepGet(IrLine.KEY);
		//        prev_line_ir.blocks.value[0].get().focusMe.value += 1

		//    }
		//}

	}

	const getCaretPosition = (editableDiv) => {
		var caretPos = 0,
			sel, range;
		if (window.getSelection) {
			sel = window.getSelection();
			if (sel.rangeCount) {
				range = sel.getRangeAt(0);
				if (range.commonAncestorContainer.parentNode == editableDiv) {
					caretPos = range.endOffset;
				}
			}
		} else if (document.selection && document.selection.createRange) {
			range = document.selection.createRange();
			if (range.parentElement() == editableDiv) {
				var tempEl = document.createElement("span");
				editableDiv.insertBefore(tempEl, editableDiv.firstChild);
				var tempRange = range.duplicate();
				tempRange.moveToElementText(tempEl);
				tempRange.setEndPoint("EndToEnd", range);
				caretPos = tempRange.text.length;
			}
		}
		return caretPos;
	}

	return <div
		className="outline-none"
		ref={block_ref}
		contentEditable={true}
		onBlur={(e) => {
			target_ir.text.value = e.currentTarget.innerText
		}}
		onKeyDown={handleKeydown}
	>
		{text}
	</div>;
}

