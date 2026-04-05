import { createRoot } from 'react-dom/client';
import './net/socket';
import './style.css';

function App() {
    return (
        <div style={{ padding: 16 }}>
            <h1>Shadow Tactics</h1>
            <p>Tick: {80} ms</p>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);