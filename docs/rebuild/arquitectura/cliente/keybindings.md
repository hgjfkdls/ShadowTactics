# Sistema de Keybindings

## Propósito
Configuración de teclas de acceso rápido para acciones del juego. Persiste en localStorage y soporta sincronización entre pestañas.

## Archivos Clave
| Archivo | Rol |
|---|---|
| `KeyBindingsContext.tsx` | Contexto React con configuración de teclas |

## Teclas por Defecto
| Acción | Tecla |
|---|---|
| Deseleccionar | `D` |
| Ataque básico | `Q` |
| Mover | `Space` |
| Habilidad 1 | `W` |
| Habilidad 2 | `E` |
| Habilidad 3 | `R` |
| Terminar turno | `Escape` |

## Flujo de Datos
```
KeyBindingsProvider (montaje)
  ├── Lee keyBindings de localStorage (con versión)
  ├── Sincroniza cambios entre pestañas vía storage event
  └── Provee { bindings, updateBinding, resetBindings } vía contexto

Board.tsx:
  └── Lee bindings → asigna event listeners para shortcuts

KeyBindingsModal:
  └── Lee bindings → permite rebindear teclas → llama updateBinding
```

## Dependencias
| Dependencia | Tipo | Uso |
|---|---|---|
| localStorage | Externa | Persistencia |
| `window.addEventListener('storage', ...)` | Browser | Sincronización entre pestañas |

## Acoplamiento
- **Nulo**: sistema completamente independiente
- No depende de ningún otro sistema del juego
- Es consumido por Board.tsx (para shortcuts) y EndTurnBtn (para mostrar tecla)
- KeyBindingsModal es un componente UI autocontenido
