import { swapRemove } from "./array";
import { TypedKey } from "../primitive/key";

export class ArraySet<T extends object> {
    private elements_: T[] = [];

    constructor(
        private readonly index_key: TypedKey<number> = new TypedKey<number>(),
    ) {
    }

    indexOf(element: T): number | undefined {
        return this.index_key.read(element);
    }

    add(element: T): boolean {
        if (this.indexOf(element) === undefined) {
            this.index_key.write(element, this.elements_.length);
            this.elements_.push(element);
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
            swapRemove(this.elements_, index);
            if (index < this.elements_.length) {
                this.index_key.write(this.elements_[index], index);
            }
            return true;
        } else {
            return false;
        }
    }

    clear() {
        for (const element of this.elements) {
            this.index_key.remove(element);
        }
        this.elements_ = [];
    }

    get elements(): readonly T[] {
        return this.elements_;
    }

    get size(): number {
        return this.elements_.length;
    }
}
