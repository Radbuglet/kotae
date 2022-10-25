const PHANTOM_WRITE = Symbol();  // TypeScript is magical and its variance is jank.
const PHANTOM_READ = Symbol();

export interface IRawKey {
	readonly symbol: Symbol;

	has(target: object): boolean;
}

export interface IWriteKey<T> extends IRawKey {
	readonly [PHANTOM_WRITE]: (_: T) => void;

	write(target: object, value: T): void;
	remove(target: object): void;
}

export interface IReadKey<T> extends IRawKey {
	readonly [PHANTOM_READ]: () => T;

	read(target: object): T | undefined;
}

export class TypedKey<T> implements IWriteKey<T>, IReadKey<T> {
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
