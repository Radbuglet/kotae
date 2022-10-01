import React, {} from 'react';
import '../../styles/App.css';
import InfiniteViewer from "react-infinite-viewer";

//import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

//export default function Board(props: any) {
//    return (
//        <div className="h-screen border-2 border-blue-400">
//            <TransformWrapper 
//                className="border-purple-400 border-3"
//                limitToBounds={false}
//            >
//                <TransformComponent>
//                    <p className="w-screen h-screen border-2 border-green-400"> 
//                        yup
//                    </p>
//                </TransformComponent>
//            </TransformWrapper>
//        </div>
//    );
//}

export default function Board(props: any) {
    return (
	<div className="">
	    <InfiniteViewer
		className="h-screen bg-gray-500 viewer"
		//margin={0}
		//threshold={0}
		//rangeX={[0, 0]}
		//rangeY={[0, 0]}
		onScroll={e => {
		    console.log(e);
		}}
		//usePinch={true}
		useMouseDrag={true}
		useAutoZoom={true}
		wheelScale={0.001}
		displayVerticalScroll={false}
		displayHorizontalScroll={false}
	    >
		<div className="border-2 border-green-400 bg-slate-400 viewport">
		   woahhhhhhhh 
		    <div className="bg-red-600"> hiiiiiiiiiiiiiii </div>
		</div>
		    <div className="bg-red-600"> hrrrrrrrr </div>
	    </InfiniteViewer>
	    </div>
    );
}
