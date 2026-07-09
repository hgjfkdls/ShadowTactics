import './shared';

async function main() {
    console.log('=== Shadow Tactics — Test Suite ===\n');

    await import('./hex/index.test');
    await import('./state/index.test');
    await import('./preparation/index.test');

    await import('./actions/move.test');
    await import('./actions/attack.test');
    await import('./actions/cards.test');
    await import('./actions/turn.test');
    await import('./actions/modifiers.test');

    await import('./abilities/archer.test');
    await import('./abilities/cavalry.test');
    await import('./abilities/infantry.test');
    await import('./abilities/lancer.test');
    await import('./abilities/identities/dios_trueno.test');
    await import('./abilities/identities/caballos_guerra.test');
    await import('./abilities/identities/escudo_comandante.test');
    await import('./abilities/identities/monje_shaolin.test');
    await import('./abilities/identities/punta_lanza.test');
    await import('./abilities/identities/corazon_estratega.test');
    await import('./abilities/identities/inspiracion_real.test');
    await import('./abilities/identities/samurai.test');
    await import('./abilities/identities/furia_tirano.test');
    await import('./abilities/identities/robin_hood.test');
    await import('./abilities/identities/francotirador.test');
    await import('./abilities/identities/capitan_guardia.test');
    await import('./abilities/identities/cazadores.test');
    await import('./abilities/identities/espartano.test');
    await import('./abilities/identities/comandante_supremo.test');

    await import('./cards/buffs.test');
    await import('./cards/debuffs.test');
    await import('./cards/counters.test');
    await import('./modifiers/index.test');
    await import('./combat/index.test');

    await import('./systems/range-target.test');
    await import('./systems/activation-effects.test');
    await import('./systems/modifiers.test');
    await import('./systems/modifier-display.test');

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
