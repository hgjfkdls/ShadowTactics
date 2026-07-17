import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';

console.log('\n--- Preparation Phase ---\n');

// ── IDENTITY SELECTION ──

function prepIdentity() {
    const state = createInitialGameState();
    const cardId = state.players['p1'].identityCards![0];

    const result = applyAction(state, {
        type: 'SELECT_IDENTITY',
        playerId: 'p1',
        cardId
    });

    return { state, result, cardId };
}

{
    const { state, result, cardId } = prepIdentity();
    assert(result.players['p1'].selectedIdentity === cardId,
        'SELECT_IDENTITY — p1 selecciona su carta');
    assertEqual(result.preparationPhase, 'IDENTITY_SELECTION',
        'SELECT_IDENTITY — fase sigue siendo IDENTITY_SELECTION (p2 falta)');
}

{
    const { state } = prepIdentity();
    const result = applyAction(state, {
        type: 'SELECT_IDENTITY',
        playerId: 'p1',
        cardId: 'nonexistent'
    });
    assert(result === state,
        'SELECT_IDENTITY — carta inexistente es ignorada (misma ref)');
}

{
    const { state, result: s1 } = prepIdentity();
    // p1 ya seleccionó, intenta otra vez
    const dup = applyAction(s1, {
        type: 'SELECT_IDENTITY',
        playerId: 'p1',
        cardId: 'robin_hood_1'
    });
    assert(dup === s1,
        'SELECT_IDENTITY — doble selección de p1 es ignorada');

    // p2 selecciona
    const cardP2 = s1.players['p2'].identityCards![0];
    const s2 = applyAction(s1, {
        type: 'SELECT_IDENTITY',
        playerId: 'p2',
        cardId: cardP2
    });
    assert(s2.players['p2'].selectedIdentity === cardP2,
        'SELECT_IDENTITY — p2 selecciona su carta');
    assert(s2.players['p1'].revealedIdentity === true,
        'SELECT_IDENTITY — ambas reveladas automáticamente');
    assert(s2.players['p2'].revealedIdentity === true,
        'SELECT_IDENTITY — p2 revelada');
    assertEqual(s2.preparationPhase, 'ROLL',
        'SELECT_IDENTITY — avanza a ROLL cuando ambos eligen');
}

{
    const state = createInitialGameState();
    const identitySizeBefore = state.identityDeck.length;
    const cardId = state.players['p1'].identityCards![0];
    const s1 = applyAction(state, {
        type: 'SELECT_IDENTITY', playerId: 'p1', cardId
    });
    assertEqual(s1.identityDeck.length, identitySizeBefore + 2,
        'SELECT_IDENTITY — p1 devuelve 2 cartas al identityDeck');
    assertEqual(s1.players['p1'].identityCards?.length, 0,
        'SELECT_IDENTITY — identityCards de p1 se limpian');
}

// ── ROLL ──

