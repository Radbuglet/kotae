//> Core signals

import { assert } from "../util/debug";
import { ArgsListOf, callFunc } from "../util/function";
import { Part } from "./node";
import { CleanupExecutor, Weak } from "./bindable";

export interface ISubscribeOnlySignal<F> {
    connect(parent: Part | null, handler: F): Weak<ISubscribeOnlyConnection>;
}

export interface ISubscribeOnlyConnection extends Part { }

const CONNECTIONS = Symbol("Signal.CONNECTIONS");

export class Signal<F> extends Part implements ISubscribeOnlySignal<F> {
    // Invariant: The connections in this array are always valid references. In other words,
    // `SignalConnections` *must* unregister themselves from this array before finalization.
    private readonly [CONNECTIONS] = new Set<SignalConnection<F>>();

    connect(parent: Part | null, handler: F): Weak<SignalConnection<F>> {
        const connection = new SignalConnection<F>(parent, this, handler);
        this[CONNECTIONS].add(connection);
        return connection;
    }

    fire(...args: ArgsListOf<F>) {
        for (const connection of this[CONNECTIONS]) {
            callFunc(connection.handler, ...args);
        }
    }

    protected override onDestroy(cx: CleanupExecutor): void {
        // N.B. We don't actually depend on other cleanup targets because structure invariants ensure
        // the validity of order-less destruction.
        cx.register(this, [], () => {
            for (const connection of this[CONNECTIONS]) {
                connection.destroy();
            }
            this.markFinalized();
        });
    }
}

export class SignalConnection<F> extends Part {
    constructor(
        parent: Part | null,
        // Invariant: the provided signal must always be alive for the duration of this object's
        // lifetime. In other words, the signal must destroy us before it destroys itself.
        readonly signal: Signal<F>,
        readonly handler: F) {
        super(parent);
    }

    protected override onDestroy(cx: CleanupExecutor): void {
        cx.register(this, [], () => {
            if (this.signal.is_alive) {
                this.signal[CONNECTIONS].delete(this);
            }
            this.markFinalized();
        });
    }
}

export type ValueChangeHandler<T> = (new_value: T, old_value: T) => void;
export type ListChangeHandler<T> = () => void;

export class ListenValue<T> extends Part {
    private value_: T;
    private readonly on_changed_ = new Signal<ValueChangeHandler<T>>(this);

    constructor(parent: Part | null, initial_value: T) {
        super(parent);
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

    protected override onDestroy(cx: CleanupExecutor): void {
        cx.register(this, [this.on_changed_]);
    }
}

export class ListenArray<T> extends Part {
    private readonly backing: T[] = [];
    private readonly on_changed_ = new Signal<ListChangeHandler<T>>(this);

    get on_changed(): ISubscribeOnlySignal<ListChangeHandler<T>> {
        return this.on_changed_;
    }

    get values(): readonly T[] {
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

    removeAt(index: number): T | undefined {
        const removed = this.backing.splice(index, 1)[0];
        if (removed !== undefined) {
            this.on_changed_.fire();
        }
        return removed;
    }

    remove(instance: T): boolean {
        const index = this.values.indexOf(instance);
        if (index !== -1) {
            this.removeAt(index);
            return true;
        } else {
            return false;
        }
    }

    protected override onDestroy(cx: CleanupExecutor): void {
        cx.register(this, [this.on_changed_]);
    }
}
