import { ListenValue, Part, TypedKey } from "kotae-util";

export class MathBlock extends Part {
	static readonly KEY = new TypedKey<MathBlock>("MathBlock");

	readonly math = new ListenValue(this, "");
	readonly on_initialize = new ListenValue(this, true);

	protected override onDestroy() {
		this.math.destroy();
		this.on_initialize.destroy();
	}
}

