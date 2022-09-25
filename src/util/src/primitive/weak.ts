import { TypedKey } from "./entity";
import { Part } from "./node";

class Dctor extends Part {
    public suppressed: boolean = false;

    constructor(private readonly dctor: (me: Dctor, userdata: unknown) => void) {
        super();
    }

    protected onDestroyed(userdata: unknown) {
        if (!this.suppressed) {
            this.dctor(this, userdata);
        }
    }

    defuseAndDestroy() {
        this.suppressed = true;
        this.destroy(null);
    }
}

export class PartSet<T extends Part> extends Part {
    private readonly backing = new Set<T>();
    private readonly meta_key = new TypedKey<Dctor>();

    // Set management
    add(value: T) {
        if (this.backing.has(value)) return;

        // Attach deconstructor
        const dctor = new Dctor((dctor) => {
            this.backing.delete(dctor.parent as T);
        });
        this.meta_key.write(value, dctor);

        // Add to set
        this.backing.add(value);
    }

    has(value: T): boolean {
        return this.meta_key.has(value);
    }

    delete(value: T): boolean {
        const dctor = this.meta_key.read(value);
        if (dctor !== undefined) {
            this.backing.delete(value);
            dctor.defuseAndDestroy();

            return true;
        } else {
            return false;
        }
    }

    clear() {
        for (const elem of this.backing) {
            this.meta_key.read(elem)!.defuseAndDestroy();
        }
        this.backing.clear();
    }

    get size(): number {
        return this.backing.size;
    }

    // Set iteration
    [Symbol.iterator](): IterableIterator<T> {
        return this.backing[Symbol.iterator]();
    }

    entries(): IterableIterator<[T, T]> {
        return this.backing.entries();
    }

    keys(): IterableIterator<T> {
        return this.backing.keys();
    }

    values(): IterableIterator<T> {
        return this.backing.values();
    }

    // Handlers
    protected onDestroyed(_: unknown) {
        this.clear();
    }
}
