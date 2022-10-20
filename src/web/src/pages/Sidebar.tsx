// TODO: add more buttons with more functionality 
// TODO: figure out how to color icons
// TODO: figure out how to get rid of the annoying 1 px border

import * as React from "react";

import { Sidebar, Menu, MenuItem, useProSidebar/*, SubMenu*/ } from 'react-pro-sidebar';
import { SoftwareDownload } from 'css.gg/icons/tsx/SoftwareDownload';
import { PushChevronRight } from 'css.gg/icons/tsx/PushChevronRight';
import { PushChevronLeft } from 'css.gg/icons/tsx/PushChevronLeft';
import { Controller } from 'css.gg/icons/tsx/Controller';
import { FormatText } from 'css.gg/icons/tsx/FormatText';
import { Infinity } from 'css.gg/icons/tsx/Infinity';
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";
import { DEFAULT_INSERTION_MODE } from "../blocks/factory";

// import { DetailsMore } from 'css.gg/icons/tsx/DetailsMore';


export function OurSidebar({ target }: EntityViewProps) {
    const { collapseSidebar } = useProSidebar(); // allows us to expand/minimize sidebar
    const [expanded, setExpanded] = React.useState(false); // is the sidebar expanded or minimized

    const block_insertion_mode = target.deepGet(DEFAULT_INSERTION_MODE);

    const doCycleInsertionMode = wrapWeakReceiver(block_insertion_mode, _ => {
        const value = (block_insertion_mode.value + 1) % 2;
        block_insertion_mode.value = value;

    });

    const curr_ins_mode = useListenable(block_insertion_mode);

    return (<>
        {/** All of these attributes of sidebar are self-explanatory, except that trainsitionDuration is # of ms to animate collapse/expand. */}
        {/** We had the styling to override a white border the library creates. */}
        <Sidebar defaultCollapsed={true} backgroundColor="var(--matcha-normal)" transitionDuration={250} collapsedWidth="60px" width="230px"
            className="sidebar" style={{ borderRight: "2px solid var(--matcha-normal)" }}>
            <Menu>
                <MenuItem icon={expanded ? <PushChevronLeft /> : <PushChevronRight />} onClick={() => { setExpanded(!expanded); collapseSidebar(); }}>
                    Collapse
                </MenuItem>
                <MenuItem icon={<SoftwareDownload />}> Save </MenuItem>
                <MenuItem icon={curr_ins_mode ? <Infinity /> : <FormatText />} onClick={doCycleInsertionMode}>
                    Default Block Mode
                </MenuItem>
                <MenuItem icon={<Controller />}>
                    Toggle Select
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
            </Menu>
        </Sidebar>
    </>);
}








































































