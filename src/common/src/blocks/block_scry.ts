import { ListenValue, Part, TypedKey } from "kotae-util";

export class ScryBlock extends Part {
	static readonly KEY = new TypedKey<ScryBlock>("ScryBlock");

	readonly output_block = new ListenValue(this, "");

	protected override onDestroy() {
		this.output_block.destroy();
	}
}
