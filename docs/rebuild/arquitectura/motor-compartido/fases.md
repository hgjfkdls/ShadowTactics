# Sistema de Fases

## Propósito
Manejadores para cada fase del juego: selección de identidad, lanzamiento de dados, despliegue de unidades, y ciclo de turno (draw, main, counter).

## Archivos Clave
| Archivo | Rol |
|---|---|
| `phases/identity.ts` | `handleIdentity()`: procesa SELECT_IDENTITY, transiciona a ROLL |
| `phases/roll.ts` | `handleRoll()`: ejecuta roll 2d6, determina orden de despliegue, aplica efectos de identidad |
| `phases/deployment.ts` | `handleDeployment()`: valida y crea unidades en el tablero |
| `phases/turn.ts` | `handleEndTurn()`: cleanup de turno, `applyTurnStart()`: inicio de turno (AP, robo, identidad, formaciones, aura, pasivas) |
| `phases/identity-apply.ts` | `applyIdentityEffects()`: aplica class override, concesión de habilidades, copia de stats a todas las unidades |
| `phases/simulate.ts` | `simulatePreparation()`: preparación automática para testing |
| `phases/index.ts` | Re-export |
| `phases/identity-apply.ts` | Aplicación de efectos de identidad |

## Flujo de Fases

### Preparación
```
IDENTITY_SELECTION → handleIdentity()
  │  Selecciona identidad, pasa a ROLL
  ▼
ROLL → handleRoll()
  │  Roll 2d6, determina quién despliega primero
  │  applyIdentityEffects() a todas las unidades
  ▼
DEPLOYMENT → handleDeployment()
  │  Crea unidades en hexágonos válidos
  │  applyTurnStart() para estado inicial
  ▼
GAME
```

### Ciclo de Turno (applyTurnStart)
```
applyTurnStart(state, playerId)
  ├── Restaura AP (carryOver + base)
  ├── Roba carta (drawCard)
  ├── Si hay identidad pendiente: emite prompt
  ├── applyFormationModifiers
  ├── Actualiza aura (regenera escudos)
  ├── processModifiersAtTurnStart
  ├── processTurnStartPassives
  └── syncConditionalModifiers
```

## Dependencias
| Dependencia | Tipo | Uso en |
|---|---|---|
| `state`, `action-types` | State | Todas |
| `../hex` | Hex | deployment, turn |
| `./utils` | Utilidades | deployment, turn |
| `./units` | Unidades | deployment, turn, identity-apply |
| `./actions/card` | Cartas | turn (drawCard) |
| `./modifiers/engine` | Modificadores | turn (processModifiersAtTurnStart) |
| `./formations` | Formaciones | turn (applyFormationModifiers) |
| `./aura` | Aura | turn, identity-apply |
| `./passive` | Pasivas | turn (processTurnStartPassives) |
| `./data/ability-config` | Habilidades | turn (identity prompts) |
| `./data/abilities` | Datos | identity-apply |
| `./data/identities` | Datos | identity-apply |
| `@shared/i18n` | i18n | deployment (errores) |

## Acoplamiento
- **turn.ts es el más acoplado**: toca 8+ subsistemas (actions/card, modifiers, formations, aura, passive, ability-config, units)
- **identity-apply.ts**: toca units, data/abilities, data/identities, aura
- **deployment.ts**: toca hex, units, utils, identity-apply
- **roll.ts** e **identity.ts**: relativamente simples y desacoplados
