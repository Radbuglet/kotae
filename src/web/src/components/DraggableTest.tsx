import React, {} from 'react';
import Moveable from "react-moveable";

export default function DraggableTest(props: any) {
    const [target, setTarget] = React.useState();
    const [frame, setFrame] = React.useState({
	translate: [0,0],
	rotate: 0,
	transformOrigin: "50% 50%",
    });
    React.useEffect(() => {
	setTarget(document.querySelector(".target")!);
    }, []);
    return <div className="container">
	<div className="target">Target</div>
	<Moveable
	    target={target}
	    originDraggable={true}
	    originRelative={true}
	    draggable={true}
	    throttleDrag={0}
	    startDragRotate={0}
	    throttleDragRotate={0}
	    zoom={1}
	    origin={true}
	    padding={{"left":0,"top":0,"right":0,"bottom":0}}
	    rotatable={true}
	    throttleRotate={0}
	    rotationPosition={"top"}
	    onDragOriginStart={e => {
		e.dragStart && e.dragStart.set(frame.translate);
	    }}
	    onDragOrigin={e => {
		frame.translate = e.drag.beforeTranslate;
		frame.transformOrigin = e.transformOrigin;
	    }}
	    onDragStart={e => {
		e.set(frame.translate);
	    }}
	    onDrag={e => {
		frame.translate = e.beforeTranslate;
	    }}
	    onRotateStart={e => {
		e.set(frame.rotate);
	    }}
	    onRotate={e => {
		frame.rotate = e.beforeRotate;
	    }}
	    onRender={e => {
		const { translate, rotate, transformOrigin } = frame;
		e.target.style.transformOrigin = transformOrigin;
		e.target.style.transform = `translate(${translate[0]}px, ${translate[1]}px)`
		+  ` rotate(${rotate}deg)`;
	    }}
	/>
    </div>;
}
