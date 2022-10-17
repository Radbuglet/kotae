import { IrBoard } from 'kotae-common';
import { Entity } from 'kotae-util';
import * as React from 'react';
import '../../styles/App.css';
import "../../styles/Board.css"
import "../../styles/Background.css"
import { DetailsMore } from "../../../../node_modules/css.gg/icons/tsx/DetailsMore.js";


import { BoardView } from './BoardView';
import { EntityViewProps } from '../util/hooks';

export default function AppView({ target }: EntityViewProps) {
	return <div className="bg-matcha-normal the_background">
		<div className="board_outer">
			<BoardView target={target} />
		</div>
	</div>;
}
