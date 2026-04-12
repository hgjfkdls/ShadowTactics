/**
 * File        : C:\Users\Alvaro\Documents\proyectos\ShadowTactics\src\shared\game\state.ts
 * Autor       : Alvaro Cabedo
 * Fecha       : 2026-04-05
 * Descripcion : 
 */

import { HexCoord, HexMap } from '../hex';

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
};

export type GameState = {
    // Flujo global
    turn: number;
    activePlayer: PlayerId;

    gamePhase: 'PREPARATION' | 'GAME';

    // Subfases
    preparationPhase:
        | 'IDENTITY_SELECTION'
        | 'ROLL'
        | 'DEPLOYMENT'
        | 'DONE';

    turnPhase: 'DRAW' | 'MAIN' | 'COUNTER' | 'ACTION';

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

    // Orden de despliegue
    deploymentOrder?: PlayerId[];
    currentDeployingPlayer?: PlayerId;
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
    unitsToDeploy?: UnitId[];      // pool inicial
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