import { useState } from 'react';

export function useViewport() {
    const [scale, setScale] = useState(1);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);

    function zoom(delta: number) {
        setScale(s => Math.max(0.5, Math.min(3, s + delta)));
    }

    function pan(dx: number, dy: number) {
        setX(x => x + dx);
        setY(y => y + dy);
    }

    return {
        scale,
        x,
        y,
        zoom,
        pan,
    };
}