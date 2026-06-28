# Capa Actions — Estrategia de migración

## Estado actual

La capa de acciones del usuario es el punto de mayor acoplamiento del proyecto.

### Componentes involucrados

| Componente | Archivo | Líneas | Responsabilidad |
|-----------|---------|--------|-----------------|
| `HexBoard` | `@client/game/board/HexBoard.tsx` | ~1300 | Renderiza tablero, maneja clicks, teclas, targeting, modales, animaciones |
| `UnitsLayer` | `@client/game/board/UnitsLayer.tsx` | ~735 | Renderiza tokens, tooltips, indicadores, targeting visual |
| `ActionPanel` | `@client/game/layout/ActionPanel.tsx` | ~151 | Botones de acción (ataque, movimiento, habilidades) |
| `PlayerSidebar` | `@client/game/layout/PlayerSidebar.tsx` | ~470 | Panel lateral con identidad, pool, cartas |
| `useBoardInteraction` | `@client/game/board/useBoardInteraction.ts` | ~17 | Hook mínimo de selección |
| `KeyBindingsContext` | `@client/game/KeyBindingsContext.tsx` | ~80 | Teclas configurables |

### Problemas específicos

1. **`HexBoard.tsx` mezcla 7+ responsabilidades**: renderizado de hexágonos, manejo de clicks (deploy, move, attack, ability, card, identity, counter), keybindings, animaciones, modales (CounterPrompt, OccupationPanel, EspartanoChoice, etc.), targeting state, y selección de historial.
2. **`onHexClick` tiene 15+ casos**: un switch gigante con `if/else if` para cada tipo de interacción.
3. **Los modales (CounterPrompt, OccupationPanel, etc.) se renderizan dentro de `HexBoard`** en lugar de estar en un contenedor separado.
4. **`UnitsLayer` mezcla renderizado con lógica de targeting y tooltips**: calcula qué unidades son targets válidos y qué pasivas aplicar.
5. **Los handlers de teclas duplican lógica de los botones del ActionPanel**: ambos verifican PA, attackedThisTurn, etc.

## Estado ideal

```
@client/game/
  board/
    HexBoard.tsx                → orquestador (~300-400 líneas)
    HexTile.tsx                 → presente (105 líneas)
    UnitsLayer.tsx              → simplificado (~400 líneas, solo render)
    useSelection.ts             → hook central de selección (reemplaza useBoardInteraction)
    rendering/
      UnitToken.tsx             → token visual (extraído de UnitsLayer)
      UnitTooltip.tsx           → tooltip (extraído de UnitsLayer)
      PassiveIndicators.tsx     → indicadores de pasivas (extraído de UnitsLayer)
    handlers/
      useDeployHandler.ts       → lógica de click en despliegue
      useMoveHandler.ts         → lógica de click en movimiento
      useAttackHandler.ts       → lógica de click en ataque
      useAbilityHandler.ts      → lógica de click en habilidades
      useCardHandler.ts         → lógica de click en cartas
      useCounterHandler.ts      → lógica de click en fase COUNTER
      useIdentityHandler.ts     → lógica de click en habilidades de identidad
  layout/
    ActionPanel.tsx             → presente, simplificado
    HistoryPanel.tsx            → presente
    PlayerSidebar.tsx           → presente
    RightPanel.tsx              → presente
    GameModals.tsx              → contenedor de modales (extraído de HexBoard)
    modals/
      CounterPrompt.tsx         → extraído
      OccupationPanel.tsx       → ya existe en layout/
      EspartanoChoice.tsx       → extraído de HexBoard
      PlanBatalla.tsx           → extraído de HexBoard
      EndTurnBtn.tsx            → ya existe en App.tsx
```

## Migración

### Fase 1: Hook `useSelection`

Centralizar toda la selección que actualmente está como `useState` disperso en `HexBoard`.

