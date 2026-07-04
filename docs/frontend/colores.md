# Sistema de colores — UI del juego

Los colores se definen en `src/client/style.css` como tokens de Tailwind v4 (`@theme`).
Para cambiarlos, solo edita los valores CSS. Los componentes usan las clases semánticas.

## Tokens disponibles

### Facción (jugadores)

| Token | Clase Tailwind | Valor | Uso |
|---|---|---|---|
| `player1` | `*-player1` | `#a78bfa` | Bordes, nombres de unidad, indicador p1 |
| `player2` | `*-player2` | `#22d3ee` | Ídem para p2 |

Uso: `text-player1`, `border-player1`, `bg-player1/20`

### Clases de unidad

| Token | Clase Tailwind | Valor |
|---|---|---|
| `class-archer` | `*-class-archer` | `#34d399` |
| `class-infantry` | `*-class-infantry` | `#60a5fa` |
| `class-cavalry` | `*-class-cavalry` | `#fbbf24` |
| `class-lancer` | `*-class-lancer` | `#fb7185` |
| `class-general` | `*-class-general` | `#c084fc` |

Uso: `text-class-archer`, `border-class-archer`, etc.

### Efectos semánticos

| Token | Clase Tailwind | Valor | Uso |
|---|---|---|---|
| `effect-atk` | `*-effect-atk` | `#f87171` | Bonos de ataque, daño de habilidad |
| `effect-def` | `*-effect-def` | `#60a5fa` | Bonos de defensa, escudo |
| `effect-diff` | `*-effect-diff` | `#fbbf24` | Mods de dificultad |
| `effect-pa` | `*-effect-pa` | `#facc15` | Costes de PA |
| `effect-range` | `*-effect-range` | `#22d3ee` | Bonos de rango |
| `effect-dmg` | `*-effect-dmg` | `#ffffff` | Daño en tarjetas |
| `effect-heal` | `*-effect-heal` | `#34d399` | Curación |
| `effect-other` | `*-effect-other` | `#a1a1aa` | Efectos compuestos |

### Resultado de ataque

| Token | Clase Tailwind | Valor |
|---|---|---|
| `hit-bg` | `bg-hit-bg` | `#065f4620` |
| `hit-border` | `border-hit-border` | `#04785750` |
| `hit-text` | `text-hit-text` | `#34d399` |
| `miss-bg` | `bg-miss-bg` | `#7f1d1d20` |
| `miss-border` | `border-miss-border` | `#b91c1c50` |
| `miss-text` | `text-miss-text` | `#f87171` |

### Paneles

| Token | Clase Tailwind | Valor |
|---|---|---|
| `panel-bg` | `bg-panel-bg` | `#12122a` |
| `panel-border` | `border-panel-border` | `#3f3f46` |
| `panel-sub-bg` | `bg-panel-sub-bg` | `#27272a60` |
| `panel-sub-border` | `border-panel-sub-border` | `#3f3f46` |
| `panel-title` | `text-panel-title` | `#71717a` |

## Migración desde clases hardcodeadas

| Old class | New class |
|---|---|
| `text-green-400` (p1) | `text-player1` |
| `text-red-400` (p2) | `text-player2` |
| `border-l-green-700` (p1) | `border-l-player1` |
| `border-l-red-700` (p2) | `border-l-player2` |
| `bg-green-900/20 border-green-700/50` (hit) | `bg-hit-bg border-hit-border` |
| `bg-red-900/20 border-red-700/50` (miss) | `bg-miss-bg border-miss-border` |
| `text-red-400` (efecto ataque) | `text-effect-atk` |
| `text-blue-400` (efecto defensa) | `text-effect-def` |
| `text-amber-400` (dificultad) | `text-effect-diff` |
| `text-yellow-400` (PA) | `text-effect-pa` |
| `text-cyan-400` (rango) | `text-effect-range` |
| `text-white` (daño) | `text-effect-dmg` |
| `text-green-400` (curación) | `text-effect-heal` |
| `text-zinc-400` (otros) | `text-effect-other` |
| `text-zinc-500` (título panel) | `text-panel-title` |
