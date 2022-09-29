import { Entity, ListenArray, ListenValue } from "kotae-util";
import { useSyncExternalStore } from "react";

export type EntityViewProps = Readonly<{ target: Entity }>;

export function hookValue<T>(target: ListenValue<T>): T {
    return useSyncExternalStore(
        on_change => {
            const connection = target.on_changed.connect(null, on_change);

            return () => {
                if (connection.is_alive) {
                    connection.destroy();
                }
            };
        },
        () => target.value,
    )
}

export function hookArray<T>(target: ListenArray<T>): readonly T[] {
    let cache: T[] = [...target.value];

    return useSyncExternalStore(
        on_change => {
            const connection = target.on_changed.connect(null, () => {
                cache = [...target.value];
                on_change();
            });

            return () => {
                if (connection.is_alive) {
                    connection.destroy();
                }
            };
        },
        () => cache,
    );
}
