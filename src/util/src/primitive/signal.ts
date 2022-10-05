import { assert } from "../util/debug";
import { ArgsListOf, callFunc } from "../util/function";
import { ArrayExt } from "../util/array";
import { Part, Weak } from "./node";

//> Signal
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

    protected override onDestroy() {
        for (const connection of this[CONNECTIONS]) {
            connection.destroy();
        }
    }
}

export class SignalConnection<F> extends Part {
    constructor(
        parent: Part | null,
        readonly signal: Weak<Signal<F>>,
        readonly handler: F) {
        super(parent);
    }

    protected override onDestroy() {
        if (this.signal.is_alive) {
            this.signal[CONNECTIONS].delete(this);
        }
    }
}

//> IListenValueSnapshot
export interface IListenable<T> {
    readonly on_changed: ISubscribeOnlySignal<() => void>;
    readonly value: T;
    readonly value_snapshot: T;
}

//> ListenValue
export type ValueChangeHandler<T> = (new_value: T, old_value: T) => void;

export interface IReadonlyListenValue<T> extends Part, IListenable<T> {
    readonly on_changed: ISubscribeOnlySignal<ValueChangeHandler<T>>;
}

export class ListenValue<T> extends Part implements IReadonlyListenValue<T> {
    private readonly on_changed_ = new Signal<ValueChangeHandler<T>>(this);
    private value_: T;

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

    get value_snapshot(): T {
        return this.value_;
    }

    set value(value: T) {
        const old = this.value_;
        if (value !== old) {
            this.value_ = value;
            this.on_changed_.fire(value, old);
        }
    }

    protected override onDestroy() {
        this.on_changed_.destroy();
    }
}

//> ListenArray
export type ListChangeHandler<T> = () => void;

export interface IReadonlyListenArray<T> extends Part, IListenable<readonly T[]> {
    readonly on_changed: ISubscribeOnlySignal<ListChangeHandler<T>>;
    readonly length: number;
    indexOf(value: T): number;
}

export class ListenArray<T> extends Part implements IReadonlyListenArray<T> {
    private readonly on_changed_ = new Signal<ListChangeHandler<T>>(this);

    private readonly backing: T[] = [];
    private backing_snapshot: readonly T[] | null = null;

    //> Listenable exports
    get on_changed(): ISubscribeOnlySignal<ListChangeHandler<T>> {
        return this.on_changed_;
    }

    get value(): readonly T[] {
        return this.backing;
    }

    get value_snapshot(): readonly T[] {
        if (this.backing_snapshot === null) {
            this.backing_snapshot = [...this.backing];
        }
        return this.backing_snapshot;
    }

    //> Queries
    get length(): number {
        return this.backing.length;
    }

    indexOf(value: T): number {
        return this.value.indexOf(value);
    }

    //> Mutators
    private onChange() {
        this.backing_snapshot = null;
        this.on_changed_.fire();
    }

    set(index: number, value: T) {
        assert(ArrayExt.isValidIndex(this.backing, index));

        if (this.backing[index] !== value) {
            this.backing[index] = value;
            this.onChange();
        }
    }

    push(value: T) {
        this.backing.push(value);
        this.onChange();
    }

    removeAt(index: number): T | undefined {
        const removed = this.backing.splice(index, 1)[0];
        if (removed !== undefined) {
            this.onChange();
        }
        return removed;
    }

    remove(instance: T): boolean {
        const index = this.indexOf(instance);
        if (index !== -1) {
            this.removeAt(index);
            return true;
        } else {
            return false;
        }
    }

    clear() {
        if (this.backing.length > 0) {
            this.backing.length = 0;
            this.onChange();
        }
    }

    //> Finalization logic
    protected override onDestroy() {
        this.on_changed_.destroy();
    }
}

//> ListenSet
export type SetChangeHandler<T> = () => void;

export interface IReadonlyListenSet<T> extends Part, IListenable<ReadonlySet<T>> {
    readonly on_changed: ISubscribeOnlySignal<SetChangeHandler<T>>;

    readonly value: ReadonlySet<T>;
    readonly size: number;
}

export class ListenSet<T> extends Part implements IReadonlyListenSet<T> {
    private readonly on_changed_ = new Signal<SetChangeHandler<T>>(this);
    private readonly backing = new Set<T>();
    private backing_snapshot: ReadonlySet<T> | null = null;

    //> Listenable exports
    get on_changed(): ISubscribeOnlySignal<SetChangeHandler<T>> {
        return this.on_changed_;
    }

    get value(): ReadonlySet<T> {
        return this.backing;
    }

    get value_snapshot(): ReadonlySet<T> {
        if (this.backing_snapshot === null) {
            this.backing_snapshot = new Set(this.backing);
        }
        return this.backing_snapshot;
    }

    //> Queries
    get size(): number {
        return this.backing.size;
    }

    //> Mutators
    private onChange() {
        this.backing_snapshot = null;
        this.on_changed_.fire();
    }

    add(value: T): boolean {
        if (!this.backing.has(value)) {
            this.backing.add(value);
            this.onChange();
            return true;
        } else {
            return false;
        }
    }

    has(value: T) {
        return this.backing.has(value);
    }

    delete(instance: T): boolean {
        if (this.backing.delete(instance)) {
            this.onChange();
            return true;
        } else {
            return false;
        }
    }

    //> Finalization logic
    protected override onDestroy() {
        this.on_changed_.destroy();
    }
}
