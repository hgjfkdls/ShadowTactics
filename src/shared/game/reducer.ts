import { GameState } from './state';
import { GameAction } from './actions';
import { hexDistance } from '../hex';
import { rollDice } from './utils';

export function applyAction(
    state: GameState,
    action: GameAction
): GameState {
    switch (action.type) {
        case 'MOVE_UNIT': {
            const unit = state.units[action.unitId];

            if (!unit) return state;

            if (unit.owner !== state.activePlayer) return state;

            const distance = hexDistance(unit.position, action.to);

            if (distance > unit.movement) return state;

            return {
                ...state,
                units: {
                    ...state.units,
                    [unit.id]: {
                        ...unit,
                        position: action.to
                    }
                }
            };
        }

        case 'ATTACK_UNIT': {
            //identifica ambas unidades
            const unit = state.units[action.unitId];
            const target = state.units[action.targetId];
            if (!unit || !target) return state;

            //verifica que el atacante sea del jugador activo y que el objetivo no sea aliado
            if (unit.owner !== state.activePlayer) return state;
            if (target.owner === unit.owner) return state;

            //calcula la distancia entre ambas unidades y verifica que el objetivo esté dentro del rango de ataque
            const distance = hexDistance(unit.position, target.position);
            if (distance > unit.range) return state;

            // calcula la probabilidad de éxito del ataque basado en la dificultad del objetivo y una tirada de dados
            const roll = rollDice(12);

            // si la tirada es menor que la dificultad del objetivo, el ataque falla
            if (roll < unit.difficulty) {
                if (target.range < distance) {
                    // falla ataque, pero el objetivo está fuera de rango
                    return state;
                }
                else {
                    // falla ataque, target tiene rango y contesta el ataque con daño 3
                    const damage = 3;
                    // si el objetivo es un arquero, el contraataque es de daño 2
                    if (target.class === 'archer') {
                        const damage = 2;
                    }
                    return {
                        ...state,
                        units: {
                            ...state.units, [unit.id]: {
                                ...unit,
                                hp: unit.hp - damage
                            }
                        }
                    }
                }
            }
            else {
                // si la tirada es mayor o igual que la dificultad del objetivo, el ataque es exitoso
                const damage = unit.attack;
                return {
                    ...state,
                    units: {
                        ...state.units,
                        [target.id]: {
                            ...target,
                            hp: target.hp - damage
                        }
                    }
                };
            }
        }

        case 'END_TURN':
            return {
                ...state,
                turn: state.turn + 1,
                activePlayer: getNextPlayer(state)
            };

        default:
            return state;
}
}

function getNextPlayer(state: GameState) {
    // por ahora simple (luego se extiende)
    return state.activePlayer === 'p1' ? 'p2' : 'p1';
}

