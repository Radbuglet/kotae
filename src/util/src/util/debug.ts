export function assert(cond: boolean, ...data: any[]) {
    console.assert(cond, ...data);
}

export function todo(): never {
    throw "not implemented";
}
