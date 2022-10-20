import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBoard } from './blocks/factory';
import AppView from './pages/AppView';
import '../styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
const board = createBoard();

root.render(<>
	<React.StrictMode>
		<AppView target={board} />
	</React.StrictMode>
</>);
