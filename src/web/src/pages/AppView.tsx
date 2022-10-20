import * as React from 'react';

import '../../styles/App.css';
import "../../styles/Background.css"
import { OurSidebar } from './Sidebar';
import { BoardView } from './BoardView';
import { EntityViewProps } from '../util/hooks';
import { ProSidebarProvider } from 'react-pro-sidebar';


export default function AppView({ target }: EntityViewProps) {
	return (
		<ProSidebarProvider>
			<div className="bg-matcha-normal the_background">
				{/** We wrap the sidebar in a div to get rid of a white border that the library creates. */}
				<div
					style={{
						borderRight: "2px solid var(--matcha-normal)",
					}}
				>
					{/** Called "OurSidebar" because the lib we use for the sidebar calls their class "Sidebar". */}
					<OurSidebar></OurSidebar>
				</div>
				{/** We have two css classes, board_outer and board_inner because the css with the infinite canvas behaves funky. */}
				<div className="board_outer">
					{/** Where all the magic occurs ;) */}
					<BoardView target={target} />
				</div>
			</div>
		</ProSidebarProvider>);
}
