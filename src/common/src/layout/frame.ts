import { ListenValue, Part, TypedKey } from "kotae-util";
import { ReadonlyVec2, vec2 } from "gl-matrix";

export class LayoutFrame extends Part {
    static readonly KEY = new TypedKey<LayoutFrame>("LayoutFrame");

    readonly position = new ListenValue<ReadonlyVec2>(this, vec2.create());
    readonly size = new ListenValue<ReadonlyVec2>(this, vec2.create());

    protected override onDestroy() {
        this.position.destroy();
        this.size.destroy();
    }
}
