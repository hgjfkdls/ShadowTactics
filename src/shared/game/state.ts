/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\state.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { HexCoord, HexMap } from '../hex';
import type { ModifierInstance } from './modifiers/types';

export type { HexCoord, HexMap };

export type PlayerId = string;
export type UnitId = string;
export type CardId = string;

export type Unit = {
    id: UnitId;
    owner: PlayerId;
    position: HexCoord;
    attack: number;
    hp: number;
    difficulty: number;
    range: number;
    movementCost: number;
    class: 'archer' | 'infantry' | 'lancer' | 'cavalry' | 'general';
    abilities?: string[];          // IDs de habilidades activas/pasivas
    // Seguimiento de habilidades
    timesDamagedThisTurn?: number;
    lastTargetId?: UnitId;
    didMovePreviousTurn?: boolean;    // snapshot de si se movió al final del turno anterior
    lastHex?: HexCoord;
    usedAccionEvasiva?: boolean;
    usedAvance?: boolean;
    hasCargaBonus?: boolean;         // true si usó Cabalgar + Carga
    proyeccionActive?: boolean;        // Punta de Lanza: primer ataque hace daño detrás
    royalShieldSavedHp?: number;          // Inspiración Real: HP guardado antes del escudo
    ataqueExtraCharges?: number;             // Ataque extra: cargas acumulables
    precisionCharges?: number;               // Precisión: cargas acumulables
    auraShield?: number;                     // Escudo del aura (infantería) — se consume antes que HP
    flags?: string[];                      // Seguimiento unificado de flags de habilidades
    direction?: HexCoord;  // Hex hacia el que mira la unidad
    dying?: boolean;       // Marca de muerte: pendiente de animación antes de ir a graveyard
};

export type GameState = {
    // Flujo global
    turn: number;
    activePlayer: PlayerId;

    gamePhase: 'PREPARATION' | 'GAME' | 'GAME_OVER';
    winner?: PlayerId;
    gameOverReason?: 'general_killed' | 'surrender' | 'disconnect';

    // Subfases
    preparationPhase:
        | 'IDENTITY_SELECTION'
        | 'ROLL'
        | 'ROLL_RESULT'
        | 'DEPLOYMENT'
        | 'DONE';

    turnPhase: 'DRAW' | 'MAIN' | 'COUNTER';

    // Mapa
    map: HexMap;
    centerHex: HexCoord;

    // Unidades
    units: Record<UnitId, Unit>;
    graveyard: Record<UnitId, Unit>;

    // RNG
    rngSeed: number;

    // Jugadores
    players: Record<PlayerId, PlayerResources>;

    // Dados de fase de preparación
    diceRolls: Record<PlayerId, number | undefined>;
    lastTieRoll?: number;              // valor del último empate (para mostrar antes de repetir)

    // Orden de despliegue
    deploymentOrder?: PlayerId[];
    currentDeployingPlayer?: PlayerId;
    deploymentStep: number;       // qué ronda del despliegue (0-11)
    deploymentCount: number;      // unidades colocadas por el jugador actual en esta ronda

    // Mazo de efecto
    effectDeck: CardId[];
    effectDiscard: CardId[];

    // Mazo de identidad (15 cartas)
    identityDeck: CardId[];

    // Modificadores activos (efectos entre turnos)
    activeModifiers: ModifierInstance[];
    nextModifierId: number;

    // Última carta jugada (para COUNTERs)
    lastCardAction?: {
        cardId: CardId;
        playerId: PlayerId;
        targetId?: UnitId;
    };

    // Rechazo de carta (razón para mostrar al jugador)
    lastCardRejectionReason?: string;

    // Ocupación pendiente tras Avance (pasiva)
    gameStartTime?: number;  // Date.now() cuando la partida entra en fase GAME

    pendingOccupation?: {
        unitId: UnitId;
        position: HexCoord;
    };

    // Robin Hood: curación por identidad
    lastIdentityHeal?: { unitId: UnitId };

    // Samurái: Camino del guerrero activado este turno
    lastCaminoDelGuerrero?: boolean;

    // Historial de la partida
    gameHistory: Array<{
        id: string;
        turn: number;
        actionNumber: number;
        playerId: string;
        type: 'attack';
        attackerId: string;
        targetId: string;
        die1: number;
        die2: number;
        total: number;
        difficulty: number;
        baseDifficulty: number;
        hit: boolean;
        damage: number;
        baseAttack: number;
        counterDamage: number;
        attackerClass: string;
        targetClass: string;
        targetKilled?: boolean;
        attackerKilled?: boolean;
        attackName?: string;
        distance?: number;
        modifiers: string[];
        voiceKey?: string;
        paCost?: number;
        paModifiers?: string[];
        gameTime?: string;
    } | {
        id: string;
        turn: number;
        actionNumber: number;
        playerId: string;
        type: 'move';
        unitId: string;
        unitClass: string;
        from: { q: number; r: number };
        to: { q: number; r: number };
        path?: string;
        cost: number;
        baseCost: number;
        modifiers: string[];
        voiceKey?: string;
        gameTime?: string;
    } | {
        id: string;
        turn: number;
        actionNumber: number;
        playerId: string;
        type: 'card';
        cardId: string;
        cardName: string;
        cardType: 'BUFF' | 'DEBUFF' | 'COUNTER';
        targetId?: string;
        targetClass?: string;
        counterCardId?: string;
        counterCardName?: string;
        details?: string;
        paCost?: number;
        sourceClass?: string;
        sourceIdentity?: string;
        healAmount?: number;
        gameTime?: string;
    } | {
        id: string;
        turn: number;
        actionNumber: number;
        playerId: string;
        type: 'support';
        unitId?: string;
        cardId: string;
        cardName: string;
        configId?: string;
        targetId?: string;
        targetClass?: string;
        details?: string;
        paCost?: number;
        sourceClass?: string;
        sourceIdentity?: string;
        sourceIdentityKey?: string;
        alliesHit?: string[];
        enemiesHit?: string[];
        healAmount?: number;
        gameTime?: string;
    }>;
    nextHistoryId: number;

    // Historial de resultados de ataque
    attackResults: Array<{
        attackerId: UnitId;
        targetId: UnitId;
        die1: number;
        die2: number;
        total: number;
        difficulty: number;
        hit: boolean;
        damage: number;
        counterDamage: number;
        attackerClass: string;
        targetClass: string;
        turn: number;
        attackInTurn?: number;
        targetKilled?: boolean;
        attackerKilled?: boolean;
        attackName?: string;
        elapsed?: number;  // segundos desde gameStartTime
    }>;
};

