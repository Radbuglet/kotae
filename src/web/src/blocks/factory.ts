import { Entity, ListenValue, TypedKey } from "kotae-util";
import { BlockRegistry, IrBoard } from "kotae-common";
import { createRegistry as createBlockRegistry } from './registry';

export const DEFAULT_INSERTION_MODE = new TypedKey<ListenValue<number>>("DEFAULT_INSERTION_MODE");

export function createBoard() {
    const board = new Entity(null, "board");
    const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
    const registry = board.add(createBlockRegistry(board), [BlockRegistry.KEY]);

    board.add(new ListenValue<number>(board, 0), [DEFAULT_INSERTION_MODE]);

    board.setFinalizer(() => {
        registry.destroy();
        board_ir.destroy();
    });

    return board;
}
