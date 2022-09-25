import { assert } from "../util/debug";
import { Part } from "./node";

const PHANTOM_WRITE = Symbol();  // TypeScript is magical and its variance is jank.
const PHANTOM_READ = Symbol();

export interface RawKey {
    readonly key: Symbol;
}

export interface WriteKey<T> extends RawKey {
    readonly [PHANTOM_WRITE]: (_: T) => void;
}

export interface ReadKey<T> extends RawKey {
    readonly [PHANTOM_READ]: () => T;
}

export class TypedKey<T> implements WriteKey<T>, ReadKey<T> {
    readonly [PHANTOM_WRITE]!: (_: T) => void;
    readonly [PHANTOM_READ]!: () => T;

    readonly key = Symbol();
}

export class Entity extends Part {
    register<T>(comp: T, ...keys: WriteKey<T>[]): T {
        for (const key of keys) {
            (this as any)[key.key as any] = comp;
        }
        return comp;
    }

    add<T extends Part>(comp: T, ...keys: WriteKey<T>[]): T {
        comp.ensureParent(this);
        return this.register(comp, ...keys);
    }

    tryGet<T>(key: ReadKey<T>): T | undefined {
        return (this as any)[key.key as any];
    }

    get<T>(key: ReadKey<T>): T {
        const comp = this.tryGet(key);
        assert(comp !== undefined, "Entity", this, "is missing component with key", key);
        return comp!;
    }
}
