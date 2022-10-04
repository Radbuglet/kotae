import * as React from 'react';
import Moveable from "react-moveable";

export default function DraggableTest(props: any) {


    const targetRef = React.useRef<HTMLDivElement>(null);
    const movRef = React.useRef<Moveable>(null);

    //const moveableRef = React.useRef<Moveable>(null);
    //
    React.useEffect(() => {
	setTimeout(() => {
	    moveToCoords(props.x, props.y)
	}, 10)
    }, [])

    const moveToCoords = (x: number, y: number) => {
	console.log("moving", x, y)
	movRef.current.moveable.request("draggable", { x: x, x: x }, true);
    }

    return (
	<>
	    <div ref={targetRef} className="" style={{width: "min-content"}}>
		{props.content}
	    </div>
	<Moveable
	    target={targetRef}
	    container={null}
	    origin={false}
	    ref={movRef}
	    onClick={(e) => {
		console.log(movRef.current, e)
		//console.log(movRef.current.moveable.request)

		movRef.current.moveable.request("draggable", { x: 420, y: 69 }, true);
		//movRef.current.moveable.request("draggable", { deltaX: 10, deltaY: 10 });
	    }}

	    /* Resize event edges */
	    edge={true}
	    stopPropagation={true}

	    hideDefaultLines={true}
	    
	    defaultX={1000}
	    //dragTarget={targetRef}
	    //ref={moveableRef}

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
