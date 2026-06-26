import type { GameState, PlayerId } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { isHexOccupied, isWithinBounds, countPlayerClasses } from '../utils';
import { createUnit } from '../units';
import { applyTurnStart } from './turn';
import { applyIdentityEffects } from './identity-apply';

function getTargetForStep(step: number): number {
    if (step === 0) return 1;   // order[0] (menor dado) coloca 1 primero
    if (step === 11) return 1;  // order[1] cierra con 1
    return 2;                   // el resto colocan 2
}

function getDeployerForStep(step: number, order: PlayerId[]): PlayerId {
    return step % 2 === 0 ? order[0] : order[1];
}

export function handleDeployment(state: GameState, action: GameAction): GameState {
    if (action.type !== 'DEPLOY_UNIT') return state;
    if (action.playerId !== state.currentDeployingPlayer) return state;

    const player = state.players[action.playerId];
    if (!player) return state;

    const poolEntry = player.unitsToDeploy?.find(u => u.unitId === action.unitId);
    if (!poolEntry) return state;

    if (isHexOccupied(state, action.position)) return state;
    if (!isWithinBounds(action.position, state.map.radius)) return state;

    const unitClass = poolEntry.unitClass;
    const deployedCount = player.deployedUnits?.length ?? 0;

    if (deployedCount === 0) {
        if (hexDistance(action.position, state.centerHex) !== 2) return state;
    } else {
        const near = Object.values(state.units)
            .filter(u => u.owner === action.playerId)
            .some(u => hexDistance(u.position, action.position) <= 2);
        if (!near) return state;
    }

    const classCounts = countPlayerClasses(state, action.playerId);
    if (classCounts[unitClass] >= 3) return state;
    if (unitClass === 'general' && classCounts.general >= 1) return state;

    // Must deploy at least 1 general among the 11 units per player
    if (classCounts.general === 0) {
        const deployed = player.deployedUnits?.length ?? 0;
        if (unitClass !== 'general' && deployed >= 10) return state;
    }

    const unit = createUnit(action.unitId, action.playerId, action.position, unitClass);

    let newState: GameState = {
        ...state,
        units: { ...state.units, [unit.id]: unit },
        players: {
            ...state.players,
            [action.playerId]: {
                ...player,
                unitsToDeploy: player.unitsToDeploy.filter(u => u.unitId !== unit.id),
                deployedUnits: [...(player.deployedUnits || []), unit.id]
            }
        }
    };

    const nextCount = state.deploymentCount + 1;
    const target = getTargetForStep(state.deploymentStep);

    if (nextCount < target) {
        return { ...newState, deploymentCount: nextCount };
    }

    const nextStep = state.deploymentStep + 1;

    if (nextStep >= 12) {
        const identityApplied = applyIdentityEffects(newState);
        const postDeploy: GameState = {
            ...identityApplied,
            deploymentCount: 0,
            deploymentStep: nextStep,
            gamePhase: 'GAME',
            preparationPhase: 'DONE',
            gameStartTime: Date.now(),
        };
        return applyTurnStart(postDeploy, newState.activePlayer);
    }

    const nextPlayer = getDeployerForStep(nextStep, state.deploymentOrder!);
    return {
        ...newState,
        currentDeployingPlayer: nextPlayer,
        deploymentStep: nextStep,
        deploymentCount: 0
    };
}
