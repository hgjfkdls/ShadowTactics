import type { GameState } from '@shared/game/state';
import { l } from '@shared/i18n';
import { cls } from '../helpers';
import AuraResultInfo from './AuraResultInfo';

export function AttackResultDetail({ result, state }: { result: NonNullable<GameState['attackResults']>[number]; state: GameState }) {
    const attackerName = `[${result.attackerId}]${result.attackerClass === 'torbellino' ? l('ability.torbellino.name') : cls(result.attackerClass)}`;
    const targetName = result.targetId ? `[${result.targetId}]${cls(result.targetClass)}` : '';
    const isCritical = !result.noCritical && result.total >= 11;
    const dieFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
    const isAttackerGeneral = result.attackerClass === 'general';
    const isDefenderGeneral = result.targetClass === 'general';

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">⚔️</div>
                <div>
                    <div className="text-lg font-bold">{result.attackName ? (result.attackName.startsWith('ability.') || result.attackName.startsWith('button.') ? l(result.attackName) : result.attackName) : l('button.basicAttack')}</div>
                    <div className="text-xs text-zinc-500">{l('board.turnLabel')} {result.turn}{result.attackInTurn ? `.${result.attackInTurn}` : ''}</div>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400 font-semibold">{l('attackDetail.attacker')}</span>
                    <span className="text-zinc-200">{attackerName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400 font-semibold">{l('attackDetail.defender')}</span>
                    <span className="text-zinc-200">{targetName || '—'}</span>
                </div>
            </div>
            {(isAttackerGeneral || isDefenderGeneral) && <AuraResultInfo result={result} state={state} />}
            <div className="bg-panel-sub-bg border border-panel-sub-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{l('cat.diff')}</span>
                    <span className="text-zinc-200 font-semibold">{result.difficulty}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{l('attackDetail.dice')}</span>
                    <span className="text-zinc-200 font-semibold">
                        {dieFaces[result.die1] ?? result.die1} + {dieFaces[result.die2] ?? result.die2} = <span className="text-white">{result.total}</span>
                        {isCritical && <span className="text-yellow-400 ml-1">{l('attackDetail.critical')}</span>}
                    </span>
                </div>
            </div>
            <div className={[
                'rounded-lg p-3 space-y-1 text-xs',
                result.hit ? 'bg-hit-bg border border-hit-border' : 'bg-miss-bg border border-miss-border',
            ].join(' ')}>
                <div className="flex items-center justify-between">
                    <span className="font-semibold">{result.hit ? l('attackDetail.hit') : l('attackDetail.miss')}</span>
                    {result.hit && <span className="text-green-300 font-bold">-{result.damage} HP</span>}
                </div>
                {!result.hit && result.counterDamage > 0 && (
                    <div className="flex items-center justify-between text-red-300">
                        <span>{l('ui.counterDamage')}</span>
                        <span className="font-bold">-{result.counterDamage} HP</span>
                    </div>
                )}
                {result.hit && result.counterDamage > 0 && result.counterDamage !== 2 && (
                    <div className="flex items-center justify-between text-red-300">
                        <span>{l('attackDetail.counterattack')}</span>
                        <span className="font-bold">-{result.counterDamage} HP</span>
                    </div>
                )}
                {(result.targetKilled || result.attackerKilled) && (
                    <div className="text-yellow-400 font-semibold pt-1 border-t border-zinc-700 mt-1">
                        {result.targetKilled && l('attackDetail.targetKilled')}
                        {result.attackerKilled && ' ' + l('attackDetail.attackerKilled')}
                    </div>
                )}
            </div>
            {result.elapsed !== undefined && (
                <div className="text-[10px] text-zinc-600">
                    {l('attackDetail.time')}: {Math.floor(result.elapsed / 60)}:{(result.elapsed % 60).toString().padStart(2, '0')}
                </div>
            )}
        </div>
    );
}
