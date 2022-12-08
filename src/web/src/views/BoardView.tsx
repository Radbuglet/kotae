import * as React from "react";
import Selecto from "react-selecto";
import Moveable from "react-moveable";
import type { DragScrollOptions } from "@scena/dragscroll";
import { usePinch } from '@use-gesture/react'
import { mat3, vec2 } from "gl-matrix";
import { Entity } from "kotae-util";
import { IrBoard, IrFrame, LayoutFrame } from "kotae-common";
import { EntityViewProps, useListenable, useSignal, wrapWeakReceiver } from "../util/hooks";
import { PanAndZoom } from "../util/pan";
import { FrameView } from "./FrameView";
import { SELECT_ACTIVE, ZOOM_RESET_SIGNAL } from "../model/board";
import "../../styles/Board.css"
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  NO_GROUP
} from "kbar";
import CommandBar from "./CommandBar";

// TODO: make onkeydown for alt toggle selection mode, and onkeyup reset it!

export function BoardView({ target: board }: EntityViewProps) {
	//> State
	const board_ir = board.get(IrBoard.KEY);

	// The set of frames contained by the board
	const frames = useListenable(board_ir.frames);

	// Whether the user is in "selection mode."
	const is_selecting_val = board_ir.deepGet(SELECT_ACTIVE);
	const is_selecting = useListenable(is_selecting_val);

	// The list of actively selected frames
	const [selectedFrames, setSelectedFrames] = React.useState<(HTMLElement | SVGElement)[]>([]);

	// Late-bound `Selecto` properties
	const [selectoProps, setSelectoProps] = React.useState<DragScrollOptions>();

	//> Refs
	const moveable_ref = React.useRef<Moveable>(null);
	const selecto_ref = React.useRef<Selecto>(null);
	const pan_and_zoom = React.useRef<PanAndZoom>(null);
	const pan_and_zoom_wrapper = React.useRef<HTMLDivElement>(null);

	//> Handlers
	const handleClick = wrapWeakReceiver(board, (_, e: React.MouseEvent) => {
		// Ensure that the action is appropriate
		const paz = pan_and_zoom.current!;
		if (!paz.isHelperElement(e.target)) return;  // Ignore if we're not clicking the background.

		if (is_selecting) return; // if we are selecting, don't create a new frame

		// Get clicked position
		const pos = paz.xformWindowToWorld([e.clientX, e.clientY]);

		// Construct the frame
		const frame = new Entity(board_ir, "frame");
		const frame_ir = frame.add(new IrFrame(frame), [IrFrame.KEY]);
		const frame_layout = frame.add(new LayoutFrame(frame), [LayoutFrame.KEY]);
		frame_layout.position.value = pos;
		frame_layout.size.value = [500, 300];

		frame.setFinalizer(() => {
			frame_layout.destroy();
			frame_ir.destroy();
		});

		board_ir.frames.add(frame);
	})

	// listens for when user toggles selecto, if they toggled it off deselect selected blocks
	React.useEffect(() => {
		if (!is_selecting) setSelectedFrames([]);
	}, [is_selecting])

	//> Late-bind selecto properties
	React.useEffect(() => {
		// We late-bind these properties because we need access to `pan_and_zoom`, which is only
		// acquired after the component has first rendered. FIXME: can we remove this late binding
		setSelectoProps({
			container: pan_and_zoom.current!.viewport,
			throttleTime: 30,
			threshold: 0,
		});
	}, []);

	//> Setup zoom functionality
	usePinch(state => {
		const paz = pan_and_zoom.current!;
		const { origin: origin_window, delta: [pinch_delta] } = state;

		// Wrangle coordinate spaces
		const viewport_bb = paz.viewport.getBoundingClientRect();
		const origin_viewport: vec2 = [
			origin_window[0] - viewport_bb.left,
			origin_window[1] - viewport_bb.top,
		];

		// Zooming typically preserves the relative position of the zoom target. We implement this
		// by observing the difference between the old `origin_world` and the new `origin_world` after
		// the zoom factor has been updated.
		const origin_world_old = vec2.transformMat3(
			vec2.create(),
			origin_viewport,
			paz.computeViewportToWorldXform()
		);

		// Update zoom factor
		// TODO: A given `pinch_delta` should always reveal/hide a constant area, regardless of scale
		// factor.
		paz.zoom = Math.max(paz.zoom + pinch_delta, 0.01);

		// Ensure that the zoom target preserves the same relative position
		const origin_world_new = vec2.transformMat3(
			vec2.create(),
			origin_viewport,
			paz.computeViewportToWorldXform()
		);

		const world_delta = vec2.sub(vec2.create(), origin_world_old, origin_world_new);
		paz.center = vec2.add(vec2.create(), paz.center, world_delta);
	}, {
		// TODO: research this "weirdness"
		event: { passive: false }, // react useGesture listener weirdness
		target: pan_and_zoom_wrapper, // cont.
	});

	const resetZoom = () => {
		const paz = pan_and_zoom.current!;
		paz.center = vec2.create();
		paz.zoom = 1;
	};

	useSignal(board.deepGet(ZOOM_RESET_SIGNAL), () => {
		resetZoom();
        });


	//> Render the component
        return (
                <KBarProvider actions={[]}>
                    <CommandBar />

            <div
                className="h-full bg-matcha-paper board_inner"
                ref={pan_and_zoom_wrapper}
            >


                <PanAndZoom
                    ref={pan_and_zoom}
                    viewport_props={{
                        className: "bg-matcha-paper",
                        style: { width: "100%", height: "100%" },
                    onClick: handleClick,
                    }}
                >

                    <Moveable
                        ref={moveable_ref}
                        origin={false}
                        draggable={true}
                        target={selectedFrames}
                        //hideDefaultLines={true}
                        onClickGroup={e => {
                            selecto_ref.current!.clickTarget(e.inputEvent, e.inputTarget);
                        }}
                        onDrag={e => {
                            e.target.style.transform = e.transform;
                        }}
                        onDragGroup={e => {
                            e.events.forEach(ev => {
                                ev.target.style.transform = ev.transform;
                            });
                        }}
                        onDragEnd={e => {
                            if (!e.isDrag) return;

                            const eid = e.target?.dataset["entityId"];
                            if (eid === undefined) return;

                            // this is intentionally bad!
                            // until a better solution is found by @david.
                            let v = e.lastEvent.transform;
                            v = v.replace("translate(", "");
                            v = v.replace(")", "");
                            v = v.replace(/px/g, "").split(",");

                            const target_frame = Entity.entityFromId(parseInt(eid)).get(LayoutFrame.KEY); // update the locations in the IR
                            // when we are done dragging
                            target_frame.position.value = [parseFloat(v[0]), parseFloat(v[1])];
                        }}

                        onDragGroupEnd={e => {
                            const eid = e.target?.dataset["entityId"];
                            if (eid === undefined) return;

                            e.events.forEach(ev => { // same as above but for an entire group of frames
                                let v = ev.lastEvent.transform;
                                v = v.replace("translate(", "");
                                v = v.replace(")", "");
                                v = v.replace(/px/g, "").split(",");

                                const target_frame = Entity.entityFromId(parseInt(eid)).get(LayoutFrame.KEY);
                                target_frame.position.value = [parseFloat(v[0]), parseFloat(v[1])];
                            });
                        }}
                    />

                    {Array.from(frames.values()).map(
                        frame => <FrameView
                            key={frame.part_id} target={frame}
                        />
                    )}
                </PanAndZoom>

                <Selecto
                    ref={selecto_ref}
                    dragContainer={".bg-matcha-paper"}
                    selectableTargets={[".frame"]}
                    hitRate={0} // might be better at 100. play around with this TODO
                    selectByClick={false}
                    selectFromInside={true}
                    toggleContinueSelect={["shift"]}
                    ratio={0} // + L
                    {...(selectoProps !== undefined ? { scrollOptions: selectoProps } : {})}

                    dragCondition={e => {
                        // TODO we need to think about the right thing here -- this is just temp.
                        // could / should be a mode on the sidebar
                        return (e.inputEvent.altKey || is_selecting); // only drag if we have the alt key or the sidebar mode is active
                        // TODO make this sync to the sidebar onkeydown 
                    }}

                    onDragStart={e => {
                        const moveable = moveable_ref.current!;
                        const target = e.inputEvent.target;
                        // no idea what this is:
                        if (
                            moveable.isMoveableElement(target)
                                || selectedFrames.some(t => t === target || t.contains(target))
                        ) {
                            console.log("stopping select")
                            e.stop();
                        }
                    }}

                    onSelect={e => {
                        setSelectedFrames(e.selected);
                    }}

                    // or what this does. oh well!
                    onSelectEnd={e => {
                        const moveable = moveable_ref.current!;
                        if (e.isDragStart) {
                            e.inputEvent.preventDefault();

                            setTimeout(() => { // haha this is example code. *clean*
                                moveable.dragStart(e.inputEvent);
                            });
                        }
                    }}
                />
            </div>
                      </KBarProvider>
        )
}
