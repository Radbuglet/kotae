const PHANTOM_WRITE = Symbol();  // TypeScript is magical and its variance is jank.
const PHANTOM_READ = Symbol();

export interface RawKey {
    readonly symbol: Symbol;
}

export interface WriteKey<T> extends RawKey {
    readonly [PHANTOM_WRITE]: (_: T) => void;

    write(target: object, value: T): void;
    remove(target: object): void;
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

    remove(target: object): void {
        delete (target as any)[this.symbol as any];
    }

    read(target: object): T | undefined {
        return (target as any)[this.symbol as any];
    }

    has(target: object): boolean {
        return this.read(target) !== undefined;
    }
}
