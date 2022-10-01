import { ArraySet } from "../util/container";
import { assert, unreachable } from "../util/debug";
import { Bindable, CleanupExecutor } from "./bindable";
import { IReadKey, IWriteKey, TypedKey } from "./key";

//> Part

/**
 * The process's current deletion phase. See `<part>.destroy()` for more details.
 */
export enum DeletionPhase {
    NONE,
    DISCOVERY,
    FINALIZATION,
}

type DeletionCx = {
    readonly phase: DeletionPhase.NONE
} | {
    readonly phase: DeletionPhase.DISCOVERY,
    readonly executor: CleanupExecutor,
} | {
    readonly phase: DeletionPhase.FINALIZATION,
    readonly queued_deletions: Set<Part>,
};

let DELETION_CX: DeletionCx = { phase: DeletionPhase.NONE };

/**
 * A monotonically increasing `<part>.part_id` generator.
 */
let ID_GEN = 0;

/**
 * The symbol used to keep track of a `Part`'s index in the `.children` array set.
 */
const PART_CHILD_INDEX_KEY = new TypedKey<number>();

/**
 * A console-visible set of all live objects.
 */
// TODO: Remove in release builds (see Parcel's `process.env` polyfill for details)
const ALIVE_SET = (window as any)["dbg_alive_set"] = new Set<Part>();

/**
 * The base class of objects whose lifecycle can be expressed in terms of an object tree.
 * 
 * TODO: Write module docs
 */
export class Part extends Bindable {
    //> Fields

    /**
     * A process-unique identifier for this `Part`.
     * 
     * Can be used by React as a `ref` for the `Part`'s corresponding "view" component.
     */
    public readonly part_id = ID_GEN++;

    /**
     * The `Part`'s nearest `Entity` ancestor. If this part is an `Entity`, this points to its
     * parent's `parent_entity`.
     * 
     * Because `opt_parent_entity` is so frequently assumed to be non-null, we created an alias to
     * this raw field called `parent_entity` which asserts the non-existence of the `null` variant
     * (with debug checks, of course).
     */
    public readonly opt_parent_entity: Entity | null = null;

    /**
     * An asserted-non-null version of `opt_parent_entity`.
     */
    get parent_entity(): Entity {
        assert(this.opt_parent_entity !== null);
        return this.opt_parent_entity!;
    }

    /**
     * A set of the `Part`'s remaining non-condemned children.
     * 
     * If this property is ever exposed to the user, this should account for finalization status
     * instead.
     */
    private readonly remaining_children = new ArraySet<Part>(PART_CHILD_INDEX_KEY);

    /**
     * See public getter docs.
     */
    private is_condemned_ = false;

    /**
     * Whether the `Part` has been condemned to destruction by `<Part>.destroy()`. This can be
     * used by finalizers to skip expensive finalization steps for objects that won't even be
     * observed.
     */
    get is_condemned(): boolean {
        return this.is_condemned_;
    }

    /**
     * Gets the process's active deletion phase. See `<part>.destroy()` for more details.
     */
    static get deletion_phase(): DeletionPhase {
        return DELETION_CX.phase;
    }

    //> Constructors
    constructor(public readonly parent: Part | null) {
        super();

        ALIVE_SET.add(this);

        // Validate parent
        assert(parent === null || !parent.is_condemned_);

        // Add child to parent
        if (parent !== null) {
            parent.remaining_children.add(this);
        }

        // Find parent entity
        this.opt_parent_entity = parent !== null ?
            (parent instanceof Entity ? parent : parent.opt_parent_entity) :
            null;
    }

    //> Virtual methods

    /**
     * A virtual handler called on all descendants of a `<part>.destroy()`'ed part. The handler should
     * finalize anything immediately, instead registering all its finalization tasks with the provided
     * `CleanupExecutor`. It is allowed, however, to mark other objects for destruction since these
     * will not actually be finalized until the root call to `.destroy()` resolves.
     */
    protected preFinalize(cx: CleanupExecutor) {
        /* virtual method */
    }

    //> Tree querying

    /**
     * Iterates through the object's ancestors from nearest to furthest. Only includes the current
     * object if `include_self` is `true`.
     */
    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target: Part | null = include_self ? this : this.parent;

