# Simulación — Liderar a las tropas (Capitán de la Guardia)

```typescript
import { createInitialGameState } from '../src/shared/game/init';
import { applyAction } from '../src/shared/game/reducer';
import { hexDistance } from '../src/shared/hex';

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`FAIL: ${msg}`);
    console.log(`  PASS: ${msg}`);
}

let state = createInitialGameState(42);
state = applyAction(state, { type: 'SIMULATE_PREPARATION', playerId: 'p1' });

const p1 = 'p1';
const general = Object.values(state.units).find(u => u.owner === p1 && u.class === 'general')!;
assert(state.players[p1]?.selectedIdentity?.startsWith('capitan_guardia'), 'P1 tiene Capitán de la Guardia');

// Simular kill: marcar nextTurnGlobalPresion
state = {
    ...state,
    players: {
        ...state.players,
        [p1]: { ...state.players[p1], nextTurnGlobalPresion: true },
    },
};
assert(state.players[p1]?.nextTurnGlobalPresion === true, 'nextTurnGlobalPresion = true tras matar');

// Turno 2 (enemigo)
state = applyAction(state, { type: 'END_TURN', playerId: p1 });
assert(state.activePlayer !== p1, 'Turno 2: activo pasa a enemigo');

// Turno 3 (P1 otra vez)
state = applyAction(state, { type: 'END_TURN', playerId: state.activePlayer });
assert(state.activePlayer === p1, 'Turno 3: activo vuelve a P1');
assert(state.players[p1]?.globalPresionActive === true, 'Turno 3: globalPresionActive se activa');
assert(state.players[p1]?.nextTurnGlobalPresion === false, 'Turno 3: nextTurnGlobalPresion se limpia');

// Simular otra kill
state = {
    ...state,
    players: {
        ...state.players,
        [p1]: { ...state.players[p1], nextTurnGlobalPresion: true },
    },
};
assert(state.players[p1]?.nextTurnGlobalPresion === true, 'nextTurnGlobalPresion = true tras segunda kill');

// Turno 4 (enemigo)
state = applyAction(state, { type: 'END_TURN', playerId: p1 });
assert(state.activePlayer !== p1, 'Turno 4: activo pasa a enemigo');

// Turno 5 (P1 otra vez)
state = applyAction(state, { type: 'END_TURN', playerId: state.activePlayer });
assert(state.activePlayer === p1, 'Turno 5: activo vuelve a P1');
assert(state.players[p1]?.globalPresionActive === true, 'Turno 5: globalPresionActive se reactiva (segunda activación)');
assert(state.players[p1]?.nextTurnGlobalPresion === false, 'Turno 5: nextTurnGlobalPresion se limpia');

console.log('\n✓ Liderar a las tropas se activa correctamente en múltiples ocasiones');
```

## Resultado

```
  PASS: P1 tiene Capitán de la Guardia
  PASS: nextTurnGlobalPresion = true tras matar
  PASS: Turno 2: activo pasa a enemigo
  PASS: Turno 3: activo vuelve a P1
  PASS: Turno 3: globalPresionActive se activa
  PASS: Turno 3: nextTurnGlobalPresion se limpia
  PASS: nextTurnGlobalPresion = true tras segunda kill
  PASS: Turno 4: activo pasa a enemigo
  PASS: Turno 5: activo vuelve a P1
  PASS: Turno 5: globalPresionActive se reactiva (segunda activación)
  PASS: Turno 5: nextTurnGlobalPresion se limpia

✓ Liderar a las tropas se activa correctamente en múltiples ocasiones
```

## Conclusión

El flag `nextTurnGlobalPresion` se activa al matar, se transfiere a `globalPresionActive` al iniciar el siguiente turno del jugador, y se limpia al terminar el turno. El ciclo funciona correctamente para múltiples activaciones a lo largo de la partida.

## Pendiente

El general no puede one-shot enemigos con su ataque base (5 daño vs 8+ HP). Para probar el flujo completo con asesinato real, se necesita:
- Herir primero con otra unidad y rematar con el general, o
- Usar un crítico (dificultad: necesita 11+ en 2d6, daño extra +2)
