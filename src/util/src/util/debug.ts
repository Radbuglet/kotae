export function assert(cond: boolean, ...data: any[]) {
    console.assert(cond, ...data);
    if (!cond) debugger;
}

export function todo(): never {
    throw "not implemented";
}