        while (target !== null) {
            yield target;
            target = target.parent;
        }
    }

    /**
     * Iterates through the object's ancestor `Entities` from nearest to furthest, including its own
     * `opt_parent_entity`. Mirroring the semantics of `opt_parent_entity`, if this current object is
     * an `Entity`, it is not included in this iterator.
     */
    *ancestorEntities(): IterableIterator<Entity> {
        let target: Entity | null = this.opt_parent_entity;

        while (target !== null) {
            yield target;
            target = target.opt_parent_entity;
        }
    }

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

    //> Lifecycle

    /**
     * Destroys the target `Part` and all its alive descendants.
     * 
     * This process is multi-step:
     * 
     * 1. The root-most call to `.destroy()` is made.
     * 2. The deletion phase is set to `DeletionPhase.DISCOVERY` and can be observed via
     *    `Part.deletion_phase`.
     * 3. Destruction candidates are discovered:
     *      1. The object is condemned. If it was already condemned, the destroy request is ignored.
     *      2. The object's `.preFinalize()` virtual method is called. This object can mark other objects
     *         as destruction candidates via `.destroy()` and register finalization tasks with the
     *         provided `CleanupExecutor`. Exceptions occurring during that call are caught and
     *         reported.
     *      3. The object's remaining children are also `.destroy()`'ed, causing this process to
     *         recurse. Note that condemned nodes cannot be parents of new parts.
     * 4. The deletion phase is set to `DeletionPhase.FINALIZATION` and can be observed via
     *    `Part.deletion_phase`.
     * 5. After control is returned from the root-most `.destroy()` call, the `CleanupExecutor` runs
     *    all registered finalization tasks according to their dependency order. A few notes:
     *      - All the rules and semantics imposed by `<CleanupExecutor>.execute()` apply here as well:
     *        in short, don't access objects you didn't register as finalization dependencies because
     *        they could be deleted before the finalizer is ran and exceptions are caught and
     *        reported.
     *      - Calls to `.destroy()` in these finalizers are queued until the finalizer executor has
     *        finished running and ran before control is returned to the original caller. Use this
     *        feature with disgression.
     *      - Finalizers should feel free to call their instance's `<Bindable>.markFinalized()`
     *        method to enforce additional safety.
     *      - Finally, finalizers can use a dependency's `<Part>.is_condemned` field to determine whether
     *        they wish to actually update it or ignore the updates.
     * 6. The deletion phase is set to `DeletionPhase.NONE` and can be observed via `Part.deletion_phase`.
     * 7. If the finalization pass registered additional parts to destroy, these will be handled here
     *    before returning to the root caller using the same procedure described above.
     * 8. Control is returned to the original caller.
     * 
     * This method never raises exceptions.
     */
    // TODO: This still needs considerable code review & unit testing.
    destroy() {
        // Ignore double-deletions
        if (this.is_condemned) return;

        // Handle cases
        if (DELETION_CX.phase === DeletionPhase.NONE) {
            // We're starting a whole new deletion request.

            // Remove from the parent's remaining children set.
            if (this.parent !== null) {
                this.parent.remaining_children.delete(this);
            }

            // Discover deletion candidates recursively
            const executor = new CleanupExecutor();
            DELETION_CX = { phase: DeletionPhase.DISCOVERY, executor };
            this.destroyDiscovery(executor);

            // Handle the finalizer-rediscovery loop
            while (true) {
                // Run the finalizers
                DELETION_CX = { phase: DeletionPhase.FINALIZATION, queued_deletions: new Set() };
                executor.execute();  // This also can't raise exceptions.

                // Mark affected `Parts` as finalized
                // TODO

                // Rediscover new destruction candidates if they were registered.
                const candidates = DELETION_CX.queued_deletions;
                if (candidates.size > 0) {
                    // Yes, context reuse works perfectly well.
                    DELETION_CX = { phase: DeletionPhase.DISCOVERY, executor };

                    for (const candidate of candidates) {
                        candidate.destroyDiscovery(DELETION_CX.executor);
                    }

                    // Fallthrough to the finalizer rerun at the top of the loop.
                    continue;
                } else {
                    // Otherwise, finish this process.
                    break;
                }
            }

            // Return control to the user
            DELETION_CX = { phase: DeletionPhase.NONE };
            return;
        } else if (DELETION_CX.phase === DeletionPhase.DISCOVERY) {
            this.destroyDiscovery(DELETION_CX.executor);
        } else if (DELETION_CX.phase === DeletionPhase.FINALIZATION) {
            // We're finalizing objects. Queue the deletion for later.
            DELETION_CX.queued_deletions.add(this);
        } else {
            unreachable();
        }
    }

    private destroyDiscovery(executor: CleanupExecutor) {
        // We're discovering new objects to delete.
        assert(DELETION_CX.phase === DeletionPhase.DISCOVERY);

        // Ignore double-deletions
        if (this.is_condemned) return;

        // Condemn this object to prevent reentrancy
        this.is_condemned_ = true;
        ALIVE_SET.delete(this);

        // Run the virtual finalizer
        try {
            this.preFinalize(executor);
        } catch (e) {
            console.error("Exception raised while running", this, "'s .preFinalize() handler:", e);
        }

        // Mark children for destruction
        for (const child of this.remaining_children) {
            // TODO: Handle stack overflows??
            child.destroyDiscovery(executor);
        }
    }

    /**
     * Makes the current object's properties inaccessible. This must only be called during the
     * finalization phase of `<part>.destroy()`'s routine (see `<part>.destroy()`'s documentation
     * for details on the lifecycle) and will emit a warning if that rule is not followed.
     * 
     * See `<bindable>.markFinalized` for details.
     */
    override markFinalized(): void {
        assert(Part.deletion_phase === DeletionPhase.FINALIZATION);
        super.markFinalized();
    }
}

export class Entity extends Part {
    add<T>(comp: T, keys: IWriteKey<T>[]): T {
        assert(!(comp instanceof Part) || comp.parent_entity === this);

        for (const key of keys) {
            key.write(this, comp);
        }
        return comp;
    }

    tryGet<T>(key: IReadKey<T>): T | undefined {
        return key.read(this);
    }

    get<T>(key: IReadKey<T>): T {
        const comp = this.tryGet(key);
        assert(comp !== undefined, "Entity", this, "is missing component with key", key);
        return comp!;
    }

    has<T>(key: IReadKey<T>): boolean {
        return key.has(this);
    }
}
