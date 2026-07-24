# Cliente — Índice de Sistemas

## Visión General

El cliente es una SPA construida con Vite + React 18 + Tailwind CSS 4 que se comunica con el servidor vía Socket.IO. Sigue un patrón de **Context Providers** para temas transversales (estado de juego, animación, sonido, temas, keybindings) y **props descendentes** para el resto de la UI.

```
main.tsx
  └── App.tsx
        ├── ThemeProvider
        ├── KeyBindingsProvider
        ├── SoundProvider
        ├── AnimationProvider
        │     └── BoardInteractionProvider
        │           └── GameStateProvider
        │                 ├── PreparationScreen / DeploymentScreen
        │                 └── Board + Panels + Modales
        └── LoadingScreen (condicional)
```

## Sistemas

| Documento | Descripción | Archivos |
|---|---|---|
| [Estado](estado.md) | Gestión del estado de juego en el cliente | `GameStateContext.tsx`, `useGameState.ts` |
| [Tablero](tablero.md) | Renderizado SVG del hex grid, unidades, interacción | `board/` (Board, HexTile, UnitsLayer, selection, handlers) |
| [Animación](animacion.md) | Motor de animaciones por colas | `animation/` (AnimationEngine, SvgRenderer) |
| [Sonido](sonido.md) | Motor de audio multicapa | `sound/` (SoundEngine, WebAudioRenderer) |
| [Temas](temas.md) | Sistema de theming vía CSS variables | `theme/` (ThemeProvider, themes, resolveAsset) |
| [Assets](assets.md) | Precarga de assets (imágenes, audio) | `assets/` (AssetPreloader, LoadingScreen) |
| [UI](ui.md) | Layout, paneles, modales, componentes de interfaz | `layout/`, `App.tsx` |
| [Red](red.md) | Conexión Socket.IO con el servidor | `net/socket.ts` |
| [Preparación](preparacion.md) | Pantallas de pre-partida (identidad, dados, despliegue) | `prep/` |
| [Debug](debug.md) | Panel de depuración y event store | `debug/` (DebugStore, DebugPanel) |
| [Keybindings](keybindings.md) | Configuración de teclas | `KeyBindingsContext.tsx` |

## Acoplamiento Interno

- **Estado** es el hub central: todo componente interactivo depende de `useGameState`
- **Tablero** es el sistema más complejo: integra animación, keybindings, selección, sonido
- **Animación** y **Sonido** están desacoplados mediante interfaces (`AnimationRenderer`, `SoundRenderer`)
- **Temas**, **Assets**, **Debug** y **Keybindings** son independientes y opcionales
