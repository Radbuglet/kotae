import { assert } from "../util";
import { ArgsListOf as ArgsListOf, callFunc } from "../util/function";
import { CleanupExecutor, Part } from "./node";

//> Core signals
const CONNECTIONS = Symbol("Signal.CONNECTIONS");

// These two interfaces exist exclusively for the purposes of variance checking.
export interface ISubscribeOnlySignal<F> {
    connect(handler: F): ISubscribeOnlyConnection<F>;
}

export interface ISubscribeOnlyConnection<F> extends Part { }

export class Signal<F> extends Part implements ISubscribeOnlySignal<F> {
    readonly [CONNECTIONS] = new Set<SignalConnection<F>>();

    connect(handler: F): SignalConnection<F> {
        const connection = new SignalConnection(this, handler);
        this[CONNECTIONS].add(connection);
        return connection;
    }

    fire(...args: ArgsListOf<F>) {
        for (const connection of this[CONNECTIONS]) {
            callFunc(connection.handler, ...args);
        }
    }

    protected override onCleanup(cx: CleanupExecutor) {
        cx.register(this, [], () => {
            for (const handler of this[CONNECTIONS]) {
                handler.destroy();
            }
        });
    }
}

export class SignalConnection<F> extends Part implements ISubscribeOnlyConnection<F> {
    constructor(
        readonly signal: Signal<F>,
        readonly handler: F,
    ) {
        super();
    }

    protected override onCleanup(cx: CleanupExecutor) {
        if (!this.signal.is_condemned) {
            cx.register(this, [], () => {
                this.signal[CONNECTIONS].delete(this);
            });
        }
    }
}

//> Listenable values
export interface IListenable<T> {
    readonly on_changed: ISubscribeOnlySignal<() => void>;
    readonly value: T;
}

export class ListenValue<T> extends Part implements IListenable<T> {
    readonly on_changed = this.ensureChild(new Signal<(target: T, old: T) => void>());
    private value_: T;

    constructor(value: T) {
        super();
        this.value_ = value;
    }

    get value(): T {
        return this.value_;
    }

    set value(target: T) {
        const old = this.value_;
        if (target !== old) {
            this.value_ = target;
            this.on_changed.fire(target, old);
        }
    }
}

export class ListenArray<T> extends Part implements IListenable<readonly T[]> {
    readonly on_changed = this.ensureChild(new Signal<() => void>());
    private readonly backing: T[] = [];

    set(index: number, value: T) {
        assert(index < value);

        if (this.backing[index] !== value) {
            this.backing[index] = value;
            this.on_changed.fire();
        }
    }

    push(value: T) {
        this.backing.push(value);
        this.on_changed.fire();
    }

    remove(index: number): T | undefined {
        const elem = this.backing.splice(index, 1)[0];
        if (elem !== undefined) {
            this.on_changed.fire();
        }

        return elem;
    }

    get value(): readonly T[] {
        return this.backing;
    }

    get length(): number {
        return this.backing.length;
    }
}
