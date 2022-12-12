import { BlockRegistry, IrBlock, IrFrame, IrLine, LayoutFrame, TextBlock, MathBlock, ScryBlock, SlateBlock } from "kotae-common";
import { Entity } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver, useInit } from "../util/hooks";
import "../../styles/Frame.css"
import Moveable from "react-moveable";
import type { OnDrag } from "react-moveable";

import { MdDragIndicator } from "react-icons/md";
import { RiDeleteBackLine } from "react-icons/ri";
import { TbMathSymbols } from "react-icons/tb";
import { BLOCK_FACTORY_KEY, BLOCK_VIEW_KEY } from "../model/registry";
import { DEFAULT_INSERTION_MODE, COMMAND_BAR_ACTIVE } from "../model/board";

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
    Priority
} from "kbar";

export function FrameView({ target }: EntityViewProps) {

	/*******************/
	/****** STATE ******/
	/*******************/
	const target_ir = target.get(IrFrame.KEY); // representation of the frame in IR
	const target_frame = target.get(LayoutFrame.KEY); // twin representation which deals with layout

	const lines = useListenable(target_ir.lines);
	const pos = useListenable(target_frame.position);

        const [command_key_pressed, set_command_key_pressed] = React.useState(false);


	/******************/
	/****** REFS ******/
	/******************/
	const frameRef = React.useRef<HTMLDivElement>(null);
	const handleRef = React.useRef<HTMLDivElement>(null);


	/*********************/
	/****** SIGNALS ******/
	/*********************/

	const block_insertion_mode = target.deepGet(DEFAULT_INSERTION_MODE);
	const curr_ins_mode = useListenable(block_insertion_mode);

	const doDestroy = wrapWeakReceiver(target, target => {
		target.destroy();
	});

	const command_bar_active = target.deepGet(COMMAND_BAR_ACTIVE);
	const command_bar_active_listener = useListenable(command_bar_active);

	const doAddLine = wrapWeakReceiver(target_ir, target_ir => {
		const line = new Entity(target_ir, "line"); // make a new line entity, parenting it to our current frame
		const line_ir = line.add(new IrLine(line), [IrLine.KEY]); // add the line ir to our entity

		line.setFinalizer(() => { // make sure we cleanup when we destroy the line
			line_ir.destroy();
		});

		target_ir.lines.push(line); // finally, add it to the frames lines

                const kind = target_ir.deepGet(BlockRegistry.KEY).kinds[curr_ins_mode]!; // get the kind of block we want to insert
                //const kind = target_ir.deepGet(BlockRegistry.KEY).kinds[3]!; // get the kind of block we want to insert, for debugging
               	// TODO deleting blocks breaks??
		// based on the current insertion mode
		// Construct a new block through its factory and add it to the line.
		const block = kind.get(BLOCK_FACTORY_KEY)(line_ir);
		line_ir.blocks.push(block);

	});

	useInit(() => {
		doAddLine(); // add a line by default
	});

        const [barTrigger, triggerBar] = React.useState(0);

        const handleFocus = () => {
            triggerBar(barTrigger + 1)
        }


        const frame_actions = [
            {
                id: "Delete Frame",
                name: "Delete Frame",
                subtitle: "delete the current frame.",
                shortcut: [],
                perform: () => {
                    doDestroy();
                },
                keywords: "",
                priority: Priority.MEDIUM,
                section: "Frame"
            },
            //{
            //    id: "+Math Block",
            //    name: "+Math Block",
            //    subtitle: "add a math block",
            //    shortcut: [],
            //    perform: () => {
            //        doDestroy();
            //    },
            //    keywords: "",
            //    priority: Priority.MEDIUM,
            //    section: "Frame"
            //},
        ]


        useRegisterActions(frame_actions, [barTrigger])
	// this code is for temp
	// it's for deleting empty frames, allowing for free clicking around w/o cluttering
	const handleBlur = wrapWeakReceiver(target_ir, (target_ir, e: React.FocusEvent<HTMLDivElement>) => {
		const isEmpty = (target_ir: IrFrame) => {
			// TODO: Integrate with `.kind[EMPTY_DETECTOR_KEY]` 
                        if (command_key_pressed) return false;
                        
                        if (command_bar_active_listener) {
                            return false;
                        }

			if (target_ir.lines.length > 1) return false;

			const first_line = target_ir.lines.value[0];

			if (first_line === undefined) {
				return true;
			}

			const first_block = first_line.get(IrLine.KEY).blocks.value[0];

			if (first_block === undefined) {
				return true;
			}

			let first_block_text = first_block.tryGet(TextBlock.KEY);

			if (first_block_text !== undefined && first_block_text.text.value === "") {
				return true;
			}


			if (first_block_text === undefined) { // for some reason the MathLive library blurs once on input, so we need to ignore that first blur
				let first_block_math = first_block.tryGet(MathBlock.KEY);

				if (first_block_math !== undefined) {
					if (first_block_math.math.value === "") {
						if (first_block_math.on_initialize.value) {
							first_block_math.on_initialize.value = false;
							return false
						}
						return true;
					}
				}
			}

			return false;
		};

		if (isEmpty(target_ir)) { // actually do the destruction
			doDestroy()
		}
	});

        const { query } = useKBar();
	return <>
		<div className="frame"

                        onKeyDown={e => {
                            if (e.key === "Meta") {
                                set_command_key_pressed(true)
                            }
                        }}

                        onKeyUp={e => {
                            if (e.key === "Meta") {
                                set_command_key_pressed(false)
                            }
                        }}

			data-entity-id={target.part_id} // pass this so we can handle selecto stuff
			ref={frameRef}
			style={{
				position: "absolute",
				transform: `translate(${pos[0]}px, ${pos[1]}px)`,
			}}
			onBlur={handleBlur}
                        onFocus={handleFocus}
		>

			{/* CONTROLS */}
			<div className="frame-controls"
			>
				<div
					onClick={doDestroy}
					className="control"
				>
					<RiDeleteBackLine />
				</div>
				<div ref={handleRef}
					className="control"
				>
					<MdDragIndicator />
				</div>


			</div>

                        <div className="right-frame-controls">
                            <div onClick={() => {
                                query.toggle()
                            }}
                                className="control"
                            >
                                <TbMathSymbols />
                            </div>
                        </div>


			{lines.map(
				line => <LineView key={line.part_id} target={line} />,
			)}
		</div>

		<Moveable
			target={frameRef}
			keepRatio={false}
			draggable={true}
			container={null}
			origin={false}
			hideDefaultLines={true}
			throttleDrag={0}
			edge={true}
			dragTarget={handleRef.current}
			//stopPropagation={true}

			onDrag={({
				target,
				transform,
			}: OnDrag) => {
				target!.style.transform = transform;
			}}


			onDragEnd={(e) => {
				if (e.isDrag) {
					// this is intentionally bad!
					// until a better solution is found by @david.
					let v = e.lastEvent.transform;
					v = v.replace("translate(", "");
					v = v.replace(")", "");
					v = v.replace(/px/g, "").split(",");

					// TODO might be better to only have this set onDragEnd,
					// but for now I set it every tick you move (thus rerendering).
					target_frame.position.value = [parseFloat(v[0]), parseFloat(v[1])]
				}
			}}

		/>
	</>
}

