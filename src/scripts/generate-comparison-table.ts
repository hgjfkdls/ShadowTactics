import { SHARED_ABILITY_CONFIG } from '../shared/game/data/ability-config/shared';
import { ARCHER_ABILITY_CONFIG } from '../shared/game/data/ability-config/archer';
import { CAVALRY_ABILITY_CONFIG } from '../shared/game/data/ability-config/cavalry';
import { INFANTRY_ABILITY_CONFIG } from '../shared/game/data/ability-config/infantry';
import { LANCER_ABILITY_CONFIG } from '../shared/game/data/ability-config/lancer';
import { CAVALRY_IDENTITY_CONFIG } from '../shared/game/data/ability-config/cavalry-identity';
import { INFANTRY_IDENTITY_CONFIG } from '../shared/game/data/ability-config/infantry-identity';
import { LANCER_IDENTITY_CONFIG } from '../shared/game/data/ability-config/lancer-identity';
import { GENERAL_IDENTITY_CONFIG } from '../shared/game/data/ability-config/general-identity';
import { l } from '../shared/i18n';
import type { AbilityConfig, ConfigEffect } from '../shared/game/data/ability-config/types';
import * as fs from 'fs';

const ALL_CONFIGS: Record<string, AbilityConfig> = {
    ...SHARED_ABILITY_CONFIG,
    ...ARCHER_ABILITY_CONFIG,
    ...CAVALRY_ABILITY_CONFIG,
    ...INFANTRY_ABILITY_CONFIG,
    ...LANCER_ABILITY_CONFIG,
    ...CAVALRY_IDENTITY_CONFIG,
    ...INFANTRY_IDENTITY_CONFIG,
    ...LANCER_IDENTITY_CONFIG,
    ...GENERAL_IDENTITY_CONFIG,
};

const CATEGORY_LABELS: Record<string, string> = {
    attack: 'Ataque',
    defense: 'Defensa',
    difficulty: 'Dificultad',
    range: 'Rango',
    cost: 'Coste',
    inmovil: 'Inmovilizar',
    actionCost: 'Coste de acción',
    attackCost: 'Coste de ataque',
    movementCost: 'Coste de movimiento',
    ignoresPassives: 'Ignora pasivas',
    nullifyCharge: 'Anula carga',
};

function describeEffect(e: ConfigEffect): string {
    const parts: string[] = [];
    const val = e.value !== undefined ? e.value : 1;
    const prefix = val > 0 ? '+' : '';

    switch (e.type) {
        case 'flagPush':
            parts.push(`flag ${(e.flags ?? []).join(',')}`);
            break;
        case 'flagPop':
            parts.push(`quita flag ${(e.flags ?? []).join(',')}`);
            break;
        case 'modifierPush':
            parts.push(`${prefix}${val} ${CATEGORY_LABELS[e.stat ?? ''] ?? e.stat}`);
            if (e.remainingTurns !== undefined) parts.push(`${e.remainingTurns} turno(s)`);
            if (e.remainingUses !== undefined) parts.push(`${e.remainingUses} uso(s)`);
            break;
        case 'modifierPop':
            parts.push(`elimina ${(e.modifierIds ?? []).join(',')}`);
            break;
        case 'combatMutator':
            parts.push(`${prefix}${val} ${CATEGORY_LABELS[e.stat ?? ''] ?? e.stat} (combate)`);
            if (e.identityBonus) {
                for (const [id, bonus] of Object.entries(e.identityBonus)) {
                    parts.push(`${id} ${bonus > 0 ? '+' : ''}${bonus}`);
                }
            }
            if (e.conditionalValue) {
                for (const cv of e.conditionalValue) {
                    const cond: string[] = [];
                    if (cv.attackerClasses) cond.push(`atk:${cv.attackerClasses.join('/')}`);
                    if (cv.excludeTargetClasses) cond.push(`no:${cv.excludeTargetClasses.join('/')}`);
                    parts.push(`si ${cond.join(' ')} → ${cv.value > 0 ? '+' : ''}${cv.value}`);
                }
            }
            break;
        case 'stateChange':
            if (e.healType === 'hp') parts.push(`cura ${val} HP`);
            else if (e.healType === 'shield') parts.push(`escudo +${val} HP`);
            else parts.push(`${prefix}${val} PA`);
            break;
        case 'trigger':
            parts.push(`trigger: ${e.trigger}`);
            break;
        case 'indicator':
            parts.push(`indicador ${e.indicatorIcon ?? '?'} (${e.indicatorCategory ?? '?'})`);
            break;
        default:
            parts.push(`${e.type} ${prefix}${val}`);
    }
    if (e.targetFilter) {
        const tf = e.targetFilter;
        const conds: string[] = [];
        if (tf.classes) conds.push(`vs ${tf.classes.join('/')}`);
        if (tf.isolated) conds.push('aislado');
        if (tf.targetHpMaxPercent) conds.push(`HP≤${tf.targetHpMaxPercent}%`);
        if (tf.targetDidMovePreviousTurn === false) conds.push('no se movió');
        if (tf.lastTargetId) conds.push('mismo objetivo');
        if (tf.isBasicAttack) conds.push('ataque básico');
        if (conds.length > 0) parts.push(`[${conds.join(', ')}]`);
    }
    if (e.timing && e.timing !== 'onUse') parts.push(`(${e.timing})`);
    return parts.join(' ');
}

