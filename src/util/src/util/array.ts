import { assert } from "./debug"

export const ArrayExt = new class {
	extend<T>(arr: T[], from: Iterable<T>) {
		for (const elem of from) {
			arr.push(elem);
		}
	}

	swapRemove<T>(arr: T[], index: number) {
		assert(this.isValidIndex(arr, index));

		arr[index] = arr[arr.length - 1]!;
		arr.pop();
	}

	isValidIndex<T>(arr: readonly T[], index: number) {
		return index >= 0 && index < arr.length;
	}
};

export const IterExt = new class {
	any<T>(iter: Iterable<T>, predicate: (value: T) => boolean): boolean {
		for (const val of iter) {
			if (predicate(val)) {
				return true;
			}
		}
		return false;
	}

	has<T>(iter: Iterable<T>, value: T): boolean {
		return this.any(iter, v => v === value);
	}

	*map<T, R>(iter: Iterable<T>, map: (value: T) => R): IterableIterator<R> {
		for (const elem of iter) {
			yield map(elem);
		}
	}

	*enumerate<T>(iter: Iterable<T>): IterableIterator<readonly [T, number]> {
		let i = 0;
		for (const elem of iter) {
			yield [elem, i++];
		}
	}

	mapIntoArray<T, R>(iter: Iterable<T>, map: (value: T) => R): R[] {
		return [...this.map(iter, map)];
	}
}();
