import { Entity, ListenArray, ListenValue } from "kotae-util";
import { useSyncExternalStore } from "react";

export type EntityViewProps = Readonly<{ target: Entity }>;

export function hookValue<T>(target: ListenValue<T>): T {
    return useSyncExternalStore(
        on_change => {
            target.on_changed.connect(on_change);

            return () => {
                target.on_changed.disconnect(on_change);
            };
        },
        () => target.value,
    )
}

export function hookArray<T>(target: ListenArray<T>): readonly T[] {
    let cache: T[] = [...target.value];

    return useSyncExternalStore(
        on_change => {
            const handler = () => {
                cache = [...target.value];
                on_change();
            };

            target.on_changed.connect(handler);

            return () => {
                target.on_changed.disconnect(handler);
            };
        },
        () => cache,
    );
}
