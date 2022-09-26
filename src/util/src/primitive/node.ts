import { extend } from "../util/array";
import { assert, todo } from "../util/debug";
import { ArraySet } from "../util/container";
import { TypedKey, ReadKey, WriteKey } from "./key";

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
}

class CleanupMeta {
    public blocked_rc = 0;
    public readonly blocking: object[] = [];
    public task: CleanupTask | null = null;
}

export class Part {
    //> Fields
    private parent_: Part | null = null;
    private readonly children_ = new ArraySet<Part>();

    //> Tree management
    get parent(): Part | null {
        return this.parent_;
    }

    set parent(new_parent: Part | null) {
        if (this.parent === new_parent) return;

        // Remove from old parent
        if (this.parent !== null) {
            this.parent.children_.delete(this);
        }

        // Add to new parent
        if ((this.parent = new_parent) !== null) {
            this.parent.children_.add(this);
        }
    }

    get children(): readonly Part[] {
        return this.children_.elements;
    }

    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target = include_self ? this : this.parent_;

        while (target !== null) {
            yield target;
            target = target.parent_;
        }
    }

    ensureChild<T extends Part>(part: T): T {
        part.ensureParent(this);
        return part;
    }

    ensureParent(desired: Part | null) {
        assert(this.parent_ === null || this.parent_ === desired);
        this.parent = desired;
    }

    orphan() {
        this.parent = null;
    }

    //> Lifecycle management
    protected onCleanup(cx: CleanupExecutor) { /* virtual method */ }

    get is_condemned(): boolean {
        return todo();
    }

    destroy() {
        todo();
    }
}

export class Entity extends Part {
    register<T>(comp: T, ...keys: WriteKey<T>[]): T {
        for (const key of keys) {
            key.write(this, comp);
        }
        return comp;
    }

    add<T extends Part>(comp: T, ...keys: WriteKey<T>[]): T {
        comp.ensureParent(this);
        return this.register(comp, ...keys);
    }

    tryGet<T>(key: ReadKey<T>): T | undefined {
        return key.read(this);
    }

    get<T>(key: ReadKey<T>): T {
        const comp = this.tryGet(key);
        assert(comp !== undefined, "Entity", this, "is missing component with key", key);
        return comp!;
    }

    has<T>(key: ReadKey<T>): boolean {
        return key.has(this);
    }
}
