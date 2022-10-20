// TODO: add more buttons with more functionality 
// TODO: figure out how to color icons
// TODO: figure out how to get rid of the annoying 1 px border

import * as React from "react";

import { Sidebar, Menu, MenuItem, useProSidebar/*, SubMenu*/ } from 'react-pro-sidebar';
import { SoftwareDownload } from 'css.gg/icons/tsx/SoftwareDownload';
import { PushChevronRight } from 'css.gg/icons/tsx/PushChevronRight';
import { PushChevronLeft } from 'css.gg/icons/tsx/PushChevronLeft';
import { FormatText } from 'css.gg/icons/tsx/FormatText';
import { Infinity } from 'css.gg/icons/tsx/Infinity';

// import { DetailsMore } from 'css.gg/icons/tsx/DetailsMore';


export function OurSidebar() {
    const { collapseSidebar } = useProSidebar(); // allows us to expand/minimize sidebar
    const [expanded, setExpanded] = React.useState(false); // is the sidebar expanded or minimized
    const [isModeMath, setMode] = React.useState(false); // is the default mode for blocks 

    return (<>
        {/** All of these attributes of sidebar are self-explanatory, except that trainsitionDuration is # of ms to animate collapse/expand. */}
        <Sidebar defaultCollapsed={true} backgroundColor="rgb(139 168 136)" transitionDuration={250} collapsedWidth="80px" width="228px">
            <Menu>
                <MenuItem icon={expanded ? <PushChevronLeft /> : <PushChevronRight />} onClick={() => { setExpanded(!expanded); collapseSidebar(); }}>
                    Collapse
                </MenuItem>
                <MenuItem icon={<SoftwareDownload />}> Save </MenuItem>
                <MenuItem icon={isModeMath ? <Infinity /> : <FormatText />} onClick={() => { setMode(!isModeMath) }}>
                    Default Block Mode
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
