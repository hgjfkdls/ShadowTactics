import type { GameState } from '@shared';
import { l } from '@shared/i18n';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';

function effectLines(entry: any): { text: string; color: string }[] {
    if (entry.cardId === 'plan_batalla') {
        const detail = entry.details ?? '';
        if (detail.startsWith('Avanzar')) return [{ text: `+1 ${l('cat.atk')}`, color: 'text-effect-atk' }];
        if (detail.startsWith('Reagruparse')) return [{ text: `+1 ${l('cat.def')}`, color: 'text-effect-def' }];
    }
    if (entry.cardId === 'liderar_tropas') {
        const bonus = entry.details?.split(' · ')[0] ?? '+1';
        return [{ text: `${bonus} ${l('cat.atk')}`, color: 'text-effect-atk' }];
    }
    if (entry.cardId === 'en_nombre_del_rey') {
        return [
            { text: `+2 ${l('cat.atk')}`, color: 'text-effect-atk' },
            { text: `${l('aura.shieldName')} +3 HP`, color: 'text-effect-def' },
        ];
    }
    if (entry.cardId === 'proteger') {
        return [{ text: `+1 ${l('cat.def')}`, color: 'text-effect-def' }];
    }
    if (entry.cardId === 'voz_de_mando') {
        return [
            { text: `+1 ${l('cat.atk')}`, color: 'text-effect-atk' },
            { text: `+1 ${l('cat.def')}`, color: 'text-effect-def' },
        ];
    }
    if (entry.cardId === 'robar_ricos') {
        return [{ text: '+1 HP', color: 'text-effect-heal' }];
    }
    if (entry.cardId === 'sacrificar') {
        return [{ text: '-2 HP', color: 'text-effect-dmg' }];
    }
    if (entry.cardId === 'rayo_celestial') {
        return [{ text: `+${entry.details?.match(/\+(\d+)/)?.[1] ?? '3'} ${l('cat.atk')}`, color: 'text-effect-atk' }];
    }
    if (entry.cardId === 'lanza_escudo') {
        const isRange = entry.details?.includes('rango');
        return isRange ? [{ text: `+1 ${l('cat.range')}`, color: 'text-effect-range' }] : [{ text: `+1 ${l('cat.def')}`, color: 'text-effect-def' }];
    }
    if (entry.cardId === 'angel_guardian') {
        const lines = [{ text: `${l('aura.shieldName')} +2 HP`, color: 'text-effect-def' }];
        const healMatch = entry.details?.match(/\+1 HP a \[(\w+)\]/);
        if (healMatch) lines.push({ text: `+1 HP [${healMatch[1]}]`, color: 'text-effect-heal' });
        return lines;
    }
    // Generic config-driven display: read effects from config
    const cfg = entry.configId ? ABILITY_CONFIG[entry.configId] : ABILITY_CONFIG[entry.cardId];
    if (cfg?.effects) {
        const lines: { text: string; color: string }[] = [];
        for (const e of cfg.effects) {
            if (e.activation?.turnStart || e.timing === 'turnStart') continue; // Turn-start passives not applied on use
            if (e.type === 'stateChange' && e.healType === 'hp') lines.push({ text: `+${e.value ?? 3} HP`, color: 'text-effect-heal' });
            else if (e.type === 'shield') lines.push({ text: `${l('aura.shieldName')} +${e.value ?? 2} HP`, color: 'text-effect-def' });
            else if (e.type === 'heal') lines.push({ text: `+${e.value ?? 1} HP`, color: 'text-effect-heal' });
            else if (e.type === 'attack') lines.push({ text: `+${e.value ?? 1} ${l('cat.atk')}`, color: 'text-effect-atk' });
            else if (e.type === 'defense') lines.push({ text: `+${e.value ?? 1} ${l('cat.def')}`, color: 'text-effect-def' });
            else if (e.type === 'buff') lines.push({ text: `+${e.value ?? 1}`, color: 'text-effect-atk' });
        }
        if (lines.length > 0) return lines;
    }
    return [{ text: '?', color: 'text-effect-diff' }];
}

