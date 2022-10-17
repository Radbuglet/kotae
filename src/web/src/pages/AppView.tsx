import * as React from 'react';
import '../../styles/App.css';
import "../../styles/Background.css"
import { ProSidebarProvider, useProSidebar } from 'react-pro-sidebar';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import{ DetailsMore } from 'css.gg/icons/tsx/DetailsMore';
import { PushChevronRight } from 'css.gg/icons/tsx/PushChevronRight';
import { PushChevronLeft } from 'css.gg/icons/tsx/PushChevronLeft';

import { BoardView } from './BoardView';
import { EntityViewProps } from '../util/hooks';

function WithinBackground({ target }: EntityViewProps) {
	const { collapseSidebar } = useProSidebar();
	return (<>
		<Sidebar>
			<Menu>
				<MenuItem onClick={() => collapseSidebar()}><PushChevronRight></PushChevronRight></MenuItem>
				<SubMenu icon={<DetailsMore></DetailsMore>}>
					<MenuItem> Pie charts </MenuItem>
					<MenuItem> Line charts </MenuItem>
				</SubMenu>
				<MenuItem> Calendar </MenuItem>
			</Menu>
		</Sidebar>
		<div className="board_outer">
			<BoardView target={target} />
		</div>
	</>);
}
export default function AppView({ target }: EntityViewProps) {
	return (
		<ProSidebarProvider>
			<div className="bg-matcha-normal the_background">
				<WithinBackground target={target}></WithinBackground>
			</div>
		</ProSidebarProvider>);
}
