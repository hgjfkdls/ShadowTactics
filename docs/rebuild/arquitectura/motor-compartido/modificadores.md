# Sistema de Modificadores

## Propósito
Motor de buffs/debuffs temporales que afectan estadísticas de unidades y jugadores. Los modificadores tienen duración (turnos), usos restantes, fuente, y pueden ser consumidos por ataques.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `modifiers/types.ts` | Tipo `ModifierInstance` |
| `modifiers/engine.ts` | CRUD: addModifier, getModifierSum, consumeModifier, removeModifier, processModifiersAtTurnStart |
| `modifiers/index.ts` | Re-export |

## ModifierInstance
```typescript
interface ModifierInstance {
  id: string;
  sourcePlayerId: PlayerId;
  targetId: string;       // unitId o 'player'
  stat: ModifierStat;     // attack, defense, difficulty, etc.
  value: number;
  operator: '+' | '-' | '*' | 'set';
  remainingTurns: number;
  remainingUses: number;  // -1 = ilimitado
  source: string;         // 'card', 'ability', 'identity'
  sourceName: string;
  consumedBy: string | null; // 'attack', 'difficulty', 'damage', 'defense', 'cost'
}
```

## Funciones Principales
| Función | Propósito |
|---|---|
| `addModifier(state, playerId, targetId, config)` | Añade modificador al estado |
| `getModifierSum(state, targetId, stat)` | Suma valor de modificadores activos para una stat |
| `consumeModifier(state, targetId, stat)` | Consume un uso de modificador (decrementa remainingUses) |
| `removeModifier(state, id)` | Elimina modificador por ID |
| `removePlayerDebuffs(state, playerId)` | Limpia todos los debuffs de un jugador |
| `modifierExists(state, targetId, stat, source?)` | Verifica existencia |
| `getLastDebuffSource(state, targetId)` | Obtiene última fuente de debuff |
| `processModifiersAtTurnStart(state, playerId)` | Procesa modificadores al iniciar turno (reduce remainingTurns, aplica passiveDamage, AP modifiers) |

## Dependencias
| Dependencia | Tipo |
|---|---|
| `state` | State |
| `./utils` (updateUnit, dealDamage) | Utilidades |

## Acoplamiento
- **Muy bajo** con el exterior: solo depende de state y utils
- **Altamente referenciado**: ~15 subsistemas importan modifiers/engine
  - reducer, actions/card, actions/ability, combat/resolver, combat/ability-effects
  - phases/turn, passive, formations, effects/processEffects
  - data/ability-config/handler, data/card-config/handler
- Es el **segundo hub** más importante del motor después de state.ts
