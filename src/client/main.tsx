import { createRoot } from 'react-dom/client';
import './net/socket';

function App() {
    return (
        <div style={{ padding: 16 }}>
            <h1>mgame</h1>
            <p>Tick: {80} ms</p>
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);