import { Entity, IterExt, ListenSet } from "kotae-util";

//> Snapshot Type
export type SnapshotPrimitive = symbol | string | number | boolean | null;

export type WritableSnapshotMap = { [key: string]: Snapshot };

export type Snapshot =
	| SnapshotPrimitive
	| readonly Snapshot[]
	| Readonly<WritableSnapshotMap>;

//> Serializer Infrastructure
export interface ISerializer<T> {
	serialize(target: T): Snapshot;
	deserializeOnto(target: T, serialized: Snapshot): void;
	deserializeDeNovo(serialized: Snapshot): T;
}

export class DeserializationException extends Error {
	constructor(message: string) {
		super(message);
	}

	override get name(): string {
		return "DeserializationException";
	}
}

//> Generic Serializers
export class EntitySetSerializer implements ISerializer<ListenSet<Entity>> {
	constructor(readonly elem_serializer: ISerializer<Entity>) { }

	serialize(target: ListenSet<Entity>): Snapshot {
		const snapshot: WritableSnapshotMap = {};

		for (const target_elem of target.value) {
			snapshot[target_elem.part_id] = this.elem_serializer.serialize(target_elem);
		}

		return snapshot;
	}

	deserializeOnto(target: ListenSet<Entity>, serialized: Snapshot): void {
		if (!(serialized instanceof Object)) throw new DeserializationException("expected an object");

		// Deserialize onto the set.
		const remaining_targets = [...target.value];

		for (const serialized_part_key in serialized) {
			if (!serialized.hasOwnProperty(serialized_part_key)) continue;

			// TODO
		}
	}

	deserializeDeNovo(serialized: Snapshot): ListenSet<Entity> {
		const target = new ListenSet<Entity>(null);
		this.deserializeOnto(target, serialized);
		return target;
	}
}
