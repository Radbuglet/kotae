import * as React from "react";

import { DEFAULT_INSERTION_MODE, SELECT_ACTIVE, RESET_MY_ZOOM } from "../blocks/factory";
import { Sidebar, Menu, MenuItem, useProSidebar/*, SubMenu*/ } from 'react-pro-sidebar';
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";

import { FaAngleDoubleRight, FaAngleDoubleLeft, FaInfinity, FaTextHeight, FaGamepad, FaDownload } from 'react-icons/fa';
import { TbMathAvg } from 'react-icons/tb';
import { BiText, BiSelection } from 'react-icons/bi';
import { MdOutlineShareLocation } from 'react-icons/md';

// import { DetailsMore } from 'css.gg/icons/tsx/DetailsMore';


export function OurSidebar({ target }: EntityViewProps) {
    const { collapseSidebar } = useProSidebar(); // allows us to expand/minimize sidebar
    const [expanded, setExpanded] = React.useState(false); // is the sidebar expanded or minimized

    const block_insertion_mode = target.deepGet(DEFAULT_INSERTION_MODE);
    const select_toggle = target.deepGet(SELECT_ACTIVE);
    const reset_zoom = target.deepGet(RESET_MY_ZOOM);

    const doCycleInsertionMode = wrapWeakReceiver(block_insertion_mode, _ => {
        const value = (block_insertion_mode.value + 1) % 2;
        block_insertion_mode.value = value;

    });

    const doCycleSelectToggle = wrapWeakReceiver(select_toggle, _ => {
        const value = (select_toggle.value + 1) % 2;
        select_toggle.value = value;

    });

    const doTriggerResetZoom = wrapWeakReceiver(reset_zoom, _ => {
        reset_zoom.value += 1;

    });

    const curr_ins_mode = useListenable(block_insertion_mode);
    const curr_select_active = useListenable(select_toggle);

    return (<>
        {/** All of these attributes of sidebar are self-explanatory, except that trainsitionDuration is # of ms to animate collapse/expand. */}
        {/** We had the styling to override a white border the library creates. */}
        <Sidebar defaultCollapsed={true} backgroundColor="var(--matcha-bluish)" transitionDuration={250} collapsedWidth="60px" width="200px"
            className="sidebar" style={{ borderRight: "2px solid var(--matcha-bluish)", userSelect: "none" }}>
            <Menu
                className="flex flex-col content-center mt-4 -ml-1"
                renderMenuItemStyles={({ level, disabled, active }) => ({
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
                        borderLeft: active? "3px solid var(--matcha-light)": "3px solid transparent",
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
                <MenuItem icon={<FaAngleDoubleRight size={25} className={`${expanded? "rotate-180" : "rotate-0"} transition duration-200`}/>} onClick={() => { setExpanded(!expanded); collapseSidebar(); }}>
                    Collapse
                </MenuItem>
                {/*<MenuItem icon={<SoftwareDownload />}> Save </MenuItem>*/}
                <MenuItem icon={curr_ins_mode ? 
                    //<p className="text-xl" style={{fontFamily: "'Inconsolata', monospace"}}>∫</p>
                    <TbMathAvg size={20} />
                        
                    : 
                    <BiText size={25} />
                    } onClick={doCycleInsertionMode}>
                    {curr_ins_mode ? "Text mode" : "Math mode"}
                </MenuItem>
                <MenuItem icon={<BiSelection size={25} /> // TODO make this sync!
                    }
                    active={curr_select_active!!}
                    onClick={doCycleSelectToggle}
                > 
                    Select mode
                </MenuItem>
                <MenuItem icon={<MdOutlineShareLocation size={25} />
                    }
                    onClick={doTriggerResetZoom}
                > 
                    Reset zoom
                </MenuItem>
                {
                    /*
                    This is just to show how you would do a submenu.

                    <SubMenu icon={<DetailsMore></DetailsMore>} label="Visual">
                        <MenuItem> Graph </MenuItem>
                        <MenuItem> Table </MenuItem>
                    </SubMenu>
                    */
                }
                {/*<MenuItem icon={<BiSelection size={25} className="" 
                    style={{ position: "absolute",
                        bottom:"0"
                    }}/> }> 
                    Toggle Select
                </MenuItem>*/}
            </Menu>
        </Sidebar>
    </>);
}








/*
quu..__
 $$$b  `---.__
  "$$b        `--.                          ___.---uuudP
   `$$b           `.__.------.__     __.---'      $$$$"              .
     "$b          -'            `-.-'            $$$"              .'|
       ".                                       d$"             _.'  |
         `.   /                              ..."             .'     |
           `./                           ..::-'            _.'       |
            /                         .:::-'            .-'         .'
           :                          ::''\          _.'            |
          .' .-.             .-.           `.      .'               |
          : /'$$|           .@"$\           `.   .'              _.-'
         .'|$u$$|          |$$,$$|           |  <            _.-'
         | `:$$:'          :$$$$$:           `.  `.       .-'
         :                  `"--'             |    `-.     \
        :##.       ==             .###.       `.      `.    `\
        |##:                      :###:        |        >     >
        |#'     `..'`..'          `###'        x:      /     /
         \                                   xXX|     /    ./
          \                                xXXX'|    /   ./
          /`-.                                  `.  /   /
         :    `-  ...........,                   | /  .'
         |         ``:::::::'       .            |<    `.
         |             ```          |           x| \ `.:``.
         |                         .'    /'   xXX|  `:`M`M':.
         |    |                    ;    /:' xXXX'|  -'MMMMM:'
         `.  .'                   :    /:'       |-'MMMM.-'
          |  |                   .'   /'        .'MMM.-'
          `'`'                   :  ,'          |MMM<
            |                     `'            |tbap\
             \                                  :MM.-'
              \                 |              .''
               \.               `.            /
                /     .:::::::.. :           /
               |     .:::::::::::`.         /
               |   .:::------------\       /
              /   .''               >::'  /
              `',:                 :    .'
                                   `:.:' 
*/
