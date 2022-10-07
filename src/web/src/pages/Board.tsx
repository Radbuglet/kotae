import * as React from 'react';
import '../../styles/App.css';
import InfiniteViewer from "react-infinite-viewer";
import DraggableTest from "../components/DraggableTest";
import "../../styles/Frame.css";

export default function Board(props: any) {

    const vref = React.useRef<InfiniteViewer>(null);

    const [frames, addFrame] = React.useState(
	[ ]
    );
    const handleClick = (e: any) => {
	const [absx, absy] = getPlacePosition(e.inputEvent.clientX, e.inputEvent.clientY);
	if (e.inputEvent.detail == 2) testAddFrame(absx, absy)
    }

    const getPlacePosition = (relx: number, rely: number) => {

	const zoom = parseFloat(vref.current.getViewport().style.transform.split("(").at(-1).slice(0, -1))
	const trueWidth = window.innerWidth / zoom

	const percentX = relx / window.innerWidth
	const convertedX = percentX * trueWidth

	const percentY = rely / window.innerWidth
	const convertedY = percentY * trueWidth

	const x = vref.current.getScrollLeft(false);
	const y = vref.current.getScrollTop(false);

	const absx = x+convertedX;
	const absy = y+convertedY;
	return [absx, absy]
    }

    const testAddFrame = (x: number, y: number) => {
	const tempFrame = <DraggableTest
		x={x}
		y={y}
		content={
		    <div className="frame" style={{
			transform: `translate(${x}px, ${y}px)`,
			position: "absolute"
			}}> {Math.random()}
			{/*<p
			    className="bg-blue-700"
			    onClick={ e => {
				//e.target.focus()
				e.stopPropagation()
				// e.preventDefault()
				console.log(e, "yee")
				//e.stopPropagation()

			    }}
			    //contentEditable={true}

			></p> */}
			<input
			    onClick={ e => {
				console.log("Whee")
				e.stopPropagation()
			    }}
			/>
			</div>
		}
	    />
	addFrame([...frames, tempFrame])
    }

    return (
	<div className=""
	>
	    <InfiniteViewer
		className="h-screen bg-gray-500 viewer"
		//onClick={handleClick}
		//usePinch={true}
		useMouseDrag={true}
		useAutoZoom={true}
		ref={vref}
		//wheelScale={0.001}
		//displayVerticalScroll={false}
		//displayHorizontalScroll={false}

		onDragStart={e => {
		    console.log("Woo", e);
		    handleClick(e)
		    if (e.inputEvent.path[0]?.tagName == "INPUT") {
			throw "";
		    }
		}}
	    >
		<div>
		    {frames.map((frame, index) => (
			{...frame}
		    ))}

		    <div className="w-20 h-20 bg-red-500"> 
			yeahhh 
			<input />
		    </div>
		</div>
	    </InfiniteViewer>
	    </div>
    );
}
