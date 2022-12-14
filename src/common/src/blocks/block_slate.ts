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





















































































/*
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΎπΎπΎπ»πΎπΎπΎπ»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΎπ»πΌπΎπΎπ»πΎπΎπΎπ»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΎπΎπΎπΎπΌπ»πΌπΎπΌπΌπΎπΎπ»πΎπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π½πΎπΌπ»πΎπΌπΌπΌπΌπΌπΌπΎπΌπΌπΎπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π½πΌπ»πΌπΌπΌπΌπΌπΌπΌπΌπΎπΎπ½π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΎπΌπΌπΌπΌπΌπΌπΌπΌπΌπΌπΎπΌπΎπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπ»π»π½πΎπΌπΌπΎπΎπΎπΎπΎπΎπΎπΎπΎπΎπΌπΎπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»πΏπΏπΏπ»π»π»πΏπΏπΏπ»π»πΎπΎπΎπΎπΎπΎπ½π»π»π½π½π½πΎπΎπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»πΏπΏπ»π»π»π»π»π»π»πΏπΏπΏπΏπΎπΎπΎπΎπΎπ½π»π»π½π»π½πΎπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»πΏπΏπ»π»π»π»π»π»π»π»π»πΏπΏπΏπΌπ»πΎπΎπΎπΎπΎπΎπΎπΎπΎπΎπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπΌπ»πΌπΌπΌπΏπΌπΌπΌπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπ»π»πΏπΌπΌπΌπΌπΌπ½πΌπΌπΌπ½πΏπ»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπ»π»π»π»π»πΏπΌπΌπΌπΌπΌπΌπΌπΌπΌπΌπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»πΏπΏπΏπΏπΏπ»π»π»π»π»π»π»π»π»πΏπΏπΌπΌπΌπΌπΌπΌπΌπΌπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»πΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΌπΌπΌπ½π½πΌπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»πΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΏπΌπΌπΌπΌπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»πΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΎπΎπΏπΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»πΏπ»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΎπΎπΎπΏπΏπΏπΏπΎπΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»πΏπ»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΎπΎπΎπΎπΎπΏπΏπΏπΎπΏπΎπΎπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»πΎπΏπΏπΎπΎπΏπΎπΎπΎπΎπΏπΎπΏπΎπΏπΎπΎπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΎπΎπΏπΎπΎπΎπΎπΏπΎπΏπΎπΏπΎπΏπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΎπΏπΏπΏπΏπΏπΏπΏπΏπΎπΏπΏπΏπΎπΏπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΏπΎπΎπΏπΏπ½πΌπΌπ»πΌπΌπΎπΏπ½πΏπΎπΏπ»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΏπΏπΏπΏπΏπ½π»πΌπΌπ»π»πΎπΏπ½πΏπΎπΏπΏπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΏπΏπ»πΏπ½πΌπ»π»πΌπΌπΎπΏπ½π½πΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΎπΏπ»π»πΏπ½πΌπΌπ»π»π»πΎπΏπ½π½πΏπΎπΏπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΎπΏπ»π»πΏπ½πΌπΌπΌπΌπΌπΌπΎπΏπ½πΏπΎπΏπ»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΎπΎπΏπΏπΎπΏπ»π»πΏπΏπ½πΌπ»π»πΌπΌπΎπΏπ½πΏπΎπΎπΏπ»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΎπΏπΌπΌπΏπ»π»π»π»πΏπΏπΏπΏπΎπΎπΎπΎπΏπΏπΏπΏπΎπΎπΏπΏπ»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»πΏπΌπΌπΏπΏπ»π»π»π»πΏπΏπΏπΏπΏπΏπΏπΏπΏπΏπΏπΏπΎπΏπΏπΌπΏπΏπ»π»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΌπΌπΌπΌπΏπ»π»π»π»πΏπ½πΌπΌπΌπΌπΌπΌπΌπΌπΏπΏπΎπΏπΌπΌπΌπΌπΏπ»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΌπΌπΌπΌπΌπΏπ»π»π»πΏπΌπ»π»πΌπΌπΌπΌπΌπΌπΌπΌπΏπΏπΌπΌπΌπΌπΏπ»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΌπΌπΌπΌπΌπΏπ»π»π»πΏπ½πΌπΌπ»π»πΌπΌπΏπΌπΌπΌπΏπΏπΌπΌπΌπΏπ»π»π»π»π»π»
π»π»π»π»π»π»π»π»πΏπΌπΌπΌπΌπΏπ»π»π»πΏπ½π»π½π½π½πΌπΌπΌπΏπΌπΌπΌπΌπΏπΏπΏπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπ»π»π»π»πΏπΏπΏπ»π»π½π½πΏπΏπΌπΏπΏπΌπΌπΏπ»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπ»π»πΏπΏπ½πΏπ»πΏπΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ»π½π½πΏπ»π»πΏπ½π½π½π½πΌπΌπΏπ»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ½π½πΏπ»π»π»π»πΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ½π½π½πΏπ»π»π»π»πΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπΌπ½π½πΏπ»π»π»π»π»π»πΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ½π½π½πΏπ»π»π»π»π»π»πΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ½π½π½πΏπ»π»π»π»π»π»π»πΏπ½π½π½πΌπΌπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ½π½π½πΏπ»π»π»π»π»π»π»π»πΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπΌπΌπ½π½π½πΏπ»π»π»π»π»π»π»π»πΏπ½π½π½π½πΌπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΌπ½π½π½πΏπ»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπΏπ»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπ»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΏπ»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΏπΏπΏπΏπΏπ»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΎπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΎπΎπΎπΏπΏπ»π»π»π»
π»π»π»π»π»π»π»π»π»πΏπΎπΎπΎπΎπΎπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΎπΎπΎπΌπΌπΌπΏπ»π»π»
π»π»π»π»π»π»π»π»πΏπΎπΌπΌπΌπΌπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπΏπΏπ»π»π»
π»π»π»π»π»π»π»π»πΏπΏπΏπΏπΏπΏπΏπ»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»
π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»π»

*/
