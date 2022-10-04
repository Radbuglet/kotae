import * as React from 'react';
import '../../styles/App.css';
import InfiniteViewer from "react-infinite-viewer";
import DraggableTest from "../components/DraggableTest";
import "../../styles/Frame.css";

export default function Board(props: any) {

    const vref = React.useRef<InfiniteViewer>(null);

    const [frames, addFrame] = React.useState(
	[
	    //<div>ss </div>,
	    <DraggableTest
		x={0}
		y={0}
		content={
		    <div className="frame"> t2asjdflkasd </div>
		}
	    />,
	    <DraggableTest
		x={0}
		y={0}
		content={
		    <div className="frame"> laksdfffffffffffffffffffff; </div>
		}
	    />
	]
    );

    //const handleClick = (e: any) => {
    //    if (e.detail === 2) {
    //        //console.log("Double click", e.clientX, e.clientY);
    //        console.log(e, e.target.offsetLeft, e.target.offsetLeft-e.clientX)
    //        //const mouseX = e.pageX - div.offsetLeft;
    //        //const mouseY = e.pageY - div.offsetTop;
    //        testAddFrame();
    //        console.log(vref.current.getScrollLeft(false))
    //        console.log(vref.current.getRangeY(false, false))
    //    }
    //}

    const handleClick = (e: any) => {
	//e.clientX
	//e.clientY

	const [absx, absy] = getPlacePosition(e.inputEvent.layerX, e.inputEvent.layerY)

	testAddFrame(absx, absy)
	//console.log(e, "here")
    }

    const getPlacePosition = (relx: number, rely: number) => {
	const x = vref.current.getScrollLeft(false);
	const y = vref.current.getScrollTop(false);

	//console.log(relx+x, rely+y, "hi")
	//const absx = relx+x;
	//const absy = rely+y;
	const absx = relx;
	const absy = rely;
	return [absx, absy]
	//console.log(x +
    }

    const testAddFrame = (x: number, y: number) => {
	const tempFrame = <DraggableTest
		x={x}
		y={y}
		content={
		    <div className="frame"> {Math.random()} </div>
		}
	    />
	addFrame([...frames, tempFrame])
    }

    return (
	<div className=""
	    //onClick={handleClick}
	>
	    <InfiniteViewer
		className="h-screen bg-gray-500 viewer"
		onScroll={e => {
		    //console.log(vref.current.infiniteViewer.scrollLeft, vref.current.infiniteViewer.scrollTop)
		    console.log(vref.current.getScrollLeft(false), vref.current.getScrollTop(false))
		    //console.log(vref.current.getRangeY(false, false))
		}}

		onClick={handleClick}
		//usePinch={true}
		useMouseDrag={true}
		useAutoZoom={true}
		ref={vref}
		//wheelScale={0.001}
		//displayVerticalScroll={false}
		//displayHorizontalScroll={false}

		onDragStart={e => {
		    //console.log(e, e.inputEvent.layerX, e.inputEvent.layerY)
		    handleClick(e)
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
