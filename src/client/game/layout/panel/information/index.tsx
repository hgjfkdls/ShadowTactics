import type { GameState, GameAction } from '@shared';
import { l } from '@shared/i18n';
import { AttackResultDetail } from './abilities/AttackResultDetail';
import IdentityDetail from './abilities/IdentityDetail';
import CardDetail from './abilities/CardDetail';
import EffectDetail from './abilities/EffectDetail';
import { UnitDetail } from './units/UnitDetail';
import { cls } from './helpers';
import HistoryEntryDetail from './history/HistoryEntryDetail';

export type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string; fromRect?: DOMRect; _ck?: number; isReclick?: boolean } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number } | { type: 'attackResult'; resultIndex: number } | { type: 'historyAttack'; entry: any } | { type: 'historyMove'; entry: any } | { type: 'historyCard'; entry: any } | null;

type Props = {
    state: GameState;
    playerId: string;
    selectedInfo: SelectedInfo;
    sendAction?: (action: GameAction) => void;
    children?: React.ReactNode;
};

export function RightPanel({ state, playerId, selectedInfo, sendAction, children }: Props) {
    function renderContent() {
        if (selectedInfo?.type === 'identity') {
            return <IdentityDetail state={state} targetPlayerId={selectedInfo.playerId} myPlayerId={playerId} />;
        }
        if (selectedInfo?.type === 'unit') {
            return <UnitDetail state={state} unitId={selectedInfo.unitId} myPlayerId={playerId} />;
        }
        if (selectedInfo?.type === 'card') {
            return <CardDetail cardId={selectedInfo.cardId} fromRect={selectedInfo.fromRect} isReclick={selectedInfo.isReclick} key={selectedInfo.cardId + '_' + (selectedInfo._ck ?? 0)} />;
        }
        if (selectedInfo?.type === 'effect') {
            return <EffectDetail stat={selectedInfo.stat} label={selectedInfo.label} description={selectedInfo.description} source={selectedInfo.source} sourceName={selectedInfo.sourceName} value={selectedInfo.value} />;
        }
        if (selectedInfo?.type === 'attackResult') {
            const r = state.attackResults?.[selectedInfo.resultIndex];
            if (!r) return null;
            return <AttackResultDetail result={r} state={state} />;
        }
        if (selectedInfo?.type === 'historyAttack' || selectedInfo?.type === 'historyMove' || selectedInfo?.type === 'historyCard') {
            return <HistoryEntryDetail entry={selectedInfo.entry} state={state} />;
        }
        return null;
    }

    return (
        <aside className="h-full border-l border-zinc-700 flex flex-col overflow-hidden bg-zinc-900/80">
            <div className="border-b border-zinc-700 p-3">
                <div className="text-[10px] font-semibold text-panel-title uppercase tracking-wide">
                    {selectedInfo ? l('board.info') : l('board.details')}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {renderContent()}
                {children}
                {!selectedInfo && !children && (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-600">
                        {l('board.noDetails')}
                    </div>
                )}
            </div>
        </aside>
    );
}
