import { IrBoard } from 'kotae-common';
import { Entity } from 'kotae-util';
import * as React from 'react';
import '../../styles/App.css';
import Board from './Board';
import { AppRoot } from './demo';

export default function App() {
	const [board, _] = React.useState(() => {
		const board = new Entity(null, "board");
		const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
		board.setFinalizer(() => {
			board_ir.destroy();
		});

		return board;
	});

	return (
		<div className="App">
			<AppRoot target={board} />
			<Board />
		</div>
	);
}
