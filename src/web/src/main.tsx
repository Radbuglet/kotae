import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBoard } from './model/board';
import AppView from './views/AppView';
import '../styles/index.css';

// Initialize model
const board = createBoard();

// Attach main React view
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(<>
	<React.StrictMode>
		<AppView target={board} />
	</React.StrictMode>
</>);
