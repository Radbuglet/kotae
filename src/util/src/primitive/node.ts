import { assert } from "../util/debug";
import { IReadKey, IWriteKey } from "./key";

//> Part
let ID_GEN = 0;

export class Part {
    readonly part_id = ID_GEN++;
    private readonly parent_entity_: Entity | null = null;

    constructor(public readonly parent: Part | null) {
        // Find parent entity
        for (const ancestor of this.ancestors(false)) {
            if (ancestor instanceof Entity) {
                this.parent_entity_ = ancestor;
                break;
            }
        }
    }

    get parent_entity(): Entity {
        assert(this.parent_entity_ !== null);
        return this.parent_entity_!;
    }

    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target: Part | null = include_self ? this : this.parent;

        while (target !== null) {
            yield target;
            target = target.parent;
        }
    }

    tryDeepGet<T>(key: IReadKey<T>): T | undefined {
        for (const ancestor of this.ancestors(true)) {
            if (!(ancestor instanceof Entity)) continue;

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
