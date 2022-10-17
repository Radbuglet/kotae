import * as React from 'react';
import '../../styles/App.css';
import "../../styles/Background.css"
import { ProSidebarProvider, useProSidebar } from 'react-pro-sidebar';
import { OurSidebar } from './Sidebar';

import { BoardView } from './BoardView';
import { EntityViewProps } from '../util/hooks';

export default function AppView({ target }: EntityViewProps) {
	return (
		<ProSidebarProvider>
			<div className="bg-matcha-normal the_background">
			<OurSidebar></OurSidebar>
			<div className="board_outer">
				<BoardView target={target} />
			</div>
			</div>
		</ProSidebarProvider>);
}
