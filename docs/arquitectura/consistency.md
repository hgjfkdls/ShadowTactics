[docs](../docs.md) > [arquitectura](./docs.md) > consistency

[volver](./docs.md) | [prev](./arquitectura_recomendada.md)

# Consistencia: Documentación vs Código

> Evaluación de `docs/game/` contra `src/shared/game/`

---

## Resumen

| Categoría | Cantidad |
|-----------|----------|
| Implementado correctamente | 37 |
| Parcialmente implementado | 7 |
| No implementado | 33 |
| Implementado diferente | 4 |
| En código no documentado | 9 |

El código está en **estado de andamiaje temprano**: el flujo base (fases, turnos, combate básico, movimiento) funciona, pero **casi todo el contenido del juego falta**.

---

## Por documento

### juego.md (reglas principales)

| Regla | Documento | Código | Estado |
|-------|-----------|--------|--------|
| Radio del mapa | 5 | `init.ts` → `radius: 5` | ✅ Correcto |
| Prioridad: 2 dados | "lanza los 2 dados" | `roll.ts` → `roll2d6()` | ✅ Correcto |
| Máx 3 unidades por tipo | "Máximo 3 unidades del mismo tipo" | `deployment.ts` → `>= 3` | ✅ Correcto |
| Máx PA totales | "máximo 8 PA totales" | `turn.ts` → `Math.min(..., 8)` | ✅ Correcto |
| Despliegue: 11 unidades | 11 unidades cada uno | `init.ts` → 13 en pool, se despliegan 11 | ✅ Correcto |
| Patrón de despliegue | 1-2-2-2-...-2-1 | `deployment.ts` → `getTargetForStep()` | ✅ Correcto |
| Robar carta al inicio | "roba 1 carta de efecto" | `turn.ts` → `drawCard()`, `card.ts` → 52 cartas (4×13) | ✅ Correcto |
| Mano máxima 3 | "Si tiene más de 3, descarta 1" | `card.ts` → `hand.slice(1)` auto-descarta la más vieja | ✅ Correcto |
| Victoria | "elimina al General enemigo" | `killUnit` → si `class === 'general'`, setea `gamePhase: 'GAME_OVER'` + `winner` | ✅ Correcto |
| Combate: 2 dados | "lanza 2 dados" | `resolver.ts` → `roll2d6()` → `{ die1, die2, total }` | ✅ Correcto |
| Movimiento | "cuesta PA = coste de movimiento" | `move.ts` → `getMovementCost()` | ✅ Correcto |
| PA base 5 + carry-over | "mitad redondeo abajo" | `turn.ts` → `Math.floor/2` | ✅ Correcto |
| Cartas sin coste PA | "no tiene coste de PA" | `handleCard` en `card.ts` → no descuenta PA | ✅ Correcto |

### unidades.md (stats y habilidades)

| Unidad | Stat | Documento | Código | Estado |
|--------|------|-----------|--------|--------|
| Arquero | HP/Atq/Dif/Mov/Rango | 8/3/6+dist/2/4 | `stats.ts` → 8/3/6/2/4, `hit.ts` suma distancia | ✅ Correcto |
| Caballería | HP/Atq/Dif/Mov/Rango | 10/4/7/1/1 | `stats.ts` → 10/4/7/1/1 | ✅ Correcto |
| Lancero | HP/Atq/Dif/Mov/Rango | 10/4/7/1/1 | `stats.ts` → 10/4/7/1/1 | ✅ Correcto |
| Infantería | HP/Atq/Dif/Mov/Rango | 12/3/6/1/1 | `stats.ts` → 12/3/6/1/1 | ✅ Correcto |
| General | HP/Atq/Dif/Mov/Rango | 15/5/6/1/1 | `stats.ts` → 15/5/6/1/1 | ✅ Correcto |

**Habilidades**: **16 implementadas** (7 pasivas + 9 activas) en `data/abilities.ts` y `actions/ability.ts`. Pasivas integradas en el pipeline de combate (`resolver.ts`). Activas como acciones `USE_ABILITY`.

> Diseño: `Unit.abilities` es un array `string[]` que contiene los IDs de habilidades que tiene la unidad. Por defecto `createUnit` asigna las de su clase (`CLASS_ABILITIES`), pero las cartas de identidad pueden añadir o quitar habilidades libremente. El sistema de combate usa `hasAbility(unit, id)` en vez de comprobar `unit.class`.

