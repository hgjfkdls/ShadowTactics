import type { GameState } from '@shared';
import { l } from '@shared/i18n';
import { IDENTITY_INFO, getIdentityKey } from '../../../../../prep/identityData';
import { ABILITIES, CLASS_ABILITIES } from '@shared/game/data/abilities';
import { IDENTITY_EFFECTS } from '@shared/game/data/identities';
import { AbilityList } from '../units/AbilityList';

const cls = (c: string) => l(`unit.class.${c}`) || c;

const CLASS_COLORS: Record<string, string> = {
    archer: 'text-class-archer', infantry: 'text-class-infantry', cavalry: 'text-class-cavalry', lancer: 'text-class-lancer', general: 'text-class-general',
};

export default function IdentityDetail({ state, targetPlayerId, myPlayerId }: { state: GameState; targetPlayerId: string; myPlayerId: string }) {
    const identityCardId = state.players[targetPlayerId]?.selectedIdentity;
    if (!identityCardId) return <div className="text-xs text-zinc-500">{l('identity.noIdentity')}</div>;

    const key = getIdentityKey(identityCardId);
    const info = IDENTITY_INFO[key];
    if (!info) return <div className="text-xs text-zinc-500">{l('identity.unknown')}</div>;

    const isMine = targetPlayerId === myPlayerId;
    const unitCount = Object.values(state.units).filter(u => u.owner === targetPlayerId).length;
    const iName = l(`identity.${key}.name`) || info.name;
    const iClass = l(`identity.${key}.className`) || info.className;

    const verbose = (() => { const t = l(`identity.${key}.descVerbose`); return t && t !== `identity.${key}.descVerbose` ? t : info.descVerbose; })();
    const sections = verbose.split('\n\n').filter((s: string) => s.trim());
    const flavor = sections[0] ?? '';
    const abilitySections = sections.slice(1);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">🛡️</div>
                <div>
                    <div className="text-lg font-bold">{iName}</div>
                    <div className={`text-sm font-semibold ${CLASS_COLORS[identityCardId.includes('robin') || identityCardId.includes('franco') ? 'archer' : 'infantry']}`}>
                        {iClass}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-player1' : 'text-player2'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                    </div>
                </div>
            </div>

            <div className="text-xs text-zinc-400">
                {l('identity.units', { count: unitCount })}
            </div>

            {flavor && (
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">{l('identity.description')}</div>
                    <div className="text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3 leading-relaxed italic">
                        {flavor}
                    </div>
                </div>
            )}

            {abilitySections.length > 0 && (
                <div className="space-y-2">
                    {abilitySections.map((section: string, i: number) => {
                        const lines = section.split('\n');
                        const header = lines[0] ?? '';
                        const desc = lines.slice(1).join(' ').trim();
                        const isEspecial = header.startsWith('Especial');
                        return (
                            <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[9px] font-mono text-zinc-500">👑</span>
                                    <span className="font-semibold text-zinc-200">{header}</span>
                                </div>
                                <div className="text-[11px] text-zinc-300 leading-relaxed">{desc}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