function describeConfig(cfg: AbilityConfig): string {
    const lines: string[] = [];
    if (cfg.base.paCost !== undefined && cfg.base.paCost !== 0) {
        const cost = cfg.base.paCost === 'unit.movementCost' ? 'coste movimiento' : `${cfg.base.paCost} PA`;
        lines.push(`Coste: ${cost}`);
    }
    if (cfg.activation) {
        const act = cfg.activation;
        if (act.blockFlags) lines.push(`Bloqueado si flags: ${act.blockFlags.join(', ')}`);
        if (act.requireFlags) lines.push(`Requiere flags: ${act.requireFlags.join(', ')}`);
        if (act.turnStart) {
            const when = act.turnStart.owner ? 'propio' : '';
            const when2 = act.turnStart.enemy ? 'enemigo' : '';
            lines.push(`Activa: inicio turno ${[when, when2].filter(Boolean).join('/')}`);
        }
        if (act.whenAttack) lines.push('Activa: al atacar');
        if (act.whenAttacked) lines.push('Activa: al ser atacado');
        if (act.prompt) lines.push('Activa: prompt jugador');
        if (act.onAllyKill) lines.push('Activa: kill aliado');
        if (act.hpMaxPercent) lines.push(`Requiere HP≤${act.hpMaxPercent}%`);
        if (act.unitClasses) lines.push(`Clases: ${act.unitClasses.join(', ')}`);
        if (act.self) lines.push('Auto-objetivo');
    }
    if (cfg.effects) {
        for (const e of cfg.effects) {
            if (e.type === 'indicator') continue; // skip indicators in main description
            const desc = describeEffect(e);
            if (desc) lines.push(`  ${desc}`);
        }
    }
    return lines.join('\n');
}

