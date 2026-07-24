# Sistema de Assets

## Propósito
Precarga todos los assets del juego (imágenes de cartas, iconos, sonidos) antes de que comience la partida, reportando progreso. Previene garbage collection del navegador almacenando referencias en `window.__ASSET_CACHE__`.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `AssetPreloader.ts` | Genera lista de assets y los precarga con progreso |
| `LoadingScreen.tsx` | Pantalla de carga con barra de progreso |
| `src/client/assets/assetMap.ts` | Descubre assets de tema vía Vite glob |

## Assets Precargados
- Cartas de efecto (ES/EN)
- Cartas de identidad (ES/EN)
- Iconos de estadísticas
- Iconos de unidades
- Iconos de habilidades
- Sonidos UI
- Voces (ES/EN)
- Efectos de sonido (SFX)

## Flujo de Datos
```
Servidor: emite LOAD_ASSETS
  │
  ▼
useGameState: llama preloadAllAssets(callback)
  │
  ▼
AssetPreloader
  ├── Construye lista completa (imágenes + audio)
  ├── Itera: new Image(url) / fetch(audioUrl, {cache: 'force-cache'})
  ├── Almacena en window.__ASSET_CACHE__
  └── Reporta progreso (loaded/total)
  │
  ▼
useGameState: emite ASSETS_LOADED
  │
  ▼
Servidor: cuando ambos jugadores listos → BOTH_PLAYERS_READY
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `window.__ASSET_CACHE__` | Global | Almacenamiento de referencias |
| `import.meta.glob` (Vite) | Build | Descubrimiento de assets |
| Browser APIs (Image, fetch) | Externa | Precarga |

## Acoplamiento
- **Bajo**: AssetPreloader es una utilidad independiente sin dependencias de React
- **Medio** con useGameState: es llamado desde allí y emite ASSETS_LOADED de vuelta
- LoadingScreen es un componente presentacional simple
