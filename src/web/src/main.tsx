import { BlockRegistry, IrBoard } from 'kotae-common';
import { Entity } from 'kotae-util';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';
import { createRegistry as createBlockRegistry } from './blocks/registry';
import AppView from './pages/AppView';

const board = new Entity(null, "board");
const board_ir = board.add(new IrBoard(board), [IrBoard.KEY]);
const registry = board.add(createBlockRegistry(board), [BlockRegistry.KEY]);

board.setFinalizer(() => {
	registry.destroy();
	board_ir.destroy();
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<>
	<React.StrictMode>
		<AppView target={board} />
	</React.StrictMode>
</>);
