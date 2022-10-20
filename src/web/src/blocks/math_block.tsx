import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../util/hooks";
import { IrBlock,MathBlock } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./registry";
//import { MathfieldElement } from "mathlive";
//import { MathfieldComponent } from "react-mathlive";
import MathView, { MathViewRef } from 'react-math-view';
import "../../styles/MathBlock.css";

export function createKind(parent: Part | null) {
    const kind = new Entity(parent, "math block kind");
    kind.add(MathBlockView, [BLOCK_VIEW_KEY]);
    kind.add({
        name: "Math Block",
        description: "A block for writing math",
        icon: null!,
    }, [BLOCK_KIND_INFO_KEY]);
    kind.add((parent) => {
        const instance = new Entity(parent, "math block");
        const instance_ir = instance.add(new IrBlock(instance, kind), [IrBlock.KEY]);
        const instance_math = instance.add(new MathBlock(instance), [MathBlock.KEY]);
        instance.setFinalizer(() => {
            instance_math.destroy();
            instance_ir.destroy();
        });

        return instance;
    }, [BLOCK_FACTORY_KEY]);

    return kind;
}

function MathBlockView({ target }: EntityViewProps) {
    const target_ir = target.get(MathBlock.KEY);
    const math = useListenable(target_ir.math);

    const block_ref = React.useRef<HTMLDivElement>(null);
    const math_ref = React.useRef<MathViewRef>(null);

    React.useEffect(() => {
        math_ref.current!.focus();
        //set_just_mounted(false);
    }, []);

    return <div
        className="outline-none"
        ref={block_ref}
    >
        <MathView
            value={math}
            ref={math_ref}
            onBlur={(e) => {
                //if (!target_ir.is_alive) return;

                //if (!target_ir.on_initialize.value) {
                //    target_ir.on_initialize.value = false;
                //}
            }}
            onChange={(e) => {
                //console.log("blurin the math field");
                target_ir.math.value = e.target.value;
            }}
            //smartMode={true}
            smartFence={true}
            smartSuperscript={false}
            mathModeSpace={"\\;"}
            //className="math-field"
            //style={{
            //    backgroundColor: "red",
            //}}
        />
    </div>;
}


