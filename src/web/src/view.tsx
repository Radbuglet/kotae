import { vec2 } from "gl-matrix";
import { IrBlock, IrBoard, IrFrame, IrLine } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { PanAndZoom } from "./util/pan";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "./util/util";

export function makeReactRoot(target: Entity) {
    const pan_and_zoom = React.createRef<PanAndZoom>();

    return <>
        <h1> Kotae :) </h1>
        <p> Footage shown may not reflect final product. </p>

        <p>
            <button onClick={() => pan_and_zoom.current!.zoom += 0.1}> Zoom and Enhance </button> { }
            <button onClick={() => {
                const paz = pan_and_zoom.current!;
                paz.center = vec2.create();
                paz.zoom = 1;
            }}> Reset </button>
        </p>
        <PanAndZoom viewport_props={{ style: { width: "100%", height: "90vh", border: "1px solid" } }} ref={pan_and_zoom}>
            <BoardView target={target} />
        </PanAndZoom>
    </>;
}

export function BoardView({ target }: EntityViewProps) {
    const target_ir = target.get(IrBoard.KEY);
    const frames = useListenable(target_ir.frames);

    const doAddFrame = wrapWeakReceiver(target_ir, target_ir => {
        const frame = new Entity(target_ir, "frame");
        const frame_ir = frame.add(new IrFrame(frame), [IrFrame.KEY]);
        frame.setFinalizer(() => {
            frame_ir.destroy();
        });
        target_ir.frames.add(frame);
    });

    return <div className="container" style={{ width: "50vw" }}>
        <h2> Board (ID: {target.part_id}) </h2>
        <p> Frames: <button onClick={doAddFrame}> Add Frame </button> </p>
        {IterExt.mapIntoArray(
            frames.values(),
            frame => <FrameView key={frame.part_id} target={frame} />
        )}
    </div>;
}

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

    return <div className="container">
        <h2> Frame (ID: {target.part_id}) </h2>
        <p>Lines: <button onClick={doAddLine}> Add Line </button> <button onClick={doDestroy}> Destroy </button> </p>
        {lines.map(
            line => <LineView key={line.part_id} target={line} />,
        )}
    </div>;
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

    return <div className="container">
        <h2> Line (ID: {target.part_id}) </h2>
        <p>
            Blocks: { }
            <button onClick={doAddBlock}> Add Block </button> { }
            <button onClick={() => doMerge("prev")}> Merge Prev </button> { }
            <button onClick={() => doMerge("next")}> Merge Next </button> { }
            <button onClick={doDestroy}> Destroy </button>
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

    return <div className="container">
        <h2> Block  (ID: {target.part_id}) </h2>
        <p> <button onClick={doDestroy}> Destroy </button> </p>
    </div>;
}
