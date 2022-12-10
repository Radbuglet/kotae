import * as React from 'react';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { EntityViewProps } from '../util/hooks';
import { OurSidebar } from './Sidebar';
import { BoardView } from './BoardView';
import '../../styles/App.css';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  NO_GROUP
} from "kbar";

import CommandBar from "./CommandBar";

export default function AppView({ target }: EntityViewProps) {
	return (
                <KBarProvider actions={[]}>
                    <CommandBar target={target}/>
		<ProSidebarProvider>
			<div className="bg-matcha-bluish the_background">
				{/** We wrap the sidebar in a div to get rid of a white border that the library creates. */}
				<div
					style={{
						borderRight: "2px solid var(--matcha-bluish)",
					}}
				>
					{/** Called "OurSidebar" because the lib we use for the sidebar calls their class "Sidebar". */}
					<OurSidebar target={target}></OurSidebar>
				</div>
				{/** We have two css classes, board_outer and board_inner because the css with the infinite canvas behaves funky. */}
				<div className="board_outer">
					{/** Where all the magic occurs ;) */}
					<BoardView target={target} />
				</div>
			</div>
		</ProSidebarProvider>
                      </KBarProvider>
                    );
}
