import * as React from "react";

import { DEFAULT_INSERTION_MODE, SELECT_ACTIVE, ZOOM_RESET_SIGNAL } from "../model/board"; // data we're accessing from IR
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks"; // IR utilities
import { Sidebar, Menu, MenuItem, useProSidebar } from 'react-pro-sidebar'; // sidebar library

// icons 
import { MdOutlineShareLocation } from 'react-icons/md';
import { BiText, BiSelection } from 'react-icons/bi';
import { FaAngleDoubleRight } from 'react-icons/fa';
import { TbMathAvg, TbMathSymbols } from 'react-icons/tb';
import {
    ActionId,
    KBarAnimator,
    KBarProvider,
    KBarPortal,
    KBarPositioner,
    KBarSearch,
    KBarResults,
    createAction,
    useMatches,
    useRegisterActions,
    ActionImpl,
    useKBar,
    Priority,
    useStore
} from "kbar";


export function OurSidebar({ target }: EntityViewProps) {
	const { collapseSidebar } = useProSidebar(); // allows us to expand/minimize sidebar
	const [expanded, setExpanded] = React.useState(true); // is the sidebar expanded or minimized

	const block_insertion_mode = target.deepGet(DEFAULT_INSERTION_MODE); // access the block insertion mode (math or regular text) from the IR
	const select_toggle = target.deepGet(SELECT_ACTIVE); // access whether or not we are toggling selecto from the IR
	const reset_zoom = target.deepGet(ZOOM_RESET_SIGNAL); // access zoom resetting from the IR

	// swap block insertion mode (math or regular text)
	const doCycleInsertionMode = wrapWeakReceiver(block_insertion_mode, _ => {
		const value = (block_insertion_mode.value + 1) % 2; // instead of being normal and using if statements, we use this to flip, from 0 -> 1 and 1 -> 0
		block_insertion_mode.value = value;
	});

	// toggle between creating math/text block and selecto
	const doCycleSelectToggle = wrapWeakReceiver(select_toggle, _ => {
		const value = (select_toggle.value + 1) % 2; // same logic as doCycleInsertionMode
		select_toggle.value = value;
	});

	// calling this will cause zoom to reset via IR
	const doTriggerResetZoom = wrapWeakReceiver(reset_zoom, _ => {
		reset_zoom.fire();
	});

	const curr_ins_mode = useListenable(block_insertion_mode); // how we read block insertion mode 
	const curr_select_active = useListenable(select_toggle); // how we read toggling selecto 

        const { query } = useKBar()

	return (<>
		{/** All of these attributes of sidebar are self-explanatory, except that transitionDuration is # of ms to animate collapse/expand. */}
		{/** We had the styling to override a white border the library creates. */}
		<Sidebar defaultCollapsed={!expanded} backgroundColor="var(--matcha-bluish)" transitionDuration={250} collapsedWidth="60px" width="200px"
			className="sidebar" style={{ borderRight: "2px solid var(--matcha-bluish)", userSelect: "none", marginTop: "10px", minWidth: "4rem" }}>
			<Menu
				className="flex flex-col content-center mt-4 -ml-1"
				renderMenuItemStyles={({ level, disabled, active }) => ({ /** how we override the sidebar's library styling */
					'.menu-icon': {
						//backgroundColor: 'none',
						//backgroundColor: active? "var(--matcha-400)" : 'none',
						color: 'var(--matcha-light)',
						//opacity: 0.62,
						transition: 'all 0.2s ease-in-out',
						fontSize: '12px',
						fontWeight: 900,
						fontStyle: 'black',
						borderRadius: '2px',
						marginLeft: "-0.5px",
						borderLeft: active ? "3px solid var(--matcha-light)" : "3px solid transparent",
						':hover': {
							borderLeft: "3px solid var(--matcha-light)",
							paddingLeft: "5px",
						} // FIXME this should trigger on menue-anchor hover
					},
					'.menu-anchor': {
						color: 'var(--matcha-light)',
						backgroundColor: "initial",
						opacity: 0.62,
						fontFamily: "'Inconsolata', monospace",
						fontSize: '16px',
						fontWeight: 700,
					},
				})}
			>

				{/** We use css to spin the arrow to the right direction (towards right to expand, left to collapse). */}
				<MenuItem icon={<FaAngleDoubleRight size={25} className={`${expanded ? "rotate-180" : "rotate-0"} transition duration-200`} />} onClick={() => { setExpanded(!expanded); collapseSidebar(); }}>
					Collapse
				</MenuItem>

				{
					/** We don't have saving capability just yet ;( */
					/** When actually implementing consider <FaDownload /> */
					/*<MenuItem icon={<SoftwareDownload />}> Save </MenuItem>*/
				}

				{/** We toggle the icon depending on the insertion mode. */}
				<MenuItem icon={curr_ins_mode ?
					<TbMathAvg size={20} />
					:
					<BiText size={25} />
				} onClick={doCycleInsertionMode}>
					{curr_ins_mode ? "Math mode" : "Text mode"}
				</MenuItem>

				{/** Active property will show an indicator for when selecto is on. */}
				<MenuItem icon={<BiSelection size={25} />
				}
					active={curr_select_active == 1}
					onClick={doCycleSelectToggle}
				>
					Select mode
				</MenuItem>

				<MenuItem icon={<MdOutlineShareLocation size={25} />} onClick={doTriggerResetZoom}>
					Reset zoom
				</MenuItem>

                                {/*<MenuItem icon={<TbMathSymbols size={25} />} onClick={() => { 
                                    query.toggle()
                                }}>
                                    Command bar
				</MenuItem>*/}

                                 {/*
                                     for when we add non-frame specific actions.
                                */}

				{
					/*
					This is just to show how you would do a submenu.

					<SubMenu icon={<DetailsMore></DetailsMore>} label="Visual">
						<MenuItem> Graph </MenuItem>
						<MenuItem> Table </MenuItem>
					</SubMenu>
					*/
				}
			</Menu>
		</Sidebar>
	</>);
}
