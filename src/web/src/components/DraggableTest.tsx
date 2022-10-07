import * as React from 'react';
import Moveable from "react-moveable";

export default function DraggableTest(props: any) {


    const targetRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const dragHandleRef = React.useRef<HTMLDivElement>(null);

    return (
	<>
	    {/*<div className="border-2 border-red-500" ref={dragHandleRef}> draggy draggy </div>*/}

	    <div ref={targetRef} className="border-2 border-blue-500" style={{width: "min-content"}}>
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

	    //dragTarget={<div> hii </div>}
	    //checkInput={true}
	    //dragArea={true}

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
		//console.log("onDrag");
	    }}
	    onDragEnd={(e) => {
		console.log(e.inputEvent.detail);
		console.log(e, "onDragEnd");
		//if (e.inputEvent.detail === 2 && e.isDrag === false) {
		if (e.isDrag === false) {
		    //console.log("not a drag")
		    //e.inputEvent.path[0].focus();
		    //e.inputEvent.path[0].click()
		    //inputRef.current.focus()
		}
	    }}

	/>
	</>
    );
}
