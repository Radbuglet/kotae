import * as React from "react";
import { createRoot } from "react-dom/client";

import { Entity, IListenable, Part } from "kotae-util";
import { IrTodoItem, IrTodoList } from "kotae-common";

// Setup tree
const list = new Entity();
list.registerAndAttach(new IrTodoList(), [IrTodoList.KEY]);
list.parent = Part.ROOT_NODE_MARKER;

// Define my custom React hook
function hookListenable<T>(listenable: IListenable<T>): T {
    // TODO: Can we write our own hook to avoid setting a React-land mirror?
    const [mirror, setMirror] = React.useState<T>(listenable.value);

    React.useEffect(() => {
        const connection = listenable.on_changed.connect(() => {
            // FIXME: Fix this brain damage
            if (listenable.value instanceof Array) {
                setMirror([...listenable.value] as any);
            } else {
                setMirror(listenable.value);
            }
        });

        // Lifetimes are managed by react
        connection.parent = Part.ROOT_NODE_MARKER;

        return () => {
            connection.destroy();
        };
    }, []);

    return mirror;

    //     return React.useSyncExternalStore(onStoreChange => {
    //         const connection = listenable.on_changed.connect(() => {
    //             onStoreChange();
    //         });
    //         connection.parent = Part.ROOT_NODE_MARKER;
    // 
    //         return () => {
    //             connection.destroy();
    //         }
    //     }, () => listenable.value);
}

// Define React components
type EntityViewProps = Readonly<{ target: Entity }>;

function TodoListView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoList.KEY);

    const title = hookListenable(target_ir.title);
    const items = hookListenable(target_ir.items);
    const checked_count = hookListenable(target_ir.checked_count);

    return <div>
        <h1> {title} </h1>
        <p>Item count: {items.length} | Checked: {checked_count}</p>
        <p>
            <button onClick={() => {
                const item = new Entity();
                item.registerAndAttach(new IrTodoItem(), [IrTodoItem.KEY]);
                target_ir.addItem(item);
            }}>Add Item</button>
        </p>
        <li>{items.map(item => {
            return <TodoItemView key={item.part_id} target={item} />;
        })}</li>
    </div>;
}

function TodoItemView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoItem.KEY);

    const is_checked = hookListenable(target_ir.checked);
    const text = hookListenable(target_ir.text);

    return <ul>
        <input
            type="checkbox"
            value={is_checked ? "yes" : "no"}
            onChange={() => target_ir.flipChecked()}
        />
        <span> {text} </span>
    </ul>;
}

// Render items to DOM
createRoot(document.getElementById("root")!).render(
    <TodoListView target={list} />
);
