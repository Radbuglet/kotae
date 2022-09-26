// `never` is a "top" type so non-function types should essentially prevent a function dependent on
// this computed type to become uncallable.
export type ArgsListOf<F> = F extends (...args: infer A) => unknown ? A : never;

export function callFunc<F>(f: F, ...args: ArgsListOf<F>) {
    (f as any)(...args);
}
