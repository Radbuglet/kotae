// TODO: Produce a release build

import { assert } from "../util/debug";
import { IRawKey, IReadKey, IWriteKey } from "./key";

//> Bindable
export const UNSAFE_BINDABLE_BACKING = Symbol("UNSAFE_BINDABLE_BACKING");

const DBG_ALIVE_SET = (window as any)["dbg_alive_set"] = new Set<Bindable>();

export type Weak<T extends Bindable> =
    ({ readonly is_alive: false, readonly [UNSAFE_BINDABLE_BACKING]: T, readonly unwrapped: T }) |
    // N.B. the `true | false` thing here is a *massive hack* to get around TypeScript self-type jank.
    // Essentially, when one attempts to construct the second intersection type, `this` resolves to a
    // type where `is_alive: true`, which is incompatible with `T` where `is_alive: true | false`.
    // At least... that's what I think is going on. I can't actually find any documentation on this
    // behavior. Anyways, `true | false` fixes everything but is still *good enough* for safety since
    // `is_alive: false` still allows the former case to resolve and narrow the type.
    ({ readonly is_alive: true | false } & T);

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
        DBG_ALIVE_SET.add(this);

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
        DBG_ALIVE_SET.delete(this[UNSAFE_BINDABLE_BACKING]);
    }
}

//> Part
let PART_ID_GEN = 0;

export type Finalizer = () => void;

export class Part extends Bindable {
    //> Properties & fields
    readonly part_id = PART_ID_GEN++;
    private parent_: Part | null = null;
    private entity_: Entity | null = null;
    private children_ = new Set<Part>();
    private is_condemned_ = false;
    private is_destroying_ = false;

    get parent(): Part | null {
        return this.parent_;
    }

    set parent(new_parent: Part | null) {
        if (assert(!this.is_condemned_, "Cannot move condemned parts!")) {
            return;
        }

        // TODO: Detect recursive trees

        // Update `Part.children`
        if (this.parent_ !== null) {
            this.parent_.children_.delete(this);
        }

        this.parent_ = new_parent;
        if (this.parent_ !== null) {
            this.parent_.children_.add(this);
        }

        // Update nearest entity
        const new_entity = this.parent_ === null
            ? null
            : (this.parent_ instanceof Entity ? this.parent_ : this.parent_.entity_);

        if (this.entity_ !== new_entity) {
            this.entity_ = new_entity;

            for (const descendant of this.descendants(false, descendant => !(descendant instanceof Entity))) {
                descendant.entity_ = this.entity_;
            }
        }
    }

    get children(): ReadonlySet<Part> {
        return this.children_;
    }

    get entity(): Entity {
        assert(this.entity_ !== null);
        return this.entity_!;
    }

    get opt_entity(): Entity | null {
        return this.entity_;
    }

    get is_condemned(): boolean {
        return this.is_condemned_;
    }

    //> Constructors
    constructor(parent: Part | null) {
        super();
        this.parent = parent;
    }

    //> Tree querying
    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target: Part | null = include_self ? this : this.parent_;

        while (target !== null) {
            yield target;
            target = target.parent_;
        }
    }

    *ancestorEntities(): IterableIterator<Entity> {
        let target: Entity | null = this.entity_;

        while (target !== null) {
            yield target;
            target = target.entity_;
        }
    }

    *descendants(include_self: boolean, filter: (part: Part) => boolean = () => true): IterableIterator<Part> {
        if (include_self) {
            yield this;
        }

        for (const child of this.children_) {
            if (filter(child)) {
                for (const descendant of child.descendants(true, filter)) {
                    yield descendant;
                }
            }
        }
    }

    //> Component querying
    tryDeepGet<T>(key: IReadKey<T>): T | undefined {
        for (const ancestor of this.ancestorEntities()) {
            const comp = ancestor.tryGet(key);
            if (comp !== undefined) {
                return comp;
            }
        }

        return undefined;
    }

    deepGet<T>(key: IReadKey<T>): T {
        const comp = this.tryDeepGet(key);
        assert(comp !== undefined, "Part", this, "is missing deep component with key", key);
        return comp!;
    }

    //> Finalization
    destroy() {
        // Condemn all the object's descendants if they haven't been condemned yet.
        if (!this.is_condemned_) {
            for (const descendant of this.descendants(true, descendant => !descendant.is_condemned_)) {
                descendant.is_condemned_ = true;
            }
        }

        // Prevent reentrancy
        assert(!this.is_destroying_, ".destroy() is not reentrant");
        this.is_destroying_ = true;

        // Call onDestroy
        try {
            if (this.onDestroy !== undefined) {
                this.onDestroy();
            }
        } finally {
            // Ensure that all descendants have been finalized
            for (const descendant of this.descendants(false, descendant => descendant.is_alive)) {
                assert(descendant.onDestroy === undefined, "Leaked", descendant);

                // TODO: Justify why this is a valid implementation despite a technical UAF
                // (`descendants` is implemented weirdly)
                descendant.markFinalizedInner();
            }

            // Mark ourselves as finalized.
            if (this.parent_ !== null) {
                this.parent_.children_.delete(this);
            }

            this.markFinalizedInner();
        }
    }

    protected override markFinalized(): void {
        console.error("Cannot call `markFinalized()` on a `Part` directly. Please go through `destroy()` instead.");
    }

    private markFinalizedInner() {
        super.markFinalized();
    }

    // This is actually a virtual method.
    protected onDestroy?(): void;
}

//> Entity
export class Entity extends Part {
    private finalizer: Finalizer | null = null;

    constructor(parent: Part | null, readonly debug_name: string) {
        super(parent);
    }

    add<T>(comp: T, keys: IWriteKey<T>[]): T {
        assert(!(comp instanceof Part) || comp.opt_entity === this);

        for (const key of keys) {
            assert(!this.has(key));
            key.write(this, comp);
        }
        return comp;
    }

    with<T>(comp: T, keys: IWriteKey<T>[]): this {
        this.add(comp, keys);
        return this;
    }

    tryGet<T>(key: IReadKey<T>): T | undefined {
        return key.read(this);
    }

    get<T>(key: IReadKey<T>): T {
        const comp = this.tryGet(key);
        assert(comp !== undefined, "Entity", this, "is missing component with key", key);
        return comp!;
    }

    has(key: IRawKey): boolean {
        return key.has(this);
    }

    setFinalizer(finalizer: Finalizer) {
        assert(this.finalizer === null, "Cannot specify more than one finalizer for a given `Entity`.");
        this.finalizer = finalizer;
    }

    protected override onDestroy() {
        if (this.finalizer !== null) {
            this.finalizer();
        }
    }

    override toString() {
        return `Entity(${this.debug_name})`;
    }
}
