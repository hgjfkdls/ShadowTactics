import {
    applyAction,
    hexDistance,
    hexRange,
    isWithinBounds,
    isHexOccupied,
} from '@shared';

import type { GameAction, GameState, HexCoord } from '@shared';
import type { TimerInfo, TimerPhase } from '@shared/game/timer';
import { createInitialGameState } from '@shared/game/init';
import { decideAI } from './ai/AIPlayer';
import { evaluateDeployPosition } from './ai/evaluate';

const DISCONNECT_TIMEOUT_MS = 60_000;

const PHASE_TIMERS: Record<string, { isActive: boolean; value: number }> = {
    IDENTITY_SELECTION: { isActive: true, value: 45 },
    REVEAL: { isActive: true, value: 10 },
    ROLL: { isActive: true, value: 10 },
    ROLL_RESULT: { isActive: true, value: 10 },
    DEPLOYMENT: { isActive: true, value: 15 },
    DISCARD: { isActive: true, value: 10 },
    COUNTER: { isActive: true, value: 10 },
    TURN: { isActive: true, value: 60 },
};

function timerInfo(phase: TimerPhase, overrides?: Partial<TimerInfo>): TimerInfo {
    const c = PHASE_TIMERS[phase];
    return { phase, remaining: c.value, duration: c.value, isActive: c.isActive, ...overrides };
}

type ActiveTimer = {
    phase: string;
    remaining: number;
    duration: number;
    playerId?: string;
    tickInterval: ReturnType<typeof setInterval> | null;
    expiryTimeout: ReturnType<typeof setTimeout> | null;
    alive: boolean;
};

