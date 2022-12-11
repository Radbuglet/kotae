import { ListenValue, Part, TypedKey } from "kotae-util";

export class SlateBlock extends Part {
	/**
	 * The slate block is similar to the text block, except richer with markdown support.
	 */
	static readonly KEY = new TypedKey<SlateBlock>("SlateBlock");

	readonly latexified = new ListenValue(this, ""); // we convert the text from markdown --> html --> latex, and store it as a string

	protected override onDestroy() {
		this.latexified.destroy();
	}
}