{
    const state = createInitialGameState();
    const s1 = applyAction(state, {
        type: 'SELECT_IDENTITY', playerId: 'p1',
        cardId: state.players['p1'].identityCards![0]
    });
    const s2 = applyAction(s1, {
        type: 'SELECT_IDENTITY', playerId: 'p2',
        cardId: s1.players['p2'].identityCards![0]
    });
    assertEqual(s2.preparationPhase, 'ROLL', 'setup — llegamos a ROLL');

    // p1 tira
    const r1 = applyAction(s2, { type: 'ROLL_DICE', playerId: 'p1' });
    assert(typeof r1.diceRolls['p1'] === 'number',
        'ROLL_DICE — p1 obtiene un número');
    assert(r1.diceRolls['p1']! >= 2 && r1.diceRolls['p1']! <= 12,
        'ROLL_DICE — p1 entre 2 y 12');
    assert(r1.diceRolls['p2'] === undefined,
        'ROLL_DICE — p2 aún sin tirar');
    assertEqual(r1.preparationPhase, 'ROLL',
        'ROLL_DICE — sigue en ROLL (p2 falta)');

    // doble tirada p1 ignorada
    const dup = applyAction(r1, { type: 'ROLL_DICE', playerId: 'p1' });
    assert(dup === r1,
        'ROLL_DICE — doble tirada p1 ignorada');

    // p2 tira
    const r2 = applyAction(r1, { type: 'ROLL_DICE', playerId: 'p2' });

    // RNG avanza en cada tirada (incluso en empate)
    assert(r2.rngSeed !== r1.rngSeed,
        'ROLL_DICE — semilla RNG se consumió en p2');

    if (r2.diceRolls['p1'] !== undefined && r2.diceRolls['p1'] === r2.diceRolls['p2']) {
        // Empate: ambos dados se resetearon
        assert(r2.diceRolls['p1'] === undefined &&
               r2.diceRolls['p2'] === undefined,
            'ROLL_DICE — empate reinicia dados a undefined');
        assert(r2.lastTieRoll !== undefined && typeof r2.lastTieRoll === 'number' && r2.lastTieRoll >= 2 && r2.lastTieRoll <= 12,
            'ROLL_DICE — lastTieRoll almacena el valor del empate');
        assertEqual(r2.preparationPhase, 'ROLL',
            'ROLL_DICE — sigue en ROLL tras empate');
    } else {
        assert(typeof r2.diceRolls['p2'] === 'number',
            'ROLL_DICE — p2 obtiene un número');
        assert(r2.preparationPhase === 'ROLL_RESULT',
            'ROLL_DICE — avanza a ROLL_RESULT si no hay empate');

        // deploymentOrder y deploymentCount
        assert(r2.deploymentOrder !== undefined,
            'ROLL_DICE — deploymentOrder definido');
        assertEqual(r2.deploymentOrder?.length, 2,
            'ROLL_DICE — deploymentOrder tiene 2 jugadores');
        assertEqual(r2.deploymentCount, 0,
            'ROLL_DICE — deploymentCount reseteado a 0');
        assertEqual(r2.deploymentStep, 0,
            'ROLL_DICE — deploymentStep reseteado a 0');

        // Orden: menor rango despliega primero, mayor es activo
        const p1Roll = r2.diceRolls['p1']!;
        const p2Roll = r2.diceRolls['p2']!;
        if (p1Roll < p2Roll) {
            assertEqual(r2.deploymentOrder[0], 'p1',
                'ROLL_DICE — deploymentOrder[0] es el menor (p1)');
            assertEqual(r2.currentDeployingPlayer, 'p1',
                'ROLL_DICE — currentDeployingPlayer es el menor (p1)');
            assertEqual(r2.activePlayer, 'p2',
                'ROLL_DICE — activePlayer es el mayor (p2)');
        } else {
            assertEqual(r2.deploymentOrder[0], 'p2',
                'ROLL_DICE — deploymentOrder[0] es el menor (p2)');
            assertEqual(r2.currentDeployingPlayer, 'p2',
                'ROLL_DICE — currentDeployingPlayer es el menor (p2)');
            assertEqual(r2.activePlayer, 'p1',
                'ROLL_DICE — activePlayer es el mayor (p1)');
        }
    }
}

{
    // Empate: verificar que ambos resetean y se puede volver a tirar
    // Probar con distintas semillas hasta que ocurra un empate (~11% por intento)
    const maxAttempts = 50;
    let sawTie = false;
    for (let i = 0; i < maxAttempts; i++) {
        const base = createInitialGameState();
        base.rngSeed = 100000 + i;  // semilla distinta cada intento
        const s1 = applyAction(base, { type: 'SELECT_IDENTITY', playerId: 'p1', cardId: base.players['p1'].identityCards![0] });
        const s2 = applyAction(s1, { type: 'SELECT_IDENTITY', playerId: 'p2', cardId: s1.players['p2'].identityCards![0] });
        const r1 = applyAction(s2, { type: 'ROLL_DICE', playerId: 'p1' });
        const r2 = applyAction(r1, { type: 'ROLL_DICE', playerId: 'p2' });
        if (r2.diceRolls['p1'] === undefined && r2.diceRolls['p2'] === undefined) {
            sawTie = true;
            // Tras empate, ambos undefined → se puede volver a tirar
            const r3 = applyAction(r2, { type: 'ROLL_DICE', playerId: 'p1' });
            assert(typeof r3.diceRolls['p1'] === 'number',
                'ROLL_DICE — tras empate, p1 vuelve a tirar (sin bloqueo)');
            assert(r3.lastTieRoll === undefined,
                'ROLL_DICE — lastTieRoll se limpia al tirar de nuevo');
            break;
        }
    }
    assert(sawTie, 'ROLL_DICE — se produjo al menos un empate en ' + maxAttempts + ' intentos');
}

