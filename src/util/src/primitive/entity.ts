import { assert } from "../util/debug";
import { Part } from "./node";

const PHANTOM_WRITE = Symbol();  // TypeScript is magical and its variance is jank.
const PHANTOM_READ = Symbol();

export interface RawKey {
    readonly symbol: Symbol;
}

export interface WriteKey<T> extends RawKey {
    readonly [PHANTOM_WRITE]: (_: T) => void;

    write(target: object, value: T): void;
}

export interface ReadKey<T> extends RawKey {
    readonly [PHANTOM_READ]: () => T;

    read(target: object): T | undefined;
    has(target: object): boolean;
}

export class TypedKey<T> implements WriteKey<T>, ReadKey<T> {
    readonly [PHANTOM_WRITE]!: (_: T) => void;
    readonly [PHANTOM_READ]!: () => T;

    readonly symbol: Symbol;

    constructor(name?: string) {
        this.symbol = Symbol(name);
    }

    write(target: object, value: T): void {
        (target as any)[this.symbol as any] = value;
    }

    read(target: object): T | undefined {
        return (target as any)[this.symbol as any];
    }

    has(target: object): boolean {
        return this.read(target) !== undefined;
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
