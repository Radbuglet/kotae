import { ReadonlyVec2, vec2 } from "gl-matrix";
import { IrBlock, IrBoard, IrFrame, IrLine } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";
import DemoClasses from "./demo.module.css";
import { BoardView } from "./BoardView";
import { Sidebar } from "./Sidebar";

export function AppRoot({ target }: EntityViewProps) {

    return <>
        <div className="bg-matcha-normal">
            <BoardView target={target} />
        </div>
    </>;
}