// ── DEPLOYMENT ──

function prepDeployment() {
    let state = createInitialGameState();
    state = applyAction(state, {
        type: 'SELECT_IDENTITY', playerId: 'p1',
        cardId: state.players['p1'].identityCards![0]
    });
    state = applyAction(state, {
        type: 'SELECT_IDENTITY', playerId: 'p2',
        cardId: state.players['p2'].identityCards![0]
    });
    state = applyAction(state, { type: 'ROLL_DICE', playerId: 'p1' });
    state = applyAction(state, { type: 'ROLL_DICE', playerId: 'p2' });

    // Si hubo empate, repetir hasta que avance
    while (state.preparationPhase === 'ROLL') {
        state = applyAction(state, { type: 'ROLL_DICE', playerId: 'p1' });
        state = applyAction(state, { type: 'ROLL_DICE', playerId: 'p2' });
    }
    return state;
}

{
    const state = prepDeployment();
    assertEqual(state.preparationPhase, 'ROLL_RESULT',
        'deployment setup — fase ROLL_RESULT');

    const deployer = state.currentDeployingPlayer!;
    const entry = state.players[deployer].unitsToDeploy![0];

    // Primera unidad debe estar a rango 2 del centro
    const first = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: deployer,
        unitId: entry.unitId,
        position: { q: 2, r: 0 },
    });
    assert(first.units[entry.unitId] !== undefined,
        'DEPLOY_UNIT — primera unidad colocada en rango 2');
    assertEqual(first.players[deployer].unitsToDeploy?.length, 12,
        'DEPLOY_UNIT — una unidad menos en pool');
    assertEqual(first.players[deployer].deployedUnits?.length, 1,
        'DEPLOY_UNIT — una unidad en deployed');
}

{
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const entry = state.players[deployer].unitsToDeploy![0];

    // Primera unidad NO puede estar en rango != 2
    const bad = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: deployer,
        unitId: entry.unitId,
        position: { q: 0, r: 0 },
    });
    assert(bad === state,
        'DEPLOY_UNIT — primera unidad en centro es rechazada');
}

{
    // Pre-classed units: max 3 per class. Deploying 4th archer fails because pool only has 3
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const other = deployer === 'p1' ? 'p2' : 'p1';

    function deployNext(s: typeof state, p: string, q: number, r: number) {
        const entry = s.players[p].unitsToDeploy![0];
        return applyAction(s, {
            type: 'DEPLOY_UNIT', playerId: p, unitId: entry.unitId, position: { q, r }
        });
    }

    let s = state;

    // Step 0: deployer coloca 1 (u1 = archer)
    s = deployNext(s, deployer, 2, 0);
    // Step 1: other coloca 2 (u14 = archer, u15 = archer)
    s = deployNext(s, other, -2, 0);
    s = deployNext(s, other, -2, 1);
    // Step 2: deployer coloca 2 (u2 = archer, u3 = archer)
    s = deployNext(s, deployer, 2, -1);
    s = deployNext(s, deployer, 2, -2);
    // Step 3: other coloca 2 (u16 = archer — 3ª archer de other, u17 = infantry)
    s = deployNext(s, other, -2, -1);
    s = deployNext(s, other, -2, -2);

    // Only 3 cavalry exist per player. The 4th deploy picks the next class
    const entry4 = s.players[deployer].unitsToDeploy![0];
    assertEqual(entry4.unitClass, 'lancer',
        'DEPLOY_UNIT — 4ª unidad del pool (después de 3 cavalry) es lancer');
}

{
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const entry = state.players[deployer].unitsToDeploy![0];

    const r = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: 'p1',
        unitId: entry.unitId,
        position: { q: 2, r: 0 },
    });
    if (deployer !== 'p1') {
        assert(r === state,
            'DEPLOY_UNIT — no es el turno del jugador');
    }
}

