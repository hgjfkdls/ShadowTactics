import type { GameState } from '@shared';
import { IDENTITY_INFO, getIdentityKey } from './identityData';
import { l } from '@shared/i18n';

type Props = {
    state: GameState;
    playerId: string;
    selectedUnitId: string | null;
    onSelectUnit: (unitId: string | null) => void;
};

function getIdentityName(cardId: string | undefined): string {
    if (!cardId) return '?';
    const key = getIdentityKey(cardId);
    return IDENTITY_INFO[key]?.name ?? '?';
}

export function DeploymentPanel({ state, playerId, selectedUnitId, onSelectUnit }: Props) {
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const isMyTurn = state.currentDeployingPlayer === playerId;
    const player = state.players[playerId];
    const opponent = state.players[opponentId];
    const pool = player?.unitsToDeploy ?? [];
    const deployedCount = player?.deployedUnits?.length ?? 0;
    const opponentDeployedCount = opponent?.deployedUnits?.length ?? 0;
    const step = state.deploymentStep;

    function handleUnitClick(unitId: string) {
        if (!isMyTurn) return;
        onSelectUnit(selectedUnitId === unitId ? null : unitId);
    }

    return (
        <aside className="h-full border-r border-zinc-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-zinc-700 p-3 space-y-1">
                <h2 className="text-lg font-bold">Despliegue</h2>
                <div className="text-xs text-zinc-400">
                    Paso {step + 1} / 12
                    {isMyTurn
                        ? ` — Colocas ${step === 0 || step === 11 ? '1' : '2'} unidad(es)`
                        : l('ui.waitingOpponentShort')}
                </div>
            </div>

            {/* Panel A — Player info */}
            <div className="border-b border-zinc-700 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('ui.yourInfo')}</div>
                <div className="flex items-center gap-2">
                    <div className="text-lg">🛡️</div>
                    <div>
                        <div className="text-sm font-bold">{getIdentityName(player?.selectedIdentity)}</div>
                        <div className="text-xs text-zinc-400">{l('ui.playerLabel', { n: playerId === 'p1' ? '1' : '2' })}</div>
                    </div>
                </div>
                <div className="space-y-1 text-xs">
                    {state.activePlayer === playerId ? (
                        <div className="text-green-400 font-semibold">{l('ui.activePlayer', { player: 'tú' })}</div>
                    ) : (
                        <div className="text-zinc-500">{l('ui.activePlayer', { player: state.activePlayer === opponentId ? l('ui.oponente') : l('ui.playerShort', { id: state.activePlayer }) })}</div>
                    )}
                    {isMyTurn ? (
                        <div className="text-yellow-400 font-semibold">{l('deploy.deployingNow')}</div>
                    ) : (
                        <div className="text-zinc-500">{l('deploy.deployer', { player: state.currentDeployingPlayer === opponentId ? l('ui.oponente') : l('ui.playerShort', { id: state.currentDeployingPlayer }) })}</div>
                    )}
                    <div className="text-zinc-400">Unidades: {deployedCount} / 11</div>
                </div>
            </div>

            {/* Panel A — Opponent info */}
            <div className="border-b border-zinc-700 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Oponente</div>
                <div className="flex items-center gap-2">
                    <div className="text-lg">🛡️</div>
                    <div>
                        <div className="text-sm font-bold">{getIdentityName(opponent?.selectedIdentity)}</div>
                        <div className="text-xs text-zinc-400">Jugador {opponentId}</div>
                    </div>
                </div>
                <div className="space-y-1 text-xs">
                    <div className="text-zinc-400">Unidades: {opponentDeployedCount} / 11</div>
                </div>
            </div>

            {/* Panel F — My units to deploy */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-zinc-700">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        Tus unidades ({pool.length} restantes de 13)
                    </div>
                </div>

                {pool.length === 0 ? (
                    <div className="text-xs text-zinc-600 text-center py-4">Todas las unidades colocadas</div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-3 gap-2">
                            {pool.map(entry => {
                                const isSelected = selectedUnitId === entry.unitId;
                                const isClickable = isMyTurn;
                                return (
                                    <button
                                        key={entry.unitId}
                                        onClick={() => handleUnitClick(entry.unitId)}
                                        disabled={!isClickable}
                                        className={[
                                            'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition cursor-pointer',
                                            isSelected
                                                ? 'border-blue-500 bg-blue-600/20'
                                                : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-750',
                                            !isClickable ? 'opacity-50 cursor-not-allowed' : '',
                                        ].join(' ')}
                                    >
                                        <ClassSvg cls={entry.unitClass} />
                                        <span className="text-[10px] font-mono text-zinc-500">{entry.unitId}</span>
                                        <span className="text-[10px] font-semibold leading-tight">{l(`unit.class.${entry.unitClass}`)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedUnitId && (
                            <div className="mt-3 text-xs text-green-400 text-center">
                                {l('ui.clickHexDeploy', { unitId: selectedUnitId })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}

function ClassSvg({ cls }: { cls: string }) {
    switch (cls) {
        case 'archer':
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M7 16 L17 8 M11 8 L17 8 L17 12" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
            );
        case 'infantry':
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#60a5fa" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#60a5fa" strokeWidth="1.3" fill="none" />
                    <rect x="7" y="9" width="10" height="8" rx="1.5" stroke="#60a5fa" strokeWidth="1.2" fill="none" />
                    <line x1="12" y1="9" x2="12" y2="17" stroke="#60a5fa" strokeWidth="1.2" />
                </svg>
            );
        case 'cavalry':
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#a78bfa" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#a78bfa" strokeWidth="1.3" fill="none" />
                    <path d="M4 17 C4 12 8 5 12 4 C16 5 20 12 20 17" stroke="#a78bfa" strokeWidth="1.2" fill="none" />
                    <circle cx="12" cy="9" r="2" fill="#a78bfa" />
                </svg>
            );
        case 'lancer':
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#f87171" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#f87171" strokeWidth="1.3" fill="none" />
                    <line x1="12" y1="10" x2="12" y2="3" stroke="#f87171" strokeWidth="1.5" />
                    <line x1="12" y1="3" x2="15" y2="6" stroke="#f87171" strokeWidth="1.5" />
                </svg>
            );
        case 'general':
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M12 4 L13.5 7 L17 7.5 L14.5 9.5 L15 12.5 L12 11 L9 12.5 L9.5 9.5 L7 7.5 L10.5 7 Z" stroke="#fbbf24" strokeWidth="0.9" fill="none" />
                </svg>
            );
        default:
            return null;
    }
}
