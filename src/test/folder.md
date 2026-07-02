# Estructura de Tests — Shadow Tactics

```
src/test/
  main.ts                     ← Runner: importa todos los módulos y reporta resultados
  shared.ts                   ← Utilidades: assert(), assertEqual(), assertThrows()
  folder.md                   ← Este archivo

  hex/
    index.test.ts             ← Hex math: distance, neighbors, range, map generation

  state/
    index.test.ts             ← GameState inicial: fase, jugadores, mazos, dados

  preparation/
    index.test.ts             ← Preparación: identidad → dados → despliegue

  actions/
    move.test.ts              ← MOVE_UNIT: movimiento, ocupado, distancia, PA, restricciones
    attack.test.ts            ← ATTACK_UNIT: impacto, fallo, melee, contraataque, rango, PA
    turn.test.ts              ← END_TURN: avance de turno, carryOver, game over, fases
    cards.test.ts             ← USE_CARD / PASS_COUNTER: uso de cartas, contraventana
    modifiers.test.ts         ← Modificadores en acciones: movilidad, pantano, actionCost

  abilities/
    archer.test.ts            ← Arquero: patada_acrobatica, fuego_cobertura
    cavalry.test.ts           ← Caballería: cabalgar, carga, doble_ataque, combos
    infantry.test.ts          ← Infantería: ejecutar, romper_filas, resistencia,
                                línea_defensiva, anti-caballería, presión
    lancer.test.ts            ← Lancero: ventaja_alcance, doble_ataque

    identities/
      ejecutar.test.ts        ← Infantería (clase): ejecutar condicional
      dios_trueno.test.ts     ← Dios del Trueno: rayo_celestial
      caballos_guerra.test.ts ← Caballos de Guerra: cabalgar_2, a_la_carga
      escudo_comandante.test.ts ← Escudo del Comandante: angel_guardian, proteger
      monje_shaolin.test.ts   ← Monje Shaolin: meditación
      punta_lanza.test.ts     ← Punta de Lanza: torbellino
      corazon_estratega.test.ts ← Corazón de Estratega: posición estratégica
      inspiracion_real.test.ts ← Inspiración Real: en nombre del rey
      samurai.test.ts         ← Samurái: desenvainado veloz
      furia_tirano.test.ts    ← Furia del Tirano: sacrificar

  cards/
    index.test.ts             ← Efectos de las 13 cartas del mazo

  combat/
    index.test.ts             ← Combate: hit.ts, counter.ts, resolveAttack, computeAttack

  modifiers/
    index.test.ts             ← Modifier engine: add, sum, consume, remove, turn-start
```

## Criterio de agrupación

**Capa técnica** (de abajo arriba):

| Carpeta | Capa | Abrir cuando... |
|---------|------|-----------------|
| `hex/` | Geometría | Falla cálculo de distancia / vecinos / mapa |
| `state/` | Estado global | Falla creación del estado inicial |
| `preparation/` | Flujo de juego | Falla selección de identidad / dados / despliegue |
| `actions/` | Acciones básicas | Falla mover unidad, ataque básico, fin de turno, cartas |
| `abilities/` | Habilidades | Falla una habilidad específica de clase o identidad |
| `cards/` | Cartas | Falla un efecto de carta específico |
| `combat/` | Resolución | Falla fórmula de daño/dificultad/crítico/contraataque |
| `modifiers/` | Modificadores | Falla engine de modifiers (ADD/SET/MUL, decay, consumo) |

**Dentro de cada carpeta:** un archivo por subdominio. Las excepciones son
`actions/` (5 archivos: move, attack, turn, cards, modifiers) y `abilities/`
(4 clases + 10 identidades) por ser dominios grandes.

## Reglas de mantenimiento

1. **Cada archivo tiene su propio helper** `makeState()` o `makeGameState()`.
   Esto evita dependencias entre archivos y permite moverlos sin romper nada.

2. **Import paths:**
   - `hex/`, `state/`, `preparation/`: `../shared` + `../../shared/...`
   - `actions/`: `../shared` + `../../shared/...`
   - `abilities/`: `../shared` + `../../shared/...`
   - `abilities/identities/`: `../../shared` + `../../../shared/...`
   - `cards/`, `combat/`, `modifiers/`: `../shared` + `../../shared/...`

3. **Si una identidad nueva no tiene tests**, crear el archivo en
   `abilities/identities/` con un placeholder:
   ```ts
   import { assert } from '../../shared';
   console.log('\n--- Identity: X ---\n');
   const state = makeState();
   assert(typeof state !== 'undefined', 'X — config cargada');
   ```
