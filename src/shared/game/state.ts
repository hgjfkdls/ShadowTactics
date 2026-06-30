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
    movedThisTurn?: boolean;          // true si se movió en el turno actual
    didMovePreviousTurn?: boolean;    // snapshot de movedThisTurn al final del turno anterior
    attackedThisTurn?: boolean;
    usedCarga?: boolean;
    usedCabalgar?: boolean;
    cabalgarDir?: { dq: number; dr: number };
    usedVentajaAlcance?: boolean;
    usedDobleAtaque?: boolean;
    usedPatadaAcrobatica?: boolean;
    usedFuegoCobertura?: boolean;
    usedAccionEvasiva?: boolean;
    usedAvance?: boolean;
    hasCargaBonus?: boolean;         // true si usó Cabalgar + Carga
    fuegoCoberturaCharges?: number;  // cargas restantes de Fuego de cobertura (coste +1)
    usedCounterattack?: boolean;      // Capitán de la Guardia: 1 contraataque por turno enemigo
    usedTorbellino?: boolean;          // Punta de Lanza: Torbellino usado este turno
    celestialRayDamageBonus?: number; // Dios del Trueno: bonus de daño del próximo ataque
    aLaCargaActive?: boolean;          // Caballos de Guerra: Cabalgar potenciado (3 hex)
    espartanoRangeBonus?: boolean;     // Espartano: +1 rango este turno
    espartanoDefenseBonus?: boolean;   // Espartano: -1 daño recibido este turno
    proyeccionActive?: boolean;        // Punta de Lanza: primer ataque hace daño detrás
    performedActionThisTurn?: boolean;  // Monje Shaolin: tracking de acciones por turno
    usedPosicionEstrategica?: boolean;  // Corazón de Estratega: 1 vez por turno
    usedVozDeMando?: boolean;           // Comandante Supremo: consumió Voz de mando
    royalShieldSavedHp?: number;          // Inspiración Real: HP guardado antes del escudo
    usedEnNombreDelRey?: boolean;         // Inspiración Real: 1 vez por turno
    usedDesenvainadoVeloz?: boolean;       // Samurái: se resetea si elimina al objetivo
    ataqueExtraCharges?: number;             // Ataque extra: cargas acumulables
    precisionCharges?: number;               // Precisión: cargas acumulables
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

    // Monje Shaolin: Meditación usada este turno
    lastMeditacion?: boolean;

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
        modifiers: string[];
        paCost?: number;
        paModifiers?: string[];
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
    } | {
        id: string;
        turn: number;
        actionNumber: number;
        playerId: string;
        type: 'ability';
        abilityId: string;
        abilityName: string;
        sourceClass?: string;
        sourceIdentity?: string;
        targetId?: string;
        targetClass?: string;
        details?: string;
        paCost?: number;
        damage?: number;
        hit?: boolean;
        die1?: number;
        die2?: number;
        total?: number;
        difficulty?: number;
        targetKilled?: boolean;
        modifiers?: string[];
        healAmount?: number;
    } | {
        id: string;
        turn: number;
        actionNumber: number;
        playerId: string;
        type: 'phase';
        phaseName: 'turn_start' | 'turn_end' | 'draw' | 'discard' | 'identity_select' | 'roll' | 'deployment_start' | 'deployment_end' | 'game_start' | 'game_over';
        details?: string;
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
    celestialRayBonus?: number;        // Dios del Trueno: bonus de Rayo celestial (3/2/1)
    aLaCargaCost?: number;              // Caballos de Guerra: coste actual de A la carga (0/1/2)
    nextTurnGlobalPresion?: boolean;    // Capitán de la Guardia: Presión global pendiente para el próximo turno
    globalPresionActive?: boolean;      // Capitán de la Guardia: Presión global activa este turno

    // RESULTADO DE ATAQUE
    lastAcknowledgedIndex: number;     // Último índice en attackResults que el jugador reconoció (-1 = ninguno)

    // COMANDANTE SUPREMO
    pendingPlanBatalla?: boolean;     // Plan de batalla: elección pendiente
    vozDeMandoReady?: boolean;        // Voz de mando: disponible tras mover general
    caminoDelGuerreroUsedThisTurn?: boolean; // Samurái: 1 PA por kill a rango 1
    protegerUsedThisTurn?: boolean;           // Escudo del Comandante: Proteger usado este turno

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