// Build the table
const ABILITIES = [
    { id: 'ataque_basico', config: SHARED_ABILITY_CONFIG.ataque_basico },
    { id: 'movimiento', config: SHARED_ABILITY_CONFIG.movimiento },
    { id: 'doble_ataque', config: SHARED_ABILITY_CONFIG.doble_ataque },
    { id: 'blanco_facil', config: ARCHER_ABILITY_CONFIG.blanco_facil },
    { id: 'patada_acrobatica', config: ARCHER_ABILITY_CONFIG.patada_acrobatica },
    { id: 'fuego_cobertura', config: ARCHER_ABILITY_CONFIG.fuego_cobertura },
    { id: 'cabalgar', config: CAVALRY_ABILITY_CONFIG.cabalgar },
    { id: 'carga', config: CAVALRY_ABILITY_CONFIG.carga },
    { id: 'romper_filas', config: CAVALRY_ABILITY_CONFIG.romper_filas },
    { id: 'resistencia', config: INFANTRY_ABILITY_CONFIG.resistencia },
    { id: 'linea_defensiva', config: INFANTRY_ABILITY_CONFIG.linea_defensiva },
    { id: 'presion', config: INFANTRY_ABILITY_CONFIG.presion },
    { id: 'ejecutar', config: INFANTRY_ABILITY_CONFIG.ejecutar },
    { id: 'anti_caballeria', config: LANCER_ABILITY_CONFIG.anti_caballeria },
    { id: 'formacion_defensiva', config: LANCER_ABILITY_CONFIG.formacion_defensiva },
    { id: 'ventaja_alcance', config: LANCER_ABILITY_CONFIG.ventaja_alcance },
    { id: 'acechar', config: CAVALRY_IDENTITY_CONFIG.acechar },
    { id: 'hostigar', config: CAVALRY_IDENTITY_CONFIG.hostigar },
    { id: 'cabalgar_2', config: CAVALRY_IDENTITY_CONFIG.cabalgar_2 },
    { id: 'furia_berserker', config: INFANTRY_IDENTITY_CONFIG.furia_berserker },
    { id: 'rayo_celestial', config: INFANTRY_IDENTITY_CONFIG.rayo_celestial },
    { id: 'liderar_tropas', config: INFANTRY_IDENTITY_CONFIG.liderar_tropas },
    { id: 'torbellino', config: LANCER_IDENTITY_CONFIG.torbellino },
    { id: 'proyeccion', config: LANCER_IDENTITY_CONFIG.proyeccion },
    { id: 'lanza_escudo', config: LANCER_IDENTITY_CONFIG.lanza_escudo },
    { id: 'muro_espartano', config: LANCER_IDENTITY_CONFIG.muro_espartano },
    { id: 'karma', config: GENERAL_IDENTITY_CONFIG.karma },
    { id: 'meditacion', config: GENERAL_IDENTITY_CONFIG.meditacion },
    { id: 'meditacion_2', config: GENERAL_IDENTITY_CONFIG.meditacion_2 },
    { id: 'formacion_linea', config: GENERAL_IDENTITY_CONFIG.formacion_linea },
    { id: 'formacion_triangulo', config: GENERAL_IDENTITY_CONFIG.formacion_triangulo },
    { id: 'posicion_estrategica', config: GENERAL_IDENTITY_CONFIG.posicion_estrategica },
    { id: 'voz_de_mando', config: GENERAL_IDENTITY_CONFIG.voz_de_mando },
    { id: 'plan_batalla', config: GENERAL_IDENTITY_CONFIG.plan_batalla },
    { id: 'guardia_real', config: GENERAL_IDENTITY_CONFIG.guardia_real },
    { id: 'en_nombre_del_rey', config: GENERAL_IDENTITY_CONFIG.en_nombre_del_rey },
    { id: 'terror', config: GENERAL_IDENTITY_CONFIG.terror },
    { id: 'sacrificar', config: GENERAL_IDENTITY_CONFIG.sacrificar },
    { id: 'camino_del_guerrero', config: GENERAL_IDENTITY_CONFIG.camino_del_guerrero },
    { id: 'desenvainado_veloz', config: GENERAL_IDENTITY_CONFIG.desenvainado_veloz },
    { id: 'angel_guardian', config: GENERAL_IDENTITY_CONFIG.angel_guardian },
    { id: 'proteger', config: GENERAL_IDENTITY_CONFIG.proteger },
];

// Evaluación manual de contradicciones (análisis semántico)
const EVALUATIONS: Record<string, string> = {
    formacion_defensiva: '✓ Corregido: i18n actualizada, solo anula Carga',
    acechar: '✓ Corregido: config + i18n actualizados. +1 aislado, +2 si atacante general, 0 vs general enemigo',
    lanza_escudo: '✓ Prompt-driven: el handler recibe la elección del jugador y aplica solo el efecto seleccionado',
    plan_batalla: '✓ Prompt-driven: el handler recibe la elección del jugador y aplica solo el efecto seleccionado',
    terror: '✓ Corregido: i18n actualizada (+2 dificultad a todos los enemigos)',
    angel_guardian: '✓ Handler ya implementa la lógica correcta (escudo +2 a todos, cura 1 al que más HP le falte)',
    doble_ataque: '✓ Corregido: i18n ES cambiado "daño" → "ataque"',
};

let md = `# Tabla comparativa: Config vs i18n

| Habilidad | Tipo | Config-description | i18n description | Evaluación |
|---|---|---|---|---|
`;

for (const { id, config } of ABILITIES) {
    if (!config) continue;
    
    const configDesc = describeConfig(config).replace(/\n/g, '<br>');
    const i18nKey = `ability.${id}.desc`;
    let i18nDesc = l(i18nKey);
    if (i18nDesc === i18nKey) {
        // Fallback to ABILITIES metadata
        try {
            const { ABILITIES } = await import('../shared/game/data/abilities');
            i18nDesc = (ABILITIES as any)[id]?.description ?? '(sin desc)';
        } catch { i18nDesc = '(sin desc)'; }
    }
    i18nDesc = i18nDesc.replace(/\n/g, '<br>');
    
    const evalText = EVALUATIONS[id] ?? '✓ Coinciden';
    const abilityType = config.type ?? '?';
    
    md += `| ${id} | ${abilityType} | ${configDesc} | ${i18nDesc} | ${evalText} |\n`;
}

fs.writeFileSync('docs/auditoria/tabla_comparativa.md', md, 'utf-8');
console.log('Tabla generada en docs/auditoria/tabla_comparativa.md');