**Estado actual en HexBoard**:
```typescript
const { hoveredHex, selectedHex, selectedUnitId, setHoveredHex, setSelectedHex, setSelectedUnitId } = useBoardInteraction();
const [movingUnitId, setMovingUnitId] = useState<UnitId | null>(null);
const [attackingUnitId, setAttackingUnitId] = useState<UnitId | null>(null);
const [pendingAbility, setPendingAbility] = useState<PendingAbility>(null);
const [pendingIdentityTargetId, setPendingIdentityTargetId] = useState<UnitId | null>(null);
const [pendingPatadaTargetId, setPendingPatadaTargetId] = useState<UnitId | null>(null);
const [cabalgarPath, setCabalgarPath] = useState<HexCoord[]>([]);
const [cabalgarIsLaCarga, setCabalgarIsLaCarga] = useState(false);
const [pendingTorbellino, setPendingTorbellino] = useState(false);
const [pendingAngelGuardian, setPendingAngelGuardian] = useState(false);
const [pendingCounterEspejoCard, setPendingCounterEspejoCard] = useState<string | null>(null);
```

**Estado ideal**:
```typescript
const sel = useSelection();
// sel.selectedUnitId, sel.movingUnitId, sel.attackingUnitId, sel.pendingAbility
// sel.clearAll() → limpia todo
// sel.selectUnit(id), sel.startMove(id), sel.startAttack(id), sel.startAbility(id, unitId)
```

**Proteger**: `clearAllSelections()` que ya existe en HexBoard debe ser absorbido por `useSelection.clearAll()`. La función es llamada desde DESELECT key, deseleccionar unidad, click en hex vacío y seleccionar historial.

### Fase 2: Extraer modales de HexBoard

Los siguientes modales se renderizan dentro del JSX de HexBoard (~300 líneas de modales):

| Modal | Líneas aprox | Condición |
|-------|-------------|-----------|
| Identity target prompt | 30 | `isIdentityTargetMode && !pendingIdentityTargetId` |
| Identity confirm panel | 35 | `pendingIdentityTargetId` |
| Cabalgar confirm | 45 | `pendingAbility?.abilityId === 'cabalgar_2' && cabalgarPath.length >= maxSteps` |
| Torbellino confirm | 25 | `pendingTorbellino` |
| Ángel Guardián confirm | 25 | `pendingAngelGuardian` |
| Counter waiting prompt | 15 | `isWaitingForCounter` |
| Counter prompt | 50 | `isCounterPrompt` |
| Espejo target prompt | 10 | `pendingCounterEspejoCard` |
| Espartano choice | 20 | `state.players[...].pendingEspartanoChoice` |
| Plan batalla | 20 | `state.players[...].pendingPlanBatalla` |

**Migración**:

1. Crear `GameModals.tsx` que recibe `state`, `playerId`, `sendAction`, `selectedInfo`, y los callbacks necesarios.
2. Mover cada modal a su propio archivo bajo `layout/modals/`.
3. `GameModals` renderiza condicionalmente cada modal basado en el estado.
4. `HexBoard` solo renderiza `<GameModals ... />`.

**Proteger**: 
- Todos los `sendAction` con los tipos correctos (OCCUPY_POSITION, ESPARTANO_CHOICE, COMANDANTE_CHOICE, etc.)
- La posición absoluta de los modales (centrados `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`)
- El z-index para que estén sobre el tablero

### Fase 3: Separar handlers de `onHexClick`

Actualmente `onHexClick` es una función de ~170 líneas con 15+ casos. Separar en hooks:

```typescript
// handlers/useAttackHandler.ts
export function useAttackHandler(state, myPlayerId, sendAction, addAlert, selectedInfo) {
  return (hex: HexCoord) => {
    // validar target, enviar ATTACK_UNIT
  };
}
```

Cada handler recibe solo el estado y callbacks que necesita, no todo `HexBoard`.

**Migración**:

1. Crear cada archivo handler.
2. En `HexBoard`, instanciar cada hook.
3. En `onHexClick`, delegar a cada handler según el modo actual.

