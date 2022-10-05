export function error(...data: any[]) {
    console.error(...data);
    debugger;
}

export function assert(cond: boolean, ...data: any[]): boolean {
    if (!cond) {
        error("Assertion failed:", ...data);
    }
    return !cond;
}

export function todo(): never {
    throw "not implemented";
}

export function unreachable(): never {
    throw "unreachable code reached";
}