| Habilidad | Tipo | Documento | Código | Estado |
|-----------|------|-----------|--------|--------|
| Blanco fácil | Arquero pasiva | -1 dificultad si objetivo no se movió | `resolver.ts` → `getEffectiveDifficulty` | ✅ |
| Disparo rápido | Arquero coste 1 | 2º ataque a ≤2, dificultad +1 | `ability.ts` → `handleDisparoRapido` | ✅ |
| Fuego de cobertura | Arquero coste 2 | Coste +1 al objetivo | `ability.ts` → `handleFuegoCobertura` | ✅ |
| Acción evasiva | Arquero coste 1 | Reemplaza primer movimiento | `ability.ts` → stub (requiere UI) | ⚠️ |
| Romper filas | Caballería pasiva | Ignora Resistencia y Línea defensiva | `resolver.ts` → `applyDefensePassives` | ✅ |
| Doble ataque | Caballería coste 1 | 2º ataque, -1 daño | `ability.ts` → `handleDobleAtaque` | ✅ |
| Cabalgar | Caballería coste 1 | Mover 2 en línea recta | `ability.ts` → `handleCabalgar` | ✅ |
| Carga | Caballería coste 1 | -1 dificultad, +1 daño | `ability.ts` → `handleCarga` | ✅ |
| Anti-caballería | Lancero pasiva | +2 daño vs caballería | `resolver.ts` → `getEffectiveDamage` | ✅ |
| Formación defensiva | Lancero pasiva | Anula bono de Carga | `resolver.ts` → `getEffectiveDifficulty` + `applyPostDamageEffects` | ✅ |
| Doble ataque (lancero) | Lancero coste 1 | 2º ataque, -1 daño | Reutiliza `handleDobleAtaque` | ✅ |
| Ventaja de alcance | Lancero coste 1 | +1 rango | `ability.ts` → `handleVentajaAlcance` | ✅ |
| Resistencia | Infantería pasiva | -1 daño primera vez | `resolver.ts` → `applyDefensePassives` | ✅ |
| Línea defensiva | Infantería pasiva | -1 daño si no movió | `resolver.ts` → `applyDefensePassives` | ✅ |
| Presión | Infantería pasiva | +1 daño al mismo objetivo | `resolver.ts` → `getEffectiveDamage` | ✅ |
| Avance | Infantería coste 1 | Ocupar posición al eliminar | `ability.ts` → `handleAvance` | ✅ |

### cartas_efecto.md (13 cartas de efecto)

**Efectos sin implementar**, pero el mazo (52 cartas, 4 copias de cada una), robo (`drawCard`) y gestión de mano (descarte automático si > 3) están funcionales en `actions/card.ts`. Existe `handleCard` como stub que retorna el estado sin cambios.

### cartas_identidad.md (15 cartas de identidad)

**Ninguna implementada**. El flujo de selección/revelación funciona en `phases/identity.ts`, pero ninguna carta tiene efectos reales. El sistema `modifiers/types.ts` está diseñado para este propósito pero no se usa.

---

## Bugs detectados

| # | Problema | Archivo | Línea | Impacto |
|---|----------|---------|-------|---------|
| 1 | `isWithinBounds` usaba max 5 por defecto y el mapa era radio 6 (✔ resuelto: mapa ahora es radio 5) | `utils/helpers.ts` | 20 | ✅ Resuelto al cambiar mapa a radio 5 |
| 2 | `movementRange.ts` (cliente) referencia `unit.movement` que no existe | `client/game/board/movementRange.ts` | - | El rango de movimiento siempre está vacío en el cliente |
| 3 | `HexBoard.tsx` tiene `myPlayerId = 'p1'` hardcodeado | `client/game/board/HexBoard.tsx` | - | Ambos jugadores controlan las mismas unidades |
| 4 | Dificultad de infantería era 7 en reducer original (corregido en stats.ts a 6) | `units/stats.ts` | 7 | Ya no aplica, pero ilustra que el reducer original no coincidía con docs |

---

## En código no documentado

| Elemento | Propósito |
|----------|-----------|
| `modifiers/types.ts` | Sistema de modificadores (buffs/debuffs) listo para usar pero sin implementar |
| `gamePhase: 'PREPARATION' \| 'GAME'` | Fase global del juego |
| `turnPhase: 'DRAW' \| 'MAIN' \| 'COUNTER'` | Subfase del turno |
| `graveyard: Record<UnitId, Unit>` | Unidades eliminadas |
| `rngSeed: number` | RNG determinista para replay |
| `deploymentCount: number` | Contador de unidades colocadas por el jugador actual en esta ronda |
| `deploymentStep: number` | Ronda del despliegue (0-9), determina cuántas coloca cada jugador |
| `isInsideMap()` y `isWithinBounds()` | Dos funciones de límite, una en `hex/map.ts` y otra en `utils/helpers.ts` |

---

## Contradicciones internas en docs

| # | Conflicto |
|---|-----------|
| 1 | `unidades.md` dice que la carta de identidad se activa "1 vez luego de la fase de despliegue", pero `cartas_identidad.md` dice "Durante la fase de preparación". El código sigue `cartas_identidad.md` (pre-despliegue). |
| 2 | `juego.md` entrega 4 unidades de cada tipo (16 + general = 17), pero la regla de despliegue dice máximo 3 por tipo. Sobran 4 unidades. |

---

## Resumen: lo que hay que priorizar

### Pendiente
1. Sistema de cartas de efecto (13 cartas, efectos reales)
2. Sistema de cartas de identidad (15 cartas, efectos reales) 
3. Acción evasiva (requiere UI para detectar enemigos adyacentes)
4. Referencia `unit.movement` inexistente en `client/game/board/movementRange.ts`
5. `HexBoard.tsx` con `myPlayerId = 'p1'` hardcodeado
