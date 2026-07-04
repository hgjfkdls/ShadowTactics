import { l } from '@shared/i18n';
import { nameForHistoryCard } from '../../../RightPanel';

export default function PanelTitle({ entry, isAttackEntry, isMoveEntry, isSupportCard, isCounter }: { entry: any; isAttackEntry: boolean; isMoveEntry: boolean; isSupportCard: boolean; isCounter: boolean }) {
    const abilityName = entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : null;
    const attackName = entry.attackName?.startsWith('ability.') || entry.attackName?.startsWith('button.') ? l(entry.attackName) : null;
    return isAttackEntry ? (
        <div className="flex items-start gap-3">
            <div className="text-3xl">{entry.configId === 'torbellino' ? '🌪️' : '⚔️'}</div>
            <div>
                <div className="text-lg font-bold">{attackName ?? (entry.attackName?.startsWith('ability.') || entry.attackName?.startsWith('button.') ? l(entry.attackName) : entry.attackName) ?? l('button.basicAttack')}</div>
                <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    ) : isMoveEntry ? (
        <div className="flex items-start gap-3">
            <div className="text-3xl">👟</div>
            <div>
                <div className="text-lg font-bold">{abilityName ?? l('button.move')}</div>
                <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    ) : isSupportCard ? (
        <div className="flex items-start gap-3">
            <div className="text-3xl">✨</div>
            <div>
                <div className="text-lg font-bold">{entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : entry.cardName}</div>
                <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    ) : (
        <div className="flex items-start gap-3">
            <div className="text-3xl">🃏</div>
            <div>
                <div className="text-lg font-bold">{nameForHistoryCard(entry.cardId)}</div>
                <div className={[
                    'text-xs font-semibold',
                    isCounter ? 'text-violet-400' : entry.cardType === 'BUFF' ? 'text-emerald-400' : 'text-red-400',
                ].join(' ')}>
                    {l(`cardType.${entry.cardType}`) || entry.cardType}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    );
}
