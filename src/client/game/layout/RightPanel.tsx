import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, GameAction, Unit, ModifierInstance } from '@shared';
import { IDENTITY_INFO, getIdentityKey } from '../../prep/identityData';
import { ABILITIES, CLASS_ABILITIES } from '@shared/game/data/abilities';
import { IDENTITY_EFFECTS } from '@shared/game/data/identities';
import { BASE_STATS } from '@shared/game/units';
import { getCardName, getCardType, getCardDescription, getCardDescriptionBySourceName } from '@shared/game/actions/card';
import { getAuraBuffs, AURA_CONFIG } from '@shared/game/aura';
import { l } from '@shared/i18n';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number } | { type: 'attackResult'; resultIndex: number } | { type: 'historyAttack'; entry: any } | { type: 'historyMove'; entry: any } | { type: 'historyCard'; entry: any } | null;

type Props = {
    state: GameState;
    playerId: string;
    selectedInfo: SelectedInfo;
    sendAction?: (action: GameAction) => void;
    children?: React.ReactNode;
};

function cls(cls: string): string { return l(`unit.class.${cls}`) || cls; }

const CLASS_COLORS: Record<string, string> = {
    archer: 'text-amber-400', infantry: 'text-blue-400', cavalry: 'text-violet-400', lancer: 'text-red-400', general: 'text-yellow-300',
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
            return <CardDetail cardId={selectedInfo.cardId} />;
        }
        if (selectedInfo?.type === 'effect') {
            return <EffectDetail stat={selectedInfo.stat} label={selectedInfo.label} description={selectedInfo.description} source={selectedInfo.source} sourceName={selectedInfo.sourceName} value={selectedInfo.value} />;
        }
        if (selectedInfo?.type === 'attackResult') {
            const r = state.attackResults?.[selectedInfo.resultIndex];
            if (!r) return null;
            return <AttackResultDetail result={r} state={state} />;
        }
        if (selectedInfo?.type === 'historyAttack') {
            return <HistoryAttackDetail entry={selectedInfo.entry} state={state} />;
        }
        if (selectedInfo?.type === 'historyMove') {
            return <HistoryMoveDetail entry={selectedInfo.entry} />;
        }
        if (selectedInfo?.type === 'historyCard') {
            return <HistoryCardDetail entry={selectedInfo.entry} />;
        }
        return null;
    }

    return (
        <aside className="h-full border-l border-zinc-700 flex flex-col overflow-hidden bg-zinc-900/80">
            <div className="border-b border-zinc-700 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
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

function IdentityDetail({ state, targetPlayerId, myPlayerId }: { state: GameState; targetPlayerId: string; myPlayerId: string }) {
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
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-blue-400' : 'text-red-400'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                    </div>
                </div>
            </div>

            <div className="text-xs text-zinc-400">
                {l('identity.units', { count: unitCount })}
            </div>

            {/* Reseña */}
            {flavor && (
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('identity.description')}</div>
                    <div className="text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3 leading-relaxed italic">
                        {flavor}
                    </div>
                </div>
            )}

            {/* Habilidades (Especial + Global) */}
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

function CardDetail({ cardId }: { cardId: string }) {
    const ctype = getCardType(cardId);

    const TYPE_COLORS: Record<string, string> = {
        BUFF: 'text-emerald-400 border-emerald-700',
        DEBUFF: 'text-red-400 border-red-700',
        COUNTER: 'text-violet-400 border-violet-700',
    };

    const TYPE_BG: Record<string, string> = {
        BUFF: 'bg-emerald-900/20',
        DEBUFF: 'bg-red-900/20',
        COUNTER: 'bg-violet-900/20',
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">🃏</div>
                <div>
                    <div className="text-lg font-bold">{getCardName(cardId)}</div>
                    <div className={['text-xs font-semibold', ctype ? TYPE_COLORS[ctype]?.split(' ')[0] : 'text-zinc-400'].join(' ')}>
                        {l(`cardType.${ctype}`) || ctype || '?'}
                    </div>
                </div>
            </div>

            <div className={['rounded-lg border p-3 text-xs text-zinc-300 leading-relaxed', ctype ? TYPE_BG[ctype] ?? '' : 'bg-zinc-800/30 border-zinc-700'].join(' ')}>
                {getCardDescription(cardId) || getCardName(cardId)}
            </div>
        </div>
    );
}

function AuraBox({ state, playerId }: { state: GameState; playerId: string }) {
    const ab = getAuraBuffs(state, playerId);
    const boxRef = useRef<HTMLDivElement>(null);
    const [showTip, setShowTip] = useState(false);
    const items = [
        { key: 'shieldPoints', name: l('aura.shieldName'), value: ab.shieldPoints, color: 'text-blue-400', desc: l('aura.shieldDesc') },
        { key: 'defenseBonus', name: l('aura.defenseName'), value: ab.defenseBonus, color: 'text-blue-400', desc: l('aura.defenseDesc') },
        { key: 'difficultyPenalty', name: l('aura.evasionName'), value: ab.difficultyPenalty, color: 'text-violet-400', desc: l('aura.evasionDesc') },
        { key: 'difficultyReduction', name: l('aura.precisionName'), value: ab.difficultyReduction, color: 'text-amber-400', desc: l('aura.precisionDesc') },
    ];
    return (
        <div ref={boxRef} className="bg-zinc-800/40 border border-zinc-700/60 rounded-lg p-2.5 cursor-help" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{l('aura.title')}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {items.map(item => (
                    <div key={item.key} className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${item.color}`}>{item.name}</span>
                        <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                ))}
            </div>
            {showTip && boxRef.current && createPortal(
                <div className="fixed z-[100] bg-zinc-900 border border-zinc-600 rounded-lg p-2.5 space-y-1.5 shadow-xl" style={{
                    right: window.innerWidth - boxRef.current.getBoundingClientRect().left + 8 + 'px',
                    top: boxRef.current.getBoundingClientRect().top - 10 + 'px',
                    width: '200px',
                }}>
                    {items.map(item => (
                        <div key={item.key} className="text-[10px] leading-relaxed">
                            <span className={`font-semibold ${item.color}`}>{item.name}</span>
                            <span className="text-zinc-300"> — {item.desc}</span>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

function AuraResultInfo({ result, state }: { result: { attackerId?: string; attackerClass: string; targetId?: string; targetClass: string }; state: GameState }) {
    const lines: { text: string; color: string }[] = [];
    const atkUnit = result.attackerId ? (state.units[result.attackerId] ?? state.graveyard[result.attackerId]) : undefined;
    const defUnit = result.targetId ? (state.units[result.targetId] ?? state.graveyard[result.targetId]) : undefined;

    if (result.attackerClass === 'general' && atkUnit) {
        const ab = getAuraBuffs(state, atkUnit.owner);
        if (ab.difficultyReduction > 0) lines.push({ text: l('aura.precision', { n: ab.difficultyReduction }), color: 'text-amber-400' });
    }
    if (result.targetClass === 'general' && defUnit) {
        const ab = getAuraBuffs(state, defUnit.owner);
        if (ab.difficultyPenalty > 0) lines.push({ text: l('aura.evasion', { n: ab.difficultyPenalty }), color: 'text-violet-400' });
        if (ab.defenseBonus > 0) lines.push({ text: l('aura.defense', { n: ab.defenseBonus }), color: 'text-blue-400' });
        if (ab.shieldPoints > 0 && defUnit && (defUnit.auraShield ?? 0) > 0) lines.push({ text: l('aura.shieldActive', { n: defUnit.auraShield ?? 0 }), color: 'text-blue-400' });
    }
    if (lines.length === 0) return null;
    return (
        <div className="space-y-0.5">
            {lines.map((l, i) => (
                <div key={i} className={`text-[10px] ${l.color} font-semibold`}>{l.text}</div>
            ))}
        </div>
    );
}

function AttackResultDetail({ result, state }: { result: NonNullable<GameState['attackResults']>[number]; state: GameState }) {
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

            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-2">
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
                result.hit ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50',
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

function HistoryAttackDetail({ entry, state }: { entry: any; state: GameState }) {
    const isCritical = !entry.noCritical && entry.total >= 11;
    const dieFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    const showCounterOnHit = entry.hit && entry.counterDamage > 0 && entry.counterDamage !== 2;
    const showCounterOnMiss = !entry.hit && entry.counterDamage > 0;

    // Extract difficulty formula from modifiers
    const diffFormulaIdx = (entry.modifiers ?? []).findIndex((m: string) => m.startsWith('Dificultad:'));
    const diffFormula = diffFormulaIdx >= 0 ? entry.modifiers[diffFormulaIdx] : null;
    const rawMods = (entry.modifiers ?? []).filter((_: string, i: number) => i !== diffFormulaIdx);

    // Build flat list of all non-formula modifiers with letters
    interface ModItem { letter: string; text: string; color?: string }
    const modItems: ModItem[] = [];
    let letterIdx = 0;
    const nextLetter = () => String.fromCharCode(97 + letterIdx++); // a, b, c...

    // Aura lines (inserted as modifiers too)
    if (entry.attackerClass === 'general' || entry.targetClass === 'general') {
        const atkUnit = entry.attackerId ? (state.units[entry.attackerId] ?? state.graveyard[entry.attackerId]) : undefined;
        const defUnit = entry.targetId ? (state.units[entry.targetId] ?? state.graveyard[entry.targetId]) : undefined;
        if (entry.attackerClass === 'general' && atkUnit) {
            const ab = getAuraBuffs(state, atkUnit.owner);
            if (ab.difficultyReduction > 0) modItems.push({ letter: nextLetter(), text: l('aura.precision', { n: ab.difficultyReduction }), color: 'text-amber-400' });
        }
        if (entry.targetClass === 'general' && defUnit) {
            const ab = getAuraBuffs(state, defUnit.owner);
            if (ab.difficultyPenalty > 0) modItems.push({ letter: nextLetter(), text: l('aura.evasion', { n: ab.difficultyPenalty }), color: 'text-violet-400' });
            if (ab.defenseBonus > 0) modItems.push({ letter: nextLetter(), text: l('aura.defense', { n: ab.defenseBonus }), color: 'text-blue-400' });
            if (ab.shieldPoints > 0 && defUnit && (defUnit.auraShield ?? 0) > 0) modItems.push({ letter: nextLetter(), text: l('aura.shieldActive', { n: defUnit.auraShield ?? 0 }), color: 'text-blue-400' });
        }
    }

    // Also add aura to catMap for categorized display (keep category grouping)
    const catLabels: Record<string, string> = { diff: l('cat.diff'), atk: l('cat.atk'), range: l('cat.range'), def: l('cat.def'), pa: l('cat.pa'), cost: l('cat.pa'), mixed: l('cat.mixed') };
    const catColors: Record<string, string> = { diff: 'text-amber-400', atk: 'text-red-400', range: 'text-cyan-400', def: 'text-blue-400', pa: 'text-yellow-400', cost: 'text-yellow-400' };
    const grouped: { cat: string; items: { letter: string; text: string }[] }[] = [];
    const catOrder = ['diff', 'atk', 'range', 'def', 'pa', 'cost', 'mixed'];
    const catMap = new Map<string, { letter: string; text: string }[]>();
    for (const m of rawMods) {
        const match = m.match(/^\[(\w+)\]\s*/);
        const l = nextLetter();
        if (match) {
            const cat = match[1];
            const text = m.slice(match[0].length);  // raw text includes [id:xxx] for ability matching
            if (!catMap.has(cat)) catMap.set(cat, []);
            catMap.get(cat)!.push({ letter: l, text });
        } else {
            if (!catMap.has('other')) catMap.set('other', []);
            catMap.get('other')!.push({ letter: l, text: m });
        }
    }
    for (const cat of catOrder) {
        if (catMap.has(cat)) grouped.push({ cat, items: catMap.get(cat)! });
    }
    if (catMap.has('other')) grouped.push({ cat: 'other', items: catMap.get('other')! });

    // Collect all flat items for display (aura + categorized)
    const allItems: ModItem[] = [...modItems];
    for (const g of grouped) {
        for (const item of g.items) {
            allItems.push(item);
        }
    }

    // Generic resolver for [ignores:...] tags: find modifiers that nullify others
    // Build a map of [id:xxx] -> letters for all items, then resolve ignores references
    const idToLetters = new Map<string, string[]>();
    for (const item of allItems) {
        const idMatch = item.text.match(/\[id:(\w+)\]/);
        if (idMatch) {
            if (!idToLetters.has(idMatch[1])) idToLetters.set(idMatch[1], []);
            idToLetters.get(idMatch[1])!.push(item.letter);
        }
    }
    const ignoredLetters = new Set<string>();
    for (const item of allItems) {
        const ignoresMatch = item.text.match(/\[ignores:([\w,]+)\]/);
        if (ignoresMatch) {
            for (const ignoredId of ignoresMatch[1].split(',')) {
                const letters = idToLetters.get(ignoredId);
                if (letters) letters.forEach(l => ignoredLetters.add(l));
            }
        }
    }

    // Strip embedded [id:xxx] and [ignores:xxx] tags from display text,
    // then translate ability names using the [id:xxx] reference
    const MODIFIER_TRANSLATIONS: Record<string, string> = {
        ataque: l('cat.atk').toLowerCase(),
        atk: l('cat.atk').toLowerCase(),
        defensa: l('cat.def').toLowerCase(),
        def: l('cat.def').toLowerCase(),
        dificultad: l('cat.diff').toLowerCase(),
        diff: l('cat.diff').toLowerCase(),
        daño: l('cat.diff').toLowerCase() === 'difficulty' ? 'dmg' : 'daño',
        'Línea defensiva': l('ability.linea_defensiva.name'),
        'Resistencia': l('ability.resistencia.name'),
        'Contraataque': l('ability.contraataque.name'),
    };
    const PHRASE_TRANSLATIONS: Record<string, string> = {
        'ignora Línea defensiva': l('ui.combat.romperFilas.ignoreLineaDef'),
        'ignora Resistencia': l('ui.combat.romperFilas.ignoreResistencia'),
        'anula Carga': l('ui.combat.formacionDefensiva.anulaCarga'),
        'Liderar a las tropas': l('ability.liderar_tropas.name'),
        'Coste ataque': l('cat.pa') + ' ataque',
        'Coste acción': l('cat.pa') + ' acción',
        'Bonificación rango': l('cat.range') + ' bonus',
        'Avanzar': l('planBatalla.attack'),
        'Reagruparse': l('planBatalla.defense'),
        '+1 daño': '+1 daño',  // fallback
    };
    for (const item of allItems) {
        const rawText = item.text;
        item.text = item.text.replace(/\[(?:id|ignores):[\w,]+\]\s*/g, '');
        // If we stripped an [id:xxx] tag, try to translate the ability name
        const idMatch = rawText.match(/\[id:(\w+)\]/);
        if (idMatch) {
            const translated = l(`ability.${idMatch[1]}.name`);
            if (translated && translated !== `ability.${idMatch[1]}.name`) {
                // Replace the first word (the ability name) with the translation
                const colonIdx = item.text.indexOf(':');
                if (colonIdx > 0) {
                    const rest = item.text.slice(colonIdx);
                    item.text = translated + rest;
                }
            }
        }
        // Translate stat names in the modifier text
        const statPart = item.text.match(/:\s*([+-]?\d+)\s+(\w+)/);
        if (statPart) {
            const translatedStat = MODIFIER_TRANSLATIONS[statPart[2]];
            if (translatedStat) {
                item.text = item.text.replace(statPart[0], `: ${statPart[1]} ${translatedStat}`);
            }
        }
        // Translate known phrases (ignora, anula, etc.)
        for (const [phrase, translation] of Object.entries(PHRASE_TRANSLATIONS)) {
            if (item.text.includes(phrase) && translation !== phrase) {
                item.text = item.text.replace(phrase, translation);
            }
        }
    }

    // Add critical as a modifier only if damage was actually increased
    const critApplied = isCritical;
    if (critApplied) {
        allItems.push({ letter: String.fromCharCode(97 + allItems.length), text: l('ui.criticalDamage'), color: 'text-yellow-400' });
    }

    // Build formula references by category
    const diffModLetters = [...modItems.filter(m => m.text.includes('dificultad') || m.text.includes('difficulty')), ...(catMap.get('diff') ?? [])].map(m => m.letter).filter(l => l && !ignoredLetters.has(l));
    const rangeModLetters = [...(catMap.get('range') ?? [])].map(m => m.letter);
    const paModLetters = [...(catMap.get('pa') ?? [])].map(m => m.letter);
    const rangeStats: Record<string, number> = { archer: 3, infantry: 1, cavalry: 1, lancer: 1, general: 1 };
    const baseRange = entry.attackerClass ? (rangeStats[entry.attackerClass] ?? 1) : 0;
    const hasRangeBonus = rangeModLetters.length > 0 && baseRange > 0;
    const finalRange = hasRangeBonus ? baseRange + rangeModLetters.length : baseRange;

    const diffFormulaRef = diffFormula
        ? (() => {
            const base = diffFormula.replace('Dificultad: ', '');
            const hasDiff = /,?\s*[+-]?\d+\s*=\s*\d+/.test(base);
            if (!hasDiff && diffModLetters.length === 0) return base;
            if (hasDiff) {
                return base.replace(/,?\s*[+-]?\d+\s*=\s*\d+/, () => {
                    if (diffModLetters.length === 0) return ` = ${entry.difficulty}`;
                    const signs = diffModLetters.map(l => {
                        const item = modItems.concat(...grouped.map(g => g.items)).find(i => i.letter === l);
                        const text = item?.text ?? '';
                        const signMatch = text.match(/([+-])\s*\d/);
                        const effectiveSign = signMatch ? signMatch[1] : (text.includes('Penalty') || text.includes('Evasión') ? '+' : '-');
                        return effectiveSign + l;
                    });
                    return ', ' + signs.join(' ') + ' = ' + entry.difficulty;
                });
            }
            return base + ' ' + diffModLetters.map(l => `+${l}`).join(' ') + ' → ' + entry.difficulty;
        })()
        : null;

    // Build damage formula: atk buffs suman (+), def buffs restan (-)
    interface DmgLetter { letter: string; sign: string }
    const dmgLetters: DmgLetter[] = [
        ...(catMap.get('def') ?? []).map(m => ({ letter: m.letter, sign: '-' as const })),
        ...(catMap.get('atk') ?? []).map(m => {
            const signMatch = m.text.match(/([+-])\s*\d/);
            return { letter: m.letter, sign: (signMatch ? signMatch[1] : '+') as string };
        }),
        ...modItems.filter(m => m.text.includes('daño') || m.text.includes('damage')).map(m => {
            const text = m.text ?? '';
            const signMatch = text.match(/([+-])\s*\d/);
            return { letter: m.letter, sign: (signMatch ? signMatch[1] : '-') as string };
        }),
        ...modItems.filter(m => m.text.includes('defensa') || m.text.includes('defense')).map(m => ({
            letter: m.letter, sign: '-' as const,
        })),
        ...(critApplied ? [{ letter: allItems.find(i => i.text.includes('Crítico') || i.text.includes('Critical'))?.letter ?? '', sign: '+' as const }] : []),
    ].filter(l => l.letter && !ignoredLetters.has(l.letter));
    // Raw damage (before clamping to minimum 1)
    const rawDamage = dmgLetters.reduce((sum, l) => {
        const item = allItems.find(i => i.letter === l.letter);
        const text = item?.text ?? '';
        const valueMatch = text.match(/([+-])\s*(\d+)/);
        const val = valueMatch ? parseInt(valueMatch[2]) : 0;
        return l.sign === '-' ? sum - val : sum + val;
    }, entry.baseAttack ?? 0);
    const dmgClamped = rawDamage !== entry.damage;
    const dmgFormula = dmgLetters.length > 0
        ? `${entry.baseAttack} ${dmgLetters.map(l => `${l.sign}${l.letter}`).join(' ')} = ${rawDamage}`
        : null;

    // Support abilities - detect by configId or attackName
    if (entry.configId === 'angel_guardian' || entry.attackName === 'Ángel Guardián' || entry.configId === 'proteger' || entry.attackName === 'Proteger') {
        const abDesc = entry.configId ? l(`ability.${entry.configId}.desc`) : null;
        const effectLines: { text: string; color: string }[] = [];
        const isAngel = entry.configId === 'angel_guardian' || entry.attackName === 'Ángel Guardián';
        if (isAngel) {
            effectLines.push({ text: `🛡 ${l('aura.shieldName')} +2 HP a ${entry.shieldedCount} aliados`, color: 'text-blue-400' });
            if (entry.healedId) {
                effectLines.push({ text: `💚 [${entry.healedId}] ${l(`unit.class.${entry.targetClass}`) ?? entry.targetClass} +1 HP`, color: 'text-green-400' });
            }
        } else {
            effectLines.push({ text: `🛡 [${entry.targetId}] ${l(`unit.class.${entry.targetClass}`) ?? entry.targetClass} +1 ${l('cat.def')}`, color: 'text-blue-400' });
        }
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="text-3xl">✨</div>
                    <div>
                        <div className="text-lg font-bold">{entry.attackName?.startsWith('ability.') || entry.attackName?.startsWith('button.') ? l(entry.attackName) : entry.attackName}</div>
                        <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400 font-semibold">{l('cardDetail.source')}</span>
                    <span className="text-zinc-200">[{entry.attackerId}]{cls(entry.attackerClass)} · {l('identity.escudo_comandante.name')}</span>
                </div>
                {abDesc && (<div className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 text-xs text-zinc-300 leading-relaxed">{abDesc}</div>)}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{l('attackDetail.paCost')}</span>
                    <span className="font-bold text-yellow-400">{entry.paCost ?? 0} PA</span>
                </div>
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">{l('cardDetail.effects')}</div>
                <div className="space-y-1">
                    {effectLines.map((line, i) => (
                        <div key={i} className={`${line.color} text-sm`}>{line.text}</div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Torbellino: panel especial ──
    if (entry.configId === 'torbellino') {
        const dieFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="text-3xl">🌪️</div>
                    <div>
                        <div className="text-lg font-bold">{entry.attackName?.startsWith('ability.') || entry.attackName?.startsWith('button.') ? l(entry.attackName) : entry.attackName}</div>
                        <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400 font-semibold">{l('attackDetail.attacker')}</span>
                    <span className="text-zinc-200">[{entry.attackerId}]{cls(entry.attackerClass)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{l('attackDetail.paCost')}</span>
                    <span className="font-bold text-yellow-400">{entry.paCost ?? 0} PA</span>
                </div>

                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.baseDamage')}</span>
                        <span className="text-zinc-200">2</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.baseDifficulty')}</span>
                        <span className="text-zinc-200">6</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.finalDifficulty')}</span>
                        <span className="text-zinc-200 font-semibold">{entry.difficulty}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.dice')}</span>
                        <span className="text-zinc-200 font-semibold">
                            {dieFaces[entry.die1] ?? entry.die1} + {dieFaces[entry.die2] ?? entry.die2} = <span className="text-white">{entry.total}</span>
                        </span>
                    </div>
                </div>

                <div className={`rounded-lg p-3 text-sm ${entry.hit ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50'}`}>
                    <span className="font-semibold">{entry.hit ? l('attackDetail.hit') : l('attackDetail.miss')}</span>
                </div>

                <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{l('cardDetail.effects')}</div>
                    {(() => {
                        const items: { text: string; color: string }[] = [];
                        if (entry.hit) {
                            for (const eid of (entry.enemiesHit ?? [])) {
                                const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === eid);
                                items.push({ text: `[${eid}] ${u ? cls(u.class) : '?'}`, color: 'text-green-400' });
                            }
                        } else {
                            for (const aid of (entry.alliesHit ?? [])) {
                                const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === aid);
                                items.push({ text: `[${aid}] ${u ? cls(u.class) : '?'}`, color: 'text-red-400' });
                            }
                            for (const eid of (entry.enemiesHit ?? [])) {
                                const u = Object.values(state.units).concat(Object.values(state.graveyard)).find(u => u.id === eid);
                                items.push({ text: `[${eid}] ${u ? cls(u.class) : '?'}`, color: 'text-green-400' });
                            }
                        }
                        return items.map((item, i) => (
                            <div key={i} className={`flex items-center justify-between ${item.color}`}>
                                <span>{item.text}</span>
                                <span className="font-bold">{entry.hit ? '-2' : '-1'} HP</span>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">⚔️</div>
                <div>
                    <div className="text-lg font-bold">{entry.attackName ? (entry.attackName.startsWith('ability.') || entry.attackName.startsWith('button.') ? l(entry.attackName) : entry.attackName) : l('button.basicAttack')}</div>
                    <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400 font-semibold">{l('attackDetail.attacker')}</span>
                    <span className="text-zinc-200">[{entry.attackerId}]{cls(entry.attackerClass)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-400 font-semibold">{l('attackDetail.defender')}</span>
                    {entry.configId === 'torbellino' ? (
                        <div className="text-xs leading-relaxed space-y-0.5">
                            {entry.hit ? (
                                <span className="text-green-400">{l('ui.torbellinoHit', { count: entry.hitEnemies ?? '?', ids: `[${(entry.enemiesHit ?? []).join('], [')}]` })}</span>
                            ) : (
                                <>
                                    <div className="text-red-400">{l('ui.torbellinoMissAllies', { count: entry.hitAllies ?? '?', ids: `[${(entry.alliesHit ?? []).join('], [')}]` })}</div>
                                    <div className="text-green-400">{l('ui.torbellinoMissEnemies', { count: entry.hitEnemies ?? '?', ids: `[${(entry.enemiesHit ?? []).join('], [')}]` })}</div>
                                </>
                            )}
                        </div>
                    ) : (
                        <span className="text-zinc-200">[{entry.targetId}]{cls(entry.targetClass)}</span>
                    )}
                </div>
            </div>

            {allItems.length > 0 && (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{l('attackDetail.modifiers')}</div>
                    {allItems.map((item, i) => (
                        <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-xs flex items-center gap-2">
                            <span className="text-zinc-300 font-bold text-sm w-5 text-right">{item.letter}.</span>
                            <span className={item.color ?? 'text-zinc-300'}>{item.text}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.paCost')}</span>
                    <span className="text-zinc-200 font-semibold">{entry.paCost ?? 1} PA</span>
                </div>
                {paModLetters.length > 0 && (
                    <div className="text-xs text-zinc-400 text-right">{entry.paCost} {paModLetters.map(l => `+${l}`).join(' ')}</div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.baseDamage')}</span>
                    <span className="text-zinc-200">{entry.baseAttack}</span>
                </div>
                {dmgFormula && (
                    <div className="text-xs text-zinc-400 text-right">{dmgFormula}</div>
                )}
                {dmgClamped && entry.hit && (
                    <div className="text-[10px] text-zinc-500 text-right">{l('board.minDamageNote')}</div>
                )}
                {entry.baseDifficulty > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.baseDifficulty')}</span>
                    <span className="text-zinc-200">{entry.baseDifficulty}</span>
                </div>
                )}
                {diffFormulaRef && (
                <div className="text-xs text-zinc-400 text-right leading-relaxed">{diffFormulaRef}</div>
                )}
                {entry.difficulty > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.finalDifficulty')}</span>
                    <span className="text-zinc-200 font-semibold">{entry.difficulty}</span>
                </div>
                )}
                {hasRangeBonus && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('board.range')}</span>
                        <span className="text-zinc-200">{baseRange}</span>
                    </div>
                    <div className="text-xs text-zinc-400 text-right">{baseRange} {rangeModLetters.map((l: string) => `+${l}`).join(' ')} = {finalRange}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('board.range')}</span>
                        <span className="text-zinc-200 font-semibold">{finalRange}</span>
                    </div>
                </>
                )}
                {entry.total > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.dice')}</span>
                    <span className="text-zinc-200 font-semibold">
                        {dieFaces[entry.die1] ?? entry.die1} + {dieFaces[entry.die2] ?? entry.die2} = <span className="text-white">{entry.total}</span>
                        {isCritical && <span className="text-yellow-400 ml-1">💥</span>}
                    </span>
                </div>
                )}
            </div>
            <div className={[
                'rounded-lg p-3 text-sm space-y-1',
                entry.hit ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50',
            ].join(' ')}>
                <div className="flex items-center justify-between">
                    <span className="font-semibold">{entry.hit ? l('attackDetail.hit') : l('attackDetail.miss')}</span>
                    {entry.hit && <span className="text-green-300 font-bold">-{entry.damage} HP{entry.total >= 11 ? ' 💥' : ''}</span>}
                </div>
                {entry.hit && entry.total >= 11 && (
                    <div className="text-yellow-400 text-[10px] font-bold">{l('attackDetail.critical')}</div>
                )}
                {showCounterOnMiss && (
                    <div className="flex items-center justify-between text-red-300">
                        <span>{l('attackDetail.counterattack')}</span>
                        <span className="font-bold">-{entry.counterDamage} HP</span>
                    </div>
                )}
                {showCounterOnHit && (
                    <div className="flex items-center justify-between text-red-300">
                        <span>{l('attackDetail.counterattack')}</span>
                        <span className="font-bold">-{entry.counterDamage} HP</span>
                    </div>
                )}
                {(entry.targetKilled || entry.attackerKilled) && (
                    <div className="text-yellow-400 font-semibold pt-1 border-t border-zinc-700 mt-1">
                        {entry.targetKilled && `⚫ ${l('attackDetail.targetKilled')}`}
                        {entry.attackerKilled && ` ⚫ ${l('attackDetail.attackerKilled')}`}
                    </div>
                )}
            </div>
        </div>
    );
}

function HistoryMoveDetail({ entry }: { entry: any }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">👟</div>
                <div>
                    <div className="text-lg font-bold">{l('button.move')}</div>
                    <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-400 font-semibold">{l('moveDetail.unit')}</span>
                    <span className="text-zinc-200">[{entry.unitId}]{cls(entry.unitClass)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">{l('moveDetail.origin')}</span>
                    <span className="text-zinc-200 font-mono">({entry.from.q}, {entry.from.r})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">{l('moveDetail.destination')}</span>
                    <span className="text-zinc-200 font-mono">({entry.to.q}, {entry.to.r})</span>
                </div>
            </div>
            {entry.modifiers && entry.modifiers.length > 0 && (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{l('moveDetail.modifiers')}</div>
                    <div className="space-y-1">
                        {entry.modifiers.map((m: string, i: number) => (
                            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300">{m}</div>
                        ))}
                    </div>
                </div>
            )}
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('moveDetail.baseCost')}</span>
                    <span className="text-zinc-200">{entry.baseCost} PA</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('moveDetail.finalCost')}</span>
                    <span className={entry.cost === 0 ? 'text-green-400 font-bold' : 'text-zinc-200 font-semibold'}>{entry.cost} PA</span>
                </div>
            </div>
        </div>
    );
}

function HistoryCardDetail({ entry }: { entry: any }) {
    const CARD_SUPPORT_DETAIL = new Set([
        'rayo_celestial', 'meditacion', 'en_nombre_del_rey', 'liderar_tropas',
        'lanza_escudo', 'voz_de_mando', 'plan_batalla', 'camino_guerrero', 'robar_ricos',
        'cabalgar', 'cabalgar_2', 'a_la_carga', 'posicion_estrategica',
        'angel_guardian', 'proteger', 'torbellino', 'sacrificar', 'desenvainado_veloz',
        'proyeccion',
    ]);
    if (CARD_SUPPORT_DETAIL.has(entry.cardId)) {
        const cls2 = (c: string) => l(`unit.class.${c}`) ?? c;
        const effectLines: { text: string; color: string }[] = [];
        if (entry.cardId === 'lanza_escudo') {
            const isRange = entry.details?.includes('rango');
            effectLines.push({ text: isRange ? `⚔ +1 ${l('cat.range')}` : `🛡 +1 ${l('cat.def')}`, color: isRange ? 'text-red-400' : 'text-blue-400' });
        } else if (entry.cardId === 'voz_de_mando') {
            effectLines.push({ text: `⚔ +1 ${l('cat.atk')}`, color: 'text-red-400' });
            effectLines.push({ text: `🛡 +1 ${l('cat.def')}`, color: 'text-blue-400' });
        } else if (entry.cardId === 'plan_batalla') {
            const isAtk = entry.details?.includes('Avanzar');
            effectLines.push({ text: isAtk ? `⚔ ${entry.details}` : `🛡 ${entry.details}`, color: isAtk ? 'text-red-400' : 'text-blue-400' });
        } else if (entry.cardId === 'camino_guerrero') {
            effectLines.push({ text: `⚔ +1 PA (${l('ui.killAtRange', { n: 1 })}`, color: 'text-yellow-400' });
        } else if (entry.cardId === 'robar_ricos') {
            effectLines.push({ text: `💚 [${entry.targetId}] ${cls2(entry.targetClass)} +1 HP`, color: 'text-green-400' });
        } else if (entry.cardId === 'posicion_estrategica') {
            effectLines.push({ text: `👟 ${entry.details}`, color: 'text-amber-400' });
        } else if (entry.cardId === 'cabalgar' || entry.cardId === 'a_la_carga') {
            const parts = (entry.details ?? '').split(' · ');
            effectLines.push({ text: `👟 ${parts[0] ?? ''}`, color: 'text-amber-400' });
            if (parts.length > 1) effectLines.push({ text: `  ${parts[1]}`, color: 'text-zinc-500' });
        } else if (entry.cardId === 'meditacion') {
            const healAmt = entry.healAmount ?? entry.details?.match(/(\d+)/)?.[1] ?? '?';
            effectLines.push({ text: `💚 General +${healAmt} HP`, color: 'text-green-400' });
        } else if (entry.cardId === 'liderar_tropas') {
            const bonus = entry.details?.match(/\+(\d+)/)?.[1] ?? '1';
            effectLines.push({ text: `⚔ ${l('unit.class.infantry')} +${bonus} ${l('cat.atk')}`, color: 'text-red-400' });
        } else if (entry.cardId === 'en_nombre_del_rey') {
            effectLines.push({ text: `🛡 [${entry.targetId}] ${cls2(entry.targetClass)} ${l('unit.status.royalShieldSavedHp')} +3 HP`, color: 'text-blue-400' });
            effectLines.push({ text: `⚔ [${entry.targetId}] ${cls2(entry.targetClass)} ${l('cat.atk')} +2`, color: 'text-red-400' });
        } else if (entry.cardId === 'rayo_celestial') {
            effectLines.push({ text: `⚔ [${entry.targetId}] ${cls2(entry.targetClass)} ${l('cat.atk')} +3`, color: 'text-red-400' });
        } else if (entry.cardId === 'angel_guardian') {
            const count = entry.details?.match(/(\d+)/)?.[1] ?? '?';
            effectLines.push({ text: `🛡️ ${l('aura.shieldName')} +2 HP a ${count} aliados`, color: 'text-blue-400' });
            if (entry.targetId) {
                effectLines.push({ text: `💚 [${entry.targetId}] +1 HP`, color: 'text-green-400' });
            }
        } else if (entry.cardId === 'proteger') {
            effectLines.push({ text: `🛡 [${entry.targetId}] ${cls2(entry.targetClass)} +1 ${l('cat.def')}`, color: 'text-blue-400' });
        } else if (entry.cardId === 'proyeccion') {
            const targets = (entry.details ?? '').split('|').filter(Boolean);
            for (const t of targets) {
                effectLines.push({ text: `⚔ ${t} -1 HP`, color: 'text-red-400' });
            }
        } else if (entry.details) {
            effectLines.push({ text: entry.details, color: 'text-zinc-300' });
        }
        const abDesc = l(`ability.${entry.cardId}.desc`);
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="text-3xl">✨</div>
                    <div>
                        <div className="text-lg font-bold">{entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : entry.cardName}</div>
                        <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                    </div>
                </div>
                {entry.sourceClass && (entry.sourceIdentity || entry.sourceIdentityKey) && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-blue-400 font-semibold">{l('cardDetail.source')}</span>
                        <span className="text-zinc-200">{cls2(entry.sourceClass)} · {entry.sourceIdentityKey ? l(`identity.${entry.sourceIdentityKey}.name`) || entry.sourceIdentityKey : entry.sourceIdentity}</span>
                    </div>
                )}
                <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 text-xs text-zinc-300 leading-relaxed">{abDesc}</div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{l('attackDetail.paCost')}</span>
                    <span className="font-bold text-yellow-400">{entry.paCost ?? 0} PA</span>
                </div>
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">{l('cardDetail.effects')}</div>
                <div className="space-y-1">
                    {effectLines.map((line, i) => (
                        <div key={i} className={`${line.color} text-sm`}>{line.text}</div>
                    ))}
                </div>
            </div>
        );
    }

    const isCounter = entry.cardType === 'COUNTER';
    return (
        <div className="space-y-4">
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
            <div className="space-y-1">
                {entry.targetId && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">{l('cardDetail.objective')}</span>
                        <span className="text-zinc-200">[{entry.targetId}]{entry.targetClass ? cls(entry.targetClass) : ''}</span>
                    </div>
                )}
                {entry.counterCardId && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-violet-400 font-semibold">{l('cardDetail.counters')}</span>
                        <span className="text-zinc-200">{nameForHistoryCard(entry.counterCardId)}</span>
                    </div>
                )}
            </div>
            {entry.counterCardId ? (() => {
                const desc = descForHistoryCard(entry.cardId) ?? descForHistoryCard(entry.counterCardId);
                const cdesc = descForHistoryCard(entry.counterCardId);
                const atkName = nameForHistoryCard(entry.cardId);
                const cName = nameForHistoryCard(entry.counterCardId);
                return (
                    <div className="space-y-3">
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                            <div className="text-zinc-400 text-[10px] mb-1">{l('cardDetail.playerPlays', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                            <div className="font-semibold text-zinc-200 mb-1">{cName}</div>
                            {cdesc && <div>{cdesc}</div>}
                        </div>
                        <div className="bg-violet-900/15 border border-violet-700/40 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                            <div className="text-violet-400 text-[10px] mb-1">{l('cardDetail.butOpponentCounters')}</div>
                            <div className="font-semibold text-violet-300 mb-1">{atkName}</div>
                            {desc && <div>{desc}</div>}
                        </div>
                    </div>
                );
            })() : (() => {
                const desc = descForHistoryCard(entry.cardId);
                const name = nameForHistoryCard(entry.cardId);
                return (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                        <div className="font-semibold text-zinc-200 mb-1">{name}</div>
                        {desc && <div>{desc}</div>}
                        {entry.details && <div className="text-zinc-400 mt-1 text-[10px]">{entry.details}</div>}
                    </div>
                );
            })()}
        </div>
    );
}

function EffectDetail({ stat, label, description, source, sourceName, value }: { stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number }) {
    const isDebuff = ['movementCost', 'difficulty', 'attackCost', 'actionCost', 'blocked', 'passiveDamage', 'movementPenalty'].includes(stat) || (stat === 'damage' && value !== undefined && value < 0);
    const cardDesc = source === 'card' && sourceName ? getCardDescriptionBySourceName(sourceName) : null;
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">{isDebuff ? '🔴' : '🟢'}</div>
                <div>
                    <div className="text-lg font-bold">{label}</div>
                    <div className={`text-xs font-semibold mt-1 ${isDebuff ? 'text-red-400' : 'text-green-400'}`}>
                        {isDebuff ? l('effect.negative') : l('effect.positive')}
                    </div>
                </div>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                {description}
                {source && sourceName && (
                    <div className="text-[10px] text-zinc-500 mt-1">({source}: {sourceName})</div>
                )}
                {cardDesc && (
                    <div className="text-[10px] text-zinc-400 mt-2 italic">{cardDesc}</div>
                )}
            </div>
        </div>
    );
}

function getProjectedPoolUnitInfo(
  cls: string,
  identityId: string | undefined
): { abilities: string[]; stats: { attack: number; hp: number; difficulty: number; range: number; movementCost: number } } {
  const baseAbilities = CLASS_ABILITIES[cls as keyof typeof CLASS_ABILITIES] ?? [];
  let abilities = [...baseAbilities];
  const base = BASE_STATS[cls as keyof typeof BASE_STATS];
  const stats = { attack: base.attack, hp: base.hp, difficulty: base.difficulty, range: base.range, movementCost: base.movementCost };

  if (!identityId) return { abilities, stats };

  const key = getIdentityKey(identityId);
  const effect = IDENTITY_EFFECTS[key];
  if (!effect) return { abilities, stats };

  if (cls === 'general') {
    const overrideAbilities = effect.abilitiesOverride ?? CLASS_ABILITIES[effect.unitClassOverride];
    abilities = [...overrideAbilities];
    if (effect.copyStats) {
      const overrideStats = BASE_STATS[effect.unitClassOverride];
      const toCopy = effect.statsToCopy ?? (['range', 'movementCost', 'difficulty'] as const);
      for (const s of toCopy) {
        stats[s] = overrideStats[s];
      }
    }
  }

  if (key === 'robin_hood' && (cls === 'archer' || cls === 'general')) {
    stats.movementCost = 1;
  }
  if (key === 'caballos_guerra' && cls === 'cavalry') {
    abilities = abilities.map(a => a === 'cabalgar' ? 'cabalgar_2' : a);
  }

  return { abilities, stats };
}

function UnitDetail({ state, unitId, myPlayerId }: { state: GameState; unitId: string; myPlayerId: string }) {

    // Try live unit, then graveyard, then pool (undeployed)
    const liveUnit = state.units[unitId];
    const deadUnit = !liveUnit ? Object.values(state.graveyard).find(u => u.id === unitId) : undefined;
    const poolEntry = (!liveUnit && !deadUnit)
        ? findPoolEntry(state, unitId)
        : undefined;

    if (!liveUnit && !deadUnit && !poolEntry) {
        return <div className="text-xs text-zinc-500">Unidad no encontrada</div>;
    }

    const unit = liveUnit ?? deadUnit;
    const isMine = unit ? unit.owner === myPlayerId : (poolEntry?.owner ?? '') === myPlayerId;
    const isAlive = !!liveUnit;
    const unitClass = unit?.class ?? poolEntry!.unitClass;
    const maxHp = getMaxHp(unitClass);
    const currentHp = unit?.hp ?? maxHp;

    const projected = poolEntry ? getProjectedPoolUnitInfo(
      unitClass,
      state.players[poolEntry.owner]?.selectedIdentity
    ) : null;

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">{poolEntry ? '📦' : isAlive ? '⚔️' : '💀'}</div>
                <div>
                    <div className={`text-lg font-bold ${CLASS_COLORS[unitClass]}`}>
                        {unit?.id ? `[${unit.id}]` : ''}{cls(unitClass)}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-blue-400' : 'text-red-400'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                        {poolEntry ? ' (Sin desplegar)' : !isAlive ? ' (Eliminada)' : ''}
                    </div>
                </div>
            </div>

            {/* Unit stats */}
            <div className="grid grid-cols-2 gap-2">
                <StatBox label={l('unitDetail.hp')} value={`${liveUnit ? currentHp + (liveUnit.auraShield ?? 0) : currentHp}/${maxHp}`} hp={liveUnit ? currentHp : undefined} shield={liveUnit ? (liveUnit.auraShield ?? 0) : 0} maxHp={maxHp} />
                <StatBox label={l('unitDetail.attack')} value={`${unit?.attack ?? projected?.stats.attack ?? 3}`} />
                <StatBox label={l('unitDetail.difficulty')} value={`${unit?.difficulty ?? projected?.stats.difficulty ?? 6}`} />
                <StatBox label={l('unitDetail.range')} value={`${unit?.range ?? projected?.stats.range ?? 1}`} />
                <StatBox label={l('unitDetail.movement')} value={`${unit?.movementCost ?? projected?.stats.movementCost ?? 1}`} />
            </div>

            {/* Aura buffs (general only) */}
            {liveUnit && liveUnit.class === 'general' && AURA_CONFIG.isActive && (
                <AuraBox state={state} playerId={liveUnit.owner} />
            )}

            {/* Active effects */}
            {liveUnit && (() => {
                const { buffs, debuffs } = getUnitStatus(liveUnit, state.activeModifiers);
                const all = [...buffs.map(s => ({ s, isDebuff: false })), ...debuffs.map(s => ({ s, isDebuff: true }))];
                if (all.length === 0) return null;
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('unitDetail.activeEffects')}</div>
                        <div className="space-y-1">
                            {all.map(({ s, isDebuff }) => (
                                <div key={s} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${isDebuff ? 'border-red-800/60 bg-red-900/15' : 'border-green-800/60 bg-green-900/15'}`}>
                                    <span>{isDebuff ? '🔴' : '🟢'}</span>
                                    <span className={`font-semibold ${isDebuff ? 'text-red-300' : 'text-green-300'}`}>
                                        {statusLabel(s)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {liveUnit && (
                <div className="text-xs text-zinc-500">
                    {l('unitDetail.position', { q: liveUnit.position.q, r: liveUnit.position.r })}
                    {liveUnit.movedThisTurn && <span className="ml-2 text-zinc-400">· {l('unitDetail.moved')}</span>}
                    {liveUnit.attackedThisTurn && <span className="ml-2 text-zinc-400">· {l('unitDetail.attacked')}</span>}
                </div>
            )}

            {/* Identity card abilities (general only) — special + global as cards */}
            {liveUnit && liveUnit.class === 'general' && (() => {
                const identityCardId = state.players[liveUnit.owner]?.selectedIdentity;
                if (!identityCardId) return null;
                const key = getIdentityKey(identityCardId);
                const identityInfo = IDENTITY_INFO[key];
                if (!identityInfo) return null;
                const verbose = (() => { const t = l(`identity.${key}.descVerbose`); return t && t !== `identity.${key}.descVerbose` ? t : identityInfo.descVerbose; })();
                const sections = verbose.split('\n\n').filter(s => s.trim());
                const abilitySections = sections.slice(1);
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('identity.cardLabel')} — {l(`identity.${key}.name`) || identityInfo.name}</div>
                        <div className="space-y-2">
                            {abilitySections.map((section, i) => {
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
                    </div>
                );
            })()}

            {/* Abilities with clickable names (collapsed by default for generals) */}
            {unit?.abilities && unit.abilities.length > 0 && (
                <AbilityList key={unit.id} abilities={unit.abilities} ownerPlayerId={unit.owner} startCollapsed={unit.class === 'general'} />
            )}
            {!unit && projected && projected.abilities.length > 0 && (
                <AbilityList abilities={projected.abilities} ownerPlayerId={poolEntry?.owner} startCollapsed={unitClass === 'general'} />
            )}

            {/* Identity abilities for general in pool */}
            {poolEntry && unitClass === 'general' && (() => {
              const identityCardId = state.players[poolEntry.owner]?.selectedIdentity;
              if (!identityCardId) return null;
              const key = getIdentityKey(identityCardId);
               const identityInfo = IDENTITY_INFO[key];
               if (!identityInfo) return null;
               const verbose = l(`identity.${key}.descVerbose`) || identityInfo.descVerbose;
               const sections = verbose.split('\n\n').filter(s => s.trim());
               const abilitySections = sections.slice(1);
               return (
                 <div className="space-y-1">
                   <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('identity.cardLabel')} — {l(`identity.${key}.name`) || identityInfo.name}</div>
                  <div className="space-y-2">
                    {abilitySections.map((section, i) => {
                      const lines = section.split('\n');
                      const header = lines[0] ?? '';
                      const desc = lines.slice(1).join(' ').trim();
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
                </div>
              );
            })()}

            {poolEntry && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-[10px] text-zinc-400">
                    Unidad en {l('ui.poolUnitDesc')}
                </div>
            )}
        </div>
    );
}

function AbilityList({ abilities, ownerPlayerId, startCollapsed }: { abilities: string[]; ownerPlayerId?: string; startCollapsed?: boolean }) {
    const [expanded, setExpanded] = useState<Set<string>>(() => startCollapsed ? new Set() : new Set(abilities));

    function toggleAbility(id: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    return (
        <div className="space-y-1">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('unitDetail.abilities')}</div>
            <div className="space-y-2">
                {abilities.map(abId => {
                    const ab = ABILITIES[abId];
                    if (!ab) return null;
                    const isOpen = expanded.has(abId);
                    let description = l(`ability.${abId}.desc`);
                    if (!description || description === `ability.${abId}.desc`) description = ab.description;
                    if (abId === 'blanco_facil' && ownerPlayerId?.startsWith('francotirador')) {
                        description = description.replace('-1', '-2');
                    }
                    return (
                        <div key={abId} className="border border-zinc-700 bg-zinc-800/50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs cursor-pointer select-none" onClick={() => toggleAbility(abId)}>
                                <span className="text-[9px] font-mono text-zinc-500">
                                    {ab.type === 'active' ? `⚡${ab.cost ?? '?'}PA` : '🔰'}
                                </span>
                                <span className="font-semibold text-zinc-200">{l(`ability.${abId}.name`) || ab.name}</span>
                                <span className="ml-auto text-zinc-600 text-[10px]">{isOpen ? '▼' : '▶'}</span>
                            </div>
                            {isOpen && (
                                <>
                                    <div className="text-[11px] text-zinc-300 leading-relaxed">{description}</div>
                                    {(() => {
                                        const tr = l(`ability.${abId}.restriction`);
                                        const restriction = (tr && tr !== `ability.${abId}.restriction`) ? tr : (ab.restrictions || '');
                                        if (!restriction) return null;
                                        return <div className="text-[10px] text-amber-400/80 italic">{restriction}</div>;
                                    })()}
                                    <div className="text-[9px] text-zinc-500">{ab.type === 'active' ? l('unitDetail.typeActive') : l('unitDetail.typePassive')}{ab.cost !== undefined ? ` · ${l('unitDetail.costLabel', { n: ab.cost })}` : ''}</div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function findPoolEntry(state: GameState, unitId: string): { owner: string; unitClass: string } | undefined {
    for (const [pid, p] of Object.entries(state.players)) {
        const entry = p.unitsToDeploy?.find(e => e.unitId === unitId);
        if (entry) return { owner: pid, unitClass: entry.unitClass };
    }
    return undefined;
}

function StatBox({ label, value, hp, shield, maxHp }: { label: string; value: string; hp?: number; shield?: number; maxHp?: number }) {
    const sh = shield ?? 0;
    const hasShield = sh > 0 && hp !== undefined && maxHp !== undefined;
    if (hasShield) {
        const total = hp! + sh;
        const hpWidth = (hp! / total) * 100;
        const colorClass = hp! > maxHp! * 0.5 ? 'bg-green-500' : hp! > maxHp! * 0.25 ? 'bg-yellow-500' : 'bg-red-500';
        return (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
                <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
                <div className="text-sm font-bold">{value}</div>
                <div className="w-full h-2 bg-zinc-700 rounded-full mt-1 overflow-hidden relative">
                    <div className="absolute h-full rounded-full bg-zinc-100/60" style={{ width: '100%' }} />
                    <div className={`absolute h-full rounded-full ${colorClass}`} style={{ width: `${hpWidth}%` }} />
                </div>
            </div>
        );
    }
    const bar = hp !== undefined && maxHp !== undefined ? Math.round((hp / maxHp) * 100) : undefined;
    return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
            <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
            <div className="text-sm font-bold">{value}</div>
            {bar !== undefined && (
                <div className="w-full h-2 bg-zinc-700 rounded-full mt-1 overflow-hidden relative">
                    <div className={`absolute h-full rounded-full ${bar > 50 ? 'bg-green-500' : bar > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${bar}%` }} />
                </div>
            )}
        </div>
    );
}

function descForHistoryCard(cardId: string): string | undefined {
    const cardDesc = getCardDescription(cardId);
    if (cardDesc) return cardDesc;
    const ab = ABILITIES[cardId];
    if (ab) {
        const translated = l(`ability.${cardId}.desc`);
        if (translated && translated !== `ability.${cardId}.desc`) return translated;
        return ab.description;
    }
    return undefined;
}

function nameForHistoryCard(cardId: string): string {
    const cardName = getCardName(cardId);
    if (cardName !== cardId) return cardName;
    const ab = ABILITIES[cardId];
    if (ab) {
        const translated = l(`ability.${cardId}.name`);
        if (translated && translated !== `ability.${cardId}.name`) return translated;
        return ab.name;
    }
    return cardId;
}

function getMaxHp(cls: string): number {
    return BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
}

function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];
    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'actionCost', 'bloqueo', 'inmovil'];
    const helpfulStats = ['attack', 'dotOnHit'];
    const passiveStats: string[] = [];
    for (const m of modifiers) {
        if (m.remainingTurns < 0) continue;
        if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
        const isUnitSpecific = m.targetId === unit.id;
        const isPlayerWide = !m.targetId && m.sourcePlayerId === unit.owner;
        if (!isUnitSpecific && !isPlayerWide) continue;
        const stat = m.stat;
        if (stat === 'movementCost' && m.value === 0 && m.operator === 'SET') {
            if (!buffs.includes(stat)) buffs.push(stat);
            continue;
        }
        if (stat === 'damage' && m.value < 0 && m.targetId) {
            continue;
        }
        if (stat === 'attack' && m.value > 0 && m.targetId) {
            continue;
        }
        if (stat === 'passiveDamage') {
            const label = `${l('unit.status.passiveDamage')} (${m.value} HP, ${m.remainingUses ?? '?'} turnos)`;
            if (!debuffs.includes(label)) debuffs.push(label);
            continue;
        }
        if (stat === 'damage') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else if (m.value < 0) { if (!debuffs.includes(stat)) debuffs.push(stat); }
            continue;
        }
        if (stat === 'attack') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else { if (!debuffs.includes(stat)) debuffs.push(stat); }
            continue;
        }
        if (stat === 'ap') continue;
        if (harmfulStats.includes(stat)) { if (!debuffs.includes(stat)) debuffs.push(stat); }
        else if (helpfulStats.includes(stat)) { if (!buffs.includes(stat)) buffs.push(stat); }
        else if (passiveStats.includes(stat)) { if (!debuffs.includes(stat)) debuffs.push(stat); }
    }
    return { buffs, debuffs };
}

function statusLabel(stat: string): string {
    const t = l(`unit.status.${stat}`);
    return t || stat;
}
