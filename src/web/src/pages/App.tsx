import { IrBoard } from 'kotae-common';
import { Entity } from 'kotae-util';
import * as React from 'react';
import '../../styles/App.css';
import "../../styles/Board.css"
import "../../styles/Background.css"

import { BoardView } from './BoardView';

export default function App() {
	const [board, _] = React.useState(() => {
		const board = new Entity(null, "board");
		const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
		board.setFinalizer(() => {
			board_ir.destroy();
		});

		return board;
	});

	return <>
        <div className="bg-matcha-normal the_background">
            <div className="board">
                <BoardView target={board} />
            </div>
        </div>
    </>;
}
