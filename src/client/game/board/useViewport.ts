import { useState, useRef } from 'react';

export function useViewport() {
    const [scale, setScale] = useState(1);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const boundsRef = useRef({ minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity });

    function zoom(delta: number) {
        setScale(s => Math.max(0.8, s + delta));
    }

    function pan(dx: number, dy: number) {
        setX(x => Math.max(boundsRef.current.minX, Math.min(boundsRef.current.maxX, x + dx)));
        setY(y => Math.max(boundsRef.current.minY, Math.min(boundsRef.current.maxY, y + dy)));
    }

    function setBounds(minX: number, maxX: number, minY: number, maxY: number) {
        boundsRef.current = { minX, maxX, minY, maxY };
        setX(x => Math.max(minX, Math.min(maxX, x)));
        setY(y => Math.max(minY, Math.min(maxY, y)));
    }

    return {
        scale,
        x,
        y,
        zoom,
        pan,
        setBounds,
    };
}
