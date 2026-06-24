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
    usedVentajaAlcance?: boolean;
    usedDobleAtaque?: boolean;
    usedDisparoRapido?: boolean;
    usedFuegoCobertura?: boolean;
    usedAccionEvasiva?: boolean;
    usedAvance?: boolean;
    hasCargaBonus?: boolean;         // true si usó Cabalgar + Carga
    fuegoCoberturaCharges?: number;  // cargas restantes de Fuego de cobertura (coste +1)
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

    // Último resultado de ataque (para mostrar dados al cliente)
    lastAttackResult?: {
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
    };
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