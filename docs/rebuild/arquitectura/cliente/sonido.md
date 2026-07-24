# Sistema de Sonido

## Propósito
Motor de audio multicapa (music, sfx, voice) con control de volumen, cooldowns, interrupción de voces, y caché de buffers. Reacciona al historial del juego para reproducir sonidos contextuales.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `SoundContext.tsx` | Provider de React exponiendo API de sonido |
| `SoundEngine.ts` | Core: layers, volumen, mute, cooldowns, gestión de voces |
| `WebAudioRenderer.ts` | Implementación Web Audio API (AudioContext, GainNode, bufferCache) |
| `SoundRenderer.ts` | Interfaz del renderer |
| `types.ts` | SoundEvent, SoundLayer, SoundOptions, SoundInstance |
| `assets.ts` | Resolución de URLs de sonido por evento/tipo |
| `soundConfig.ts` | Configuración de voces con claves i18n |
| `useGameSounds.ts` | Hook que reacciona a gameHistory → reproduce sonidos |

## Flujo de Datos
```
gameHistory (nuevo entrada)
  │
  ▼
useGameSounds
  │  Determina tipo de sonido: hit, miss, critical, kill, card_play, move
  ▼
SoundContext (play, playSfx, playKey)
  │
  ▼
SoundEngine
  │  Asigna a layer, respeta cooldowns, interrumpe voz anterior si necesario
  ▼
WebAudioRenderer
  │  bufferCache → AudioBufferSourceNode → GainNode(layer) → destination
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| `@shared/i18n` | Motor | Locale para rutas de voces |
| `GameState.gameHistory` | Estado | Disparador de sonidos |

## Acoplamiento
- **Bajo**: SoundEngine no depende de React; SoundContext es un wrapper delgado
- **Excelente desacople**: `SoundRenderer` es interfaz intercambiable (WebAudioRenderer ↔ NullRenderer)
- **Unidireccional**: el sonido no depende de animación ni de UI
- **useGameSounds** es un hook separado, no integrado en el contexto base
