//> Core signals

import { assert } from "../util";
import { ArgsListOf, callFunc } from "../util/function";

export interface ISubscribeOnlySignal<F> {
    connect(handler: F): void;
    disconnect(handler: F): void;
}

export class Signal<F> implements ISubscribeOnlySignal<F> {
    private readonly handlers = new Set<F>();

    connect(handler: F) {
        this.handlers.add(handler);
    }

    disconnect(handler: F): void {
        assert(this.handlers.has(handler));
        this.handlers.delete(handler);
    }

    fire(...args: ArgsListOf<F>) {
        for (const handler of this.handlers) {
            callFunc(handler, ...args);
        }
    }

    iterHandlers(): IterableIterator<F> {
        return this.handlers.values();
    }
}

export type ValueChangeHandler<T> = (new_value: T, old_value: T) => void;
export type ListChangeHandler<T> = () => void;

export class ListenValue<T> {
    private value_: T;
    private readonly on_changed_ = new Signal<ValueChangeHandler<T>>();

    constructor(initial_value: T) {
        this.value_ = initial_value;
    }

    get on_changed(): ISubscribeOnlySignal<ValueChangeHandler<T>> {
        return this.on_changed_;
    }

    get value(): T {
        return this.value_;
    }

    set value(value: T) {
        const old = this.value_;
        if (value !== old) {
            this.value_ = value;
            this.on_changed_.fire(value, old);
        }
    }
}

export class ListenArray<T> {
    private readonly backing: T[] = [];
    private readonly on_changed_ = new Signal<ListChangeHandler<T>>();

    get on_changed(): ISubscribeOnlySignal<ListChangeHandler<T>> {
        return this.on_changed_;
    }

    get value(): readonly T[] {
        return this.backing;
    }

    get length(): number {
        return this.backing.length;
    }

    set(index: number, value: T) {
        assert(index < this.backing.length);
        if (this.backing[index] !== value) {
            this.backing[index] = value;
            this.on_changed_.fire();
        }
    }

    push(value: T) {
        this.backing.push(value);
        this.on_changed_.fire();
    }

    remove(index: number): T | undefined {
        const removed = this.backing.splice(index, 1)[0];
        if (removed !== undefined) {
            this.on_changed_.fire();
        }
        return removed;
    }
}
