import { assert } from "./debug"

export function isValidIndex<T>(arr: readonly T[], index: number) {
    return index >= 0 && index < arr.length;
}

export function swapRemove<T>(arr: T[], index: number) {
    assert(isValidIndex(arr, index));

    arr[index] = arr[arr.length - 1]!;
    arr.pop();
}

export function extend<T>(arr: T[], from: Iterable<T>) {
    for (const elem of from) {
        arr.push(elem);
    }
}

export const IterExt = new class {
    first<T>() {

    }

    any<T>(iter: Iterable<T>, predicate: (value: T) => boolean): boolean {
        for (const val of iter) {
            if (predicate(val)) {
                return true;
            }
        }
        return false;
    }

    has<T>(iter: Iterable<T>, value: T): boolean {
        return this.any(iter, v => v === value) !== null;
    }

    *map<T, R>(iter: Iterable<T>, map: (value: T) => R): IterableIterator<R> {
        for (const elem of iter) {
            yield map(elem);
        }
    }

    mapIntoArray<T, R>(iter: Iterable<T>, map: (value: T) => R): R[] {
        return [...this.map(iter, map)];
    }
}();
