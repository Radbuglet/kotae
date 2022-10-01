import React, {} from 'react';
import '../../styles/App.css';
import InfiniteViewer from "react-infinite-viewer";
import DraggableTest from "../components/DraggableTest";

export default function Board(props: any) {
    return (
	<div className="">
	    <InfiniteViewer
		className="h-screen bg-gray-500 viewer"
		onScroll={e => {
		    //console.log(e);
		}}
		//usePinch={true}
		useMouseDrag={true}
		useAutoZoom={true}
		wheelScale={0.001}
		displayVerticalScroll={false}
		displayHorizontalScroll={false}
	    >
		<div>
		    <DraggableTest />
		    <div className="w-20 h-20 bg-red-500">  yeahhh </div>
		</div>
	    </InfiniteViewer>
	    </div>
    );
}
