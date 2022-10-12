import { IrBoard } from 'kotae-common';
import { Entity } from 'kotae-util';
import * as React from 'react';
import '../../styles/App.css';
import "../../styles/Board.css"
import "../../styles/Background.css"

import { BoardView } from './BoardView';
import { EntityViewProps } from '../util/hooks';

export default function AppView({ target }: EntityViewProps) {
	return <div className="bg-matcha-normal the_background">
		<div className="board">
			<BoardView target={target} />
		</div>
	</div>;
}
