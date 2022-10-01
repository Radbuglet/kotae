//> Core signals

import { assert } from "../util/debug";
import { ArgsListOf, callFunc } from "../util/function";
import { Part } from "./node";
import { CleanupExecutor, PHANTOM_CLEANUP_TARGET, Weak } from "./bindable";

export interface ISubscribeOnlySignal<F> {
    connect(parent: Part | null, handler: F): Weak<ISubscribeOnlyConnection>;
}

export interface ISubscribeOnlyConnection extends Part { }

const CONNECTIONS = Symbol("Signal.CONNECTIONS");

//> Signal

export class Signal<F> extends Part implements ISubscribeOnlySignal<F> {
    readonly [PHANTOM_CLEANUP_TARGET]!: never;

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

    protected override preFinalize(cx: CleanupExecutor): void {
        cx.register(this, [], () => {
            // N.B. connection destruction is a finalization task, not a discovery task. This is
            // because destroying those connections would alter the state of the signal (it may or
            // may not be have a complete handler list) which may be undesirable for some users.
            for (const connection of this[CONNECTIONS]) {
                connection.destroy();
            }
            this.markFinalized();
        });
    }
}

export class SignalConnection<F> extends Part {
    readonly [PHANTOM_CLEANUP_TARGET]!: never;

    constructor(
        parent: Part | null,
        readonly signal: Weak<Signal<F>>,
        readonly handler: F) {
        super(parent);
    }

    protected override preFinalize(cx: CleanupExecutor): void {
        cx.register(this, [], () => {
            if (this.signal.is_alive) {
                this.signal[CONNECTIONS].delete(this);
            }
            this.markFinalized();
        });
    }
}

//> ListenValue

export type ValueChangeHandler<T> = (new_value: T, old_value: T) => void;

export interface IReadonlyListenValue<T> extends Part {
    readonly value: T;
    readonly on_changed: ISubscribeOnlySignal<ValueChangeHandler<T>>;
}

export class ListenValue<T> extends Part implements IReadonlyListenValue<T> {
    readonly [PHANTOM_CLEANUP_TARGET]!: never;

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

    protected override preFinalize(cx: CleanupExecutor): void {
        cx.register(this, [this.on_changed_], () => {
            this.markFinalized();
        });
    }
}

//> ListenArray

export type ListChangeHandler<T> = () => void;

export interface IReadonlyListenArray<T> extends Part {
    readonly on_changed: ISubscribeOnlySignal<ListChangeHandler<T>>;

    readonly values: readonly T[];
    readonly length: number;
}

export class ListenArray<T> extends Part implements IReadonlyListenArray<T> {
    readonly [PHANTOM_CLEANUP_TARGET]!: never;

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

    protected override preFinalize(cx: CleanupExecutor): void {
        cx.register(this, [this.on_changed_], () => {
            this.markFinalized();
        });
    }
}

//> ListenSet

export type SetChangeHandler<T> = () => void;

export interface IReadonlyListenSet<T> extends Part {
    readonly on_changed: ISubscribeOnlySignal<SetChangeHandler<T>>;

    readonly values: ReadonlySet<T>;
    readonly size: number;
}

export class ListenSet<T> extends Part implements IReadonlyListenSet<T> {
    readonly [PHANTOM_CLEANUP_TARGET]!: never;

    private readonly backing = new Set<T>();
    private readonly on_changed_ = new Signal<SetChangeHandler<T>>(this);

    get on_changed(): ISubscribeOnlySignal<SetChangeHandler<T>> {
        return this.on_changed_;
    }

    get values(): ReadonlySet<T> {
        return this.backing;
    }

    get size(): number {
        return this.backing.size;
    }

    add(value: T) {
        if (!this.backing.has(value)) {
            this.backing.add(value);
            this.on_changed_.fire();
        }
    }

    has(value: T) {
        return this.backing.has(value);
    }

    delete(instance: T): boolean {
        if (this.backing.delete(instance)) {
            this.on_changed_.fire();
            return true;
        } else {
            return false;
        }
    }

    protected override preFinalize(cx: CleanupExecutor): void {
        cx.register(this, [this.on_changed_], () => {
            this.markFinalized();
        });
    }
}
