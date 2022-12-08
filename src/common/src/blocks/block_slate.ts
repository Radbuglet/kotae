import { ListenValue, Part, TypedKey } from "kotae-util";

export class SlateBlock extends Part {
	static readonly KEY = new TypedKey<SlateBlock>("SlateBlock");

	readonly stringified_json = new ListenValue(this, "");

	protected override onDestroy() {
		this.stringified_json.destroy();
	}
}
