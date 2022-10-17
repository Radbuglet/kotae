import { ListenValue, Part, TypedKey } from "kotae-util";

export class MathBlock extends Part {
	static readonly KEY = new TypedKey<MathBlock>("MathBlock");

	readonly math = new ListenValue(this, "");

	protected override onDestroy() {
		this.text.destroy();
	}
}

