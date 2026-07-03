# Registros de Historial y Paneles de Información

## Historia: tarjeta pequeña (`AttackResultPanel.tsx — HistoryCard`)

### `type: 'attack'`

| Registro | Creado por | Archivo:línea | Panel info (`RightPanel.tsx`) |
|----------|-----------|---------------|-------------------------------|
| Ataque básico | `ATTACK_UNIT` → `handleAttack` | `attack.ts:293` | `HistoryAttackDetail` |
| En la mira | `IDENTITY_ABILITY` → `handleIdentityAbility` | `identity.ts:20` | `HistoryAttackDetail` |
| **Torbellino** ⚠️ | `USE_ABILITY` → `handleNewAttack` (AoE inline) | `handler.ts:107` | **Panel especial** (solo atacante, cuadro daño 2, lista unidades) |
| Patada acrobática | `USE_ABILITY` → `handleNewAttack` (fixedDamage) | `handler.ts:184` | `HistoryAttackDetail` |
| Ejecutar | `USE_ABILITY` → `handleNewAttack` (via `storeAttackResult`) | `handler.ts:230` | `HistoryAttackDetail` |
| Carga | `USE_ABILITY` → `handleNewAttack` (via `storeAttackResult`) | `handler.ts:263` | `HistoryAttackDetail` |
| Doble ataque | `USE_ABILITY` → `handleNewAttack` (via `storeAttackResult`) | `handler.ts:263` | `HistoryAttackDetail` |
| Ventaja de alcance | `USE_ABILITY` → `handleNewAttack` (via `storeAttackResult`) | `handler.ts:263` | `HistoryAttackDetail` |
| Fuego de cobertura | `USE_ABILITY` → `handleNewAttack` (via `storeAttackResult`) | `handler.ts:263` | `HistoryAttackDetail` |
| Desenvainado veloz | `USE_ABILITY` → `handleNewAttack` (via `storeAttackResult`) | `handler.ts:263` | `HistoryAttackDetail` |
| **Sacrificar** ⚠️ | `USE_ABILITY` → `handleNewSupport` (pero type:'attack') | `handler.ts:557` | `HistoryAttackDetail` |
| Karma | `killUnit` → `karmaEntryToAppend` | `kill.ts:38` | `HistoryAttackDetail` |

### `type: 'move'`

| Registro | Creado por | Archivo:línea | Panel info |
|----------|-----------|---------------|------------|
| Movimiento normal | `MOVE_UNIT` → `handleMove` | `move.ts:87` | `HistoryMoveDetail` |
| Ocupar posición | `OCCUPY_POSITION` → reducer | `reducer.ts:220` | `HistoryMoveDetail` |

### `type: 'card'`

| `cardId` | Habilidad | Creado por | Archivo:línea | Panel info |
|----------|-----------|-----------|---------------|------------|
| `plan_batalla` | Plan de batalla | `COMANDANTE_CHOICE` (Avanzar/Reagrupar) | `reducer.ts:153` | `HistoryCardDetail` |
| `lanza_escudo` | Lanza y escudo | `ESPARTANO_CHOICE` (+1 rango/+1 defensa) | `reducer.ts:185` | `HistoryCardDetail` |
| `voz_de_mando` | Voz de mando | `handleMove` (aliado gratis) | `move.ts:124` | `HistoryCardDetail` |
| `cabalgar` | Cabalgar | `handleNewMove` | `handler.ts:663` | `HistoryCardDetail` |
| `cabalgar_2` | Cabalgar (identidad) | `handleNewPathMove` | `handler.ts:718` | `HistoryCardDetail` |
| `a_la_carga` | A la carga | `handleNewSupport` | `handler.ts:402` | `HistoryCardDetail` |
| `posicion_estrategica` | Posición estratégica | `handleNewMove` | `handler.ts:625` | `HistoryCardDetail` |
| `angel_guardian` | Ángel Guardián | `handleNewSupport` | `handler.ts:444` | `HistoryCardDetail` |
| `proteger` | Proteger | `handleNewSupport` | `handler.ts:482` | `HistoryCardDetail` |
| `rayo_celestial` | Rayo celestial | `handleNewSupport` | `handler.ts:507` | `HistoryCardDetail` |
| `en_nombre_del_rey` | En nombre del rey | `handleNewSupport` | `handler.ts:530` | `HistoryCardDetail` |
| `robar_ricos` | Robar a los ricos | `handleAttack` (Robin Hood passive) | `attack.ts:111` | `HistoryCardDetail` |
| `liderar_tropas` | Liderar a las tropas | `handleAttack` (Capitán passive) | `attack.ts:395` | `HistoryCardDetail` |
| `camino_guerrero` | Camino del guerrero | `killUnit` (Samurái passive) | `kill.ts:80` | `HistoryCardDetail` |
| `proyeccion` | Proyección | `handleAttack` / `handleNewAttack` | `attack.ts:356`, `handler.ts:300` | `HistoryCardDetail` |
| Cartas de efecto | Mazo (13 cartas) | `USE_CARD` → `recordCardHistory` | `card.ts:244` | `HistoryCardDetail` |

## Panel de información detallado (`RightPanel.tsx`)

| `selectedInfo.type` | Componente | Línea | Qué renderiza |
|--------------------|-----------|-------|---------------|
| `'historyAttack'` | `HistoryAttackDetail` | 334 | Desglose completo del ataque: atacante/defensor, modificadores, fórmula daño/dificultad, dados, resultado |
| `'historyMove'` | `HistoryMoveDetail` | 802 | Unidad, origen, destino, costes, modificadores |
| `'historyCard'` | `HistoryCardDetail` | 850 | Nombre, origen, descripción, efectos por `cardId`, coste PA |
| `'attackResult'` | `AttackResultDetail` | 250 | Resultado de ataque en vivo (no historial): stats, dados, crítico, muertes |
| `'identity'` | `IdentityDetail` | 80 | Info de identidad seleccionada |
| `'unit'` | `UnitDetail` | 1066 | Stats de unidad, efectos activos, habilidades |
| `'card'` | `CardDetail` | 151 | Descripción de carta |
| `'effect'` | `EffectDetail` | 1002 | Detalle de modificador activo |

## Paneles especiales (early return antes del genérico)

| Componente | Detectado por | Habilidades afectadas |
|-----------|---------------|----------------------|
| `HistoryAttackDetail` SUPPORT (línea 548) | `configId === 'angel_guardian' \|\| 'Ángel Guardián' \|\| configId === 'proteger' \|\| 'Proteger'` | Ángel Guardián, Proteger |
| `HistoryAttackDetail` TORBELLINO (línea 589) | `configId === 'torbellino'` | Torbellino |
| `HistoryCard` SUPPORT (AttackResultPanel.tsx:84) | `SUPPORT_ABILITIES.has(entry.attackName)` | Solo Sacrificar (los demás crean `type:'card'`) |
| `HistoryCard` TORBELLINO (AttackResultPanel.tsx:127) | `entry.attackName === 'Torbellino' \|\| configId === 'torbellino'` | Torbellino |

## Notas

- **Sacrificar** es el único `type:'attack'` creado desde `handleNewSupport` — incoherencia histórica.
- **Torbellino** es el único con panel 100% custom tanto en tarjeta como en info panel.
- **Meditación** no crea ningún registro de historial — el heal se aplica pero es invisible en el historial.
- Los registros de habilidades de clase (`cabalgar`, `cabalgar_2`, `posicion_estrategica`) usan `type:'card'` aunque conceptualmente son movimientos.
