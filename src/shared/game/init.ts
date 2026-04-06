import { GameState } from './state';

export function createInitialGameState(): GameState {
    return {
        turn: 1,
        activePlayer: 'p1',
        map: { radius: 4 },

        units: {
            // PLAYER 1 (lado izquierdo)
            u1: {
                id: 'u1',
                owner: 'p1',
                position: { q: -2, r: 0 },
                attack: 3,
                hp: 8,
                difficulty: 6,
                range: 4,
                movement: 1,
                class: 'archer'
            },
            u2: {
                id: 'u2',
                owner: 'p1',
                position: { q: -3, r: 1 },
                attack: 5,
                hp: 10,
                difficulty: 5,
                range: 1,
                movement: 1,
                class: 'infantry'
            },
            u3: {
                id: 'u3',
                owner: 'p1',
                position: { q: -3, r: 0 },
                attack: 6,
                hp: 12,
                difficulty: 5,
                range: 1,
                movement: 2,
                class: 'cavalry'
            },

            // PLAYER 2 (lado derecho)
            u4: {
                id: 'u4',
                owner: 'p2',
                position: { q: 2, r: 0 },
                attack: 3,
                hp: 8,
                difficulty: 6,
                range: 4,
                movement: 1,
                class: 'archer'
            },
            u5: {
                id: 'u5',
                owner: 'p2',
                position: { q: 3, r: -1 },
                attack: 5,
                hp: 10,
                difficulty: 5,
                range: 1,
                movement: 1,
                class: 'infantry'
            },
            u6: {
                id: 'u6',
                owner: 'p2',
                position: { q: 3, r: 0 },
                attack: 6,
                hp: 12,
                difficulty: 5,
                range: 1,
                movement: 2,
                class: 'cavalry'
            }
        }
    };
}