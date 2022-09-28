// TODO: Maybe reimplement condemnation?

import { extend } from "../util/array";
import { ArraySet } from "../util/container";
import { assert } from "../util/debug";
import { TypedKey } from "./key";
import { Entity, Part } from "./node";
import { ISubscribeOnlySignal, Signal } from "./signal";

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

//> Dismounter
export type DismountHandler = (cx: CleanupExecutor) => void;

export class Dismounter {
    static readonly KEY = new TypedKey<Dismounter>();
    private readonly on_dismount_ = new Signal<DismountHandler>();
    private is_mounted_ = true;

    get on_dismount(): ISubscribeOnlySignal<DismountHandler> {
        return this.on_dismount_;
    }

    get is_mounted(): boolean {
        return this.is_mounted_;
    }

    dismount(cx: CleanupExecutor) {
        assert(this.is_mounted_);
        this.is_mounted_ = false;

        for (const handler of this.on_dismount_.iterHandlers()) {
            try {
                handler(cx);
            } catch (e) {
                console.error("Failed to run dismount handler", handler, "because of exception", e);
            }
        }
    }

    dismountAsRoot() {
        CleanupExecutor.run(cx => this.dismount(cx));
    }
}

export function registerCompDismounter(target: Part, handler: DismountHandler) {
    target.deepGet(Dismounter.KEY).on_dismount.connect(handler);
}

export function dismountRootIfPresent(target: Entity | undefined | null) {
    if (target != undefined) {
        target.get(Dismounter.KEY).dismountAsRoot();
    }
}

export function dismountIfPresent(target: Entity | undefined | null, cx: CleanupExecutor) {
    if (target != undefined) {
        target.get(Dismounter.KEY).dismount(cx);
    }
}
