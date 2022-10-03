import { IrDocument, IrFrame } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "./util";

export function makeReactRoot(target: Entity) {
    return <div>
        <h1> Kotae :) </h1>
        <p> Footage shown may not reflect final product. </p>

        <DocumentView target={target} />
    </div>;
}

export function DocumentView({ target }: EntityViewProps) {
    const target_ir = target.get(IrDocument.KEY);
    const frames = useListenable(target_ir.frames);

    const doAddFrame = wrapWeakReceiver(target_ir, target_ir => {
        const frame = new Entity(target_ir, "frame");
        const frame_ir = frame.add(new IrFrame(frame), [IrFrame.KEY]);
        frame.setFinalizer(() => {
            frame_ir.destroy();
        });
        target_ir.frames.add(frame);
    });

    return <div className="container">
        <h2> Document </h2>
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

    return <div className="container">
        <h2>Frame</h2>
        <p> <button onClick={doDestroy}> Destroy </button> </p>
        <p>Line count: {lines.length}</p>
    </div>;
}