// Turno alternado en despliegue
{
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const other = deployer === 'p1' ? 'p2' : 'p1';

    // Desplegar primera unidad
    const e1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: deployer,
        unitId: e1.unitId,
        position: { q: 2, r: 0 },
    });

    const e2 = state.players[other].unitsToDeploy![0];
    const s2 = applyAction(s1, {
        type: 'DEPLOY_UNIT',
        playerId: other,
        unitId: e2.unitId,
        position: { q: -2, r: 0 },
    });

    // Ambos desplegaron 1
    assertEqual(s2.players[deployer].deployedUnits?.length, 1,
        'DEPLOY_UNIT — turno alternado funciona');
}

{
    // Hex ocupado: no se puede colocar sobre otra unidad
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const e1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: e1.unitId,
        position: { q: 2, r: 0 }
    });
    const e2 = s1.players[deployer].unitsToDeploy![0];
    const reject = applyAction(s1, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: e2.unitId,
        position: { q: 2, r: 0 }
    });
    assert(reject === s1,
        'DEPLOY_UNIT — hex ocupado es rechazado');
}

{
    // Segunda unidad sin aliado cerca → rechazada
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const e1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: e1.unitId,
        position: { q: 2, r: 0 }
    });
    const e2 = s1.players[deployer].unitsToDeploy![0];
    const reject = applyAction(s1, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: e2.unitId,
        position: { q: 5, r: 0 }
    });
    assert(reject === s1,
        'DEPLOY_UNIT — unidad lejos de aliada es rechazada');
}

{
    // Unidad no en pool → rechazada
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const reject = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: 'nonexistent',
        position: { q: 2, r: 0 }
    });
    assert(reject === state,
        'DEPLOY_UNIT — unitId no en pool es rechazada');
}

{
    // Máximo 1 general — pool solo contiene 1 general por jugador
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const other = deployer === 'p1' ? 'p2' : 'p1';

    function dp(s: typeof state, p: string, q: number, r: number) {
        const uid = s.players[p].unitsToDeploy![0];
        return applyAction(s, { type: 'DEPLOY_UNIT', playerId: p, unitId: uid, position: { q, r } });
    }

    let s = dp(state, deployer, 2, 0);                                                 // step 0 (archer)
    s = dp(s, other, -2, 0); s = dp(s, other, -2, 1);                                 // step 1
    s = dp(s, deployer, 2, -1);                                                       // step 2 — u2(archer), no general yet

    // Deployer's pool: u1-archer(u1), u2-archer, u3-archer, u4-inf, ... u13-general
    // Deploy all deployer units up to the general, then verify only 1 general in pool
    s = dp(s, deployer, 2, -2);                                                       // step 2 — u3(archer)

    // Scan deployer's remaining pool for general count
    const genCount = s.players[deployer].unitsToDeploy!.filter(e => e.unitClass === 'general').length;
    assertEqual(genCount, 1,
        'DEPLOY_UNIT — solo 1 general en el pool');
}

{
    // Pool contiene exactamente 1 general al final → depliegue natural lo satisface
    const state = prepDeployment();
    const order0 = state.deploymentOrder![0];

    const pool = state.players[order0].unitsToDeploy!;
    const genEntry = pool.find(e => e.unitClass === 'general');
    assert(genEntry !== undefined, 'Pool debe contener 1 general');
    assertEqual(pool.indexOf(genEntry), pool.length - 1,
        'DEPLOY_UNIT — general es la última entrada del pool');
}

