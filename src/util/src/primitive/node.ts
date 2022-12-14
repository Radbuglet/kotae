// TODO: Produce a release build

import { IterExt } from "../util";
import { assert, error } from "../util/debug";
import { IRawKey, IReadKey, IWriteKey } from "./key";

//> Bindable
export const UNSAFE_BINDABLE_BACKING = Symbol("UNSAFE_BINDABLE_BACKING");

export type Weak<T extends Bindable> =
	({ readonly is_alive: false, readonly [UNSAFE_BINDABLE_BACKING]: T, readonly unwrapped: T }) |
	// N.B. the `true | false` thing here is a *massive hack* to get around TypeScript self-type jank.
	// Essentially, when one attempts to construct the second intersection type, `this` resolves to a
	// type where `is_alive: true`, which is incompatible with `T` where `is_alive: true | false`.
	// At least... that's what I think is going on. I can't actually find any documentation on this
	// behavior. Anyways, `true | false` fixes everything but is still *good enough* for safety since
	// `is_alive: false` still allows the former case to resolve and narrow the type.
	({ readonly is_alive: true | false } & T);

export class Bindable {
	private is_alive_ = true;

	// N.B. this impl is only called when the proxy has been stripped via
	// `UNSAFE_BINDABLE_BACKING`; otherwise, it's intercepted by the proxy.
	get [UNSAFE_BINDABLE_BACKING](): this {
		return this;
	}

	get unwrapped(): this {
		return this;
	}

	constructor() {
		const backing = this;

		const can_access = (target: this, key: string | symbol) => {
			return target.is_alive_ ||
				key === "is_alive" ||
                                key === "is_alive_" ||
				key === UNSAFE_BINDABLE_BACKING;
		};

		return new Proxy(backing, {
			get(target, key, receiver) {
				assert(can_access(target, key), "Attempted to access", key, "from finalized bindable", target);

				if (key === UNSAFE_BINDABLE_BACKING) {
					return backing;
				}

				// Safety: provided by type checker

				// N.B. This ensures that custom setters will interpret `this` as the proxy rather
				// than the underlying target.
				return Reflect.get(target, key, receiver);
			},
			set(target, key, value, receiver) {
				assert(can_access(target, key), "Attempted to access", key, "from finalized bindable", target);

				// Safety: provided by type checker

				// N.B. This ensures that custom setters will interpret `this` as the proxy rather
				// than the underlying target.
				return Reflect.set(target, key, value, receiver);
			},
		});
	}

	get is_alive(): boolean {
		return this.is_alive_;
	}

	asWeak(): Weak<this> {
		return this;
	}

	protected markFinalized() {
		assert(this.is_alive_);
		this.is_alive_ = false;
	}
}

//> Part
let PART_ID_GEN = 0;

const PART_ID_MAP = (globalThis as any)["KOTAE_DBG_PART_ID_MAP"] = new Map<number, Part>();

export type Finalizer = () => void;

export class Part extends Bindable {
	//> Properties & fields
	readonly part_id = PART_ID_GEN++;
	private parent_: Part | null = null;
	private entity_: Entity | null = null;
	private children_ = new Set<Part>();
	private is_condemned_ = false;
	private is_destroying_ = false;

	get parent(): Part | null {
		return this.parent_;
	}

	set parent(new_parent: Part | null) {
		if (assert(!this.is_condemned_, "Cannot move condemned parts!")) {
			return;
		}

		// Ignore redundant requests
		if (this.parent === new_parent) return;

		// Prevent parent chain cycles
		assert(
			new_parent === null
			|| !this.isAncestorOf(new_parent),
			"cannot parent part", this, "to its descendant", new_parent,
		);

		// Update `Part.children`
		if (this.parent_ !== null) {
			this.parent_.children_.delete(this);
		}

		this.parent_ = new_parent;
		if (this.parent_ !== null) {
			this.parent_.children_.add(this);
		}

		// Update nearest entity
		const new_entity = this.parent_ === null
			? null
			: (this.parent_ instanceof Entity ? this.parent_ : this.parent_.entity_);

		if (this.entity_ !== new_entity) {
			this.entity_ = new_entity;

			if (!(this instanceof Entity)) {
				for (const descendant of this.descendants(false, descendant => !(descendant instanceof Entity))) {
					descendant.entity_ = this.entity_;
				}
			}
		}
	}

	get children(): ReadonlySet<Part> {
		return this.children_;
	}

	get parent_entity(): Entity {
		assert(this.entity_ !== null);
		return this.entity_!;
	}

	get opt_parent_entity(): Entity | null {
		return this.entity_;
	}

	get is_condemned(): boolean {
		return this.is_condemned_;
	}

	//> Constructors
	constructor(parent: Part | null) {
		super();
		PART_ID_MAP.set(this.part_id, this);
		this.parent = parent;
	}

