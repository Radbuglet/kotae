import React, { useMemo, useRef, useEffect } from 'react'

import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../../util/hooks";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "../registry";
import { IrBlock, SlateBlock } from "kotae-common";
import { Slate, Editable, withReact, useSlate, useFocused } from 'slate-react'
import {
  Editor,
  Transforms,
  Text,
  createEditor,
  Descendant,
  Range,
} from 'slate'
import { css } from '@emotion/css'
import { withHistory } from 'slate-history'

export function createKind(parent: Part | null): Entity {
    const kind = new Entity(parent, "slate block kind");

    kind.add({
        name: "Slate Block",
        description: "Text block",
        icon: null!,
    }, [BLOCK_KIND_INFO_KEY]);

    kind.add((parent) => {
        const block = new Entity(parent, "slate block");
        const block_ir = block.add(new IrBlock(block, kind), [IrBlock.KEY]);
        const block_text = block.add(new SlateBlock(block), [SlateBlock.KEY]);

		block.setFinalizer(() => {
			block_text.destroy();
			block_ir.destroy();
		});

        return block;
    }, [BLOCK_FACTORY_KEY]);

    kind.add(SlateBlockView, [BLOCK_VIEW_KEY]);

    return kind;
}

export function SlateBlockView({ target }: EntityViewProps) {
    const target_ir = target.get(SlateBlock.KEY);
	const text = useListenable(target_ir.stringified_json);

	const block_ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		block_ref.current!.focus();
	}, []);

    return <div
		className="outline-none"
		ref={block_ref}
		contentEditable={true}
		onBlur={(e) => {
			//target_ir.stringified_json.value = 
		}}
	>
		<Slate editor={editor} value={initialValue}>
            <HoveringToolbar />
            <Editable
                renderLeaf={props => <Leaf {...props} />}
                placeholder="Enter some text..."
                onDOMBeforeInput={(event: InputEvent) => {
                switch (event.inputType) {
                    case 'formatBold':
                    event.preventDefault()
                    return toggleFormat(editor, 'bold')
                    case 'formatItalic':
                    event.preventDefault()
                    return toggleFormat(editor, 'italic')
                    case 'formatUnderline':
                    event.preventDefault()
                    return toggleFormat(editor, 'underlined')
                }
                }}
            />
        </Slate>
	</div>;
}
