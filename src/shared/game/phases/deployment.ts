import type { GameState, PlayerId } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { isHexOccupied, isWithinBounds, countPlayerClasses } from '../utils';
import { createUnit } from '../units';
import { applyTurnStart } from './turn';

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
    if (!player.unitsToDeploy?.includes(action.unitId)) return state;
    if (isHexOccupied(state, action.position)) return state;
    if (!isWithinBounds(action.position, state.map.radius)) return state;

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
    if (classCounts[action.class] >= 3) return state;
    if (action.class === 'general' && classCounts.general >= 1) return state;

    const remainingUnits = player.unitsToDeploy.length;
    if (remainingUnits === 1 && classCounts.general === 0 && action.class !== 'general') return state;

    const unit = createUnit(action.unitId, action.playerId, action.position, action.class);

    let newState: GameState = {
        ...state,
        units: { ...state.units, [unit.id]: unit },
        players: {
            ...state.players,
            [action.playerId]: {
                ...player,
                unitsToDeploy: player.unitsToDeploy.filter(id => id !== unit.id),
                deployedUnits: [...(player.deployedUnits || []), unit.id]
            }
        }
    };

    const nextCount = state.deploymentCount + 1;
    const target = getTargetForStep(state.deploymentStep);

    // Aún no completa la ronda
    if (nextCount < target) {
        return { ...newState, deploymentCount: nextCount };
    }

    // Ronda completada → avanzar al siguiente paso
    const nextStep = state.deploymentStep + 1;

    // Si se acabaron los pasos, terminar despliegue
    if (nextStep >= 12) {
        const postDeploy: GameState = {
            ...newState,
            deploymentCount: 0,
            deploymentStep: nextStep,
            gamePhase: 'GAME',
            preparationPhase: 'DONE',
        };
        // Primer turno: DRAW → robar carta → recibir PA → MAIN
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
