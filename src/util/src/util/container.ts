import { ArrayExt } from "./array";
import { TypedKey } from "../primitive/key";

export class ArraySet<T extends object> implements Iterable<T> {
    private elements: T[] = [];

    constructor(
        private readonly index_key: TypedKey<number> = new TypedKey<number>(),
    ) {
    }

    indexOf(element: T): number | undefined {
        return this.index_key.read(element);
    }

    add(element: T): boolean {
        if (this.indexOf(element) === undefined) {
            this.index_key.write(element, this.elements.length);
            this.elements.push(element);
            return true;
        } else {
            return false;
        }
    }

    has(element: T): boolean {
        return this.indexOf(element) !== undefined;
    }

    delete(element: T): boolean {
        const index = this.indexOf(element);

        if (index !== undefined) {
            // Remove index key
            this.index_key.remove(element);

            // Swap remove from container
            ArrayExt.swapRemove(this.elements, index);
            if (index < this.elements.length) {
                this.index_key.write(this.elements[index]!, index);
            }
            return true;
        } else {
            return false;
        }
    }

    clear(): T[] {
        const old = this.elements;
        for (const element of this.elements) {
            this.index_key.remove(element);
        }
        this.elements = [];
        return old;
    }

    *[Symbol.iterator](): IterableIterator<T> {
        for (const element of this.elements) {
            yield element;
        }
    }

    get raw_elements(): readonly T[] {
        return this.elements;
    }

    get size(): number {
        return this.elements.length;
    }
}
