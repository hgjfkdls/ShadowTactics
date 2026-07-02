# Session 2 — Refactor terminología daño → ataque/defensa

## Goal
- Separar el concepto de `daño` como estadística de unidad en dos conceptos diferenciados:
  - **Ataque**: bonos ofensivos que aumentan el daño causado (`stat='attack'`)
  - **Defensa**: bonos defensivos que reducen el daño recibido (`stat='defense'`)
- El `daño` es el *resultado* de `baseAttack + sum(attack) - sum(defense)`, no una estadística de unidad.

## Constraints & Preferences
- `stat='damage'` eliminado del sistema. Todo `damageMod` renombrado a `attackMod`/`defenseMod`.
- Fórmula de daño: `final = baseAttack + sum(attack modifiers) - sum(defense modifiers)` donde defensa son enteros positivos que se restan del daño.
- Fórmula de dificultad: solo arqueros/`blanco_facil` usan `5 + distance`; el resto usa `unit.difficulty` plano.
- Historial: modificadores agrupados por categoría con prefijos `[atk]`, `[def]`, `[diff]`, `[range]`, `[pa]`.
- Toda UI textual debe usar i18n (`l()`), no strings hardcodeadas.

## Progress

### Done
- **Refactor stat=damage → stat=attack/defense**:
  - `applyDamageAbilities` usa solo `mods.attackMod` (eliminado `mods.damageMod`)
  - `applyDefenseAbilities` usa `result.damage -= mods.defenseMod` (antes `+= Math.min(0, damageMod)`)
  - Todos los `stat='damage'` para defensa cambiados a `stat='defense'` con valores positivos
  - Flechas de fuego: `stat='damage'` → `stat='attack'`
  - Modificador `[dmg]` → `[atk]` para ataque, `[def]` para defensa

- **Corrección Meditación stacking**: `remainingTurns > 0` → `>= 0` en `processModifiersAtTurnStart` para que expire correctamente (0 → -1 → filtrado).

- **Migración masiva a i18n**:
  - `es.ts`: ~50 reemplazos de strings hardcodeadas por claves i18n (`cat:`, `ui:`)
  - Modificadores: `Presión (+1 ataque)`, `Línea defensiva (-1 defensa)`, `Meditación (-1 defensa)`, etc.
  - Habilidad/descripciones de carta actualizadas (ej: `"hace +3 de ataque"`, `"recibes -1 de defensa"`)
  - Identidades en `identityData.ts` sincronizadas con i18n

- **Historial y UI**:
  - Modificadores antes del box de cálculos en panel derecho
  - Labels con letras (a, b, c...) y referencias en fórmulas
  - `patada_acrobática`: dos entradas separadas (ataque 0/0/0 + movimiento)
  - `romper_filas`: texto `ignora modificador X` con referencia a letra
  - `resistencia`/`linea_defensiva` solo se muestran cuando realmente aplican
  - Fórmula de rango: `base X + letter = final` solo cuando hay mods de rango
  - Modificadores de aura incluidos en referencias de fórmula

- **Timer fixes** (sesión 1):
  - IDENTITY_SELECTION: timer compartido cuando ambos en idle
  - COUNTER: timer 10s con auto-pass; preserva tiempo restante de TURN (`turnTimerRemaining`)
  - REVEAL: `revealHandled` flag, `!lastTieRoll` guard, auto-advance en dismiss
  - Deployment: `while` loop despliega todas las unidades de un step en un expiry
  - TURN `isActive: false` con early return en `fireAutoAction`
  - `alive` flag en `ActiveTimer` evita restart innecesario
  - Timers centralizados en `PHASE_TIMERS` record con `{ isActive, value }`

### In Progress
- *(none)*

### Blocked / Issues
- *(none known)*

## Cómo retomar
- **Estado de tests**: 276/276 passing, 0 failed.
- **TypeScript**: `npx tsc --noEmit` limpio.
- **Servidor**: `npm run server` (http://localhost:3000)
- **Cliente**: `npm run dev` (http://localhost:5173)
- **Tests**: `npx tsx src/test/main.ts`

## Archivos relevantes modificados esta sesión
- `src/shared/i18n/resources/es.ts` — traducciones ataque/defensa, claves `cat:` y `ui:`
- `src/shared/i18n/resources/en.ts` — traducciones ataque/defensa
- `src/client/prep/identityData.ts` — descripciones de identidades
- `src/shared/game/combat/ability-effects.ts` — `attackMod`/`defenseMod`, fórmula daño
- `src/shared/game/modifiers/engine.ts` — corrección Meditación (`>= 0`)
- `src/shared/game/actions/attack.ts` — `histMods` con prefijos `[cat]`
- `src/shared/game/actions/ability.ts` — `buildAttackModifiers`, `storeAttackResult`
- `src/shared/game/combat/hit.ts` — `getDifficulty()` (arqueros vs resto)
- `src/shared/game/actions/card.ts` — Flechas de fuego `stat='attack'`
- `src/shared/game/formations.ts` — Línea (`defense`), Triángulo (`attack`)
- `src/client/game/layout/RightPanel.tsx` — HistoryAttackDetail
- `src/client/game/layout/AttackResultPanel.tsx` — HistoryPanel
- `docs/debug/modificadores.md` — documentación completa de modifiers

## Decisiones clave
- Los modifiers defensivos son enteros **positivos** que se *restan* del daño (no negativos que se suman).
- `stat='defense'` con valor `1` significa "reduce el daño en 1".
- El daño mínimo es 0 (nunca negativo).
- Historial: el string del modifier incluye el prefijo `[cat]` y se usa directamente para display.
- `identityData.ts` es copia local de descripciones de identidades; debe mantenerse sincronizada con `es.ts`/`en.ts`.
