# Session 3 (fin) — Color tokens, Bust SVG, player panel refinement

## Completed

### Theme token system
- Created @theme block in src/client/style.css with 23 semantic tokens
- Player: violet/cyan (p1/p2), Class: emerald/blue/amber/rose/purple, Effects: red/blue/amber/yellow/cyan/white/emerald
- Hit/miss cards, panel sub-bg/border/title tokens
- ~14 panel components migrated from hardcoded Tailwind classes to semantic token classes
- Full reference in docs/frontend/colores.md

### Bust SVG (generic person bust)
- Replaced ClassIcon (class-specific SVGs) and ClassSvg with unified BustSvg component
- Simple bust: circle head + shoulders, filled with class color, black stroke
- Used in UnitsLayer.tsx (board tokens) and PlayerSidebar.tsx (deployment pool)
- Positioned higher (cy=5, translate -9,-12) to leave space for HP text

### Player panel refinement
- Active turn badge: always green (g-emerald-700/60 text-emerald-200)
- Cards title: 	ext-white/50 (brighter)
- Borders: all order-zinc-* → order-white/20 or order-white/10
- Backgrounds: g-zinc-800/* → g-zinc-900 (darker)
- Identity card, stats row, pool units, hand cards all updated

### Previously (same session)
- GameTime display with auto-fill in reducer
- showActionName fix for move/card entries  
- PA floating to bottom-right in all card types
- countAllies/countEnemies with i18n
- showTarget component
- showEffects removed from info panel
- PanelUnitsAffected rewrite with damage cards
- showResult removed, hit/miss in dice line
- Card entry PA respects showFormula
- PanelResult removed

