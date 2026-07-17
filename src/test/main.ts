import './shared';

async function main() {
    console.log('=== Shadow Tactics — Test Suite ===\n');

    // ── Estado y preparación ──
    await import('./hex/index.test');
    await import('./state/index.test');
    await import('./preparation/index.test');

    // ── Board / Selección ──
    await import('./selection/range-target.test');

    // ── Acciones básicas ──
    await import('./actions/move.test');
    await import('./cards/card-flow.test');

    // ── Turnos ──
    await import('./turns/turn-flow.test');

    // ── Cartas ──
    await import('./cards/buffs.test');
    await import('./cards/debuffs.test');
    await import('./cards/counters.test');

    // ── Habilidades de clase ──
    await import('./abilities/archer.test');
    await import('./abilities/cavalry.test');
    await import('./abilities/infantry.test');
    await import('./abilities/lancer.test');

    // ── Habilidades de identidad ──
    await import('./abilities/identities/dios_trueno.test');
    await import('./abilities/identities/caballos_guerra.test');
    await import('./abilities/identities/escudo_comandante.test');
    await import('./abilities/identities/monje_shaolin.test');
    await import('./abilities/identities/robin_hood.test');
    await import('./abilities/identities/francotirador.test');
    await import('./abilities/identities/capitan_guardia.test');
    await import('./abilities/identities/punta_lanza.test');
    await import('./abilities/identities/corazon_estratega.test');
    await import('./abilities/identities/inspiracion_real.test');

    // ── Combate ──
    await import('./combat/index.test');
    await import('./combat/basic-attack.test');
    await import('./combat/ability-effects.test');

    // ── Modificadores ──
    await import('./modifiers/engine-modifiers.test');
    await import('./modifiers/engine.test');
    await import('./modifiers/display.test');
    await import('./modifiers/action-modifiers.test');

    const { getPassed, getFailed } = await import('./shared');
    const passed = getPassed();
    const failed = getFailed();
    const total = passed + failed;

    console.log(`\n=== Resultados: ${passed}/${total} passed, ${failed} failed ===\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error ejecutando tests:', err);
    process.exit(1);
});
