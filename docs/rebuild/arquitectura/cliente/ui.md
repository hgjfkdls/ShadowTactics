# Sistema de UI (Layout, Paneles, Modales)

## Propósito
Componentes de interfaz de usuario que rodean al tablero: layout de tres columnas, paneles laterales, sistema de modales, notificaciones, temporizador, y menús.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `src/client/App.tsx` | Layout raíz: join form / preparación / juego (3 columnas) |
| `panel/player/PlayerSidebar.tsx` | Barra lateral izquierda (240px): info del jugador, identidades, lista de unidades |
| `panel/action/ActionPanel.tsx` | Botones de acción (mover, ataque, habilidades) |
| `panel/history/HistoryPanel.tsx` | Historial de juego |
| `panel/information/` | Panel derecho con detalle de unidad, habilidades, cartas |
| `layout/CardHand.tsx` | Mano de cartas del jugador |
| `layout/AlertPanel.tsx` | Notificaciones toast |
| `layout/TurnTimer.tsx` | Cuenta regresiva del turno |
| `layout/HamburgerMenu.tsx` | Menú de configuración (keybindings, sonido, temas) |
| `layout/GameOverModal.tsx` | Modal de victoria/derrota |
| `layout/DisconnectModal.tsx` | Modal de desconexión del oponente |
| `layout/PendingOccupationPanel.tsx` | Panel de ocupación de posición |
| `layout/modals/GameModals.tsx` | Gestor centralizado de modales de juego |

## Layout (App.tsx)
```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────────┬────────────────────────┬──────────────┐ │
│  │ PlayerSidebar │       <main>           │ RightPanel  │ │
│  │    (240px)    │   Hex Board + overlay │  (280px)    │ │
│  │              │   AlertPanel           │  UnitDetail  │ │
│  │              │   TurnTimer            │  Abilities   │ │
│  │              │   EndTurnBtn           │  History     │ │
│  │              │   GameOverModal        │  CardHand    │ │
│  │              │   DisconnectModal      │              │ │
│  └──────────────┴────────────────────────┴──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `GameState`, `sendAction` | Estado | Datos de juego y envío de acciones |
| `useAnimation()` | Animación | Modales encolan animaciones (flipCard) |
| `useSound()` | Sonido | Sonidos de UI |
| `useTheme()` | Temas | Tema actual para estilos |
| `useKeyBindings()` | Keybindings | Mostrar teclas asignadas |

## Acoplamiento
- **Alto** con el sistema de Estado (casi todo componente recibe GameState como props)
- **Medio** con Animación y Sonido (modales específicos)
- **Bajo** con Temas y Keybindings (solo lectura de contexto)
- Los componentes reciben datos como props (no leen contexto directamente) excepto animación/sonido/temas/keybindings
- GameModals.tsx centraliza la lógica modal compleja pero maneja muchos casos distintos
