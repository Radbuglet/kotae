// TODO: Figure out soundness

export type AnyFunc = (...args: unknown[]) => unknown;
export type ArgsList<F extends AnyFunc> = F extends (...args: infer A) => unknown ? A : never;
