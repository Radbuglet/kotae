import * as React from "react";
import { ProSidebarProvider, useProSidebar } from 'react-pro-sidebar';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import{ DetailsMore } from 'css.gg/icons/tsx/DetailsMore';
import { PushChevronRight } from 'css.gg/icons/tsx/PushChevronRight';
import { PushChevronLeft } from 'css.gg/icons/tsx/PushChevronLeft';

export function OurSidebar() {
    const { collapseSidebar } = useProSidebar();
	const [expanded, setExpanded] = React.useState(false);
    
    return (<>
        <Sidebar defaultCollapsed={true}>
            <Menu>
                <MenuItem onClick={() => {setExpanded(!expanded); collapseSidebar();}}>
                    {expanded ? <PushChevronLeft /> : <PushChevronRight />}
                </MenuItem>
                <SubMenu icon={<DetailsMore></DetailsMore>}>
                    <MenuItem> Pie charts </MenuItem>
                    <MenuItem> Line charts </MenuItem>
                </SubMenu>
                <MenuItem> Calendar </MenuItem>
            </Menu>
        </Sidebar>
    </>);
}
