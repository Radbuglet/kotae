import { Entity, ListenValue, Signal, TypedKey } from "kotae-util";
import { BlockRegistry, IrBoard } from "kotae-common";
import { createRegistry as createBlockRegistry } from './registry';

// A property of the board indicating the index in the block registry of the next block to spawn.
// TODO: In the future, this should use IDs and should not be hardcoded. This was a temp hack.
export const DEFAULT_INSERTION_MODE = new TypedKey<ListenValue<number>>("DEFAULT_INSERTION_MODE");

// A property of the board indicating whether the user is in select mode.
// TODO: This should be a boolean.
export const SELECT_ACTIVE = new TypedKey<ListenValue<number>>("SELECT_ACTIVE");

export const COMMAND_BAR_ACTIVE = new TypedKey<ListenValue<boolean>>("COMMAND_BAR_ACTIVE");

// A signal of the board used by the sidebar to reset the zoom level
export const ZOOM_RESET_SIGNAL = new TypedKey<Signal<() => void>>("RESET_MY_ZOOM");

export function createBoard() {
	const board = new Entity(null, "board");
	const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
	const registry = board.add(createBlockRegistry(board), [BlockRegistry.KEY]);


	board.add(new ListenValue<number>(board, 0), [DEFAULT_INSERTION_MODE]);
	board.add(new ListenValue<number>(board, 0), [SELECT_ACTIVE]);
	board.add(new Signal<() => void>(board), [ZOOM_RESET_SIGNAL]);

	board.add(new ListenValue<boolean>(board, false), [COMMAND_BAR_ACTIVE]);

	board.setFinalizer(() => {
		registry.destroy();
		board_ir.destroy();
	});

	return board;
}
