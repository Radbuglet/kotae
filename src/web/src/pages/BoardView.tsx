import { IrBlock, IrBoard, IrFrame, IrLine, LayoutFrame } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";
import DemoClasses from "./demo.module.css";
import { FrameView } from "./FrameView";
import { PanAndZoom } from "../util/pan";
import { ReadonlyVec2, vec2 } from "gl-matrix";


export function BoardView({ target }: EntityViewProps) {
    const target_ir = target.get(IrBoard.KEY);
    const frames = useListenable(target_ir.frames);
    const pan_and_zoom = React.useRef<PanAndZoom>(null);

    const handleClick = wrapWeakReceiver(target, (_, e: React.MouseEvent) => {

	// GET POS //
	const paz = pan_and_zoom.current!;
	if (!paz.isHelperElement(e.target)) return;

	const bb = paz.viewport.getBoundingClientRect();
	const pos: vec2 = [
	    e.clientX - bb.left,
	    e.clientY - bb.top,
	];

	vec2.transformMat3(pos, pos, paz.computeViewportToWorldXform());

	// ADD FRAME //
        const frame = new Entity(target_ir, "frame");
        const frame_ir = frame.add(new IrFrame(frame), [IrFrame.KEY]);
	const frame_layout = frame.add(new LayoutFrame(frame), [LayoutFrame.KEY]);

	//pos[0] += -18
	//pos[1] += -49

	frame_layout.position.value = pos;
	frame_layout.size.value = [500, 300];

        frame.setFinalizer(() => {
	    frame_layout.destroy();
            frame_ir.destroy();
        });
        target_ir.frames.add(frame); // TODO this adds it in the wrong place
	// it needs to be offset so that the cursor is over the text box,
	// not on the top left.
    })

    return (
		<div className="bg-white">
			<div className="border-2 border-matcha-500" style={{
			width: "min-content"
			}}>
			hiiiiiiiiiii
			</div>
			<button className="border-2 border-red-500" onClick={() => {
			pan_and_zoom.current.zoom += 1
			}}>sss</button>
			<PanAndZoom
		ref={pan_and_zoom}
		viewport_props={{
		    className: "bg-matcha-paper",
		    style: { width: "100%", height: "90vh"},
		    onClick: handleClick,
		}}
	    >

			{Array.from(frames.values()).map(
				frame => <FrameView key={frame.part_id} target={frame} />)
			}

			</PanAndZoom>
		</div>
    )
}

