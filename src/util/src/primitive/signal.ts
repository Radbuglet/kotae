import { ArgsListOf as ArgsListOf, callFunc } from "../util/function";
import { CleanupExecutor, Part } from "./node";

const CONNECTIONS = Symbol("Signal.CONNECTIONS");

export class Signal<F> extends Part {
    public readonly [CONNECTIONS] = new Set<SignalConnection<F>>();

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

export class SignalConnection<F> extends Part {
    constructor(
        public readonly signal: Signal<F>,
        public readonly handler: F,
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

export class ListenValue<T> extends Part {
    public readonly on_changed = this.ensureChild(new Signal<(target: T, old: T) => void>());
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
        this.value_ = target;
        this.on_changed.fire(target, old);
    }
}
