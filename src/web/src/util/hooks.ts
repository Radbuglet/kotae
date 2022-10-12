import { Bindable, callFunc, Entity, IListenable, Weak } from "kotae-util";
import { useSyncExternalStore, useEffect } from "react";

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

// FIXME: Don't `useInit`. If you don't remember why this is a terrible idea next morning, you
// clearly need more sleep.
export function useInit<T>(f: () => void) {
	// N.B. this hack ensures that React strict mode can only call this closure once.
	// TODO hack! need a more idiomatic way to do this.

	let init = true;
	useEffect(() => {
		if (init) {
			f();
			init = false;
		}
	}, []);
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