```typescript
function onHexClick(hex: HexCoord) {
  if (mode === 'DEPLOYMENT') return handleDeploy(hex);
  if (movingUnitId) return handleMove(hex);
  if (attackingUnitId) return handleAttack(hex);
  if (pendingAbility) return handleAbility(hex);
  if (isCardTargetMode) return handleCard(hex);
  if (isIdentityTargetMode) return handleIdentityTarget(hex);
  if (pendingCounterEspejoCard) return handleCounterEspejo(hex);
  clearAllSelections();
}
```

**Proteger**: El orden de los if/else es crítico (movingUnitId tiene prioridad sobre attackingUnitId, etc.).

### Fase 4: Simplificar UnitsLayer

**Problema**: UnitsLayer calcula targeting, estado de pasivas, indicadores visuales, tooltips, y renderizado, todo en un solo componente.

**Migración**:

1. Extraer `UnitToken.tsx`: el `<g>` que renderiza el rectángulo, icono de clase, HP, buff/debuff dots. Recibe `unit`, `selected`, `buffs`, `debuffs`, `onClick`.
2. Extraer `UnitTooltip.tsx`: el tooltip hover. Ya existe como función `UnitTooltip` dentro de UnitsLayer. Mover a archivo separado.
3. Extraer `PassiveIndicators.tsx`: los indicadores de diana, escudo, etc. (blanco_facil, presion, resistencia). Reciben las condiciones ya calculadas.
4. UnitsLayer se convierte en un orquestador que:
   - Ordena unidades (hovered/selected al final)
   - Itera `sortedUnits` y renderiza `<UnitToken>` + `<PassiveIndicators>` + `<UnitTooltip>`

**Proteger**: 
- El z-ordering de unidades (hovered arriba de todo, seleccionado segundo)
- `animPositions` para overriding de posición durante animaciones
- `onClick` que distingue entre identity target, attack, ability, patada, y selección normal

### Fase 5: Unificar ActionPanel + KeyBindings

**Problema**: `ActionPanel.tsx` y el handler de teclas en HexBoard duplican las validaciones de PA, attackedThisTurn, etc.

**Migración**: Crear un hook `useActionValidation` que centralice las reglas de disponibilidad:

```typescript
function useActionValidation(state, playerId, unitId) {
  const unit = state.units[unitId];
  const ap = getPlayerAP(state, playerId);

  return {
    canAttack: !unit.attackedThisTurn || (unit.ataqueExtraCharges ?? 0) > 0,
    canAttackWithPA: ap >= 1 || (unit.ataqueExtraCharges ?? 0) > 0,
    canMove: ap >= effectiveMoveCost,
    canAbility: (abilityId: string) => { ... },
  };
}
```

Tanto `ActionPanel` como el keydown handler usan el mismo hook.

## Interacciones críticas a proteger

| Interacción | Archivos | Riesgo |
|-------------|----------|--------|
| `clearAllSelections()` | HexBoard | Alto — usado en DESELECT, deseleccionar, historial |
| Orden de prioridad en `onHexClick` | HexBoard | Alto — cambiar orden rompe UX |
| `onSelectUnit` con modo DEPLOYMENT | HexBoard | Medio — modificado recientemente |
| Teclas (DESELECT, END_TURN, BASIC_ATTACK, MOVE, ABILITY_1-3) | HexBoard | Alto — validaciones duplicadas con ActionPanel |
| `animPositions` en UnitsLayer | UnitsLayer | Alto — animaciones de movimiento |

## Timeline estimado

| Fase | Archivos | Dependencias | Esfuerzo |
|------|----------|-------------|----------|
| 1. useSelection | HexBoard, useBoardInteraction | Ninguna | 1-2 días |
| 2. Extraer modales | HexBoard, 10+ nuevos archivos | useSelection | 2-3 días |
| 3. Separar handlers | HexBoard, 7 nuevos archivos | useSelection | 2-3 días |
| 4. Simplificar UnitsLayer | UnitsLayer, 3 nuevos archivos | Fase 1 | 2-3 días |
| 5. Unificar ActionPanel | ActionPanel, HexBoard | Fase 1 | 1 día |
