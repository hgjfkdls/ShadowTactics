[docs](../docs.md) > [arquitectura](./index.md) > servidor

# 6. Convenciones de desarrollo

## Nombres de archivos

- **Archivos TypeScript**: `kebab-case.ts` (ej: `action-types.ts`, `game-room.ts`)
- **Archivos React/TSX**: `PascalCase.tsx` (ej: `GameRoom.tsx`, `ActionLog.tsx`)
- **Tests**: `kebab-case.test.ts`
- **Archivos de datos**: `kebab-case.ts` (ej: `abilities.ts`, `identities.ts`)

## Estructura de módulos

Cada módulo sigue el patrón:

```
modulo/
├── index.ts        # Barrel: re-exporta todo lo público
├── archivo1.ts     # Implementación principal
└── archivo2.ts     # Sub-módulos
```

Ejemplo en `src/shared/game/actions/`:

```
actions/
├── index.ts        # Re-exporta: handleMove, handleAttack, handleCard, etc.
├── move.ts         # handleMove
├── attack.ts       # handleAttack
├── card.ts         # handleCard, handleDiscard, handlePassCounter
├── ability.ts      # handleAbility (18 habilidades activas)
├── identity.ts     # handleIdentityAbility (Robin Hood)
└── helpers.ts      # consumeAP, updateUnitPos, getAttackCost
```

## Convenciones de TypeScript

### Tipado estricto

El proyecto usa `strict: true` en `tsconfig.json`. No se permite `any` implícito.

### Tipos vs Interfaces

- Usar **type alias** para uniones discriminadas y tipos de datos planos
- Usar **type** para `GameState`, `Unit`, `GameAction`, etc. (todo el modelo de dominio usa tipos)
- No usar `interface` a menos que sea necesario para declaración de merging

### Naming

| Concepto | Convención | Ejemplo |
|----------|-----------|---------|
| Tipos | `PascalCase` | `GameState`, `ActionRecord`, `HexCoord` |
| Funciones | `camelCase` | `handleMove`, `applyAction`, `createUnit` |
| Constantes | `UPPER_SNAKE_CASE` o `camelCase` | `BASE_STATS`, `TIMEOUT_MS` |
| Variables | `camelCase` | `currentState`, `newState` |
| Archivos | `kebab-case` | `action-types.ts`, `ability-effects.ts` |

### Tipado de acciones

Las acciones se definen como una unión discriminada con `type` como discriminante:

```typescript
type GameAction =
    | { type: 'MOVE_UNIT'; playerId: PlayerId; unitId: UnitId; to: HexCoord }
    | { type: 'ATTACK_UNIT'; playerId: PlayerId; unitId: UnitId; targetId: UnitId }
    | { type: 'END_TURN'; playerId: PlayerId }
    // ... más variantes
```

Esto permite TypeScript estrechar el tipo automáticamente en los `switch`:

```typescript
switch (action.type) {
    case 'MOVE_UNIT':
        // action.unitId existe aquí automáticamente
        return handleMove(state, action);
    case 'ATTACK_UNIT':
        // action.targetId existe aquí automáticamente
        return handleAttack(state, action);
}
```

### Inmutabilidad

Todas las funciones que modifican el estado devuelven un nuevo objeto:

```typescript
// ✅ Correcto
function handleMove(state: GameState, action: GameAction): GameState {
    return {
        ...state,
        units: { ...state.units, [unit.id]: updatedUnit },
        gameHistory: [...state.gameHistory, entry],
    };
}

// ❌ Incorrecto — mutación directa
function handleMove(state: GameState, action: GameAction): void {
    state.units[unit.id] = updatedUnit; // NO
}
```

## Estrategia de manejo de errores

### En el servidor (capa IO)

Los errores se manejan con `try/catch` y logging:

```typescript
try {
    const result = await someOperation();
    if (!result.ok) {
        console.error(`[operacion] Error: ${result.error}`);
    }
} catch (err) {
    console.error(`[operacion] Excepción:`, err);
}
```

### En el reducer (lógica pura)

No se lanzan excepciones. Si una acción no es válida, se devuelve el estado sin cambios:

```typescript
function applyActionInner(state: GameState, action: GameAction): GameState {
    if (state.gamePhase === 'GAME_OVER') return state;  // Silencioso
    if (action.type !== 'END_TURN') return state;       // Silencioso
    // ...
}
```

### En reportes HTTP

Se usa retry con backoff exponencial:

```typescript
const delays = [1_000, 5_000, 15_000];
for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
        const res = await fetch(REPORT_API_URL, { ... });
        if (res.ok) return true;
        console.error(`[report] Intento ${attempt + 1} falló: ${res.status}`);
    } catch (err) {
        console.error(`[report] Error de red:`, err);
    }
    if (attempt < delays.length) await new Promise(r => setTimeout(r, delays[attempt]));
}
```

## Estándares de commits

Los mensajes de commit siguen el formato **Conventional Commits**:

```
<type>(<scope>): <descripción corta>

Ejemplos:
feat(server): agregar manejo de desconexión con timeout
fix(combat): corregir cálculo de dificultad para arqueros
refactor(game): extraer lógica de formación a módulo separado
docs(server): documentar pipeline de acciones
```

### Tipos

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio de código sin cambio funcional |
| `docs` | Documentación |
| `test` | Tests |
| `chore` | Mantenimiento, dependencias, config |
