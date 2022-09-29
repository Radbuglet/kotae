import { ArraySet } from "../util/container";
import { assert } from "../util/debug";
import { Bindable, CleanupExecutor } from "./bindable";
import { IReadKey, IWriteKey, TypedKey } from "./key";

//> Part
let ID_GEN = 0;

const PART_CHILD_INDEX_KEY = new TypedKey<number>();

export class Part extends Bindable {
    //> Fields
    public readonly part_id = ID_GEN++;
    public readonly opt_parent_entity: Entity | null = null;
    private readonly children_ = new ArraySet<Part>(PART_CHILD_INDEX_KEY);
    private is_condemned_ = false;

    //> Constructors
    constructor(public readonly parent: Part | null) {
        super();

        // Validate parent
        assert(parent === null || !parent.is_condemned_);

        // Add child to parent
        if (parent !== null) {
            parent.children_.add(this);
        }

        // Find parent entity
        for (const ancestor of this.ancestors(false)) {
            if (ancestor instanceof Entity) {
                this.opt_parent_entity = ancestor;
                break;
            }
        }
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
        try {
            // Collect destructors & run
            CleanupExecutor.run(cx => {
                for (const descendant of descendants) {
                    descendant.onDestroy(cx);
                }
            });
        } finally {
            // Remove from parent
            if (this.parent !== null) {
                this.parent.children_.delete(this);
            }

            // Finalize remaining parts
            // (we have to immediately return after this or everything breaks!)
            for (const descendant of descendants) {
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
