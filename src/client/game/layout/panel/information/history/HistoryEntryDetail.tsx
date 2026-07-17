import { l } from '@shared/i18n';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { hexDistance } from '@shared/hex';
import type { GameState } from '@shared/game/state';
import PanelTitle from './PanelTitle';
import PanelSource from './PanelSource';
import PanelAttacker from './PanelAttacker';
import PanelTarget from './PanelTarget';
import PanelDefender from './PanelDefender';
import PanelDescription from './PanelDescription';
import PanelModifiers from './PanelModifiers';
import PanelFormula from './PanelFormula';
import PanelMovement from './PanelMovement';
import PanelUnitsAffected from './PanelUnitsAffected';
import PanelCounterCard from './PanelCounterCard';
import { cls, nameForHistoryCard, descForHistoryCard } from '../helpers';
import { cardImgUrl } from '../../../../helpers/cards';
import { useLightbox } from '../../../../helpers/Lightbox';

function HistoryEntryDetail({ entry, state }: { entry: any; state: GameState }) {
  const { setLightbox, lightboxEl } = useLightbox();
    const configId = entry.configId ?? entry.cardId;
    const panelCfg = (configId ? ABILITY_CONFIG[configId]?.panel : undefined) ?? {};
    const pTitle = panelCfg.title ?? true;
    const pShowSource = panelCfg.showSource ?? false;
    const pShowAttacker = panelCfg.showAttacker ?? true;
    const pShowDefender = panelCfg.showDefender ?? true;
    const pShowDescription = panelCfg.showDescription ?? false;
    const pShowModifiers = panelCfg.showModifiers ?? true;
    const pShowFormula = panelCfg.showFormula ?? ['PA', 'diff', 'dmg', 'range'];
    const logCfg = (configId ? ABILITY_CONFIG[configId]?.log : undefined) ?? {};
    const abilityCfg = configId ? ABILITY_CONFIG[configId] : undefined;
    const mvDefault = abilityCfg?.type === 'move';
    const pShowMovement = panelCfg.showMovement ?? logCfg.showMovement ?? mvDefault;
    const pShowTarget = panelCfg.showTarget ?? false;
    const pShowUnitsAffected = panelCfg.showUnitsAffected ?? false;

    const isAttackEntry = entry.attackerId != null;
    const isMoveEntry = !isAttackEntry && entry.from != null;
    const isCardEntry = !isAttackEntry && !isMoveEntry;

    const isCritical = !entry.noCritical && entry.total >= 11;
    const dieFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    const diffFormulaIdx = (entry.modifiers ?? []).findIndex((m: string) => m.startsWith('Dificultad:'));
    const diffFormula = diffFormulaIdx >= 0 ? entry.modifiers[diffFormulaIdx] : null;
    const rawMods = (entry.modifiers ?? []).filter((_: string, i: number) => i !== diffFormulaIdx);

    interface ModItem { letter: string; text: string; color?: string }
    const modItems: ModItem[] = [];
    let letterIdx = 0;
    const nextLetter = () => String.fromCharCode(97 + letterIdx++);

    // Aura modifiers are now in entry.modifiers (snapshotted at attack time)

    const catLabels: Record<string, string> = { diff: l('cat.diff'), atk: l('cat.atk'), range: l('cat.range'), def: l('cat.def'), pa: l('cat.pa'), cost: l('cat.pa'), mixed: l('cat.mixed') };
    const catColors: Record<string, string> = { diff: 'var(--color-effect-diff)', atk: 'var(--color-effect-atk)', range: 'var(--color-effect-range)', def: 'var(--color-effect-def)', pa: 'var(--color-effect-pa)', cost: 'var(--color-effect-pa)' };
    const grouped: { cat: string; items: { letter: string; text: string }[] }[] = [];
    const catOrder = ['diff', 'atk', 'range', 'def', 'pa', 'cost', 'mixed'];
    const catMap = new Map<string, { letter: string; text: string }[]>();
    for (const m of rawMods) {
        const match = m.match(/^\[(\w+)\]\s*/);
        const l = nextLetter();
        if (match) {
            const cat = match[1];
            const text = m.slice(match[0].length);
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

    const allItems: ModItem[] = [...modItems];
    for (const g of grouped) {
        for (const item of g.items) {
            allItems.push(item);
        }
    }

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
        '+1 daño': '+1 daño',
    };
    for (const item of allItems) {
        const rawText = item.text;
        item.text = item.text.replace(/\[(?:id|ignores):[\w,.]+\]\s*/g, '');
        const i18nMatch = rawText.match(/\[i18n:([\w.]+)\]\s*/);
        if (i18nMatch) {
            const val = rawText.match(/([+-]?\d+)$/)?.[1] ?? '0';
            item.text = l(i18nMatch[1], { n: parseInt(val) });
        }
        const idMatch = rawText.match(/\[id:(\w+)\]/);
        if (idMatch && !i18nMatch) {
            const translated = l(`ability.${idMatch[1]}.name`);
            if (translated && translated !== `ability.${idMatch[1]}.name`) {
                const colonIdx = item.text.indexOf(':');
                if (colonIdx > 0) {
                    const rest = item.text.slice(colonIdx);
                    item.text = translated + rest;
                }
            }
        }
        const statPart = item.text.match(/:\s*([+-]?\d+)\s+(\w+)/);
        const statTag = item.text.match(/\[stat:(\w+)\]/);
        if (statTag) {
            const statMap: Record<string, string> = {
                attack: l('cat.atk'),
                defense: l('cat.def'),
                difficulty: l('cat.diff'),
                range: l('cat.range'),
                pa: l('cat.pa'),
                damage: l('cat.dmg') || 'dmg',
            };
            const translated = statMap[statTag[1]] ?? statTag[1];
            item.text = item.text.replace(`[stat:${statTag[1]}]`, translated);
        } else if (statPart) {
            const translatedStat = MODIFIER_TRANSLATIONS[statPart[2]];
            if (translatedStat) {
                item.text = item.text.replace(statPart[0], `: ${statPart[1]} ${translatedStat}`);
            }
        }
        for (const [phrase, translation] of Object.entries(PHRASE_TRANSLATIONS)) {
            if (item.text.includes(phrase) && translation !== phrase) {
                item.text = item.text.replace(phrase, translation);
            }
        }
    }

    const critApplied = isCritical;
    if (critApplied) {
        allItems.push({ letter: String.fromCharCode(97 + allItems.length), text: l('ui.criticalDamage'), color: 'text-yellow-400' });
    }

    // Extract archer distance info for formula display
    const archerBase = diffFormula?.match(/base (\d+)/) ? parseInt(diffFormula.match(/base (\d+)/)![1]) : null;
    const archerDist = diffFormula?.match(/distancia \+(\d+)/) ? parseInt(diffFormula.match(/distancia \+(\d+)/)![1]) : null;
    const isArcher = archerDist !== null;

    const diffModLetters = [...modItems.filter(m => m.text.includes('dificultad') || m.text.includes('difficulty') || m.text.includes('[stat:difficulty]')), ...(catMap.get('diff') ?? [])].map(m => m.letter).filter(l => l && !ignoredLetters.has(l));
    const rangeModLetters = [...(catMap.get('range') ?? [])].map(m => m.letter);
    const paModLetters = [...(catMap.get('pa') ?? []), ...(catMap.get('cost') ?? [])].map(m => m.letter);
    // Compute base PA cost by subtracting modifier values from final cost
    const paBaseCost = (() => {
        if (paModLetters.length === 0) return entry.paCost ?? 0;
        const all = [...modItems, ...grouped.flatMap(g => g.items)];
        const modSum = paModLetters.reduce((sum, l) => {
            const item = all.find(i => i.letter === l);
            const val = parseInt(item?.text.match(/[+-]?\d+/)?.[0] ?? '0');
            return sum + Math.abs(val);
        }, 0);
        return (entry.paCost ?? 0) - modSum;
    })();
    const rangeStats: Record<string, number> = { archer: 3, infantry: 1, cavalry: 1, lancer: 1, general: 1 };
    const atkUnit = entry.attackerId ? (state.units[entry.attackerId] ?? state.graveyard[entry.attackerId]) : undefined;
    const baseRange = atkUnit ? atkUnit.range : (entry.attackerClass ? (rangeStats[entry.attackerClass] ?? 1) : 0);
    const atkDistance = entry.distance ?? 99;
    const hasRangeBonus = rangeModLetters.length > 0 && baseRange > 0 && atkDistance > baseRange;
    const finalRange = hasRangeBonus ? baseRange + rangeModLetters.length : baseRange;

    // Build difficulty formula: base + modifiers (without distance, handled separately for archers)
    const diffFormulaRef = (() => {
        const relevantMods = diffModLetters.filter(l => {
            const item = modItems.concat(...grouped.map(g => g.items)).find(i => i.letter === l);
            return item && !item.text.startsWith('distancia');
        });
        if (relevantMods.length === 0 && !isArcher) return null;
        const signs = relevantMods.map(l => {
            const item = modItems.concat(...grouped.map(g => g.items)).find(i => i.letter === l);
            const text = item?.text ?? '';
            const signMatch = text.match(/([+-])\s*\d/);
            const effectiveSign = signMatch ? signMatch[1] : (text.includes('Penalty') || text.includes('Evasión') ? '+' : '-');
            return effectiveSign + l;
        });
        const base = isArcher ? (archerBase ?? 5) : entry.baseDifficulty;
        const parts = [`${base}`];
        if (isArcher && archerDist) parts.push(`+${archerDist}`);
        if (signs.length > 0) parts.push(...signs);
        const finalDiff = entry.difficulty > 0 ? entry.difficulty : base;
        return parts.join(' ') + (parts.length > 1 ? ` = ${finalDiff}` : '');
    })();

    interface DmgLetter { letter: string; sign: string }
    const dmgLetters: DmgLetter[] = [
        ...(catMap.get('def') ?? []).map(m => ({ letter: m.letter, sign: '-' as const })),
        ...(catMap.get('atk') ?? []).map(m => {
            const signMatch = m.text.match(/([+-])\s*\d/);
            return { letter: m.letter, sign: (signMatch ? signMatch[1] : '+') as string };
        }),
        ...modItems.filter(m => m.text.includes('daño') || m.text.includes('damage') || m.text.includes('[stat:damage]')).map(m => {
            const text = m.text ?? '';
            const signMatch = text.match(/([+-])\s*\d/);
            return { letter: m.letter, sign: (signMatch ? signMatch[1] : '-') as string };
        }),
        ...modItems.filter(m => m.text.includes('defensa') || m.text.includes('defense') || m.text.includes('[stat:defense]')).map(m => ({
            letter: m.letter, sign: '-' as const,
        })),
        ...(critApplied ? [{ letter: allItems.find(i => i.text.includes('Crítico') || i.text.includes('Critical'))?.letter ?? '', sign: '+' as const }] : []),
    ].filter(l => l.letter && !ignoredLetters.has(l.letter));
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

    const CARD_SUPPORT_DETAIL = new Set([
        'rayo_celestial', 'meditacion', 'en_nombre_del_rey', 'liderar_tropas',
        'lanza_escudo', 'voz_de_mando', 'plan_batalla', 'camino_del_guerrero', 'robar_ricos',
        'cabalgar', 'cabalgar_2', 'a_la_carga', 'posicion_estrategica',
        'angel_guardian', 'proteger', 'torbellino', 'sacrificar', 'desenvainado_veloz',
    ]);
    const isSupportCard = CARD_SUPPORT_DETAIL.has(entry.cardId);
    const isCounter = entry.cardType === 'COUNTER';
    const isRegularCard = isCardEntry && !isSupportCard && entry.cardType;

    return (
        <div className="space-y-4">
            {isRegularCard ? (
                <>
                    {/* Línea 1: Icono + Título */}
                    <div className="flex items-start gap-3">
                        <img src="/cards/es/reverso.png" alt="" className="w-10 h-14 rounded object-cover" />
                        <div>
                            <div className="text-lg font-bold">{entry.cardName?.startsWith('card.') ? l(entry.cardName) : (entry.cardName ?? l('button.basicAttack'))}</div>
                            <div className={[
                                'text-xs font-semibold',
                                entry.cardType === 'BUFF' ? 'text-emerald-400' : entry.cardType === 'DEBUFF' ? 'text-red-400' : 'text-violet-400',
                            ].join(' ')}>
                                {l('cardType.' + entry.cardType)}
                            </div>
                        </div>
                    </div>
                    {/* Línea 2: Jugador · Turno · Acción */}
                    <div className="text-xs text-zinc-500">
                        {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })} · {l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}
                    </div>
                    {/* Línea 3: Carta original + contra (si existe) */}
                    {entry.counterCardId ? (
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-zinc-400 mb-1">
                                    <span className="font-semibold">{l('cardDetail.playerPlays', { n: entry.playerId === 'p1' ? '2' : '1' })}: </span>
                                    <span className="font-semibold text-red-400">{entry.counterCardName?.startsWith('card.') ? l(entry.counterCardName) : (entry.counterCardName ?? '?')}</span>
                                </div>
                                <div className="rounded-lg border-2 border-red-800/50 bg-red-900/20 p-1">
                                    <img
                                        src={cardImgUrl(entry.counterCardId)}
                                        alt=""
                                        className="w-full h-auto rounded cursor-pointer"
                                        onClick={(e) => setLightbox((e.currentTarget as HTMLImageElement).src)}
                                        onError={(e) => {
                                            const t = e.currentTarget;
                                            if (!t.dataset.fallback) {
                                                t.dataset.fallback = '1';
                                                t.src = cardImgUrl(entry.counterCardId, 'es');
                                            } else {
                                                t.style.display = 'none';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-400 mb-1">
                                    <span className="font-semibold">{l('cardDetail.butOpponentCounters', { n: entry.playerId === 'p1' ? '1' : '2' })}: </span>
                                    <span className="font-semibold text-violet-400">{entry.cardName?.startsWith('card.') ? l(entry.cardName) : (entry.cardName ?? '?')}</span>
                                </div>
                                <div className="rounded-lg border-2 border-violet-800/50 bg-violet-900/20 p-1">
                                    <img
                                        src={cardImgUrl(entry.cardId)}
                                        alt=""
                                        className="w-full h-auto rounded cursor-pointer"
                                        onClick={(e) => setLightbox((e.currentTarget as HTMLImageElement).src)}
                                        onError={(e) => {
                                            const t = e.currentTarget;
                                            if (!t.dataset.fallback) {
                                                t.dataset.fallback = '1';
                                                t.src = cardImgUrl(entry.cardId, 'es');
                                            } else {
                                                t.style.display = 'none';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={[
                            'rounded-lg border-2 p-1 text-xs',
                            entry.cardType === 'BUFF' ? 'border-emerald-800/50 bg-emerald-900/20'
                                : entry.cardType === 'DEBUFF' ? 'border-red-800/50 bg-red-900/20'
                                : 'border-violet-800/50 bg-violet-900/20',
                        ].join(' ')}>
                            <img
                                src={cardImgUrl(entry.cardId)}
                                alt={entry.cardName ?? ''}
                                className="w-full h-auto rounded cursor-pointer"
                                onClick={(e) => setLightbox((e.currentTarget as HTMLImageElement).src)}
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    if (!target.dataset.fallback) {
                                        target.dataset.fallback = '1';
                                        target.src = cardImgUrl(entry.cardId, 'es');
                                    } else {
                                        target.style.display = 'none';
                                    }
                                }}
                            />
                        </div>
                    )}
                    {/* Línea 4: Efecto snapshot (mismo estilo que PanelUnitsAffected) */}
                    {entry.modifiers && entry.modifiers.length > 0 && (
                        <div className="bg-panel-sub-bg border border-panel-sub-border rounded-lg p-3 space-y-1.5 text-sm">
                            <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">{l('cardDetail.effects')}</div>
                            {entry.modifiers.map((m: string, i: number) => {
                                const i18nMatch = m.match(/^\[i18n:([\w.]+)\]/);
                                const displayText = i18nMatch ? l(i18nMatch[1]) : m;
                                return <div key={i} className="text-xs text-zinc-300">{displayText}</div>;
                            })}
                        </div>
                    )}

                </>
            ) : (
                <>
                    {pTitle && <PanelTitle entry={entry} isAttackEntry={isAttackEntry} isMoveEntry={isMoveEntry} isSupportCard={isSupportCard} isCounter={isCounter} />}
                    {pShowSource && <PanelSource entry={entry} cls={cls} />}
                    {pShowAttacker && <PanelAttacker entry={entry} />}
                    {pShowTarget && <PanelTarget entry={entry} cls={cls} />}
                    {pShowDefender && <PanelDefender entry={entry} state={state} cls={cls} />}
                    {pShowDescription && configId && <PanelDescription configId={configId} />}
                    {pShowModifiers && (allItems.length > 0 || (isMoveEntry && (entry.modifiers?.length ?? 0) > 0)) && <PanelModifiers allItems={allItems} entry={entry} />}
                    {pShowFormula.length > 0 && <PanelFormula entry={entry} paModLetters={paModLetters} paBaseCost={paBaseCost} diffFormulaRef={diffFormulaRef} diffModLetters={diffModLetters} isArcher={isArcher} archerBase={archerBase} archerDist={archerDist} dmgFormula={dmgFormula} dmgClamped={dmgClamped} hasRangeBonus={hasRangeBonus} baseRange={baseRange} rangeModLetters={rangeModLetters} finalRange={finalRange} isCritical={isCritical} dieFaces={dieFaces} pShowFormula={pShowFormula} pShowUnitsAffected={pShowUnitsAffected} />}
                    {!isSupportCard && isCardEntry && pTitle && <PanelCounterCard entry={entry} cls={cls} isCounter={isCounter} />}
                    {pShowUnitsAffected && (entry.enemiesHit?.length > 0 || entry.alliesHit?.length > 0 || entry.targetId) && <PanelUnitsAffected entry={entry} state={state} cls={cls} />}
                    {pShowMovement && (isMoveEntry || entry.from != null) && <PanelMovement entry={entry} cls={cls} />}
                </>
            )}

            {lightboxEl}
        </div>
    );
}

export default HistoryEntryDetail;
