import { Bindable, callFunc, Entity, IListenable, Weak } from "kotae-util";
import { useSyncExternalStore } from "react";

export type EntityViewProps = Readonly<{ target: Entity }>;

export function useListenable<T>(target: IListenable<T>): T {
	return useSyncExternalStore(
		on_change => {
			const connection = target.on_changed.connect(null, on_change);

			return () => {
				if (connection.is_alive) {
					connection.destroy();
				}
			};
		},
		() => target.value_snapshot,
	);
}

export function wrapWeakReceiver<T extends Bindable, A extends readonly unknown[]>(
	target: Weak<T>,
	cb: (target: T, ...args: A) => void
): (...args: A) => void {
	return (...args: A) => {
		if (target.is_alive) {
			callFunc(cb, target, ...args);
		}
	};
}
