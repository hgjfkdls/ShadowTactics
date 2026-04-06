import { useDebugLog } from './useDebugLog';
import { DebugEntry } from './DebugEntry';

export function DebugPanel() {
    const events = useDebugLog();

    const orderedEvents = [...events].reverse();

    return (
        <div className="h-full flex flex-col text-xs">
            <div className="font-bold mb-2">
                Debug Log
            </div>

            <div className="flex-1 overflow-auto">
                {orderedEvents.map((event, i) => (
                    <DebugEntry
                        key={`${event.time}-${i}`}
                        event={event}
                    />
                ))}
            </div>
        </div>
    );
}
