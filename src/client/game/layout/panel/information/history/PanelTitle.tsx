import { l } from '@shared/i18n';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { nameForHistoryCard } from '../../../RightPanel';
import AbilityIcon from '../../../../icons/AbilityIcon';

export default function PanelTitle({ entry, isAttackEntry, isMoveEntry, isSupportCard, isCounter }: { entry: any; isAttackEntry: boolean; isMoveEntry: boolean; isSupportCard: boolean; isCounter: boolean }) {
    const nameRaw = entry.abilityName ?? entry.cardName ?? entry.attackName;
    const abilityName = nameRaw?.startsWith('ability.') || nameRaw?.startsWith('button.') ? l(nameRaw) : null;
    const cfgId = entry.configId ?? entry.cardId;
    const useCustomIcon = cfgId && ABILITY_CONFIG[cfgId]?.icon;
    const iconCls = entry.sourceClass ?? entry.attackerClass ?? entry.unitClass;
    return isAttackEntry ? (
        <div className="flex items-start gap-3">
            <div className="text-3xl">{useCustomIcon ? <AbilityIcon abilityId={cfgId} size={30} cls={iconCls} /> : entry.configId === 'torbellino' ? '🌪️' : '⚔️'}</div>
            <div>
                <div className="text-lg font-bold">{abilityName ?? l('button.basicAttack')}</div>
                <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    ) : isMoveEntry ? (
        <div className="flex items-start gap-3">
            <div className="text-3xl">{useCustomIcon ? <AbilityIcon abilityId={cfgId} size={30} /> : '👟'}</div>
            <div>
                <div className="text-lg font-bold">{abilityName ?? l('button.move')}</div>
                <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    ) : isSupportCard ? (
        <div className="flex items-start gap-3">
            <div className="text-3xl">{useCustomIcon ? <AbilityIcon abilityId={cfgId} size={30} /> : '✨'}</div>
            <div>
                <div className="text-lg font-bold">{abilityName ?? entry.cardName}</div>
                <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
            </div>
        </div>
    ) : (
        <div className="flex items-start gap-3">
            <div className="text-3xl">{useCustomIcon ? <AbilityIcon abilityId={cfgId} size={30} /> : '🃏'}</div>
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
