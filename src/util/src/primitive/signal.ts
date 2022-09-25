import { AnyFunc, ArgsList } from "../util/function";
import { swapRemove } from "../util/array";
import { Part } from "./node";

// The TypeScript "friend class" system, friends.
const CONNECTIONS = Symbol("CONNECTIONS");
const CONNECTION_INDEX = Symbol("CONNECTION_INDEX");

export class Signal<F extends AnyFunc> extends Part {
    private [CONNECTIONS]: SignalConnection<F>[] = [];

    // TODO: Determine semantics of mid-fire disconnection
    connect(handler: F): SignalConnection<F> {
        const connection = new SignalConnection(this, handler);
        connection[CONNECTION_INDEX] = this[CONNECTIONS].length;
        this[CONNECTIONS].push(connection);

        return connection;
    }

    fire(...args: ArgsList<F>) {
        for (const connection of this[CONNECTIONS]) {
            connection.handler(...args);  // FIXME: Why does this typecheck?!
        }
    }

    disconnectAll() {
        const connections = this[CONNECTIONS];
        this[CONNECTIONS] = [];

        for (const connection of connections) {
            connection.destroy(null);
        }
    }

    protected onDestroyed(_: unknown) {
        this.disconnectAll();
    }
}

export class SignalConnection<F extends AnyFunc> extends Part {
    public [CONNECTION_INDEX] = -1;

    constructor(
        public readonly signal: Signal<F>,
        public readonly handler: F,
    ) {
        super();
    }

    protected onDestroyed(_: unknown) {
        const index = this[CONNECTION_INDEX];
        if (index < 0) return;

        const connections = this.signal[CONNECTIONS];

        swapRemove(connections, index);
        if (index < connections.length) {
            connections[index][CONNECTION_INDEX] = index;
        }
    }
}
