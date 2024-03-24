import React, { useMemo, useRef, useEffect, useCallback } from 'react'

import { Entity, Part } from "kotae-util";
import { EntityViewProps, useListenable } from "../../util/hooks";
import { BLOCK_FACTORY_KEY, BLOCK_KIND_INFO_KEY, BLOCK_VIEW_KEY } from "../registry";
import { IrBlock, SlateBlock } from "kotae-common";
import { Slate, Editable, withReact } from 'slate-react'
import {
    Editor,
    Transforms,
    Text,
    createEditor,
    Descendant,
    Range,
} from 'slate'
import { withHistory } from 'slate-history'
import { css } from '@emotion/css'
import Prism from 'prismjs'
import escapeHtml from 'escape-html'

//import markdown, { getCodeString } from '@wcj/markdown-to-html';

import { convertText } from './slate_block_utils/html_to_latex' // this errors because it's written in JS, not an actual issue though when we run the app

// this is a markdown rich text editor!
// code below (until said otherwise) is from this example: https://github.com/ianstormtaylor/slate/blob/main/site/examples/markdown-preview.tsx#L6
// demo: https://www.slatejs.org/examples/markdown-preview
// eslint-disable-next-line
; Prism.languages.markdown = Prism.languages.extend("markup", {}), Prism.languages.insertBefore("markdown", "prolog", { blockquote: { pattern: /^>(?:[\t ]*>)*/m, alias: "punctuation" }, code: [{ pattern: /^(?: {4}|\t).+/m, alias: "keyword" }, { pattern: /``.+?``|`[^`\n]+`/, alias: "keyword" }], title: [{ pattern: /\w+.*(?:\r?\n|\r)(?:==+|--+)/, alias: "important", inside: { punctuation: /==+$|--+$/ } }, { pattern: /(^\s*)#+.+/m, lookbehind: !0, alias: "important", inside: { punctuation: /^#+|#+$/ } }], hr: { pattern: /(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m, lookbehind: !0, alias: "punctuation" }, list: { pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m, lookbehind: !0, alias: "punctuation" }, "url-reference": { pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/, inside: { variable: { pattern: /^(!?\[)[^\]]+/, lookbehind: !0 }, string: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/, punctuation: /^[\[\]!:]|[<>]/ }, alias: "url" }, bold: { pattern: /(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/, lookbehind: !0, inside: { punctuation: /^\*\*|^__|\*\*$|__$/ } }, italic: { pattern: /(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/, lookbehind: !0, inside: { punctuation: /^[*_]|[*_]$/ } }, url: { pattern: /!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/, inside: { variable: { pattern: /(!?\[)[^\]]+(?=\]$)/, lookbehind: !0 }, string: { pattern: /"(?:\\.|[^"\\])*"(?=\)$)/ } } } }), Prism.languages.markdown.bold.inside.url = Prism.util.clone(Prism.languages.markdown.url), Prism.languages.markdown.italic.inside.url = Prism.util.clone(Prism.languages.markdown.url), Prism.languages.markdown.bold.inside.italic = Prism.util.clone(Prism.languages.markdown.italic), Prism.languages.markdown.italic.inside.bold = Prism.util.clone(Prism.languages.markdown.bold); // prettier-ignore
// I have no clue what the above line does, especially why it starts with a semicolon. It is somehow configuring the markdown.

const Leaf = ({ attributes, children, leaf }) => {
    return (
        <span
            {...attributes}
            className={css`
        font-weight: ${leaf.bold && 'bold'};
        font-style: ${leaf.italic && 'italic'};
        text-decoration: ${leaf.underlined && 'underline'};
        ${leaf.title &&
                css`
            display: inline-block;
            font-weight: bold;
            font-size: 20px;
            margin: 20px 0 10px 0;
          `}
        ${leaf.list &&
                css`
            padding-left: 10px;
            font-size: 20px;
            line-height: 10px;
          `}
        ${leaf.hr &&
                css`
            display: block;
            text-align: center;
            border-bottom: 2px solid #ddd;
          `}
        ${leaf.blockquote &&
                css`
            display: inline-block;
            border-left: 2px solid #ddd;
            padding-left: 10px;
            color: #aaa;
            font-style: italic;
          `}
        ${leaf.code &&
                css`
            font-family: monospace;
            background-color: #eee;
            padding: 3px;
          `}
      `}
        >
            {children}
        </span>
    )
}

const initialValue: Descendant[] = [
    {
        type: 'paragraph',
        children: [{ text: '' }],
    },
]


// Modified from this reference: https://docs.slatejs.org/concepts/10-serializing
/** Recursively serializes the slate block from a markdown string to a html string. */
const serialize = node => {
    let showdown  = require('showdown');
    let converter = new showdown.Converter()

    if (Text.isText(node)) {
        let string = escapeHtml(node.text) // escape any html reserved characters, because we're exporting to html
        if (string.startsWith("&gt")) {
            string = `<blockquote>${string.slice(4)}</blockquote>` // the slice to remove the &gt
        }
        if (node.bold) { // leaves of the tree may have a bold property, this is the only property that leaves have that can be converted to html
            string = `<strong>${string}</strong>`
        }
        return string
    }

    const children = node.children.map(n => serialize(n)).join('') // serialize recursively, the data of the slate block is of a tree structure
    //return markdown(children) as string // the markdown function converts markdown strings to html
    //return children as string // the markdown function converts markdown strings to html
    return converter.makeHtml(children) as string // the markdown function converts markdown strings to html
}

// ! starting here is regular kotae code.
/** Register the slate block as a block type in the IR. This is all IR boilerplate code. */
export function createKind(parent: Part | null): Entity {
    const kind = new Entity(parent, "slate block kind");
    kind.add(SlateBlockView, [BLOCK_VIEW_KEY]);
    kind.add({
        name: "Slate Block", // IF THIS IS EVER CHANGED, MODIFY FRAMEVIEW 
        description: "Rich text editor with markdown support",
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

    return kind;
}

/** The actual react functional component for the slate block */
export function SlateBlockView({ target }: EntityViewProps) {
    const target_ir = target.get(SlateBlock.KEY); // access the IR of the slate block, so we can access it's data properties (such as its latexified export)
    const text = useListenable(target_ir.latexified); // not actually ever used, we only write to latexified, don't need to read it unless exporting, which is handled in FrameView
    //console.log(text) // debug

    const block_ref = React.useRef<HTMLDivElement>(null);
    const editable = React.useRef(null);


    // this is all from https://github.com/ianstormtaylor/slate/blob/main/site/examples/markdown-preview.tsx#L6
    const renderLeaf = useCallback(props => <Leaf {...props} />, [])
    const editor = useMemo(() => withHistory(withReact(createEditor())), [])

    React.useEffect(() => {
        //block_ref.current!.focus(); // this is not working
        // focus the editor element
        editor.selection = { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 0 } }
    }, []);

    const decorate = useCallback(([node, path]) => {
        const ranges = []

        if (!Text.isText(node)) {
            return ranges
        }

        const getLength = token => {
            if (typeof token === 'string') {
                return token.length
            } else if (typeof token.content === 'string') {
                return token.content.length
            } else {
                return token.content.reduce((l, t) => l + getLength(t), 0)
            }
        }

        const tokens = Prism.tokenize(node.text, Prism.languages.markdown)
        let start = 0

        for (const token of tokens) {
            const length = getLength(token)
            const end = start + length

            if (typeof token !== 'string') {
                ranges.push({
                    [token.type]: true,
                    anchor: { path, offset: start },
                    focus: { path, offset: end },
                })
            }

            start = end
        }

        return ranges
    }, [])

    const handleKeydown = async(e: React.KeyboardEvent) => {
        target_ir.latexified.value = await convertText(serialize(editor)) // anytime the user writes text, export it to latex (converText converts html to latex, serialize converts markdown to html)
    }

    return <div
        className="outline-none"
        ref={block_ref}
        onBlur={async(e) => {
            target_ir.latexified.value =  await convertText(serialize(editor)) // anytime the user exits out of the slate block (aka finishes writing), export it to latex
        }}
        onKeyDown={handleKeydown}
    >
        <Slate editor={editor}
            value={initialValue}
            initialValue={initialValue}
        >
            <Editable
                ref={editable}
                decorate={decorate}
                renderLeaf={renderLeaf}
                placeholder=""
                autoFocus={true}
                className="outline-none"
            />
        </Slate>
    </div>;
}
