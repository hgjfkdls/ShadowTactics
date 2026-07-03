/**
 * RightPanel — panel de información detallada
 * 
 * Los componentes se han dividido en src/client/game/layout/panel/
 * - information/  → información detallada (historial, unidades, habilidades)
 * - action/       → panel de acciones (ataque, movimiento, habilidades)
 * - history/      → historial de eventos (AttackResultPanel)
 * - player/       → panel de jugadores (PlayerSidebar)
 * 
 * Este archivo re-exporta desde panel/information/index.tsx para mantener compatibilidad.
 */

export { RightPanel, type SelectedInfo } from './panel/information';
export { cls, nameForHistoryCard, descForHistoryCard } from './panel/information/helpers';
