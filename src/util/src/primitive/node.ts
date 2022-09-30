import { ArraySet } from "../util/container";
import { assert } from "../util/debug";
import { Bindable, CleanupExecutor } from "./bindable";
import { IReadKey, IWriteKey, TypedKey } from "./key";

//> Part
let ID_GEN = 0;

const PART_CHILD_INDEX_KEY = new TypedKey<number>();

// TODO: Implement a unified debugging mechanism
const ALIVE_SET = (window as any)["dbg_alive_set"] = new Set<Part>();

export class Part extends Bindable {
    //> Fields
    public readonly part_id = ID_GEN++;
    public readonly opt_parent_entity: Entity | null = null;
    private readonly children_ = new ArraySet<Part>(PART_CHILD_INDEX_KEY);
    private is_condemned_ = false;

    //> Constructors
    constructor(public readonly parent: Part | null) {
        super();

        ALIVE_SET.add(this);

        // Validate parent
        assert(parent === null || !parent.is_condemned_);

        // Add child to parent
        if (parent !== null) {
            parent.children_.add(this);
        }

        // Find parent entity
        this.opt_parent_entity = parent !== null ?
            (parent instanceof Entity ? parent : parent.opt_parent_entity) :
            null;
    }

    //> Virtual methods
    protected onDestroy(cx: CleanupExecutor) {
        /* virtual method */
    }

    //> Tree querying
    get parent_entity(): Entity {
        assert(this.opt_parent_entity !== null);
        return this.opt_parent_entity!;
    }

    get children(): readonly Part[] {
        return this.children_.elements;
    }

    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target: Part | null = include_self ? this : this.parent;

        while (target !== null) {
            yield target;
            target = target.parent;
        }
    }

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
    get is_condemned(): boolean {
        return this.is_condemned_;
    }

    destroy() {
        // Ignore double-deletions
        if (this.is_condemned) return;

        // Fetch our parent now in case the user decides to invalidate us.
        const parent = this.parent?.asWeak();

        // Collect descendants & condemn them
        const descendants: Part[] = [];
        const condemnDeep = (target: Part) => {
            target.is_condemned_ = true;
            descendants.push(target);

            for (const child of target.children) {
                condemnDeep(child);
            }
        };

        condemnDeep(this);

        // Run user tear-down code
        // N.B. as soon as we run this, users are more than encouraged to invalidate themselves.
        // Assume the worst-case scenario!
        try {
            // Collect destructors & run
            CleanupExecutor.run(cx => {
                for (const descendant of descendants) {
                    descendant.onDestroy(cx);
                }
            });
        } finally {
            // Remove from parent if it's still alive
            if (parent !== undefined && parent.is_alive) {
                parent.children_.delete(this);
            }

            // Finalize remaining parts
            for (const descendant of descendants) {
                ALIVE_SET.delete(descendant);

                if (descendant.is_alive) {
                    descendant.markFinalized();
                }
            }
        }
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
