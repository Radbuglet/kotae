import { IrBlock, IrBoard, IrFrame, IrLine, LayoutFrame } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";


export function FrameView({ target }: EntityViewProps) {
    const target_ir = target.get(IrFrame.KEY);
    const lines = useListenable(target_ir.lines);

    const doDestroy = wrapWeakReceiver(target, target => {
        target.destroy();
    });

    const doAddLine = wrapWeakReceiver(target_ir, target_ir => {

        const line = new Entity(target_ir, "line");
        const line_ir = line.add(new IrLine(line), [IrLine.KEY]);
        line.setFinalizer(() => {
            line_ir.destroy();
        });
        target_ir.lines.push(line);
    });

    return <div className=""
	style={{
	    position: "absolute",
	    transform: `translate(${
		target_ir.parent.get(LayoutFrame.KEY).position.value[0]
	    }px, ${
		target_ir.parent.get(LayoutFrame.KEY).position.value[1]
	    }px)`,
	}}
    >
	<p>Lines: 
	<button onClick={doAddLine}> Add Line </button> <button onClick={doDestroy}> Destroy </button> </p>
	{lines.map(
	    line => <LineView key={line.part_id} target={line} />,
	)}
    </div>
}


export function LineView({ target }: EntityViewProps) {
    const target_ir = target.get(IrLine.KEY);
    const blocks = useListenable(target_ir.blocks);

    const doDestroy = wrapWeakReceiver(target, target => {
        target.destroy();
    });

    const doAddBlock = wrapWeakReceiver(target_ir, target_ir => {
        const block = new Entity(target_ir, "block");
        const block_ir = block.add(new IrBlock(block, null!), [IrBlock.KEY]);  // FIXME
        block.setFinalizer(() => {
            block_ir.destroy();
        });
        target_ir.blocks.push(block);
    });

    const doMerge = (rel: "prev" | "next") => {
        if (!target_ir.is_alive) return;

        const frame_ir = target_ir.deepGet(IrFrame.KEY);
        frame_ir.mergeLines(frame_ir.lines.indexOf(target), rel);
    };

    return <div className="">
        <h2> Line (ID: {target.part_id}) </h2>
        <p>
        </p>
        {blocks.map(
            block => <BlockView key={block.part_id} target={block} />,
        )}
    </div>;
}

export function BlockView({ target }: EntityViewProps) {
    const doDestroy = wrapWeakReceiver(target, target => {
        target.destroy();
    });

    return <div className={DemoClasses["container"]}>
        <h2> Block  (ID: {target.part_id}) </h2>
        <p> <button onClick={doDestroy}> Destroy </button> </p>
    </div>;
}

