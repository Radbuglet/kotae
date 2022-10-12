
class UndoManagerSimple<T> {
    private readonly live_stack: T[] = [];
    private readonly redo_stack: T[] = [];

    push(snapshot: T) {
        live_stack.push(T);
        redo_stack.length = 0;  // https://stackoverflow.com/a/1234337
    }
    undo(): T | null {
        if (live_stack.length === 0) return null;   // nothing to undo to

        const snapshot = live_stack.pop();
        if (snapshot !== undefined) redo_stack.push(snapshot);
        return live_stack[live_stack.length-1];
    }
    redo(): T | null {
        if (redo_stack.length === 0) return null;   // nothing to redo

        const snapshot = redo_stack.pop();
        if (snapshot !== undefined) live_stack.push(snapshot);
        return live_stack[live_stack.length-1];
    }
}