// Despliegue completo: 12 pasos, 11 unidades por jugador → transición a GAME
{
    const state = prepDeployment();
    const order0 = state.deploymentOrder![0];   // menor dado, despliega primero
    const order1 = state.deploymentOrder![1];   // mayor dado, activo tras juego

    const pos0 = [
        {q:2,r:0},{q:2,r:-1},{q:2,r:-2},{q:3,r:-2},{q:3,r:-3},{q:3,r:-4},
        {q:4,r:-4},{q:4,r:-5},{q:4,r:-2},{q:3,r:-5},{q:2,r:-5}
    ];
    const pos1 = [
        {q:-2,r:0},{q:-2,r:1},{q:-2,r:2},{q:-3,r:2},{q:-3,r:3},{q:-3,r:4},
        {q:-4,r:4},{q:-4,r:5},{q:-4,r:3},{q:-3,r:5},{q:-2,r:5}
    ];

    const targetPerStep = [1,2,2,2,2,2,2,2,2,2,2,1];
    let i0 = 0, i1 = 0;
    let s: typeof state = state;

    for (let step = 0; step < 12; step++) {
        const player = step % 2 === 0 ? order0 : order1;
        const target = targetPerStep[step];
        const posArr = player === order0 ? pos0 : pos1;
        let idx = player === order0 ? i0 : i1;
        for (let j = 0; j < target; j++, idx++) {
            const pool = s.players[player].unitsToDeploy!;
            const generalInPool = pool.find(e => e.unitClass === 'general');
            const deployed = s.players[player].deployedUnits?.length ?? 0;
            const generalsDeployed = Object.values(s.units).filter(u => u.owner === player && u.class === 'general').length;
            // If 10 units deployed without a general, force deploy general
            const entry = (generalInPool && deployed >= 10 && generalsDeployed === 0) ? generalInPool : pool[0];
            s = applyAction(s, {
                type: 'DEPLOY_UNIT', playerId: player, unitId: entry.unitId,
                position: posArr[idx]
            });
        }
        if (player === order0) i0 = idx; else i1 = idx;
    }

    // Verificar transición
    assertEqual(s.preparationPhase, 'DONE',
        'DEPLOY completo — preparationPhase es DONE');
    assertEqual(s.gamePhase, 'GAME',
        'DEPLOY completo — gamePhase es GAME');
    assertEqual(s.turnPhase, 'MAIN',
        'DEPLOY completo — turnPhase es MAIN (tras DRAW + robar)');
    assertEqual(s.activePlayer, order1,
        'DEPLOY completo — activePlayer es el mayor dado (order[1])');

    // PA y carta del primer jugador
    assertEqual(s.players[order1].actionPoints, 5,
        'DEPLOY completo — activePlayer tiene 5 PA');
    assertEqual(s.players[order1].cardsInHand?.length, 1,
        'DEPLOY completo — activePlayer tiene 1 carta robada');

    // Pool tiene 2 unidades restantes (13−11=2 por jugador)
    assertEqual(s.players[order0].unitsToDeploy?.length, 2,
        'DEPLOY completo — order[0] tiene 2 unidades sin desplegar');
    assertEqual(s.players[order1].unitsToDeploy?.length, 2,
        'DEPLOY completo — order[1] tiene 2 unidades sin desplegar');
    assertEqual(s.players[order0].deployedUnits?.length, 11,
        'DEPLOY completo — order[0] tiene 11 desplegadas');
    assertEqual(s.players[order1].deployedUnits?.length, 11,
        'DEPLOY completo — order[1] tiene 11 desplegadas');
}

{
    // Primera unidad a distancia 1 del centro → rechazada (solo distancia 2 permitida)
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const entry = state.players[deployer].unitsToDeploy![0];
    const reject = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: entry.unitId,
        position: { q: 1, r: 0 }
    });
    assert(reject === state,
        'DEPLOY_UNIT — primera unidad a distancia 1 rechazada');
}

{
    // Desplegar fuera del mapa → rechazado (segunda unidad, para no caer en distancia)
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const other = deployer === 'p1' ? 'p2' : 'p1';
    const e1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: e1.unitId,
        position: { q: 2, r: 0 }
    });
    const e2 = s1.players[other].unitsToDeploy![0];
    const s2 = applyAction(s1, {
        type: 'DEPLOY_UNIT', playerId: other, unitId: e2.unitId,
        position: { q: -2, r: 0 }
    });
    // Deployer coloca su 2ª unidad (step 2) fuera del mapa
    const e3 = s2.players[deployer].unitsToDeploy![0];
    const reject = applyAction(s2, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: e3.unitId,
        position: { q: 10, r: 0 }
    });
    assert(reject === s2,
        'DEPLOY_UNIT — fuera del mapa rechazado');
}
