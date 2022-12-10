import { ListenValue, Part, TypedKey } from "kotae-util";
//import { DEFAULT_INSERTION_MODE, SELECT_ACTIVE, ZOOM_RESET_SIGNAL } from "../../../web/src/model/board"; // data we're accessing from IR

export class ScryBlock extends Part {
	static readonly KEY = new TypedKey<ScryBlock>("ScryBlock");

	readonly output_block = new ListenValue(this, "");

	protected override onDestroy() {
		this.output_block.destroy();
	}
}
