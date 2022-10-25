import { Entity, ListenValue, TypedKey } from "kotae-util";
import { BlockRegistry, IrBoard } from "kotae-common";
import { createRegistry as createBlockRegistry } from './registry';

// I'm not sure why these are numbers, when we use them as booleans (only either 0 or 1)... - Nick
export const DEFAULT_INSERTION_MODE = new TypedKey<ListenValue<number>>("DEFAULT_INSERTION_MODE"); // Are we inserting math or regular text?
export const SELECT_ACTIVE = new TypedKey<ListenValue<number>>("SELECT_ACTIVE"); // Is selecto toggled on?
export const RESET_MY_ZOOM = new TypedKey<ListenValue<number>>("RESET_MY_ZOOM"); // Resets zoom and pan.

export function createBoard() {
	const board = new Entity(null, "board");
	const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
	const registry = board.add(createBlockRegistry(board), [BlockRegistry.KEY]);

	board.add(new ListenValue<number>(board, 0), [DEFAULT_INSERTION_MODE]);
	board.add(new ListenValue<number>(board, 0), [SELECT_ACTIVE]);
	board.add(new ListenValue<number>(board, 0), [RESET_MY_ZOOM]);

	board.setFinalizer(() => {
		registry.destroy();
		board_ir.destroy();
	});

	return board;
}
