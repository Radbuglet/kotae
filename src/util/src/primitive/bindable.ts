import { extend } from "../util/array";
import { ArraySet } from "../util/container";
import { assert } from "../util/debug";
import { TypedKey } from "./key";

//> CleanupExecutor
export type CleanupTask = () => void;

export class CleanupExecutor {
    private readonly key = new TypedKey<CleanupMeta>();
    private readonly ready_queue = new ArraySet<object>();
    private readonly not_ready_queue = new ArraySet<object>();
    private is_executing = false;

    private getMetaOrAttach(target: object): CleanupMeta {
        let meta = this.key.read(target);
        if (meta === undefined) {
            meta = new CleanupMeta();
            this.key.write(target, meta);
            this.ready_queue.add(target);
        }
        return meta;
    }

    private incrementRc(target: object) {
        const meta = this.getMetaOrAttach(target);

        // Increment RC
        meta.blocked_rc += 1;

        // Unregister from `ready_queue` if necessary
        if (meta.blocked_rc === 1) {
            this.ready_queue.delete(target);
            this.not_ready_queue.add(target);
        }
    }

    private decrementRc(target: object) {
        const blocked_meta = this.key.read(target)!;
        blocked_meta.blocked_rc -= 1;

        // Add it to the queue if it is ready.
        if (blocked_meta.blocked_rc === 0) {
            this.not_ready_queue.delete(target);
            this.ready_queue.add(target);
        }
    }

    register(target: object, needs: object[], task: CleanupTask) {
        assert(!this.is_executing);

        const target_meta = this.getMetaOrAttach(target);

        // Set task and update needs list
        assert(target_meta.task === null);
        target_meta.task = task;
        extend(target_meta.blocking, needs);

        // Increment dependents' RCs
        for (const needed of needs) {
            this.incrementRc(needed);
        }
    }

    execute() {
        assert(!this.is_executing);
        this.is_executing = true;

        // Run all tasks
        for (let i = 0; i < this.ready_queue.elements.length; i++) {
            const target = this.ready_queue.elements[i]!;
            const target_meta = this.key.read(target)!;
            assert(target_meta.blocked_rc === 0);

            // Run destructor task
            try {
                if (target_meta.task !== null) {
                    target_meta.task();
                }
            } catch (e) {
                console.error("Destructor for", target, "raised an exception", e);
            }

            // Unblock remaining tasks
            for (const blocked of target_meta.blocking) {
                this.decrementRc(blocked);
            }

            // Remove this object's metadata
            this.key.remove(target);
        }

        // Remove metadata from the tasks that haven't run.
        for (const unexecuted of this.not_ready_queue.elements) {
            console.error("Failed to execute destructor task on", unexecuted);
            this.key.remove(unexecuted);
        }

        // Reset the executor
        this.ready_queue.clear();
        this.not_ready_queue.clear();
        this.is_executing = false;
    }

    static run<R>(cb: (cx: CleanupExecutor) => R): R {
        const executor = new CleanupExecutor();
        let res;
        try {
            res = cb(executor);
        } finally {
            executor.execute();
        }
        return res;
    }
}

class CleanupMeta {
    public blocked_rc = 0;
    public readonly blocking: object[] = [];
    public task: CleanupTask | null = null;
}

//> Bindable
export const UNSAFE_BINDABLE_BACKING = Symbol("UNSAFE_BINDABLE_BACKING");

export type Weak<T extends Bindable> =
    { readonly is_alive: false, readonly unwrapped: T, readonly [UNSAFE_BINDABLE_BACKING]: T } |
    { readonly is_alive: true } & T

export class Bindable {
    private is_alive_ = true;

    // N.B. this impl is only called when the proxy has been stripped via
    // `UNSAFE_BINDABLE_BACKING`; otherwise, it's intercepted by the proxy.
    get [UNSAFE_BINDABLE_BACKING](): this {
        return this;
    }

    get unwrapped(): this {
        return this;
    }

    constructor() {
        const backing = this;

        const can_access = (target: this, key: string | symbol) => {
            return target.is_alive_ ||
                key === "is_alive" ||
                key === UNSAFE_BINDABLE_BACKING;
        };

        return new Proxy(backing, {
            get(target, key) {
                assert(can_access(target, key), "Attempted to access", key, "from finalized bindable", target);

                if (key === UNSAFE_BINDABLE_BACKING) {
                    return backing;
                }

                // Safety: provided by type checker
                return (backing as any)[key];
            },
            set(target, key, value) {
                assert(can_access(target, key), "Attempted to access", key, "from finalized bindable", target);

                (target as any)[key] = value;
                return true;
            }
        });
    }

    get is_alive(): boolean {
        return this.is_alive_;
    }

    asWeak(): Weak<this> {
        return this;
    }

    protected markFinalized() {
        assert(this.is_alive_);
        this.is_alive_ = false;
    }
}
