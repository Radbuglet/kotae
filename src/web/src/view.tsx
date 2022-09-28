import { Dismounter, Entity } from "kotae-util";
import * as React from "react";
import { IrTodoItem, IrTodoList } from "../../common/src";
import { EntityViewProps, hookArray, hookValue } from "./util";

export function makeReactRoot(target: Entity) {
    return <TodoListView target={target} />;
}

export function TodoListView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoList.KEY);

    const title = hookValue(target_ir.title);
    const items = hookArray(target_ir.items);
    const checked_count = hookValue(target_ir.checked_count);

    const on_add_item = () => {
        const item = new Entity(target_ir);
        item.add(new Dismounter(), [Dismounter.KEY]);
        item.add(new IrTodoItem(item), [IrTodoItem.KEY]);

        target_ir.addItem(item);
    };

    const on_remove_checked = () => {
        target_ir.removeChecked();
    };

    return <div>
        <h1> {title} </h1>
        <p> Completed: {checked_count} / {items.length} </p>
        <p>
            <button onClick={on_add_item}> Add Item </button> |
            <button onClick={on_remove_checked}> Remove Checked </button>
        </p>
        <li>
            {items.map(item => <TodoItemView key={item.part_id} target={item} />)}
        </li>
    </div>;
}

export function TodoItemView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoItem.KEY);

    const is_checked = hookValue(target_ir.checked);
    const text = hookValue(target_ir.text);

    const on_remove_self = () => {
        target_ir.removeSelf();
    }

    return <ul>
        <input type="checkbox" value={is_checked ? "yes" : "no"} onChange={() => {
            target_ir.flipChecked();
        }} />
        <input
            type="textbox"
            value={text}
            onChange={e => target_ir.text.value = e.target.value}
        />
        <button onClick={on_remove_self}> Remove </button>
    </ul>;
}
