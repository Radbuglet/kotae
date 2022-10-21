import { Entity, ListenValue, TypedKey } from "kotae-util";
import { BlockRegistry, IrBoard } from "kotae-common";
import { createRegistry as createBlockRegistry } from './registry';

export const DEFAULT_INSERTION_MODE = new TypedKey<ListenValue<number>>("DEFAULT_INSERTION_MODE");
export const SELECT_ACTIVE = new TypedKey<ListenValue<number>>("SELECT_ACTIVE");

export function createBoard() {
    const board = new Entity(null, "board");
    const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
    const registry = board.add(createBlockRegistry(board), [BlockRegistry.KEY]);

    board.add(new ListenValue<number>(board, 0), [DEFAULT_INSERTION_MODE]);
    board.add(new ListenValue<number>(board, 0), [SELECT_ACTIVE]);

    board.setFinalizer(() => {
        registry.destroy();
        board_ir.destroy();
    });

    return board;
}
