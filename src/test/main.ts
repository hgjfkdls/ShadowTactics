import './shared';

async function main() {
    console.log('=== Shadow Tactics — Test Suite ===\n');

    await import('./hex.test');
    await import('./game-state.test');
    await import('./game-preparation.test');
    await import('./game-actions.test');
    await import('./game-abilities.test');
    await import('./game-cards.test');

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
