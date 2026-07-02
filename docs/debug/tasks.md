# Tareas — Cambios de paradigma ataque/defensa

Basado en `cartas_skills.md` modificado manualmente.

## Tabla de avance

| # | Tarea | Estado |
|---|-------|--------|
| 1 | dios_trueno — Rayo celestial (ataque, coste 2) | Completado |
| 2 | capitan_guardia — Contraataque (rango 1, daño verdadero) | Completado |
| 3 | cazadores — Acechar (ataque, mitad a caballería) | Completado |
| 4 | espartano — Lanza y escudo (+1 defensa) | Pendiente |
| 5 | monje_shaolin — Meditación (+1 defensa), Karma (2 daño) | Completado |
| 6 | corazon_estratega — Formaciones (+1 ataque / +1 defensa) | Completado |
| 7 | comandante_supremo — Plan de batalla (+1 ataque / +1 defensa) | Completado |
| 8 | inspiracion_real — En nombre del rey (+2 ataque), Guardia real (+1 atk/+1 def) | Completado |
| 9 | escudo_comandante — Proteger (+1 defensa) | Completado |
| 10 | furia_tirano — Daño verdadero, Terror +2 | Pendiente |
| 11 | Cartas BUFF — ataque_extra, flechas_fuego (+1 ataque) | Pendiente |
| 12 | Cartas DEBUFF — mantenimiento (-1 ataque) | Pendiente |
| 13 | Cartas COUNTER — descripciones menores | Pendiente |
| 14 | Caballería — carga/doble_ataque (+1/-1 ataque) | Completado |
| 15 | Lancero — anti_caballeria (+1 ataque basico), formacion_defensiva (ignora carga) | Completado |
| 16 | Infantería — resistencia/linea_defensiva (+1 defensa), presion (+1 ataque), avance→ejecutar | Completado |
| 17 | en_nombre_del_rey — +2 ataque | Pendiente |
| 18 | meditacion — +1 defensa si no se cura | Pendiente |
| 19 | terror — +2 dificultad | Pendiente |
| 20 | cabalgar_2 — 2 casillas | Pendiente |
| 21 | rayo_celestial — coste 2, sin reducción | Pendiente |
| 22 | Labels pasivas (es.ts) — +1 ataque / +1 defensa | Pendiente |
| 23 | cat labels (es.ts) — verificar atk/def | Pendiente |
| 24 | identityData.ts — sincronizar descripciones | Pendiente |
| 25 | en.ts — sincronizar traducciones | Pendiente |

---

## Cartas de Identidad — descVerbose

1. **dios_trueno** — Rayo celestial: cambiar a `stat='attack'` (no `'damage'`), coste 2 PA, sin reducción por uso. Quitar lógica de escalado [+3/+2/+1]. `src/shared/game/data/abilities.ts` y `src/shared/game/actions/ability.ts`

2. **capitan_guardia** — Contraataque: cambio `melee` → `rango 1`. El daño del contraataque es daño verdadero (ignora ataque/defensa), fijo en 1. `src/shared/game/combat/ability-effects.ts`

3. **cazadores** — Acechar: cambiar `stat='damage'` → `stat='attack'`. Caballería recibe mitad del bonus de Acechar (solo el General aplica Acechar contra general rival). `src/shared/game/combat/ability-effects.ts`

4. **espartano** — Lanza y escudo: opción defensa ahora `stat='defense'` (antes `stat='damage'` con valor negativo). `src/shared/game/phases/turn.ts`

5. **monje_shaolin** — Meditación: si no se usó meditación, otorga `+1 defense` hasta próximo turno. Karma: daño verdadero, aumentado a 2. `src/shared/game/phases/turn.ts` y `src/shared/game/combat/kill.ts`

6. **corazon_estratega** — Formaciones: Línea → `+1 defense` (antes `-1 damage`), Triángulo → `+1 attack` (antes `+1 damage`). `src/shared/game/formations.ts`

7. **comandante_supremo** — Plan de batalla: Avanzar → `+1 attack` (antes `+1 damage`), Reagruparse → `+1 defense` (antes `-1 damage`). Voz de mando duplica: `+2 attack` / `+2 defense`. `src/shared/game/reducer.ts`

