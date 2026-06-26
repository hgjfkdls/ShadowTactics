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
};

export type GameState = {
    // Flujo global
    turn: number;
    activePlayer: PlayerId;

    gamePhase: 'PREPARATION' | 'GAME' | 'GAME_OVER';
    winner?: PlayerId;

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

    // Ocupación pendiente tras Avance (pasiva)
    pendingOccupation?: {
        unitId: UnitId;
        position: HexCoord;
    };

    // Robin Hood: curación por identidad
    lastIdentityHeal?: { unitId: UnitId };

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