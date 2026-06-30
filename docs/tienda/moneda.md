[docs](../docs.md) > [tienda](./docs.md) > moneda

# ShadowCoins [SC] — Economía

## Moneda única: ShadowCoins [SC]

Moneda blanda (soft currency) que se gana jugando partidas. Sin moneda premium (sin pay-to-win).

## Ganancias por partida

| Concepto | Base |
|---|---|
| Partida completada (cualquier resultado) | 10 |
| Bonus por victoria | +5 |
| Bonus por racha de 3+ victorias | +3 |
| Partida ranked | +2 |
| Bonus por primera partida del día | +5 |

### Fórmula

```
base     = 10 + (winner ? 5 : 0) + (streak >= 3 ? 3 : 0) + (isRanked ? 2 : 0) + (firstOfDay ? 5 : 0)
mult     = 0.5 + (score / 100)
total    = round(base * mult)

El score se ajusta al rango 0–100 (`clamp(0, 100, score)`) antes de aplicar la fórmula.
```

El `score` es el campo `GamePlayerPerformance.score` (0–100) calculado por el servidor de juego al finalizar la partida. Refleja el desempeño global: precisión, daño infligido, supervivencia, eficiencia de contraataque, etc.

**Efecto del multiplicador:**

| score | mult | Efecto |
|---|---|---|
| 0 | 0.50 | −50 % |
| 25 | 0.75 | −25 % |
| 50 | 1.00 | Neutro |
| 75 | 1.25 | +25 % |
| 100 | 1.50 | +50 % |

### Ejemplos

| Escenario | score | base | mult | Total SC |
|---|---|---|---|---|
| Pierde quickplay, mal desempeño | 20 | 10 | 0.70 | **7** |
| Pierde quickplay, desempeño medio | 50 | 10 | 1.00 | **10** |
| Gana quickplay, buen desempeño | 75 | 15 | 1.25 | **19** |
| Gana ranked, desempeño excelente | 85 | 17 | 1.35 | **23** |
| Gana ranked, racha 3, score perfecto | 100 | 20 | 1.50 | **30** |
| Gana ranked + racha 3 + 1ª del día + score perfecto | 100 | 25 | 1.50 | **38** |

## Precios de cosméticos por rareza

| Rareza | Rango precio |
|---|---|
| COMMON (común) | 10 – 30 |
| RARE (rara) | 50 – 120 |
| EPIC (épica) | 150 – 300 |
| LEGENDARY (legendaria) | 400 – 800 |

### Precios sugeridos por tipo

| Tipo | Rareza típica | Precio sugerido |
|---|---|---|
| Tablero Clásico | COMMON | Gratis (por defecto) |
| Avatar | COMMON | 15 |
| HEX_VARIANT (Piedra) | COMMON | 20 |
| EMOTE (Saludo) | COMMON | 25 |
| QUICK_MESSAGE | COMMON | 10 |
| CURSOR | COMMON | 20 |
| Tablero temático | RARE | 80 |
| SKIN (unidad) | RARE | 100 |
| WEAPON | RARE | 60 |
| PROFILE_FRAME | RARE | 70 |
| CLIMATE | RARE | 90 |
| BANNER | RARE | 50 |
| Tablero premium | EPIC | 200 |
| SKIN épica | EPIC | 250 |
| EFFECT animación | EPIC | 180 |
| PET | EPIC | 220 |
| Tablero legendario | LEGENDARY | 500 |
| SKIN mítica | LEGENDARY | 600 |
| ANIMATION_ELIMINATION | LEGENDARY | 400 |
| COMPANION | LEGENDARY | 450 |
| TITLE legendario | LEGENDARY | 350 |

## Racha de victorias

- La racha se calcula en el backend consultando las últimas partidas del jugador.
- Si las últimas N partidas (consecutivas, ordenadas por fecha descendente) son todas victorias → racha = N.
- Se considera racha a partir de 3 victorias consecutivas.
- Una derrota resetea la racha a 0.

## Primera partida del día

- Se verifica si el jugador ya ha completado alguna partida hoy (UTC).
- Solo aplica una vez por día calendario.

## Límites y seguridad

- No hay tope de monedas acumulables (no inflacionario por diseño).
- El endpoint de award está protegido con API key (igual que `POST /api/games/report`).
- Validación en servidor: no se puede llamar `award` sin un gameId válido y no previamente recompensado.
- Los cálculos se hacen exclusivamente en servidor, nunca en cliente.
