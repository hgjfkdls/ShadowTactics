import type { GameAction, GameState } from '@shared';

export type DebugEvent =
    | {
        type: 'SOCKET_CONNECT';
        time: number;
    }
    | {
        type: 'ACTION_SENT';
        action: GameAction;
        time: number;
    }
    | {
        type: 'STATE_RECEIVED';
        state: GameState;
        time: number;
    };

type Listener = (events: DebugEvent[]) => void;

class DebugStore {
    private events: DebugEvent[] = [];
    private listeners = new Set<Listener>();

    add(event: DebugEvent) {
        this.events.push(event);
        this.notify();
    }

    clear() {
        this.events = [];
        this.notify();
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        listener(this.events);
        return () => { this.listeners.delete(listener) };
    }

    private notify() {
        this.listeners.forEach(l => l(this.events));
    }
}

export const debugStore = new DebugStore();
