[docs](docs.md) > evaluacion de desempeño

# Evaluación de desempeño — Shadow Tactics

## Objetivo

Medir cuantitativamente el rendimiento de un jugador en una partida, más allá del resultado binario (ganó/perdió). La puntuación de desempeño permite:

- Evaluar habilidad real independientemente del resultado
- Detectar mejoras en el tiempo (progresión)
- Alimentar un sistema de ranking más granular
- Mostrar estadísticas post-partida al jugador

## Variables relevantes

### Ya recolectadas (`computeReport` en `src/server/report.ts`)

| ID | Variable | Descripción |
|----|----------|-------------|
| V1 | damageDealt | Daño total infligido |
| V2 | damageReceived | Daño total recibido |
| V3 | attacksHit | Ataques que acertaron |
| V4 | attacksMissed | Ataques que fallaron |
| V5 | kills | Unidades enemigas eliminadas |
| V6 | timesKilled | Veces que tus unidades murieron |
| V7 | criticalHits | Golpes críticos realizados |
| V8 | counterDamage | Daño por contraataque infligido |
| V9 | survived | Unidades supervivientes al final |
| V10 | winner | Jugador ganador |
| V11 | totalTurns | Turnos totales de la partida |
| V12 | duration | Duración en segundos |
| V13 | matchType | quickplay / ranked |

### Propuestas para nuevas métricas

#### Eficiencia ofensiva

| ID | Métrica | Fórmula | Sentido |
|----|---------|---------|---------|
| M1 | hitRate | attacksHit / (attacksHit + attacksMissed) | Precisión de ataque |
| M2 | damagePerKill | damageDealt / kills | Cuánto daño necesitas para matar (menor = mejor) |
| M3 | killParticipation | kills / total de bajas enemigas | Qué % de las bajas son tuyas |
| M4 | overkillWaste | daño en exceso sobre la vida de la unidad | Daño desperdiciado (menor = mejor) |
| M5 | criticalRate | criticalHits / attacksHit | Tasa de críticos (suerte + modificadores) |

#### Eficiencia defensiva

| ID | Métrica | Fórmula | Sentido |
|----|---------|---------|---------|
| M6 | damageTradeRatio | damageDealt / damageReceived | >1 = intercambio rentable |
| M7 | survivalRate | unidades supervivientes / unidades totales | Capacidad de mantener el ejército vivo |
| M8 | generalProtection | daño recibido por tu general / daño total recibido | Menor = mejor protegiste al general |
| M9 | counterEfficiency | counterDamage infligido / counterDamage recibido | Rentabilidad de contraataques |

#### Recursos y economía

| ID | Métrica | Fórmula | Sentido |
|----|---------|---------|---------|
| M10 | actionPointUsage | PA gastados / PA totales disponibles | Aprovechamiento de puntos de acción |
| M11 | cardsPlayedPerTurn | cartas jugadas / turnos jugados | Uso de recursos de carta |
| M12 | identityAbilityUses | usos de habilidad / usos posibles | Aprovechamiento de la identidad |

#### Táctica

| ID | Métrica | Fórmula / Lógica | Sentido |
|----|---------|-------------------|---------|
| M13 | firstBlood | 1 si hizo la primera kill, 0 si no | Iniciativa temprana |
| M14 | comeback | 1 si ganó tras estar en desventaja numérica de unidades | Remontada |
| M15 | speedBonus | 1 - (turnos en que ganó / turnos máximos esperados) | Victoria rápida (agresividad) |
| M16 | aggression | ratio de ataques / (ataques + movimientos sin ataque) | Agresividad vs pasividad |

## Fórmula de puntuación

```
score = (
    winBonus(ganó) * 0.20 +
    hitRate (M1) * 0.10 +
    damageTradeRatio (M6) * 0.15 +
    survivalRate (M7) * 0.15 +
    killParticipation (M3) * 0.10 +
    counterEfficiency (M9) * 0.05 +
    cardsPlayedPerTurn (M11) * 0.05 +
    actionPointUsage (M10) * 0.05 +
    generalProtection (M8) * 0.05 +
    firstBlood (M13) * 0.05 +
    comeback (M14) * 0.05
) * 100
```

### Normalización

Cada factor debe normalizarse a un rango [0, 1]:

| Métrica | Normalización |
|---------|---------------|
| hitRate | valor directo (0-1) |
| damageTradeRatio | min(valor / 2, 1) — capped en 2x |
| survivalRate | valor directo (0-1) |
| killParticipation | valor directo (0-1) |
| counterEfficiency | min(valor / 2, 1) |
| cardsPlayedPerTurn | min(valor / 3, 1) — máximo 3 cartas por turno |
| actionPointUsage | valor directo (0-1) |
| generalProtection | 1 - (daño al general / daño total recibido) |
| firstBlood | 0 o 1 |
| comeback | 0 o 1 |
| winBonus | 0 o 1 |

### Peso por modo

| Modo | winBonus | Daño y combate | Economía | Táctica |
|------|----------|----------------|----------|---------|
| Ranked | 30% | 40% | 15% | 15% |
| Quickplay | 10% | 55% | 20% | 15% |

En ranked se pondera más la victoria; en quickplay se pondera más el desempeño bruto.

## Implementación sugerida

1. **Ampliar `computeReport`** en `src/server/report.ts` para incluir las métricas derivadas (M1-M16) en el payload
2. **Ampliar `ReportPayload`** con un campo `performance`:
   ```typescript
   type PerformanceEntry = {
       score: number;
       hitRate: number;
       damageTradeRatio: number;
       survivalRate: number;
       killParticipation: number;
       // ... resto de métricas
   };
   ```
3. **Ampliar la tabla `GameClassStats`** en Prisma para persistir las métricas, o crear una nueva tabla `GamePlayerPerformance`
4. **Mostrar en la UI post-partida** en el perfil del jugador y en el modal `GameOverModal`

## Visualización propuesta

```
Desempeño: 78/100  ████████████████░░░░

Aciertos:     85%  ████████████░░░░░░░░
Intercambio:  1.4x █████████░░░░░░░░░░░
Supervivencia: 60% ██████████░░░░░░░░░░
Participación: 45% ███████░░░░░░░░░░░░░
```
