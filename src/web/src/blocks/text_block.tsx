import * as React from "react";
import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../util/hooks";
import { IrBlock, TextBlock } from "kotae-common";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "./registry";

export function createKind(parent: Part | null) {
    const kind = new Entity(parent, "text block kind");
    kind.add(TextBlockView, [BLOCK_VIEW_KEY]);
    kind.add({
        name: "Text Block",
        description: "You know what this is :)",
        icon: null!,
    }, [BLOCK_KIND_INFO_KEY]);
    kind.add((parent) => {
        const instance = new Entity(parent, "text block");
        const instance_ir = instance.add(new IrBlock(instance, kind), [IrBlock.KEY]);
        const instance_text = instance.add(new TextBlock(instance), [TextBlock.KEY]);
        instance.setFinalizer(() => {
            instance_text.destroy();
            instance_ir.destroy();
        });

        return instance;
    }, [BLOCK_FACTORY_KEY]);

    return kind;
}

function TextBlockView({ target }: EntityViewProps) {
    const target_ir = target.get(TextBlock.KEY);
    const text = useListenable(target_ir.text);

    const block_ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        block_ref.current!.focus();
    }, []);

    return <div
        className="outline-none"
        ref={block_ref}
        contentEditable={true}
        onBlur={(e) => {
            target_ir.text.value = e.currentTarget.innerText
        }}
    >
        {text}
    </div>;
}

