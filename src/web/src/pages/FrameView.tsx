import { IrBlock, IrBoard, IrFrame, IrLine, LayoutFrame } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";
import "../../styles/Frame.css"
import Moveable from "react-moveable";


export function FrameView({ target }: EntityViewProps) {
    const target_ir = target.get(IrFrame.KEY);
    const lines = useListenable(target_ir.lines);
    const frameRef = React.useRef<HTMLDivElement>(null);
    const handleRef = React.useRef<HTMLDivElement>(null);

    const target_frame = target.get(LayoutFrame.KEY);
    const pos = useListenable(target_frame.position);


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


    let init: Boolean = true; 
    React.useEffect(() => {
	if (init) {
	    doAddLine() // for some reason this is getting called twice?
	    init = false;
	}
    }, [])

    return <>
	<div className="frame"
	    ref={frameRef}
	    style={{
		position: "absolute",
		transform: `translate(${pos[0]}px, ${pos[1]}px)`,
	    }}
	>
	<div className="bg-matcha-300"
	    ref={handleRef}
	>
	    the handle!
	</div>
	    <div
		//contentEditable={true}
	    >
	    FRAME
	    </div>
	    {/*<p>Lines: 
	       <button onClick={doAddLine}> Add Line </button> <button onClick={doDestroy}> Destroy </button> 
	       </p>*/}
	    {lines.map(
		line => <LineView key={line.part_id} target={line} />,
	    )}
	</div>



	<Moveable
	    target={frameRef}
	    keepRatio={false}
	    draggable={true}
	    container={null}
	    origin={false}
	    hideDefaultLines={true}
	    throttleDrag={0}
	    edge={true}
	    dragTarget={handleRef.current}
	    //stopPropagation={true}

	    onDrag={({
		target,
		beforeDelta, beforeDist,
		left, top,
		right, bottom,
		delta, dist,
		transform,
		clientX, clientY,
	    }: OnDrag) => {
		target!.style.transform = transform;
	    }}


	    onDragEnd={(e) => {
		if (e.isDrag) {
		    // this is intentionally bad!
		    // until a better solution is found by @david.
		    let v = e.lastEvent.transform
		    v = v.replace("translate(", "")
		    v = v.replace(")", "")
		    v = v.replace(/px/g, "").split(",")

		    // TODO migh be better to only have this set onDragEnd,
		    // but for now I set it every tick you move (thus rerendering).
		    target_frame.position.value = [parseFloat(v[0]), parseFloat(v[1])]
		}
	    }}

	/>






	
    </>
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

    let init: Boolean = true; 
    React.useEffect(() => {
	if (init) {
	    doAddBlock() // for some reason this is getting called twice?
	    init = false;
	}
    }, [])

    const doMerge = (rel: "prev" | "next") => {
        if (!target_ir.is_alive) return;

        const frame_ir = target_ir.deepGet(IrFrame.KEY);
        frame_ir.mergeLines(frame_ir.lines.indexOf(target), rel);
    };

    return <div className="">
        <p>
	    
        </p>
        {blocks.map(
            block => <BlockView key={block.part_id} target={block} />,
        )}
    </div>;
}

export function BlockView({ target }: EntityViewProps) {
    const blockRef = React.useRef<HTMLDivElement>(null);
    const doDestroy = wrapWeakReceiver(target, target => {
        target.destroy();
    });

    React.useEffect(() => {
	blockRef.current.focus()
    }, [])

    return <div className="border-2 border-red-500 min-w-5"
	contentEditable={true}
	ref={blockRef}
    >

    </div>;
}

