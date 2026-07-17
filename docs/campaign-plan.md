# Plan de Campaña — Shadow Tactics

## Visión General

Cada una de las 15 identidades tiene una campaña de 5 batallas que narra su ascenso de soldado desconocido a general reconocido. Las campañas son independientes y pueden jugarse en cualquier orden.

## Estructura de cada campaña

| Batalla | Aliados | Enemigos | Tipo de misión |
|---------|---------|----------|----------------|
| 1 | 0-1 | 2-3 | Supervivencia / Demostración |
| 2 | 2-3 | 3-4 | Escaramuza |
| 3 | 4-5 | 5-7 | Batalla táctica |
| 4 | 6-7 | 8-10 | Conflicto mayor |
| 5 | 10 | 11-14 | Batalla épica |

## Reglas de composición de aliados

- **Clases disponibles:** Archer, Infantry, Cavalry, Lancer (4 clases base)
- **Límite por clase:** Máximo 3 unidades de la misma clase por batalla
- **Sin clases especiales:** No hay unidades únicas o héroes adicionales
- **Progresión:** Los aliados que sobreviven continúan en la siguiente batalla

## Hilo narrativo entre batallas

Cada batalla está conectada por un párrafo de transición que describe:
1. Las consecuencias inmediatas de la batalla anterior
2. Los cambios en la situación del personaje (ascensos, pérdidas, nuevos aliados)
3. La preparación para el siguiente conflicto

## Composición de aliados por general

| General | Composición batalla final (10 aliados) |
|---------|--------------------------------------|
| Robin Hood | 3 arqueros + 3 infantes + 2 lanceros + 2 caballerías |
| Francotirador | 3 arqueros + 3 infantes + 2 lanceros + 2 caballerías |
| Dios del Trueno | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Capitán de la Guardia | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Caballos de Guerra | 3 caballerías + 3 infantes + 2 lanceros + 2 arqueros |
| Cazadores | 3 caballerías + 3 infantes + 2 arqueros + 2 lanceros |
| Punta de Lanza | 3 lanceros + 3 infantes + 2 arqueros + 2 caballerías |
| Espartano | 3 lanceros + 3 infantes + 2 arqueros + 2 caballerías |
| Monje Shaolin | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Corazón de Estratega | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Comandante Supremo | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Inspiración Real | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Samurái | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Furia del Tirano | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |
| Escudo del Comandante | 3 infantes + 3 lanceros + 2 arqueros + 2 caballerías |

## Notas de implementación

- La campaña requiere persistencia para rastrear qué identidades han completado qué batallas
- Los aliados deben tener persistencia entre batallas (los que sobreviven continúan)
- Cada batalla tiene condiciones de victoria únicas (no siempre "eliminar a todos")
- El hilo narrativo se muestra como texto entre batallas para mantener la coherencia de la historia
