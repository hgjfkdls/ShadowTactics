import type { GameState, Unit, UnitId, PlayerId } from './state';
import { hexDistance } from '../hex';
import { addModifier } from './modifiers/engine';

// Los 6 ejes del hexágono (axial coordinates)
const AXES: Array<{ q: number; r: number }> = [
    { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
    { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

export type FormationResult = {
    lineaUnits: Set<UnitId>;
    trianguloUnits: Set<UnitId>;
};

export function evaluateFormations(state: GameState, playerId: string): FormationResult {
    const allies = Object.values(state.units).filter(u => u.owner === playerId);
    const lineaUnits = new Set<UnitId>();
    const trianguloUnits = new Set<UnitId>();

    if (allies.length < 3) return { lineaUnits, trianguloUnits };

    // ── Línea recta ──
    // Para cada aliado, escanear los 6 ejes y contar cuántos aliados están en cada línea
    const positionMap = new Map<string, Unit>();
    for (const u of allies) {
        positionMap.set(`${u.position.q},${u.position.r}`, u);
    }

    const processed = new Set<string>();
    for (const u of allies) {
        for (const axis of AXES) {
            const lineIds: string[] = [u.id];

            // Escanear en dirección positiva del eje
            let curQ = u.position.q + axis.q;
            let curR = u.position.r + axis.r;
            while (true) {
                const found = positionMap.get(`${curQ},${curR}`);
                if (!found) break;
                lineIds.push(found.id);
                curQ += axis.q;
                curR += axis.r;
            }

            // Escanear en dirección negativa del eje
            curQ = u.position.q - axis.q;
            curR = u.position.r - axis.r;
            while (true) {
                const found = positionMap.get(`${curQ},${curR}`);
                if (!found) break;
                lineIds.push(found.id);
                curQ -= axis.q;
                curR -= axis.r;
            }

            if (lineIds.length >= 3) {
                // Añadir todos los IDs de la línea (ordenados para evitar duplicados)
                const sortedKey = [...lineIds].sort().join('|');
                if (!processed.has(sortedKey)) {
                    processed.add(sortedKey);
                    for (const id of lineIds) {
                        lineaUnits.add(id);
                    }
                }
            }
        }
    }

    // ── Triángulo ──
    // 3 aliados mutuamente adyacentes
    for (let i = 0; i < allies.length; i++) {
        for (let j = i + 1; j < allies.length; j++) {
            if (hexDistance(allies[i].position, allies[j].position) !== 1) continue;
            for (let k = j + 1; k < allies.length; k++) {
                if (hexDistance(allies[i].position, allies[k].position) !== 1) continue;
                if (hexDistance(allies[j].position, allies[k].position) !== 1) continue;
                trianguloUnits.add(allies[i].id);
                trianguloUnits.add(allies[j].id);
                trianguloUnits.add(allies[k].id);
            }
        }
    }

    return { lineaUnits, trianguloUnits };
}

export function applyFormationModifiers(state: GameState, playerId: PlayerId): GameState {
    const identity = state.players[playerId]?.selectedIdentity ?? '';
    if (!identity.startsWith('corazon_estratega')) return state;

    // Limpiar modificadores de formación anteriores
    let s: GameState = {
        ...state,
        activeModifiers: state.activeModifiers.filter(m => !m.id.startsWith('formacion_')),
    };

    const { lineaUnits, trianguloUnits } = evaluateFormations(s, playerId);
    const alreadyLinea = new Set<string>();
    const alreadyTriangulo = new Set<string>();

    for (const uid of Object.keys(s.units)) {
        const u = s.units[uid];
        if (u.owner !== playerId) continue;

        const inLinea = lineaUnits.has(uid) && !alreadyLinea.has(uid);
        const inTriangulo = trianguloUnits.has(uid) && !alreadyTriangulo.has(uid);

        if (inLinea) {
            s = addModifier(s, playerId, uid, 'defense', 1, 'ADD', 1, 1, 'ability', 'formacion_linea');
            // Override the auto-generated ID with a formation-specific one
            const last = s.activeModifiers[s.activeModifiers.length - 1];
            if (last) {
                s = {
                    ...s,
                    activeModifiers: s.activeModifiers.map((m, i) =>
                        i === s.activeModifiers.length - 1 ? { ...m, id: `formacion_linea_${uid}` } : m
                    ),
                };
            }
            alreadyLinea.add(uid);
        }
        if (inTriangulo) {
            s = addModifier(s, playerId, uid, 'attack', 1, 'ADD', 1, 1, 'ability', 'formacion_triangulo');
            const last = s.activeModifiers[s.activeModifiers.length - 1];
            if (last) {
                s = {
                    ...s,
                    activeModifiers: s.activeModifiers.map((m, i) =>
                        i === s.activeModifiers.length - 1 ? { ...m, id: `formacion_triangulo_${uid}` } : m
                    ),
                };
            }
            alreadyTriangulo.add(uid);
        }
    }

    return s;
}

export function applyMuroEspartanoModifiers(state: GameState, playerId: PlayerId): GameState {
    const identity = state.players[playerId]?.selectedIdentity ?? '';
    if (!identity.startsWith('espartano')) return state;
    let s: GameState = {
        ...state,
        activeModifiers: state.activeModifiers.filter(m => !m.id.startsWith('muro_espartano_')),
    };
    const lancers = Object.values(s.units).filter(u => u.owner === playerId && u.class === 'lancer');
    for (const lancer of lancers) {
        const hasAdjacent = lancers.some(other =>
            other.id !== lancer.id && hexDistance(lancer.position, other.position) === 1
        );
        if (hasAdjacent) {
            s = addModifier(s, playerId, lancer.id, 'attack', 1, 'ADD', 1, 1, 'ability', 'muro_espartano');
            const last = s.activeModifiers[s.activeModifiers.length - 1];
            if (last) {
                s = { ...s, activeModifiers: s.activeModifiers.map((m, i) =>
                    i === s.activeModifiers.length - 1 ? { ...m, id: `muro_espartano_${lancer.id}` } : m
                ) };
            }
        }
    }
    return s;
}