export type PlayerResources = {
    actionPoints: number;
    carryOver: number;

    // Cartas
    cardsInHand?: CardId[];

    // IDENTIDAD
    identityCards?: CardId[];      // 3 cartas iniciales
    selectedIdentity?: CardId;     // elegida (oculta)
    revealedIdentity?: boolean;     // visible al rival

    // IDENTIDAD — seguimiento por turno
    identityHealedThisTurn?: boolean;  // Robin Hood: 1 curación por turno
    pendingIdentityTarget?: boolean;   // Robin Hood: elegir objetivo para En la mira
    pendingEspartanoChoice?: boolean;   // Espartano: elegir Lanza y escudo

    aLaCargaCost?: number;              // Caballos de Guerra: coste actual de A la carga (0/1/2)

    // HISTORIAL PENDIENTE
    karmaEntryToAppend?: any;             // Karma (Monje Shaolin): entrada de historial pendiente

    // RESULTADO DE ATAQUE
    lastAcknowledgedIndex: number;     // Último índice en attackResults que el jugador reconoció (-1 = ninguno)

    // COMANDANTE SUPREMO
    pendingPlanBatalla?: boolean;     // Plan de batalla: elección pendiente
    pendingCardNeedsTarget?: boolean;  // Carta pendiente necesita selección de objetivo
    caminoDelGuerreroUsedThisTurn?: boolean; // Samurái: 1 PA por kill a rango 1
    flags?: string[];

    // INSPIRACIÓN DE TROPA
    generalWasAttackedLastTurn?: boolean;     // el general fue atacado en el turno rival

    // CONEXIÓN
    disconnectedAt?: number;                  // timestamp de desconexión (para forfeit por timeout)

    // DESPLIEGUE
    unitsToDeploy?: { unitId: UnitId; unitClass: Unit['class'] }[];  // pool inicial con clase asignada
    deployedUnits?: UnitId[];      // ya colocadas
};

export type Card = {
    id: CardId;
    type: 'BUFF' | 'DEBUFF' | 'COUNTER' | 'IDENTITY';
    activation: 'THIS_TURN' | 'NEXT_TURN' | 'INSTANT';
    name: string;
    description: string;
    duration: number;
    effect: (state: GameState, playerId: PlayerId) => GameState;
}