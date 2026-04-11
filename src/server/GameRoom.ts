import {
    applyAction,
} from '@shared';

import type { GameAction, GameState } from '@shared';
import { createInitialGameState } from '@shared/game/init';

export type PlayerSlot = {
    socketId: string;
    playerId: 'p1' | 'p2';
};

export type PlayerRole = {
    role: 'player';
    playerId: 'p1' | 'p2';
} | {
    role: 'spectator';
}

export type ActionRecord = {
    index: number;
    action: GameAction;
    playerId: 'p1' | 'p2';
    time: number;
};

export type StateSnapshot = {
    actionIndex: number;
    state: GameState;
    time: number;
};

export type JoinResult =
    | { role: 'player'; playerId: 'p1' | 'p2' }
    | { role: 'spectator' };

export class GameRoom {
    readonly id: string;

    private players: PlayerSlot[] = [];
    private spectators = new Set<string>();

    private currentState: GameState;

    private actions: ActionRecord[] = [];
    private snapshots: StateSnapshot[] = [];

    private SNAPSHOT_EVERY_N_ACTIONS = 1;

    constructor(id: string) {
        this.id = id;

        this.currentState = createInitialGameState();

        this.snapshots.push({
            actionIndex: 0,
            state: this.currentState,
            time: Date.now(),
        });
    }

    join(socketId: string): JoinResult {
        if (this.players.length < 2) {
            const playerId = (this.players.length === 0 ? 'p1' : 'p2') as
                | 'p1'
                | 'p2';

            this.players.push({ socketId, playerId });

            return { role: 'player', playerId };
        }

        this.spectators.add(socketId);
        return { role: 'spectator' };
    }

    leave(socketId: string) {
        this.players = this.players.filter(p => p.socketId !== socketId);
        this.spectators.delete(socketId);
    }

    isPlayer(socketId: string, playerId: string): boolean {
        return this.players.some(
            p => p.socketId === socketId && p.playerId === playerId
        );
    }

    getCurrentState(): GameState {
        return this.currentState;
    }

    getActionCount(): number {
        return this.actions.length;
    }

    handleAction(action: GameAction, playerId: 'p1' | 'p2') {
        const index = this.actions.length + 1;

        const record: ActionRecord = {
            index,
            action,
            playerId,
            time: Date.now(),
        };

        this.actions.push(record);

        const newState = applyAction(this.currentState, action);
        this.currentState = newState;

        if (index % this.SNAPSHOT_EVERY_N_ACTIONS === 0) {
            this.snapshots.push({
                actionIndex: index,
                state: newState,
                time: Date.now(),
            });
        }

        return newState;
    }

    getHistory() {
        return {
            actions: [...this.actions],
            snapshots: [...this.snapshots],
        };
    }

    rebuildStateUpTo(actionIndex: number): GameState {

        const snapshot = [...this.snapshots]
            .reverse()
            .find(s => s.actionIndex <= actionIndex);

        if (!snapshot) {
            return createInitialGameState();
        }

        let state = snapshot.state;

        for (const record of this.actions) {
            if (
                record.index > snapshot.actionIndex &&
                record.index <= actionIndex
            ) {
                state = applyAction(state, record.action);
            }
        }

        return state;
    }

    isEmpty(): boolean {
        return this.players.length === 0 && this.spectators.size === 0;
    }

    debugInfo() {
        return {
            roomId: this.id,
            players: this.players.map(p => p.playerId),
            spectators: this.spectators.size,
            actions: this.actions.length,
            snapshots: this.snapshots.length,
        };
    }
}
``