import * as React from 'react';
import '../../styles/App.css';
import InfiniteViewer from "react-infinite-viewer";
import DraggableTest from "../components/DraggableTest";
import "../../styles/Frame.css";

export default function Board(props: any) {

    const [frames, addFrame] = React.useState(
	[
	    <DraggableTest
		content={
		    <div className="frame"> t2asjdflkasd </div>
		}
	    />,
	    <DraggableTest
		content={
		    <div className="frame"> laksdfffffffffffffffffffff; </div>
		}
	    />
	]
    );

    const handleClick = (e: any) => {
	if (e.detail === 2) {
	    //console.log("Double click", e.clientX, e.clientY);
	    console.log(e, e.target.offsetLeft, e.target.offsetLeft-e.clientX)
	    //const mouseX = e.pageX - div.offsetLeft;
	    //const mouseY = e.pageY - div.offsetTop;
	    testAddFrame();
	}
    }

    const testAddFrame = () => {
	const tempFrame = <DraggableTest
		content={
		    <div className="frame"> {Math.random()} </div>
		}
	    />
	addFrame([...frames, tempFrame])
    }

    return (
	<div className=""
	    onClick={handleClick}
	>
	    <InfiniteViewer
		className="h-screen bg-gray-500 viewer"
		onScroll={e => {
		    //console.log(e);
		}}
		//usePinch={true}
		useMouseDrag={true}
		useAutoZoom={true}
		//wheelScale={0.001}
		//displayVerticalScroll={false}
		//displayHorizontalScroll={false}

		onDragStart={e => {
		    console.log(e, e.inputEvent.layerX, e.inputEvent.layerY)
		}}
	    >
		<div>
		    {frames.map((frame, index) => (
			{...frame}
		    ))}

		    <div className="w-20 h-20 bg-red-500">  yeahhh </div>
		</div>
	    </InfiniteViewer>
	    </div>
    );
}
