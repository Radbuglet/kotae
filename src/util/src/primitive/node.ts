import { swapRemove } from "../util/array";
import { assert } from "../util/debug";

export enum BindableState {
    Inert,
    Bound,
    DestroyingInert,
    DestroyingBound,
    Destroyed,
}

export class Bindable {
    private state_ = BindableState.Inert;

    get state(): BindableState {
        return this.state_;
    }

    get is_bound(): boolean {
        return this.state_ === BindableState.Bound ||
            this.state_ === BindableState.DestroyingBound;
    }

    get is_alive(): boolean {
        return this.state_ !== BindableState.Destroyed;
    }

    get is_destroying(): boolean {
        return this.state_ === BindableState.DestroyingInert || this.state_ === BindableState.DestroyingBound;
    }

    get is_condemend(): boolean {
        return this.is_destroying || this.state_ === BindableState.Destroyed;
    }

    protected onBound(userdata: unknown) { /* virtual */ }
    protected onUnbound(userdata: unknown) { /* virtual */ }
    protected onDestroyed(userdata: unknown) { /* virtual */ }

    attach(userdata: unknown) {
        assert(this.state_ === BindableState.Inert, "can only attach inert Bindables. State:", this.state_);
        this.state_ = BindableState.Bound;
        this.onBound(userdata);
    }

    destroy(userdata: unknown) {
        assert(this.state_ === BindableState.Inert || this.state_ === BindableState.Bound);

        // Mark destuction state
        if (this.state_ === BindableState.Inert) {
            this.state_ = BindableState.DestroyingInert;
        } else if (this.state_ === BindableState.Bound) {
            this.state_ = BindableState.DestroyingBound;
        }

        // Destroy
        try {
            if (this.state_ === BindableState.DestroyingBound) {
                this.onUnbound(userdata);
            }

            this.onDestroyed(userdata);
        } finally {
            this.state_ = BindableState.Destroyed;
        }
    }

    ensureAlive(...data: any[]) {
        assert(this.is_alive, ...data);
    }
}

export class Part extends Bindable {
    private parent_: Part | null = null;
    private children_: Part[] = [];
    private index_in_parent: number = 0;

    get parent(): Part | null {
        return this.parent_;
    }

    set parent(new_parent: Part | null) {
        assert(new_parent === null || this.is_alive, "dead `Parts` cannot have parents");

        const old_parent = this.parent_;
        if (old_parent === new_parent) return;

        // Remove from old parent
        if (old_parent !== null) {
            swapRemove(old_parent.children_, this.index_in_parent);

            if (this.index_in_parent < old_parent.children_.length) {
                old_parent.children_[this.index_in_parent].index_in_parent = this.index_in_parent;
            }
        }

        // Add to new parent
        this.parent_ = new_parent;
        if (new_parent !== null) {
            this.index_in_parent = new_parent.children_.length;
            new_parent.children_.push(this);

            // Inherit liveness state
            if (!this.is_bound && new_parent.is_bound) {
                this.attach(null);
            }
        }
    }

    get children(): readonly Part[] {
        return this.children_;
    }

    *ancestors(include_self: boolean): IterableIterator<Part> {
        let target = include_self ? this : this.parent_;

        while (target !== null) {
            yield target;
            target = target.parent_;
        }
    }

    ensureParent(desired: Part | null) {
        assert(this.parent_ === null || this.parent_ === desired);
        this.parent = desired;
    }

    orphan() {
        this.parent = null;
    }

    // TODO: Define a better lifecycle.
    protected onBound(userdata: unknown): void {
        for (const child of this.children) {
            child.attach(userdata);
        }
    }

    protected onDestroyed(userdata: unknown): void {
        try {
            for (const child of this.children) {
                child.destroy(userdata);
            }
        } finally {
            this.parent = null;
        }
    }
}