	//> Tree querying
	*ancestors(include_self: boolean): IterableIterator<Part> {
		let target: Part | null = include_self ? this : this.parent_;

		while (target !== null) {
			yield target;
			target = target.parent_;
		}
	}

	*ancestorEntities(): IterableIterator<Entity> {
		let target: Entity | null = this.entity_;

		if (this instanceof Entity) {
			yield this;
		}

		while (target !== null) {
			yield target;
			target = target.entity_;
		}
	}

	*descendants(include_self: boolean, filter: (part: Part) => boolean = () => true): IterableIterator<Part> {
		if (include_self) {
			yield this;
		}

		for (const child of this.children_) {
			if (filter(child)) {
				for (const descendant of child.descendants(true, filter)) {
					yield descendant;
				}
			}
		}
	}

	isAncestorOf(maybe_descendant: Part): boolean {
		return IterExt.has(maybe_descendant.ancestors(true), this);
	}

	isDescendantOf(maybe_ancestor: Part): boolean {
		return maybe_ancestor.isAncestorOf(this);
	}

	//> Component querying
	tryDeepGet<T>(key: IReadKey<T>): T | undefined {
		for (const ancestor of this.ancestorEntities()) {
			const comp = ancestor.tryGet(key);
			if (comp !== undefined) {
				return comp;
			}
		}

		return undefined;
	}

	deepGet<T>(key: IReadKey<T>): T {
		const comp = this.tryDeepGet(key);
		assert(comp !== undefined, "Part", this, "is missing deep component with key", key);
		return comp!;
	}

	//> PartID decoding
	static tryFromId(id: number): Part | undefined {
		return PART_ID_MAP.get(id);
	}

	static fromId(id: number): Part {
		const part = Part.tryFromId(id);
		assert(part !== undefined, "Part with id", id, "does not exist.");
		return part!;
	}

	//> Finalization
	destroy() {
		// Condemn all the object's descendants if they haven't been condemned yet.
		if (!this.is_condemned_) {
			for (const descendant of this.descendants(true, descendant => !descendant.is_condemned_)) {
				descendant.is_condemned_ = true;
			}
		}

		// Prevent reentrancy
		assert(!this.is_destroying_, ".destroy() is not reentrant");
		this.is_destroying_ = true;

		// Call onDestroy
		try {
			if (this.onDestroy !== undefined) {
				this.onDestroy();
			}
		} finally {
			// Ensure that all descendants have been finalized
			for (const descendant of this.descendants(false, descendant => descendant.is_alive)) {
				assert(descendant.onDestroy === undefined, "Leaked", descendant);

				// TODO: Justify why this is a valid implementation despite a technical UAF
				// (`descendants` is implemented weirdly)
				descendant.markFinalizedInner();
			}

			// Mark ourselves as finalized.
			if (this.parent_ !== null) {
				this.parent_.children_.delete(this);
			}

			PART_ID_MAP.delete(this.part_id);
			this.markFinalizedInner();
		}
	}

	protected override markFinalized(): void {
		error("Cannot call `markFinalized()` on a `Part` directly. Please go through `destroy()` instead.");
	}

	private markFinalizedInner() {
		super.markFinalized();
	}

	// This is actually a virtual method.
	protected onDestroy?(): void;
}

//> Entity
export class Entity extends Part {
	private finalizer: Finalizer | null = null;

	constructor(parent: Part | null, readonly debug_name: string) {
		super(parent);
	}

	//> Primary interface
	add<T>(comp: T, keys: IWriteKey<T>[]): T {
		assert(!(comp instanceof Part) || comp.opt_parent_entity === this);

		for (const key of keys) {
			assert(!this.has(key));
			key.write(this, comp);
		}
		return comp;
	}

	with<T>(comp: T, keys: IWriteKey<T>[]): this {
		this.add(comp, keys);
		return this;
	}

	tryGet<T>(key: IReadKey<T>): T | undefined {
		return key.read(this);
	}

	get<T>(key: IReadKey<T>): T {
		const comp = this.tryGet(key);
		assert(comp !== undefined, "Entity", this, "is missing component with key", key);
		return comp!;
	}

	has(key: IRawKey): boolean {
		return key.has(this);
	}

	setFinalizer(finalizer: Finalizer) {
		assert(this.finalizer === null, "Cannot specify more than one finalizer for a given `Entity`.");
		this.finalizer = finalizer;
	}

	//> PartID decoding
	static tryEntityFromId(id: number): Entity | undefined {
		const entity = Part.tryFromId(id);
		return entity instanceof Entity ? entity : undefined;
	}

	static entityFromId(id: number): Entity {
		const part = Entity.tryEntityFromId(id);
		assert(part !== undefined, "Entity with id", id, "does not exist.");
		return part!;
	}

	//> Handlers

	protected override onDestroy() {
		if (this.finalizer !== null) {
			this.finalizer();
		}
	}

	override toString() {
		return `Entity(${this.debug_name})`;
	}
}
