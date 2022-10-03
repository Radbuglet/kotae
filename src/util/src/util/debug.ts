export function assert(cond: boolean, ...data: any[]): boolean {
    console.assert(cond, ...data);
    if (!cond) debugger;
    return !cond;
}

export function todo(): never {
    throw "not implemented";
}

export function unreachable(): never {
    throw "unreachable code reached";
}
