import { IrBoard, IrFrame, LayoutFrame } from "kotae-common";
import { Entity } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";
import { FrameView } from "./FrameView";
import { PanAndZoom } from "../util/pan";
import { vec2 } from "gl-matrix";
import Selecto from "react-selecto";
import Moveable from "react-moveable";
import "../../styles/App.css";

export function BoardView({ target }: EntityViewProps) {
	const target_ir = target.get(IrBoard.KEY);
	const frames = useListenable(target_ir.frames);
	const pan_and_zoom = React.useRef<PanAndZoom>(null);

	const [selectedFrames, setSelectedFrames] = React.useState([]);
	const [scrollOptions, setScrollOptions] = React.useState({});
	const moveableRef = React.useRef(null);
	const selectoRef = React.useRef(null);

	const handleClick = wrapWeakReceiver(target, (_, e: React.MouseEvent) => {
		// Get clicked position
		const paz = pan_and_zoom.current!;
		if (!paz.isHelperElement(e.target)) return;

		if (e.altKey) return; // if we are selecting, don't create a new frame

		const bb = paz.viewport.getBoundingClientRect();
		const pos: vec2 = [
			e.clientX - bb.left,
			e.clientY - bb.top,
		];

		vec2.transformMat3(pos, pos, paz.computeViewportToWorldXform());

		// Construct the frame
		const frame = new Entity(target_ir, "frame");
		const frame_ir = frame.add(new IrFrame(frame), [IrFrame.KEY]);
		const frame_layout = frame.add(new LayoutFrame(frame), [LayoutFrame.KEY]);
		frame_layout.position.value = pos;
		frame_layout.size.value = [500, 300];

		frame.setFinalizer(() => {
			frame_layout.destroy();
			frame_ir.destroy();
		});

		target_ir.frames.add(frame);
	})


	React.useEffect(() => {
	    setScrollOptions({
		container: pan_and_zoom.current,
		//getScrollPosition: () => {
		//    return [
		//        pan_and_zoom.current.getScrollLeft(),
		//        pan_and_zoom.current.getScrollTop(),
		//    ];
		//},
		throttleTime: 30,
		threshold: 0,
	    });
	}, []);


	return (
		<div className="bg-matcha-paper board_inner">
			<button className="border-2 border-red-500" onClick={() => {
				pan_and_zoom.current!.zoom += 1;
			}}>Zoom In</button> { }
			<button className="border-2 border-red-500" onClick={() => {
				const paz = pan_and_zoom.current!;
				paz.center = vec2.create();
				paz.zoom = 1;
			}}>Reset Zoom</button>

			<PanAndZoom
				ref={pan_and_zoom}
				viewport_props={{
					className: "bg-matcha-paper",
					style: { width: "100%", height: "93vh" },
					onClick: handleClick,
				}}
			>

			    <Moveable
				ref={moveableRef}
				origin={false}
				draggable={true}
				target={selectedFrames}
				//hideDefaultLines={true}
				onClickGroup={e => {
				    selectoRef.current.clickTarget(e.inputEvent, e.inputTarget);
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
				    
				    if (e.isDrag) {
					// this is intentionally bad!
					// until a better solution is found by @david.
					let v = e.lastEvent.transform;
					v = v.replace("translate(", "");
					v = v.replace(")", "");
					v = v.replace(/px/g, "").split(",");

					const target_frame = Entity.entityFromId(parseInt(e.target.dataset.entityId)).get(LayoutFrame.KEY)
					target_frame.position.value = [parseFloat(v[0]), parseFloat(v[1])]
				    }

				}}

				onDragGroupEnd={e => {
				    e.events.forEach(ev => {
					let v = ev.lastEvent.transform;
					v = v.replace("translate(", "");
					v = v.replace(")", "");
					v = v.replace(/px/g, "").split(",");

					const target_frame = Entity.entityFromId(parseInt(ev.target.dataset.entityId)).get(LayoutFrame.KEY)
					target_frame.position.value = [parseFloat(v[0]), parseFloat(v[1])]
				    });
				}}
			    ></Moveable>



				{Array.from(frames.values()).map(
					frame => <FrameView 
					    key={frame.part_id} target={frame} 
					/>
				)}
			</PanAndZoom>

		    <Selecto
			ref={selectoRef}
			scrollOptions={scrollOptions}
			dragContainer={".bg-matcha-paper"}
			selectableTargets={[".frame"]}
			hitRate={0} // might be better at 100. play around with this TODO
			selectByClick={false}
			selectFromInside={true}
			toggleContinueSelect={["shift"]}
			ratio={0}

			dragCondition={e => {
			    // TODO we need to think about the right thing here -- this is just temp.
			    // could / should be a mode on the sidebar
			    return e.inputEvent.altKey; // only drag if we have the alt key pressed
			}}

			onDragStart={e => {
			    const moveable = moveableRef.current;
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
			    const moveable = moveableRef.current;
			    if (e.isDragStart) {
				e.inputEvent.preventDefault();

				setTimeout(() => {
				    moveable.dragStart(e.inputEvent);
				});
			    }
			}}
		    ></Selecto>

		</div>
	)
}
