import { ListenValue, Part, TypedKey } from "kotae-util";

export class SlateBlock extends Part {
	static readonly KEY = new TypedKey<SlateBlock>("SlateBlock");

	readonly stringified_html = new ListenValue(this, "");

	protected override onDestroy() {
		this.stringified_html.destroy();
	}
}
