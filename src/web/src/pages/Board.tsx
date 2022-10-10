import * as React from 'react';
import '../../styles/App.css';
import Frame from "../components/Frame";
import "../../styles/Frame.css";

export default function Board(props: any) {
	return <div>
		<Frame />
		<div className="w-20 h-20 bg-red-500">
			yeahhh
		</div>
	</div>;
}
