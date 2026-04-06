import { useEffect, useState } from 'react';
import { debugStore } from './DebugStore';
import type { DebugEvent } from './DebugStore';

export function useDebugLog() {
    const [events, setEvents] = useState<DebugEvent[]>([]);

    useEffect(() => {
        return debugStore.subscribe(setEvents);
    }, []);

    return events;
}