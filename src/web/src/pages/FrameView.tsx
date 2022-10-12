import { IrBlock, IrBoard, IrFrame, IrLine, LayoutFrame, TextBlock } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver, useInit } from "../util/hooks";
import "../../styles/Frame.css"
import Moveable from "react-moveable";

import { MdDragIndicator } from "react-icons/md";
import { RiDeleteBackLine } from "react-icons/ri";


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


    useInit(() => {
	doAddLine()
    })

    const handleBlur = wrapWeakReceiver(target_ir, (target_ir, e: React.FocusEvent<HTMLDivElement>) => {
	const isEmpty = (target_ir: IrFrame) => {

	    if (target_ir.lines.length > 1) return false;

	    const first_line = target_ir.lines.value[0];

	    if (first_line === undefined) {
		return true;
	    }

	    const first_block = first_line.get(IrLine.KEY).blocks.value[0];
	    
	    if (first_block === undefined) {
		return true;
	    }

	    const first_block_text = first_block.tryGet(TextBlock.KEY);
	    console.log(first_block_text)

    	    if (first_block_text !== undefined && first_block_text.text.value === "") {
		return true;
	    }
	    
	    return false;
	};


	if (isEmpty(target_ir)) {
	    doDestroy()
	}
	
    });

    return <>
	<div className="frame"
	    ref={frameRef}
	    style={{
		position: "absolute",
		transform: `translate(${pos[0]}px, ${pos[1]}px)`,
	    }}
	    onBlur={handleBlur}
	>

	    {/* CONTROLS */}
	    <div className="frame-controls"
	    >
		<div
		    onClick={doDestroy}
		    className="control"
		>
		    <RiDeleteBackLine />
		</div>
		<div ref={handleRef}
		    className="control"
		>
		    <MdDragIndicator />
		</div>

	    </div>

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
	const block_text = block.add(new TextBlock(block), [TextBlock.KEY]);
	//block_text.text.value = "Whee";
        block.setFinalizer(() => {
            block_ir.destroy();
	    block_text.destroy();
        });
        target_ir.blocks.push(block);
    });

    useInit(() => {
	doAddBlock()
    });

    const doMerge = (rel: "prev" | "next") => {
        if (!target_ir.is_alive) return;

        const frame_ir = target_ir.deepGet(IrFrame.KEY);
        frame_ir.mergeLines(frame_ir.lines.indexOf(target), rel);
    };

    return <div className="">
        <p>
	    
        </p>
        {blocks.map(
            block => <TextBlockView key={block.part_id} target={block} />,
        )}
    </div>;
}

export function TextBlockView({ target }: EntityViewProps) {
    const target_ir = target.get(TextBlock.KEY);
    const text = useListenable(target_ir.text);

    const blockRef = React.useRef<HTMLDivElement>(null);
    const doDestroy = wrapWeakReceiver(target, target => {
        target.destroy();
    });

    React.useEffect(() => {
	blockRef.current.focus()
    }, [])

    // TEMP TEXT BLOCK
    return <div
	className="outline-none"
	ref={blockRef}
	contentEditable={true}
	onBlur={(e) => {
	    target_ir.text.value = e.currentTarget.innerText
	}}

    >
	{text}
    </div>;
}