8. **inspiracion_real** — En nombre del rey: cambiar de `ataque 5` fijo a `+2 attack`. Guardia real: `+1 attack` y `+1 defense` (antes `+1 ataque` y `-1 daño recibido`). `src/shared/game/phases/identity-apply.ts`

9. **escudo_comandante** — Proteger: `+1 defense` (antes `-1 damage`). `src/shared/game/data/abilities.ts`

10. **furia_tirano** — *Decisión: mantener como daño verdadero.* Sacrificar: aliado recibe 2 de daño (ignora defensa). Terror: +2 dificultad (antes +1). `src/shared/game/actions/ability.ts` y `src/shared/game/combat/ability-effects.ts`

## Cartas de Efecto

11. **ataque_extra** — Descripción: `+1 de ataque` en lugar de `+1 de daño`. `src/shared/game/actions/card.ts`

12. **flechas_fuego** — Descripción: `+1 de ataque` en lugar de `+1 de daño`. El daño pasivo sigue siendo daño verdadero (no afectado por defensa). `src/shared/game/actions/card.ts`

13. **mantenimiento** — Descripción: `-1 de ataque` en lugar de `-1 de daño`. `src/shared/game/actions/card.ts`

## Habilidades de Clase

14. **Caballería** — `carga`: `+1 ataque` (antes `+1 daño`). `doble_ataque`: `-1 ataque` (antes `-1 daño`). Restricciones actualizadas. `src/shared/game/data/abilities.ts`

15. **Lancero** — `anti_caballeria`: `+1 ataque` (antes `+1 daño`). `formacion_defensiva`: mantener como daño verdadero (no afectado por ataque/defensa). `src/shared/game/combat/ability-effects.ts`

16. **Infantería** — `resistencia`: `+1 defensa` (antes `-1 daño`). `linea_defensiva`: `+1 defensa` (antes `-1 daño`). `presion`: `+1 ataque` (antes `+1 daño`). Reemplazar `avance` por `ejecutar`: `Si el enemigo tiene 2 HP o menos tu siguiente ataque ignora defensa, permite ocupar su posición`. `src/shared/game/data/abilities.ts`, `src/shared/game/combat/ability-effects.ts`, `src/shared/game/actions/ability.ts`

## Habilidades de Identidad

17. **en_nombre_del_rey** — Cambiar de `ataque 5` fijo a `+2 attack`. `src/shared/game/data/abilities.ts`

18. **meditacion** — Si no se usó meditación en el turno, otorga `+1 defense` hasta próximo turno. `src/shared/game/phases/turn.ts`

19. **terror** — +2 dificultad (antes +1). `src/shared/game/combat/ability-effects.ts`

20. **cabalgar_2** — 2 casillas (no 2-3), `a_la_carga` habilita la 3ª. `src/shared/game/data/abilities.ts`

21. **rayo_celestial** — Ya no reduce ataque con cada uso. Coste 2 PA. `src/shared/game/data/abilities.ts` y `src/shared/game/actions/ability.ts`

## Labels (es.ts)

22. **passive labels** — Actualizar `lineaDefensiva`, `resistencia`, `meditacion`, `formacionLinea`, `formacionTriangulo`, `proteger`, `furiaBerserker`, `lanzaEscudoDefensa`, `muroEspartano`, `ataqueExtra`: cambiar `-1 daño` por `+1 defensa` o `+1 ataque` según corresponda. `src/shared/i18n/resources/es.ts`

23. **cat labels** — Verificar que `atk: 'Ataque'`, `def: 'Defensa'` estén correctos. `src/shared/i18n/resources/es.ts`

## identityData.ts

24. **identityData.ts** — Sincronizar `IDENTITY_INFO` con los cambios de descripción y terminología de las 15 identidades (ataque/defensa). `src/client/prep/identityData.ts`

## i18n en.ts

25. **en.ts** — Sincronizar traducciones al inglés con los mismos cambios de paradigma. `src/shared/i18n/resources/en.ts`