export default function PanelUnitsAffected({ entry, state }: { entry: any; state: GameState }) {
    const cls2 = (c: string) => l(`unit.class.${c}`) ?? c;
    return (
        <div className="bg-panel-sub-bg border border-panel-sub-border rounded-lg p-3 space-y-1.5 text-sm">
            <div className="text-xs font-semibold text-panel-title uppercase tracking-wide mb-1">{l('cardDetail.unitsAffected')}</div>
            {(() => {
                type Row = { id: string; clsName: string; lines: { text: string; color: string }[]; isCounter?: boolean; owner?: string };
                const rows: Row[] = [];

                const hasEnemiesHit = (entry.enemiesHit?.length ?? 0) > 0;
                const hasAlliesHit = (entry.alliesHit?.length ?? 0) > 0;

                if (entry.hit !== undefined && (hasEnemiesHit || hasAlliesHit)) {
                    // AoE entries (torbellino, etc.): list each unit individually
                    const dmgPerUnit = entry.hit && entry.damage > 0 ? Math.floor(entry.damage / ((entry.enemiesHit?.length ?? 0) + (entry.alliesHit?.length ?? 0) || 1)) : (!entry.hit && entry.damage > 0 ? 1 : 0);
                    for (const eid of (entry.enemiesHit ?? [])) {
                        const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === eid);
                        rows.push({ id: eid, clsName: u ? cls2(u.class) : '?', lines: [{ text: dmgPerUnit > 0 ? `-${dmgPerUnit} HP` : '?', color: 'text-effect-dmg' }], owner: u?.owner });
                    }
                    for (const aid of (entry.alliesHit ?? [])) {
                        const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === aid);
                        rows.push({ id: aid, clsName: u ? cls2(u.class) : '?', lines: [{ text: dmgPerUnit > 0 ? `-${dmgPerUnit} HP` : '?', color: 'text-effect-dmg' }], owner: u?.owner });
                    }
                } else if (entry.hit !== undefined) {
                    // Single-target hits/misses
                    if (!entry.hit && entry.counterDamage > 0) {
                        const a = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === entry.attackerId);
                        rows.push({ id: entry.attackerId, clsName: a ? cls2(a.class) : cls2(entry.attackerClass), lines: [{ text: `-${entry.counterDamage} HP`, color: 'text-effect-dmg' }], isCounter: true, owner: a?.owner });
                    }
                    if (entry.hit && entry.damage > 0) {
                        const d = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === entry.targetId);
                        rows.push({ id: entry.targetId, clsName: d ? cls2(d.class) : cls2(entry.targetClass), lines: [{ text: `-${entry.damage} HP`, color: 'text-effect-dmg' }], isCounter: false, owner: d?.owner });
                    }
                } else {
                    // Card effects with per-unit lines (plan_batalla, sacrificar, etc.)
                    for (const eid of (entry.enemiesHit ?? [])) {
                        const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === eid);
                        rows.push({ id: eid, clsName: u ? cls2(u.class) : '?', lines: effectLines(entry), owner: u?.owner });
                    }
                    for (const aid of (entry.alliesHit ?? [])) {
                        const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === aid);
                        if (entry.cardId === 'sacrificar' && aid === entry.targetId) {
                            rows.push({ id: aid, clsName: u ? cls2(u.class) : '?', lines: [{ text: '-2 HP', color: 'text-effect-dmg' }], owner: u?.owner });
                        } else if (entry.cardId === 'sacrificar') {
                            const heal = entry.details?.includes('+5') ? 5 : 3;
                            rows.push({ id: aid, clsName: u ? cls2(u.class) : '?', lines: [{ text: `+${heal} HP`, color: 'text-effect-heal' }], owner: u?.owner });
                        } else {
                            rows.push({ id: aid, clsName: u ? cls2(u.class) : '?', lines: effectLines(entry), owner: u?.owner });
                        }
                    }
                    if (rows.length === 0 && entry.targetId) {
                        const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === entry.targetId);
                        rows.push({ id: entry.targetId, clsName: u ? cls2(u.class) : cls2(entry.targetClass), lines: effectLines(entry), owner: u?.owner });
                    }
                }

                return rows.map(r => {
                    const ownerCls = r.owner === 'p1' ? 'text-player1' : r.owner === 'p2' ? 'text-player2' : 'text-zinc-300';
                    const inner = (
                        <div className="flex items-start justify-between gap-3">
                            <span className={ownerCls}>[{r.id}] {r.clsName}</span>
                            <div className="space-y-0.5 text-right">
                                {r.lines.map((l, i) => (
                                    <div key={i} className={`${entry.hit !== undefined ? 'font-bold' : ''} ${l.color}`}>{l.text}</div>
                                ))}
                            </div>
                        </div>
                    );
                    if (entry.hit !== undefined) {
                        const cardCls = r.isCounter ? 'bg-miss-bg border border-miss-border' : (entry.hit ? 'bg-hit-bg border border-hit-border' : 'bg-miss-bg border border-miss-border');
                        return <div key={r.id} className={`rounded-lg p-3 mt-0.5 ${cardCls}`}>{inner}</div>;
                    }
                    return <div key={r.id}>{inner}</div>;
                });
            })()}
        </div>
    );
}