export function LineView({ target }: EntityViewProps) {
	const target_ir = target.get(IrLine.KEY);
	const blocks = useListenable(target_ir.blocks);

	useInit(() => {
		// TODO: Remove; this is just temp code

		// Get the first block kind we registered
		//const kind = target_ir.deepGet(BlockRegistry.KEY).kinds[0]!;

		// Construct a new block through its factory and add it to the line.
		//const block = kind.get(BLOCK_FACTORY_KEY)(target_ir);
		//target_ir.blocks.push(block);
	});

        const { query } = useKBar();
        const [barTrigger, triggerBar] = React.useState(0);
        const handleFocus = () => {
            triggerBar(barTrigger + 1)
        }

        const addBlock = (i) => {
            const frame_ir = target_ir.deepGet(IrFrame.KEY)

            const new_line = new Entity(frame_ir, "line");
            const line_ir = new_line.add(new IrLine(new_line), [IrLine.KEY]);

            const idx = frame_ir.lines.indexOf(target_ir.parent_entity)
            frame_ir.lines.pushAt(idx+1, new_line)

            const kind = target_ir.deepGet(BlockRegistry.KEY).kinds[i]!; // FIXME todo
            const block = kind.get(BLOCK_FACTORY_KEY)(line_ir);
            line_ir.blocks.push(block)
        }

        const line_actions = [
            {
                id: "+ Math Block",
                name: "+ Math Block",
                subtitle: "add a math block",
                shortcut: [],
                perform: () => {
                    setTimeout(() => {
                        addBlock(1)
                    }, 100)
                },
                keywords: "",
                priority: Priority.MEDIUM,
                section: "Frame"
            },
            {
                id: "+ Text Block",
                name: "+ Text Block",
                subtitle: "add a text block",
                shortcut: [],
                perform: () => {
                    setTimeout(() => {
                        addBlock(0)
                    }, 100)
                },
                keywords: "",
                priority: Priority.MEDIUM,
                section: "Frame"
            },
            {
                id: "+ Scry Block",
                name: "+ Scry Block",
                subtitle: "add a scry block",
                shortcut: [],
                perform: () => {
                    setTimeout(() => {
                        addBlock(2)
                    }, 100)
                },
                keywords: "",
                priority: Priority.MEDIUM,
                section: "Frame"
            },
            {
                id: "Export Frame",
                name: "Export Frame",
                subtitle: "export the current frame to LaTeX.",
                shortcut: [],
                perform: () => {
                    alert("not implemented yet! @nick")
                },
                keywords: "",
                priority: Priority.MEDIUM,
                section: "Frame"
            },
        ]
        useRegisterActions(line_actions, [barTrigger])

	const doMerge = (rel: "prev" | "next") => {
		if (!target_ir.is_alive) return;

		const frame_ir = target_ir.deepGet(IrFrame.KEY);
		frame_ir.mergeLines(frame_ir.lines.indexOf(target), rel);
	};

	return <div
            onFocus={handleFocus}
        >
		{blocks.map(
			block => {
				const block_ir = block.get(IrBlock.KEY);
                                const KindView = block_ir.kind.get(BLOCK_VIEW_KEY); // get the blocks view based on its kind

				return <KindView target={block} />; // kindview is actually treated as a var here, and will resolve to the actual view!
				// #reactjank
			},
		)}
	</div>;
}
