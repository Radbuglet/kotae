import { ListenValue, Part, TypedKey } from "kotae-util";

export class TextBlock extends Part {
    static readonly KEY = new TypedKey<TextBlock>("TextBlock");

    readonly text = new ListenValue(this, "");

    protected override onDestroy() {
        this.text.destroy();
    }
}
