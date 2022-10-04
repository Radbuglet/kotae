import * as React from 'react';
import Moveable from "react-moveable";

export default function DraggableTest(props: any) {


    const targetRef = React.useRef<HTMLDivElement>(null);

    return (
	<>
	    <div ref={targetRef} className="" style={{width: "min-content"}}>
		{props.content}
	    </div>
	<Moveable
	    target={targetRef}
	    container={null}
	    origin={false}

	    /* Resize event edges */
	    edge={true}
	    stopPropagation={true}

	    hideDefaultLines={true}

	    /* draggable */
	    draggable={true}
	    throttleDrag={0}
	    onDragStart={({ target, clientX, clientY }) => {
		console.log("onDragStart", target);
	    }}
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
	    onDragEnd={({ target, isDrag, clientX, clientY }) => {
		console.log("onDragEnd", target, isDrag);
	    }}

	/>
	</>
    );
}
