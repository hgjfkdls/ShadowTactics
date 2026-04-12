import { createRoot } from 'react-dom/client';
import './net/socket';
import './style.css';
import { App } from './App';
import { GameStateProvider } from './game/GameStateContext';
import { BoardInteractionProvider } from './game/board/BoadrInteractionContext';

createRoot(document.getElementById('root')!).render(
    <GameStateProvider>
        <BoardInteractionProvider>
            <App />
        </BoardInteractionProvider>
    </GameStateProvider>
);