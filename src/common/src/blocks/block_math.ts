import { ListenValue, Part, TypedKey, Signal } from "kotae-util";

export class MathBlock extends Part {
	static readonly KEY = new TypedKey<MathBlock>("MathBlock");

	readonly math = new ListenValue(this, "");
	readonly on_initialize = new ListenValue(this, true);
	readonly focusMe = new ListenValue(this, 0);

        readonly on_force_update = new Signal<(v: string) => void>(this)


	protected override onDestroy() {
		this.math.destroy();
		this.on_initialize.destroy();
		this.focusMe.destroy();
		this.on_force_update.destroy();
	}
}

