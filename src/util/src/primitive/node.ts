import { collect, extend } from "../util/array";
import { assert, todo } from "../util/debug";
import { ArraySet } from "../util/container";
import { TypedKey, ReadKey, WriteKey } from "./key";

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
}

class CleanupMeta {
    public blocked_rc = 0;
    public readonly blocking: object[] = [];
    public task: CleanupTask | null = null;
}

//> Part
type ROOT_NODE_MARKER = typeof Part.ROOT_NODE_MARKER;
export type PartOrRoot<T = Part> = T | ROOT_NODE_MARKER;

let DEFAULT_ORPHANAGE: Orphanage | null = null;
let PART_ID_GEN = 0;

export class Part {
    static readonly ROOT_NODE_MARKER = Symbol("root node");

    static get DEFAULT_ORPHANAGE(): Orphanage {
        assert(DEFAULT_ORPHANAGE !== null);
        return DEFAULT_ORPHANAGE!;
    }

    //> Fields
    private parent_: Part | ROOT_NODE_MARKER = Part.ROOT_NODE_MARKER;
    private readonly children_ = new ArraySet<Part>();
    public readonly part_id: number = PART_ID_GEN++;

    //> Constructors
    constructor(initial_parent: Part | ROOT_NODE_MARKER = Part.DEFAULT_ORPHANAGE) {
        this.parent = initial_parent;
    }

    //> Tree management
    get parent(): Part | ROOT_NODE_MARKER {
        return this.parent_;
    }

    set parent(new_parent: Part | ROOT_NODE_MARKER) {
        if (this.parent_ === new_parent) return;

        // Remove from old parent
        if (this.parent_ !== Part.ROOT_NODE_MARKER) {
            this.parent_.children_.delete(this);
        }

        // Add to new parent
        if ((this.parent_ = new_parent) !== Part.ROOT_NODE_MARKER) {
            this.parent_.children_.add(this);
        }
    }

    get children(): readonly Part[] {
        return this.children_.elements;
    }

    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target = include_self ? this : this.parent_;

        while (target !== Part.ROOT_NODE_MARKER) {
            yield target;
            target = target.parent_;
        }
    }

    *descendants(include_self: boolean): IterableIterator<Part> {
        if (include_self) {
            yield this;
        }

        type StackElement = { readonly target: Part, index: number };
        const stack: StackElement[] = [{ target: this, index: 0 }];

        while (stack.length > 0) {
            const last_frame = stack[stack.length - 1]!;
            const { target, index } = last_frame;

            if (index < target.children.length) {
                // Consume this child
                last_frame.index += 1;

                // Yield this child
                const new_target = target.children[index]!;
                yield new_target;

                // If the child has children, recurse into it.
                if (new_target.children.length > 0) {
                    stack.push({ target: new_target, index: 0 });
                }
            } else {
                // Traverse to the child's parent.
                stack.pop();
            }
        }
    }

    ensureChild<T extends Part>(part: T): T {
        part.ensureParent(this);
        return part;
    }

    ensureParent(desired: Part | ROOT_NODE_MARKER) {
        assert(
            this.parent_ === Part.ROOT_NODE_MARKER ||
            this.parent_ === desired ||
            this.parent_ instanceof Orphanage
        );
        this.parent = desired;
    }

    //> Entity integration
    deepGet<T>(key: ReadKey<T>): T {
        for (const ancestor of this.ancestors(true)) {
            if (!(ancestor instanceof Entity)) continue;
            const comp = ancestor.tryGet(key);
            if (comp !== undefined) {
                return comp;
            }
        }
        throw "ahh";  // FIXME
    }

    //> Orphan management
    static reapLeakedOrphans() {
        const reaped = Part.DEFAULT_ORPHANAGE.children;

        if (reaped.length > 0) {
            console.warn(
                "Reaping",
                reaped.length,
                reaped.length === 1 ? "orphan" : "orphans",
                "which",
                reaped.length === 1 ? "was" : "were",
                "left in the `Part.DEFAULT_ORPHANAGE` and prone to being leaked.",
                reaped,
            );

            for (const orphan of Part.DEFAULT_ORPHANAGE.children) {
                orphan.destroy();
            }
        }
    }

    static fallibleSync<R>(f: (orphanage: Orphanage) => R): R {
        const orphanage = new Orphanage();
        let res: R;
        try {
            res = f(orphanage);
        } finally {
            orphanage.destroy();
        }

        return res;
    }

    // Woo! Function colors!
    static async fallibleAsync<R>(f: (orphanage: Orphanage) => Promise<R>): Promise<R> {
        const orphanage = new Orphanage();
        let res: R;
        try {
            res = await f(orphanage);
        } finally {
            orphanage.destroy();
        }

        return res;
    }

    //> Lifecycle management
    protected onCleanup(cx: CleanupExecutor) { /* virtual method */ }

    get is_condemned(): boolean {
        return todo();
    }

    destroy() {
        assert(this !== Part.DEFAULT_ORPHANAGE);  // TODO: Can we remove this special case?

        const targets = collect(this.descendants(true));

        todo();
    }
}

export class Orphanage extends Part {
    constructor() {
        super(Part.ROOT_NODE_MARKER);
    }
}

DEFAULT_ORPHANAGE = new Orphanage();

//> Entity
export class Entity extends Part {
    register<T>(comp: T, keys: WriteKey<T>[]): T {
        for (const key of keys) {
            key.write(this, comp);
        }
        return comp;
    }

    registerAndAttach<T extends Part>(comp: T, keys: WriteKey<T>[]): T {
        comp.ensureParent(this);
        return this.register(comp, keys);
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
