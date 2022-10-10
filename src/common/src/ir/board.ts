import { Entity, ListenSet, Part, TypedKey } from "kotae-util";

export class IrBoard extends Part {
    static readonly KEY = new TypedKey<IrBoard>("IrBoard");

    readonly frames = new ListenSet<Entity>(this);

    protected override onDestroy() {
        // Destroy all child frames
        for (const frame of this.frames.value) {
            frame.destroy();
        }

        // Finalize self
        this.frames.destroy();
    }
}
