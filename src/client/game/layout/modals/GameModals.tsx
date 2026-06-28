import type { GameState, HexCoord, UnitId } from '@shared';
import { l } from '@shared/i18n';
import { getCardName, getCardType } from '@shared/game/actions/card';
import type { PendingAbility } from '../../board/useSelection';

type Props = {
    state: GameState;
    myPlayerId: string;
    isIdentityTargetMode: boolean;
    isCardTargetMode: boolean;
    isCardTargetAlly: boolean;
    isWaitingForCounter: boolean;
    isCounterPrompt: boolean;
    pendingCard: { cardId: string; playerId: string; targetId?: string } | undefined;
    pendingAbility: PendingAbility;
    pendingIdentityTargetId: UnitId | null;
    pendingPatadaTargetId: UnitId | null;
    pendingCounterEspejoCard: string | null;
    pendingTorbellino: boolean;
    pendingAngelGuardian: boolean;
    cabalgarPath: HexCoord[];
    cabalgarMaxSteps: number;
    onInfoSelect?: (info: any) => void;
    sendAction: (action: any) => void;
    enqueue: (anim: any) => void;
    setPendingIdentityTargetId: (id: UnitId | null) => void;
    setPendingPatadaTargetId: (id: UnitId | null) => void;
    setPendingCounterEspejoCard: (id: string | null) => void;
    setPendingAbility: (pa: PendingAbility) => void;
    setCabalgarPath: (path: HexCoord[]) => void;
    setCabalgarIsLaCarga: (v: boolean) => void;
    setPendingTorbellino: (v: boolean) => void;
    setPendingAngelGuardian: (v: boolean) => void;
};