export type PlayerSlot = {
    socketId: string;
    playerId: 'p1' | 'p2';
    userId?: string;
    isBot?: boolean;
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

    private disconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private disconnectedPlayerId: 'p1' | 'p2' | null = null;

    private matchType: 'quickplay' | 'ranked' = 'quickplay';
    onDisconnectCallback: ((state: GameState) => void) | null = null;
    onGameOverCallback: ((state: GameState) => void) | null = null;
    onTimerTick: ((info: TimerInfo | null, pausedInfo?: TimerInfo | null) => void) | null = null;
    onTimerExpired: ((info: TimerInfo) => void) | null = null;
    onStateChanged: ((state: GameState) => void) | null = null;

    private activeTimer: ActiveTimer | null = null;
    private turnTimerRemaining: number | null = null;
    isBotGame?: boolean;
    botModelId?: string;

    private botBusy: boolean = false;
    private actionQueue: { action: GameAction; playerId: 'p1' | 'p2' }[] = [];
    private processingAction: boolean = false;

    private revealHandled: boolean = false;
    private revealDismissedPlayers: Set<string> = new Set();
    private rollResultDismissedPlayers: Set<string> = new Set();

    handleRevealDismiss(playerId: 'p1' | 'p2') {
        this.revealDismissedPlayers.add(playerId);
        if (this.revealDismissedPlayers.size >= 2 && !this.revealHandled) {
            this.revealHandled = true;
            this.stopTimer();
            this.onTimerTick?.(null, null);
            this.refreshTimer();
        }
    }

    handleRollResultDismiss(playerId: 'p1' | 'p2') {
        this.rollResultDismissedPlayers.add(playerId);
        if (this.rollResultDismissedPlayers.size >= 2) {
            const s = this.currentState;
            if (s.preparationPhase === 'ROLL_RESULT' && s.activePlayer !== undefined) {
                this.stopTimer();
                this.onTimerTick?.(null, null);
                const depState: GameState = { ...s, preparationPhase: 'DEPLOYMENT' as const };
                this.currentState = depState;
                this.onStateChanged?.(depState);
                this.refreshTimer();
            }
        }
    }

    setMatchType(type: 'quickplay' | 'ranked') {
        this.matchType = type;
    }

    getMatchType(): 'quickplay' | 'ranked' {
        return this.matchType;
    }

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

    join(socketId: string, userId?: string): JoinResult {
        if (this.players.length < 2) {
            const playerId = (this.players.length === 0 ? 'p1' : 'p2') as
                | 'p1'
                | 'p2';

            this.players.push({ socketId, playerId, userId });

            return { role: 'player', playerId };
        }

        this.spectators.add(socketId);
        return { role: 'spectator' };
    }

    addBotPlayer(playerId: 'p1' | 'p2') {
        this.players.push({ socketId: `bot_${playerId}`, playerId, isBot: true });
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

    getPlayerIdBySocket(socketId: string): 'p1' | 'p2' | null {
        return this.players.find(p => p.socketId === socketId)?.playerId ?? null;
    }

    getUserIdMapping(): { p1?: string; p2?: string } {
        const p1 = this.players.find(p => p.playerId === 'p1');
        const p2 = this.players.find(p => p.playerId === 'p2');
        return { p1: p1?.userId, p2: p2?.userId };
    }

    onPlayerDisconnect(playerId: 'p1' | 'p2') {
        this.disconnectedPlayerId = playerId;
        this.currentState = {
            ...this.currentState,
            players: {
                ...this.currentState.players,
                [playerId]: { ...this.currentState.players[playerId], disconnectedAt: Date.now() },
            },
        };
        this.disconnectTimeout = setTimeout(() => {
            if (this.currentState.gamePhase !== 'GAME') return;
            this.currentState = applyAction(this.currentState, {
                type: 'SURRENDER',
                playerId,
            });
            this.currentState = {
                ...this.currentState,
                gameOverReason: 'disconnect',
            };
            this.onGameOverCallback?.(this.currentState);
            this.onDisconnectCallback?.(this.currentState);
        }, DISCONNECT_TIMEOUT_MS);
    }

    onPlayerReconnect(playerId: 'p1' | 'p2'): boolean {
        if (this.disconnectedPlayerId !== playerId) return false;
        this.disconnectedPlayerId = null;
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
        this.currentState = {
            ...this.currentState,
            players: {
                ...this.currentState.players,
                [playerId]: { ...this.currentState.players[playerId], disconnectedAt: undefined },
            },
        };
        return true;
    }

    isDisconnected(): boolean {
        return this.disconnectedPlayerId !== null;
    }

    getDisconnectedPlayerId(): 'p1' | 'p2' | null {
        return this.disconnectedPlayerId;
    }

    getPlayerCount(): number {
        return this.players.length;
    }

    getCurrentState(): GameState {
        return this.currentState;
    }

    getActionCount(): number {
        return this.actions.length;
    }

    private stopTimer() {
        if (this.activeTimer) {
            if (this.activeTimer.tickInterval) clearInterval(this.activeTimer.tickInterval);
            if (this.activeTimer.expiryTimeout) clearTimeout(this.activeTimer.expiryTimeout);
            this.activeTimer = null;
        }
    }

    evaluateTimer(): TimerInfo | null {
        const s = this.currentState;
        const bothConnected = this.players.length === 2;

        // PREPARATION phase
        if (s.gamePhase === 'PREPARATION') {
            if (s.preparationPhase === 'IDENTITY_SELECTION' && bothConnected) {
                const idleP1 = !s.players['p1']?.selectedIdentity;
                const idleP2 = !s.players['p2']?.selectedIdentity;
                if (idleP1 || idleP2) return timerInfo('IDENTITY_SELECTION');
                return null;
            }
            if (s.preparationPhase === 'ROLL') {
                if (!this.revealHandled && this.revealDismissedPlayers.size < 2
                    && s.players['p1']?.revealedIdentity && s.players['p2']?.revealedIdentity
                    && s.diceRolls['p1'] === undefined && s.diceRolls['p2'] === undefined
                    && !s.lastTieRoll) {
                    return timerInfo('REVEAL');
                }
                if (s.diceRolls['p1'] === undefined || s.diceRolls['p2'] === undefined) {
                    return timerInfo('ROLL');
                }
                return null;
            }
            if (s.preparationPhase === 'ROLL_RESULT') return timerInfo('ROLL_RESULT');
            if (s.preparationPhase === 'DEPLOYMENT') return timerInfo('DEPLOYMENT', { playerId: s.currentDeployingPlayer });
            return null;
        }

        // GAME phase
        if (s.gamePhase === 'GAME') {
            const activePlayer = s.activePlayer;
            const hand = s.players[activePlayer]?.cardsInHand ?? [];

            if (s.turnPhase === 'COUNTER') {
                const nonActive = activePlayer === 'p1' ? 'p2' : 'p1';
                return timerInfo('COUNTER', { playerId: nonActive });
            }

            if (s.turnPhase === 'DRAW' && hand.length > 3) {
                return timerInfo('DISCARD', { playerId: activePlayer });
            }

            return timerInfo('TURN', { playerId: activePlayer });
        }

        return null;
    }

    private startTimer(info: TimerInfo) {
        this.stopTimer();

        const duration = info.remaining;
        let remaining = duration;

        // Build paused timer info (COUNTER pauses TURN)
        let pausedInfo: TimerInfo | null = null;
        if (info.phase === 'COUNTER' && this.turnTimerRemaining !== null) {
            pausedInfo = timerInfo('TURN', { remaining: this.turnTimerRemaining, duration: this.turnTimerRemaining, playerId: this.currentState.activePlayer });
        }

        // Broadcast initial value immediately
        this.onTimerTick?.({ ...info, remaining }, pausedInfo);

        const tickInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) remaining = 0;
            this.onTimerTick?.({ ...info, remaining }, pausedInfo);
            if (this.activeTimer) this.activeTimer.remaining = remaining;
        }, 1000);

        const expiryTimeout = setTimeout(() => {
            clearInterval(tickInterval);
            if (this.activeTimer) this.activeTimer.alive = false;
            this.onTimerTick?.({ ...info, remaining: 0 }, null);
            this.fireAutoAction(info);
            if (this.activeTimer === null || !this.activeTimer.alive) {
                this.activeTimer = null;
                this.refreshTimer();
            }
        }, duration * 1000);

        this.activeTimer = {
            ...info,
            remaining: duration,
            tickInterval,
            expiryTimeout,
            alive: true,
        };
    }

    private findRandomDeployPosition(state: GameState, playerId: 'p1' | 'p2'): HexCoord | null {
        const friendlyUnits = Object.values(state.units).filter(u => u.owner === playerId);
        const centerHex = state.centerHex;
        const radius = state.map.radius;

        let candidates: HexCoord[];
        if (friendlyUnits.length === 0) {
            candidates = hexRange(centerHex, 2).filter(h =>
                hexDistance(h, centerHex) === 2
                && isWithinBounds(h, radius)
                && !isHexOccupied(state, h)
            );
        } else {
            candidates = hexRange(centerHex, radius).filter(h =>
                isWithinBounds(h, radius)
                && !isHexOccupied(state, h)
                && friendlyUnits.some(u => hexDistance(u.position, h) <= 2)
            );
        }

        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    private fireAutoAction(info: TimerInfo) {
        if (!info.isActive) return;
        const s = this.currentState;
        if (info.phase === 'IDENTITY_SELECTION') {
            if (info.playerId) {
                const cards = s.players[info.playerId]?.identityCards ?? [];
                if (cards.length > 0 && !s.players[info.playerId]?.selectedIdentity) {
                    this.handleAction({ type: 'SELECT_IDENTITY', playerId: info.playerId, cardId: cards[Math.floor(Math.random() * cards.length)] }, info.playerId);
                }
            } else {
                for (const pid of ['p1', 'p2'] as const) {
                    const cards = s.players[pid]?.identityCards ?? [];
                    if (cards.length > 0 && !s.players[pid]?.selectedIdentity) {
                        this.handleAction({ type: 'SELECT_IDENTITY', playerId: pid, cardId: cards[Math.floor(Math.random() * cards.length)] }, pid);
                    }
                }
            }
        } else if (info.phase === 'ROLL' && info.playerId) {
            if (s.diceRolls[info.playerId] === undefined) {
                this.handleAction({ type: 'ROLL_DICE', playerId: info.playerId }, info.playerId);
            }
        } else if (info.phase === 'ROLL' && !info.playerId) {
            // Shared roll timer: auto-roll for both players simultaneously
            if (s.diceRolls['p1'] === undefined) {
                this.handleAction({ type: 'ROLL_DICE', playerId: 'p1' }, 'p1');
            }
            if (s.diceRolls['p2'] === undefined) {
                this.handleAction({ type: 'ROLL_DICE', playerId: 'p2' }, 'p2');
            }
        } else if (info.phase === 'ROLL_RESULT') {
            // Transition to DEPLOYMENT
            if (s.preparationPhase === 'ROLL_RESULT' && s.activePlayer !== undefined) {
                const depState: GameState = { ...s, preparationPhase: 'DEPLOYMENT' as const };
                this.currentState = depState;
                this.onStateChanged?.(depState);
                this.refreshTimer();
            }
        } else if (info.phase === 'REVEAL') {
            this.revealHandled = true;
            this.revealDismissedPlayers.add('p1').add('p2');
            this.refreshTimer();
        } else if (info.phase === 'DEPLOYMENT' && info.playerId) {
            const pid = info.playerId as 'p1' | 'p2';
            // Deploy all units for the current step in one timer
            while (this.currentState.currentDeployingPlayer === pid && this.currentState.preparationPhase === 'DEPLOYMENT') {
                const pool = this.currentState.players[pid]?.unitsToDeploy ?? [];
                if (pool.length === 0) break;

                // Priorizar: general al último. Separar el general del pool aleatorio.
                const nonGeneral = pool.filter(e => e.unitClass !== 'general');
                const generalEntry = pool.find(e => e.unitClass === 'general');

                const deployedUnits = this.currentState.players[pid]?.deployedUnits ?? [];
                // El general solo se despliega cuando no quedan otras unidades
                let entries = nonGeneral.length > 0 ? nonGeneral : (generalEntry ? [generalEntry] : pool);

                const shuffled = [...entries].sort(() => Math.random() - 0.5);
                let done = false;
                for (const entry of shuffled) {
                    const pos = this.findRandomDeployPosition(this.currentState, pid);
                    if (pos) {
                        this.handleAction({ type: 'DEPLOY_UNIT', playerId: pid, unitId: entry.unitId, position: pos }, pid);
                        done = true;
                        break;
                    }
                }
                if (!done) break;
            }
        } else if (info.phase === 'DISCARD' && info.playerId) {
            const hand = s.players[info.playerId]?.cardsInHand ?? [];
            if (hand.length > 3) {
                this.handleAction({ type: 'DISCARD_CARD', playerId: info.playerId, cardId: hand[Math.floor(Math.random() * hand.length)] }, info.playerId);
            }
        } else if (info.phase === 'COUNTER' && info.playerId) {
            const pid = info.playerId as 'p1' | 'p2';
            if (s.turnPhase === 'COUNTER' && s.activePlayer !== pid) {
                this.handleAction({ type: 'PASS_COUNTER', playerId: pid }, pid);
            }
        } else if (info.phase === 'DEPLOYMENT') {
            // Player deploys manually; timer just shows remaining time
        } else if (info.phase === 'TURN' && info.playerId) {
            const pid = info.playerId as 'p1' | 'p2';
            if (s.activePlayer !== pid) return;
            if (this.botBusy) return; // IA est� procesando, no hacer auto-action

            // Resolve pending identity choices before ending turn
            if (s.players[pid]?.pendingIdentityTarget) {
                const targets = Object.values(s.units).filter(u => u.owner !== pid && u.class !== 'general');
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    this.handleAction({ type: 'IDENTITY_ABILITY', playerId: pid, targetId: target.id }, pid);
                }
            } else if (s.players[pid]?.pendingEspartanoChoice) {
                const choice = Math.random() < 0.5 ? 'range' as const : 'defense' as const;
                this.handleAction({ type: 'ESPARTANO_CHOICE', playerId: pid, choice }, pid);
            } else if (s.players[pid]?.pendingPlanBatalla) {
                const choice = Math.random() < 0.5 ? 'attack' as const : 'defense' as const;
                this.handleAction({ type: 'COMANDANTE_CHOICE', playerId: pid, choice }, pid);
            }

            if (s.turnPhase === 'MAIN') {
                this.handleAction({ type: 'END_TURN', playerId: pid }, pid);
            }
        }
    }

    refreshTimer() {
        const expected = this.evaluateTimer();

        if (!expected) {
            this.stopTimer();
            this.onTimerTick?.(null, null);
            return;
        }

        if (this.activeTimer) {
            const same = this.activeTimer.phase === expected.phase
                && this.activeTimer.playerId === expected.playerId;
            if (same && this.activeTimer.alive) return;

            // Preserve TURN remaining when entering COUNTER
            if (this.activeTimer.phase === 'TURN' && expected.phase === 'COUNTER') {
                this.turnTimerRemaining = this.activeTimer.remaining;
            }
            // Restore TURN remaining when leaving COUNTER
            if (this.activeTimer.phase === 'COUNTER' && expected.phase === 'TURN' && this.turnTimerRemaining !== null) {
                const remaining = this.turnTimerRemaining;
                this.turnTimerRemaining = null;
                this.stopTimer();
                this.startTimer({ ...expected, remaining });
                this.scheduleBot(expected);
                return;
            }
        }

        this.startTimer(expected);
        this.scheduleBot(expected);
    }

    handleAction(action: GameAction, playerId: 'p1' | 'p2') {
        // Queue if already processing an action (reentrancy guard)
        if (this.processingAction) {
            this.actionQueue.push({ action, playerId });
            return;
        }
        this.processingAction = true;
        try {
            this._processAction(action, playerId);
        } finally {
            this.processingAction = false;
            this._drainQueue();
        }
    }

    private _processAction(action: GameAction, playerId: 'p1' | 'p2') {
        const index = this.actions.length + 1;

        const record: ActionRecord = {
            index,
            action,
            playerId,
            time: Date.now(),
        };

        this.actions.push(record);

        const newState = applyAction(this.currentState, action);
        if (action.type === 'END_TURN') {
            console.log(`[ACTION] END_TURN by ${playerId} → activePlayer:${newState.activePlayer}, turnPhase:${newState.turnPhase}, gamePhase:${newState.gamePhase}`);
        }
        this.currentState = newState;
        this.onStateChanged?.(newState);

        if (newState.gamePhase === 'GAME_OVER') {
            this.onGameOverCallback?.(newState);
            this.stopTimer();
            this.onTimerTick?.(null, null);
        }

        if (index % this.SNAPSHOT_EVERY_N_ACTIONS === 0) {
            this.snapshots.push({
                actionIndex: index,
                state: newState,
                time: Date.now(),
            });
        }

        this.refreshTimer();
    }

    private _drainQueue() {
        while (this.actionQueue.length > 0) {
            const { action, playerId } = this.actionQueue.shift()!;
            this.processingAction = true;
            try {
                this._processAction(action, playerId);
            } finally {
                this.processingAction = false;
            }
        }
    }

    private async handleBotTurn(info: TimerInfo) {
        if (this.botBusy) return;

        // Rechazar timers stale (de fases anteriores)
        const currentExpected = this.evaluateTimer();
        if (currentExpected && (currentExpected.phase !== info.phase || currentExpected.playerId !== info.playerId)) {
            return;
        }

        this.botBusy = true;
        try {
        console.log(`[BOT_TURN] phase=${info.phase}, pid=${info.playerId}`);
        const s = this.currentState;
        const pid = info.playerId as 'p1' | 'p2' | undefined;

        if (!pid) {
            const botP = (['p1', 'p2'] as const).find(p => this.isBotPlayer(p));
            if (!botP) return;

            if (info.phase === 'IDENTITY_SELECTION') {
                if (!s.players[botP]?.selectedIdentity) {
                    const modelId = this.botModelId ?? 'cpu_medio';
                    const action = await decideAI(modelId, JSON.parse(JSON.stringify(s)), botP);
                    if (action) this.handleAction(action, botP);
                }
                return;
            }
            if (info.phase === 'REVEAL') { this.handleRevealDismiss(botP); return; }
            if (info.phase === 'ROLL_RESULT') { this.handleRollResultDismiss(botP); return; }
            return;
        }

        if (info.phase === 'DEPLOYMENT') {
            await this.deployBotUnits(pid);
            return;
        }

        if (info.phase === 'TURN') {
            try {
                await this.runAITurn(pid);
            } catch (e) {
                console.error('[BOT_ERROR] runAITurn failed:', e);
            }
            return;
        }

        const mid = this.botModelId ?? 'cpu_medio';
        const action = await decideAI(mid, JSON.parse(JSON.stringify(this.currentState)), pid);
        if (action) this.handleAction(action, pid);
        } finally {
            this.botBusy = false;
        }
    }

    private async deployBotUnits(pid: 'p1' | 'p2') {
        for (let i = 0; i < 30; i++) {
            const cur = this.currentState;
            if (cur.currentDeployingPlayer !== pid || cur.preparationPhase !== 'DEPLOYMENT') break;

            const pool = cur.players[pid]?.unitsToDeploy ?? [];
            if (pool.length === 0) break;

            // Priorizar general si ya se desplegaron >=10 unidades y aun no esta
            const deployed = cur.players[pid]?.deployedUnits ?? [];
            let entries = pool;
            if (deployed.length >= 10 && !deployed.some(id => cur.units[id]?.class === 'general')) {
                const generalEntry = pool.find(e => e.unitClass === 'general');
                if (generalEntry) entries = [generalEntry];
            }

            const entry = entries[0];
            const candidates = this.deploymentCandidates(cur, pid);
            if (candidates.length === 0) break;

            // Evaluar cada hex candidato con IA
            let bestHex: HexCoord | null = null;
            let bestScore = -Infinity;
            for (const hex of candidates) {
                const score = evaluateDeployPosition(cur, pid, entry.unitId, entry.unitClass, hex);
                if (score > bestScore) { bestScore = score; bestHex = hex; }
            }

            if (bestHex) {
                this.handleAction({
                    type: 'DEPLOY_UNIT',
                    playerId: pid,
                    unitId: entry.unitId,
                    position: bestHex,
                }, pid);
                await new Promise(r => setTimeout(r, 500));
            } else {
                break;
            }
        }
    }

    private deploymentCandidates(state: GameState, playerId: 'p1' | 'p2'): HexCoord[] {
        const friendlyUnits = Object.values(state.units).filter(u => u.owner === playerId);
        const centerHex = state.centerHex;
        const radius = state.map.radius;

        if (friendlyUnits.length === 0) {
            return hexRange(centerHex, 2).filter(h =>
                hexDistance(h, centerHex) === 2
                && isWithinBounds(h, radius)
                && !isHexOccupied(state, h)
            );
        }
        return hexRange(centerHex, radius).filter(h =>
            isWithinBounds(h, radius)
            && !isHexOccupied(state, h)
            && friendlyUnits.some(u => hexDistance(u.position, h) <= 2)
        );
    }

    private async runAITurn(pid: 'p1' | 'p2') {
        if (this.currentState.activePlayer !== pid || this.currentState.gamePhase !== 'GAME') return;

        let lastAP = -1;
        let staleCount = 0;

        for (let i = 0; i < 30; i++) {
            const cur = this.currentState;
            if (cur.activePlayer !== pid || cur.gamePhase !== 'GAME') break;

            // COUNTER → PASS_COUNTER
            if (cur.turnPhase === 'COUNTER') {
                this.handleAction({ type: 'PASS_COUNTER', playerId: pid as any }, pid);
                break;
            }

            // DRAW con mano > 3 → descartar primera
            if (cur.turnPhase === 'DRAW') {
                const hand = cur.players[pid]?.cardsInHand ?? [];
                if (hand.length > 3) {
                    this.handleAction({ type: 'DISCARD_CARD', playerId: pid as any, cardId: hand[0] }, pid);
                    await new Promise(r => setTimeout(r, 20));
                    continue;
                }
                // Sin cartas que descartar → re-evaluar (el turno podr�a haber cambiado a MAIN)
                continue;
            }

            // MAIN → decidir acción
            if (cur.turnPhase === 'MAIN') {
                const ap = cur.players[pid]?.actionPoints ?? 0;

                // Stale detection: 2 acciones consecutivas sin PA → END_TURN
                if (ap === lastAP) {
                    staleCount++;
                    if (staleCount >= 2) {
                        console.log(`[BOT] END_TURN stale AP=${ap} for ${pid}`);
                        this.handleAction({ type: 'END_TURN', playerId: pid as any }, pid);
                        break;
                    }
                } else {
                    staleCount = 0;
                    lastAP = ap;
                }

                if (ap === 0) {
                    console.log(`[BOT] END_TURN AP=0 for ${pid}`);
                    this.handleAction({ type: 'END_TURN', playerId: pid as any }, pid);
                    break;
                }

                // Resolve pending identity prompts
                if (cur.players[pid]?.pendingIdentityTarget) {
                    const targets = Object.values(cur.units).filter(u => u.owner !== pid && u.class !== 'general');
                    if (targets.length > 0) {
                        this.handleAction({ type: 'IDENTITY_ABILITY', playerId: pid, targetId: targets[0].id }, pid);
                        await new Promise(r => setTimeout(r, 20));
                        continue;
                    }
                }
                if (cur.players[pid]?.pendingEspartanoChoice) {
                    this.handleAction({ type: 'ESPARTANO_CHOICE', playerId: pid, choice: 'defense' }, pid);
                    await new Promise(r => setTimeout(r, 20));
                    continue;
                }
                if (cur.players[pid]?.pendingPlanBatalla) {
                    this.handleAction({ type: 'COMANDANTE_CHOICE', playerId: pid, choice: 'attack' }, pid);
                    await new Promise(r => setTimeout(r, 20));
                    continue;
                }

                console.log(`[RUN_AI] ${pid}, AP=${ap}, phase=MAIN, i=${i}`);

                // Forzar tick del timer antes del cómputo para que el cliente vea el estado actual
                if (this.activeTimer) {
                    this.onTimerTick?.({ phase: this.activeTimer.phase as any, remaining: this.activeTimer.remaining, duration: this.activeTimer.duration, isActive: this.activeTimer.alive, playerId: this.activeTimer.playerId }, null);
                }

                const mid = this.botModelId ?? 'cpu_medio';
                const budget = i === 0 ? undefined : Math.max(2000, 5000 - i * 1000);
                const action = await decideAI(mid, JSON.parse(JSON.stringify(cur)), pid, budget);
                if (!action || action.type === 'END_TURN') break;

                this.handleAction(action, pid);
                await new Promise(r => setTimeout(r, 20));
                continue;
            }

            break;
        }
    }

    private isBotPlayer(playerId: 'p1' | 'p2'): boolean {
        return this.players.some(p => p.playerId === playerId && p.isBot);
    }

    private scheduleBot(expected: TimerInfo): void {
        if (expected.playerId && this.isBotPlayer(expected.playerId as 'p1' | 'p2')) {
            setTimeout(() => this.handleBotTurn(expected), 20);
        } else if (!expected.playerId && ['IDENTITY_SELECTION', 'ROLL', 'REVEAL', 'ROLL_RESULT'].includes(expected.phase)) {
            if (['p1', 'p2' as const].some(pid => this.isBotPlayer(pid as 'p1' | 'p2'))) {
                if (expected.phase === 'ROLL') {
                    setTimeout(() => this.fireAutoAction(expected), 20);
                } else {
                    setTimeout(() => this.handleBotTurn(expected), 20);
                }
            }
        }
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