/*
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄⣬⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠗⣸⠷⣙⣭⣭⣭⣭⣍⣛⣯⠍⣰⣿⣿⣿
⣿⠉⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣩⣭⠭⡭⢉⣙⠛⠿⢿⣿⣟⢱⣾⣥⣾⣿⣿⣿⣿⣿⣛⣛⠡⣾⣿⣿⣿⣿
⣿⠆⠊⠉⠀⠶⣯⡹⣿⣿⣿⣿⣿⣿⣿⣿⠛⠿⣿⣿⠿⣃⣴⡾⣢⣶⣿⣿⣇⠙⠷⢶⣭⣀⠀⠀⢉⣛⠛⠿⣿⣿⣿⣿⣿⣮⠻⣿⣿⣿
⢇⣾⠀⢀⣠⣴⣆⢳⡜⢿⣿⣿⣿⣿⣿⣿⣧⡻⣶⡶⢾⡿⢫⣾⣿⣿⣿⢟⡍⠈⣿⣦⣄⠙⠳⣄⠘⣿⣿⣿⣶⣝⢿⣿⣿⣿⣷⡹⣿⣿
⡘⣏⢰⣿⣿⣿⣿⣧⠻⣌⢿⣿⣿⣿⣿⣿⣿⣿⡌⣵⣿⣷⣿⣿⣿⡿⡣⢋⣤⡄⢹⣿⣿⣷⡤⠙⠷⠈⢿⣿⣿⣿⣧⣻⣿⠿⣿⣧⢻⣿
⣿⡜⢧⠻⣿⣿⣿⣿⣧⠹⣦⢻⣿⣿⣿⣿⣿⡿⢸⠿⣫⣿⣿⡿⠋⣠⣴⣿⣿⡇⢸⣿⣿⢻⠇⡄⣰⣶⠈⢿⣿⣿⣿⣿⣿⢸⣦⣝⠸⢿
⣿⣿⣌⢷⡙⠟⢉⣤⣴⣦⡸⣧⠹⣿⣿⣍⣉⠡⠶⠿⣛⣋⠁⣰⣿⣿⣿⣛⣛⡇⠸⣿⣿⡜⠆⠁⠙⠉⢸⡌⢿⣿⣿⣿⣿⢸⡿⢫⡄⠿
⣿⣿⣿⣦⠻⣄⠋⠿⠟⠉⢡⣶⣦⣾⣿⣿⣿⢣⢸⣿⣿⠇⠚⢿⣿⣿⡻⠿⣿⣷⡐⢺⣿⣿⡄⠀⠀⠀⣼⡇⡌⣿⣿⣿⣿⢀⣴⣿⠀⠀
⣿⣿⣿⣿⣷⡙⢸⠰⠶⠲⠶⠦⠹⣿⣿⠿⢃⣛⡁⣿⣿⢰⡄⠀⣿⣿⣶⠀⣬⡙⠇⢰⣍⡛⠷⣠⡄⢠⡿⢱⡟⠸⣿⣿⡟⣼⠋⠁⠀⣴
⣿⣿⣿⣿⣿⣿⣤⣾⣿⣷⡀⠀⠀⡙⣿⣿⡟⢻⣿⡜⣿⢸⢣⣤⣿⣿⣿⣤⣼⣷⣿⣌⠋⠉⠀⡅⠇⠸⠣⠟⣴⠃⣿⡿⢱⣿⣿⢠⣼⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⢀⡌⠟⢀⣾⣿⣿⣮⡀⠸⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⠸⠼⣣⣴⣴⣶⣿⠏⡀⠟⣡⣻⣿⡇⠈⠉⠉
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠟⠁⢀⣾⡿⠿⠟⣿⣿⣦⠹⣿⣿⣿⣿⣿⡿⠁⠀⠠⣶⣾⣿⣿⣿⣿⡏⣼⠇⣼⡿⠙⠟⠀⢠⣶⣶
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⠀⠀⣤⣶⣿⣿⣟⣤⣹⠟⡛⠋⠁⠀⠀⠀⠀⠹⣿⣿⣿⡿⣫⣾⡿⡘⠋⠀⠈⠉⠛⠓⠾⢽
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡁⠀⠀⠀⠀⢸⣿⣿⣿⣿⢹⣿⡄⠁⠀⠀⠀⠀⠀⠀⠀⠙⠟⢩⣶⣿⣿⣿⡇⠀⠀⢀⣀⣀⣀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠹⣿⣿⠟⢋⠈⠉⠂⠀⠀⠀⠀⠀⢀⣠⣴⣾⣿⣶⡮⠍⠛⠋⠑⢿⣦⣝⡻⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠘⠿⢸⣿⣭⣤⡀⠀⠀⠀⣠⠶⣿⣿⣿⣿⣿⠟⣁⢾⣿⡆⠀⠀⠉⢿⣿⣮⣝⠿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⢨⣿⣿⣿⡇⣠⣶⣿⣿⣶⣮⣛⣟⡛⠁⠀⢻⡇⢻⡇⣾⣷⣦⣌⡻⢿⣿⣿⣮
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⢠⡄⢀⠀⠀⢻⡿⢫⣾⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⣴⣦⠳⣜⡇⣿⣿⣿⣿⣿⣷⣬⡛⢿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⢸⠇⣿⣷⡀⠀⠰⣿⣿⣿⣿⣿⣿⣿⣿⣿⠇⠀⠀⠿⣣⢰⣮⡃⣿⣿⣿⣿⣿⣿⣿⣿⣶
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠈⠀⣿⣿⣷⡀⠀⠙⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⢰⡟⣼⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢀⣼⠀⠙⣿⣿⣿⡄⠀⠈⠿⠛⢿⣿⣿⣿⣿⡦⠀⢀⡄⣴⡌⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢃⣾⡟⣠⠀⣿⣿⣿⣷⠂⠀⠀⠀⠀⠹⣿⣿⠏⠀⢀⣾⣇⠛⣀⢿⣇⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢸⠋⣴⣿⠀⢹⣿⣿⢾⣆⠀⠀⠀⠀⠀⠘⠃⠀⢀⣾⣿⣿⠈⠃⣼⣿⢸⣿⣿⣿⣿⣿⣿⣿⣿
⣀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣾⣿⠟⢠⣆⢻⣿⣾⣿⣷⡀⠀⠀⠀⠀⠀⠠⣭⣍⠩⣭⣴⣤⡉⠭⢸⣿⣿⣿⣿⣿⣿⣿⣿

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