export function GameModals(props: Props) {
    const {
        state, myPlayerId,
        isIdentityTargetMode, isCardTargetMode, isCardTargetAlly,
        isWaitingForCounter, isCounterPrompt, pendingCard,
        pendingAbility, pendingIdentityTargetId, pendingPatadaTargetId,
        pendingCounterEspejoCard, pendingTorbellino, pendingAngelGuardian,
        cabalgarPath, cabalgarMaxSteps,
        onInfoSelect, sendAction, enqueue,
        setPendingIdentityTargetId, setPendingPatadaTargetId,
        setPendingCounterEspejoCard, setPendingAbility,
        setCabalgarPath, setCabalgarIsLaCarga,
        setPendingTorbellino, setPendingAngelGuardian,
    } = props;

    return (
        <>
            {/* Identity target banner */}
            {isIdentityTargetMode && !pendingIdentityTargetId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 border border-purple-500 rounded-lg px-5 py-2.5 text-sm text-purple-100 font-semibold shadow-lg shadow-purple-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🎯</span>
                    <span>{l('identityTarget.title')}: {l('identityTarget.subtitle')}</span>
                </div>
            )}

            {/* Card target mode */}
            {isCardTargetMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-violet-900/90 border border-violet-500 rounded-lg px-5 py-2.5 text-sm text-violet-100 font-semibold shadow-lg shadow-violet-900/50 flex items-center gap-2">
                    <span>🎯</span>
                    <span>{isCardTargetAlly ? l('alert.selectAlly') : l('alert.selectEnemyTarget')}</span>
                    <button className="ml-2 bg-zinc-700 hover:bg-zinc-600 transition text-white px-2 py-0.5 rounded text-xs cursor-pointer" onClick={() => onInfoSelect?.(null)}>
                        {l('button.cancel')}
                    </button>
                </div>
            )}

            {/* Cabalgar_2 select */}
            {pendingAbility?.abilityId === 'cabalgar_2' && cabalgarPath.length === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 border border-purple-500 rounded-lg px-5 py-2.5 text-sm text-purple-100 font-semibold shadow-lg shadow-purple-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🐴</span>
                    <span>{l('confirmActions.cabalgarSelect')}</span>
                </div>
            )}

            {/* Patada target */}
            {pendingAbility?.abilityId === 'patada_acrobatica' && !pendingPatadaTargetId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-900/90 border border-blue-500 rounded-lg px-5 py-2.5 text-sm text-blue-100 font-semibold shadow-lg shadow-blue-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🦶</span>
                    <span>{l('confirmActions.patadaTarget')}</span>
                </div>
            )}

            {/* Patada escape */}
            {pendingAbility?.abilityId === 'patada_acrobatica' && pendingPatadaTargetId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 border border-emerald-500 rounded-lg px-5 py-2.5 text-sm text-emerald-100 font-semibold shadow-lg shadow-emerald-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🦶</span>
                    <span>{l('confirmActions.patadaEscape')}</span>
                    <button className="ml-2 bg-zinc-700 hover:bg-zinc-600 transition text-white px-2 py-0.5 rounded text-xs cursor-pointer" onClick={() => setPendingPatadaTargetId(null)}>
                        {l('button.cancel')}
                    </button>
                </div>
            )}

            {/* Identity target confirm */}
            {pendingIdentityTargetId && (() => {
                const target = state.units[pendingIdentityTargetId];
                if (!target) return null;
                return (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-zinc-900/95 border border-purple-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-500">{l('identityTarget.title')}</div>
                                <div className="text-sm font-semibold text-purple-300">{l(`unit.class.${target.class}`) || target.class}</div>
                                <div className="text-xs text-zinc-400">{l('unitDetail.hp')}: {target.hp}</div>
                            </div>
                            <div className="text-sm text-zinc-300">{l('identityTarget.confirm')}</div>
                            <div className="flex gap-3 justify-center">
                                <button className="bg-purple-700 hover:bg-purple-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer" onClick={() => { sendAction({ type: 'IDENTITY_ABILITY', playerId: myPlayerId, targetId: pendingIdentityTargetId }); setPendingIdentityTargetId(null); }}>
                                    {l('identityTarget.attack')}
                                </button>
                                <button className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer" onClick={() => setPendingIdentityTargetId(null)}>
                                    {l('button.cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Cabalgar confirm */}
            {pendingAbility?.abilityId === 'cabalgar_2' && cabalgarPath.length >= cabalgarMaxSteps && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">{l('confirmActions.cabalgarTitle', { n: cabalgarPath.length })}</div>
                        <div className="flex gap-3 justify-center">
                            <button className="bg-amber-700 hover:bg-amber-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer" onClick={() => {
                                onInfoSelect?.(null);
                                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility!.unitId, abilityId: 'cabalgar_2', path: cabalgarPath });
                                const startPos = state.units[pendingAbility!.unitId]?.position;
                                if (startPos) {
                                    enqueue({ id: `cabalgar2_${pendingAbility!.unitId}_${Date.now()}`, type: 'move', unitId: pendingAbility!.unitId, path: [startPos, ...cabalgarPath], duration: 700 * cabalgarPath.length });
                                }
                                setPendingAbility(null);
                                setCabalgarPath([]);
                                setCabalgarIsLaCarga(false);
                            }}>
                                {l('confirmActions.confirm')}
                            </button>
                            <button className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer" onClick={() => { setCabalgarPath([]); setCabalgarIsLaCarga(false); }}>
                                {l('button.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Torbellino confirm */}
            {pendingTorbellino && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-red-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">{l('confirmActions.torbellinoTitle')}</div>
                        <div className="text-xs text-red-400">{l('confirmActions.torbellinoDesc')}</div>
                        <div className="flex gap-3 justify-center mt-2">
                            <button className="bg-red-700 hover:bg-red-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => { sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility!.unitId, abilityId: 'torbellino' }); setPendingAbility(null); setPendingTorbellino(false); }}>
                                {l('confirmActions.confirm')}
                            </button>
                            <button className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => setPendingTorbellino(false)}>
                                {l('button.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ángel Guardián confirm */}
            {pendingAngelGuardian && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-500 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">{l('confirmActions.angelGuardianTitle')}</div>
                        <div className="text-xs text-amber-400">{l('confirmActions.angelGuardianCost')}</div>
                        <div className="flex gap-3 justify-center mt-2">
                            <button className="bg-amber-700 hover:bg-amber-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => {
                                const gen = Object.values(state.units).find(u => u.owner === myPlayerId && u.class === 'general');
                                if (gen) sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: gen.id, abilityId: 'angel_guardian' });
                                setPendingAngelGuardian(false);
                            }}>
                                {l('confirmActions.confirm')}
                            </button>
                            <button className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => setPendingAngelGuardian(false)}>
                                {l('button.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COUNTER waiting */}
            {isWaitingForCounter && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-lg">⏳</div>
                        <div className="text-sm text-zinc-300 font-semibold">{l('counter.waitingForOpponent')}</div>
                        {pendingCard && (
                            <div className="text-xs text-zinc-500">{l('counter.youPlayed', { card: getCardName(pendingCard.cardId) })}</div>
                        )}
                    </div>
                </div>
            )}

            {/* COUNTER prompt */}
            {isCounterPrompt && !pendingCounterEspejoCard && (() => {
                if (!pendingCard) return null;
                const pendingType = getCardType(pendingCard.cardId);
                const counterCards = (state.players[myPlayerId]?.cardsInHand ?? [])
                    .filter(cid => { if (getCardType(cid) !== 'COUNTER') return false; if (pendingType === 'BUFF') return cid.startsWith('ladron'); return true; });
                const pendingName = getCardName(pendingCard.cardId);
                return (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-zinc-900/95 border border-violet-600 rounded-lg px-6 py-5 shadow-2xl min-w-80 text-center space-y-4">
                            <div className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">{l('counter.opponentCard')}</div>
                            <div className="text-sm font-semibold text-violet-300">{pendingName}</div>
                            <div className="text-xs text-zinc-400">{l('counter.wantToCounter')}</div>
                            {counterCards.length > 0 && (
                                <div className="space-y-2">
                                    {counterCards.map(cid => {
                                        const cname = getCardName(cid);
                                        const isConfusionPending = pendingCard && pendingCard.cardId.startsWith('confusion');
                                        return (
                                            <button key={cid} className="w-full bg-violet-800 hover:bg-violet-700 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => { if (cid.startsWith('espejo') && isConfusionPending) { setPendingCounterEspejoCard(cid); } else { sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId: cid }); } }}>
                                                {cname}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {counterCards.length === 0 && <div className="text-xs text-zinc-500">{l('counter.noCounterCards')}</div>}
                            <button className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => sendAction({ type: 'PASS_COUNTER', playerId: myPlayerId })}>
                                {l('button.pass')}
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Espejo target */}
            {pendingCounterEspejoCard && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-violet-900/90 border border-violet-500 rounded-lg px-5 py-2.5 text-sm text-violet-100 font-semibold shadow-lg shadow-violet-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🎯</span>
                    <span>{l('counter.selectEspejoTarget')}</span>
                </div>
            )}

            {/* Espartano choice */}
            {state.players[myPlayerId]?.pendingEspartanoChoice && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-blue-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">{l('espartano.title')}</div>
                        <div className="flex gap-3 justify-center">
                            <button className="bg-blue-700 hover:bg-blue-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => sendAction({ type: 'ESPARTANO_CHOICE', playerId: myPlayerId, choice: 'range' })}>
                                {l('espartano.range')}
                            </button>
                            <button className="bg-emerald-700 hover:bg-emerald-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => sendAction({ type: 'ESPARTANO_CHOICE', playerId: myPlayerId, choice: 'defense' })}>
                                {l('espartano.defense')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan batalla */}
            {state.players[myPlayerId]?.pendingPlanBatalla && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">{l('planBatalla.title')}</div>
                        <div className="text-xs text-zinc-500 mb-2">{l('planBatalla.subtitle')}</div>
                        <div className="flex gap-3 justify-center">
                            <button className="bg-red-700 hover:bg-red-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => sendAction({ type: 'COMANDANTE_CHOICE', playerId: myPlayerId, choice: 'attack' })}>
                                {l('planBatalla.attack')}
                            </button>
                            <button className="bg-blue-700 hover:bg-blue-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer" onClick={() => sendAction({ type: 'COMANDANTE_CHOICE', playerId: myPlayerId, choice: 'defense' })}>
                                {l('planBatalla.defense')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
