import { Entity } from "kotae-util";
import * as React from "react";
import { IrTodoItem, IrTodoList } from "../../common/src";
import { EntityViewProps, hookArray, hookValue } from "./util";

export function makeReactRoot(target: Entity) {
    return <TodoListView target={target} />;
}

export function TodoListView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoList.KEY).asWeak();

    const title = hookValue(target_ir.unwrapped.title);
    const items = hookArray(target_ir.unwrapped.items);
    const checked_count = hookValue(target_ir.unwrapped.checked_count);

    const do_add_item = () => {
        if (!target_ir.is_alive) return;

        const item = new Entity(target_ir);
        item.add(new IrTodoItem(item), [IrTodoItem.KEY]);

        target_ir.addItem(item);
        (window as any)["latest_item"] = item;
    };

    const do_remove_checked = () => {
        if (!target_ir.is_alive) return;

        target_ir.removeChecked();
    };

    return <div>
        <h1> {title} </h1>
        <p> Completed: {checked_count} / {items.length} </p>
        <p>
            <button onClick={do_add_item}> Add Item </button> | { }
            <button onClick={do_remove_checked}> Remove Checked </button>
        </p>
        <li>
            {items.map(item => <TodoItemView key={item.part_id} target={item} />)}
        </li>
    </div>;
}

export function TodoItemView({ target }: EntityViewProps) {
    const target_ir = target.get(IrTodoItem.KEY).asWeak();

    const is_checked = hookValue(target_ir.unwrapped.checked);
    const text = hookValue(target_ir.unwrapped.text);

    const do_remove_self = () => {
        if (!target_ir.is_alive) return;

        target_ir.removeSelf();
    }

    const do_flip_checkbox = () => {
        if (!target_ir.is_alive) return;

        target_ir.flipChecked();
    }

    const do_set_text = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!target_ir.is_alive) return;

        target_ir.text.value = e.target.value;
    };

    return <ul>
        <input type="checkbox" value={is_checked ? "yes" : "no"} onChange={do_flip_checkbox} />
        {" "}
        <input
            type="textbox"
            value={text}
            onChange={do_set_text}
        />
        {" "}
        <button onClick={do_remove_self}> Remove </button>
    </ul>;
}
