import { assert } from "./debug"

export function swapRemove<T>(arr: Array<T>, index: number) {
    assert(index < arr.length);

    arr[index] = arr[arr.length - 1]
    arr.pop();
}
