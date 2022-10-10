import { ReadonlyVec2, vec2 } from "gl-matrix";
import { IrBlock, IrBoard, IrFrame, IrLine } from "kotae-common";
import { Entity, IterExt } from "kotae-util";
import * as React from "react";
import { EntityViewProps, useListenable, wrapWeakReceiver } from "../util/hooks";
import DemoClasses from "./demo.module.css";
import { BoardView } from "./BoardView";

export function AppRoot({ target }: EntityViewProps) {

    return <>
            <BoardView target={target} />
    </>;
}
