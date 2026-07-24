# Sistema de Temas

## Propósito
Gestiona la apariencia visual del juego mediante temas intercambiables. Cada tema define colores CSS (vía variables CSS) y assets gráficos alternativos.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `ThemeContext.tsx` | Contexto React con tema actual y setter |
| `ThemeProvider.tsx` | Provider: persiste en localStorage, aplica clase CSS al `<html>` |
| `themes.ts` | Definiciones: `default`, `bosque-oscuro`, `dark-water` |
| `resolveAsset.ts` | Resuelve URLs de assets con fallback al tema default |
| `src/client/themes/` | Archivos CSS (`default.css`, `bosque-oscuro.css`, `dark-water.css`) |
| `src/client/assets/assetMap.ts` | Mapa de assets por tema (Vite glob import) |

## Temas Disponibles
| Tema | Descripción |
|---|---|
| `default` | Tema claro original |
| `bosque-oscuro` | Tema oscuro de bosque |
| `dark-water` | Tema oscuro de agua |

## Flujo de Datos
```
ThemeProvider (montaje)
  ├── Lee tema de localStorage
  ├── Aplica clase .theme-<id> al <html>
  └── Provee { theme, setTheme } vía contexto

setTheme(newTheme)
  ├── Guarda en localStorage
  ├── Cambia clase CSS en <html>
  └── Actualiza contexto
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| localStorage | Externa | Persistencia de preferencia |
| `import.meta.glob` (Vite) | Build | Descubrimiento de assets de tema |
| CSS custom properties | Estilo | Variables `--color-*` usadas por componentes |

## Acoplamiento
- **Muy bajo**: sistema completamente independiente
- No depende de ningún otro sistema del juego
- Los componentes consumen las variables CSS sin saber qué tema está activo
- `resolveAsset` es usado por iconos (AbilityIcon, BustIcon) pero con fallback a default
