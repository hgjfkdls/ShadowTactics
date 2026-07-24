# Índice de Sistemas Arquitectónicos

## Navegación

- [Arquitectura General](../arquitectura.md) — Visión general, acoplamiento y catálogo completo

### Cliente (React SPA)
| Documento | Subsistema | Archivos clave |
|---|---|---|
| [Estado](cliente/estado.md) | GameStateContext, useGameState | `src/client/game/GameStateContext.tsx`, `useGameState.ts` |
| [Tablero](cliente/tablero.md) | Board, HexTile, UnitsLayer, selección, interacción | `src/client/game/board/` |
| [Animación](cliente/animacion.md) | AnimationEngine, SvgRenderer | `src/client/game/animation/` |
| [Sonido](cliente/sonido.md) | SoundEngine, WebAudioRenderer | `src/client/game/sound/` |
| [Temas](cliente/temas.md) | ThemeProvider, themes, resolveAsset | `src/client/game/theme/` |
| [Assets](cliente/assets.md) | AssetPreloader, LoadingScreen | `src/client/game/assets/`, `src/client/assets/` |
| [UI](cliente/ui.md) | Layout, paneles, modales | `src/client/game/layout/`, `src/client/App.tsx` |
| [Red](cliente/red.md) | Socket.IO client | `src/client/net/socket.ts` |
| [Preparación](cliente/preparacion.md) | Pantallas de preparación | `src/client/prep/` |
| [Debug](cliente/debug.md) | DebugStore, DebugPanel | `src/client/debug/` |
| [Keybindings](cliente/keybindings.md) | KeyBindingsContext | `src/client/game/KeyBindingsContext.tsx` |

### Servidor (Node.js + Socket.IO)
| Documento | Subsistema | Archivos clave |
|---|---|---|
| [Conexiones](servidor/conexiones.md) | Entry point, handlers Socket.IO | `src/server/index.ts` |
| [GameRoom](servidor/gameroom.md) | Gestión de sala de juego | `src/server/GameRoom.ts` |
| [Timer](servidor/timer.md) | Temporizadores, auto-acciones | `src/server/GameRoom.ts` (evaluateTimer, fireAutoAction) |
| [IA](servidor/ia.md) | AIPlayer, modelos, evaluación | `src/server/ai/` |
| [Reportes](servidor/reportes.md) | Envío de reportes post-partida | `src/server/report.ts` |
| [Registry](servidor/registry.md) | Registro de salas | `src/server/rooms.ts` |

### Motor Compartido (TypeScript)
| Documento | Subsistema | Archivos clave |
|---|---|---|
| [State + Reducer](motor-compartido/state.md) | Estado central, acciones, reducer, init | `src/shared/game/state.ts`, `action-types.ts`, `reducer.ts`, `init.ts` |
| [Combate](motor-compartido/combate.md) | Resolución de ataques | `src/shared/game/combat/` |
| [Modificadores](motor-compartido/modificadores.md) | Buffs/debuffs temporales | `src/shared/game/modifiers/` |
| [Selección](motor-compartido/seleccion.md) | Rangos, blancos, highlights | `src/shared/game/board/selection.ts` |
| [Fases](motor-compartido/fases.md) | Identity, roll, deployment, turn | `src/shared/game/phases/` |
| [Cartas](motor-compartido/cartas.md) | Mazo, robo, uso, contraataque | `src/shared/game/actions/card.ts`, `data/card-config/` |
| [Habilidades](motor-compartido/habilidades.md) | Configuración y ejecución | `src/shared/game/data/ability-config/` |
| [Efectos](motor-compartido/efectos.md) | Procesador config-driven | `src/shared/game/effects/processEffects.ts` |
| [Pasivas](motor-compartido/pasivas.md) | Habilidades pasivas | `src/shared/game/passive.ts` |
| [Unidades](motor-compartido/unidades.md) | Fábrica, stats, consultas | `src/shared/game/units/` |
| [Formaciones](motor-compartido/formaciones.md) | Formaciones tácticas | `src/shared/game/formations.ts` |
| [Aura](motor-compartido/aura.md) | Aura de mando del general | `src/shared/game/aura.ts` |
| [Movimiento](motor-compartido/movimiento.md) | Costo de movimiento | `src/shared/game/movement/cost.ts` |
| [Hex](motor-compartido/hex.md) | Coordenadas hexagonales | `src/shared/hex/` |
| [Datos](motor-compartido/datos.md) | Definiciones estáticas | `src/shared/game/data/abilities.ts`, `identities.ts`, `modifier-config.ts` |
| [i18n](motor-compartido/i18n.md) | Internacionalización | `src/shared/i18n/` |
