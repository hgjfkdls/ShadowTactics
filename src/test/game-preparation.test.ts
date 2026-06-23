import { assert, assertEqual } from './shared';
import { createInitialGameState } from '../shared/game/init';
import { applyAction } from '../shared/game/reducer';

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
    assert(typeof r2.diceRolls['p2'] === 'number',
        'ROLL_DICE — p2 obtiene un número');

    // RNG avanza en cada tirada (incluso en empate)
    assert(r2.rngSeed !== r1.rngSeed,
        'ROLL_DICE — semilla RNG se consumió en p2');

    if (r2.diceRolls['p1'] !== r2.diceRolls['p2']) {
        assert(r2.preparationPhase === 'DEPLOYMENT',
            'ROLL_DICE — avanza a DEPLOYMENT si no hay empate');

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
    } else {
        assert(r2.diceRolls['p1'] === undefined &&
               r2.diceRolls['p2'] === undefined,
            'ROLL_DICE — empate reinicia dados a undefined');
        assertEqual(r2.preparationPhase, 'ROLL',
            'ROLL_DICE — sigue en ROLL tras empate');
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
    assertEqual(state.preparationPhase, 'DEPLOYMENT',
        'deployment setup — fase DEPLOYMENT');

    const deployer = state.currentDeployingPlayer!;
    const unitId = state.players[deployer].unitsToDeploy![0];

    // Primera unidad debe estar a rango 2 del centro
    const first = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: deployer,
        unitId,
        position: { q: 2, r: 0 },
        class: 'infantry'
    });
    assert(first.units[unitId] !== undefined,
        'DEPLOY_UNIT — primera unidad colocada en rango 2');
    assertEqual(first.players[deployer].unitsToDeploy?.length, 10,
        'DEPLOY_UNIT — una unidad menos en pool');
    assertEqual(first.players[deployer].deployedUnits?.length, 1,
        'DEPLOY_UNIT — una unidad en deployed');
}

{
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const unitId = state.players[deployer].unitsToDeploy![0];

    // Primera unidad NO puede estar en rango != 2
    const bad = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: deployer,
        unitId,
        position: { q: 0, r: 0 },
        class: 'infantry'
    });
    assert(bad === state,
        'DEPLOY_UNIT — primera unidad en centro es rechazada');
}

{
    // No se puede desplegar más de 3 unidades de la misma clase
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;   // P1 (step 0, coloca 1)
    const other = deployer === 'p1' ? 'p2' : 'p1';

    function deploy(s: typeof state, p: string, q: number, r: number, cls: string) {
        const uid = s.players[p].unitsToDeploy![0];
        return applyAction(s, {
            type: 'DEPLOY_UNIT',
            playerId: p,
            unitId: uid,
            position: { q, r },
            class: cls
        });
    }

    // Step 0: deployer coloca 1
    let s = deploy(state, deployer, 2, 0, 'infantry');

    // Step 1: other coloca 2
    s = deploy(s, other, -2, 0, 'infantry');
    s = deploy(s, other, -2, 1, 'infantry');

    // Step 2: deployer coloca 2 (2ª y 3ª infantería suya)
    s = deploy(s, deployer, 2, -1, 'infantry');
    s = deploy(s, deployer, 2, -2, 'infantry');

    // Step 3: other coloca 2
    s = deploy(s, other, -2, -1, 'lancer');
    s = deploy(s, other, -2, -2, 'lancer');

    // Step 4: deployer intenta 4ª infantería → rechazado
    const reject = deploy(s, deployer, 2, 1, 'infantry');
    assert(reject === s,
        'DEPLOY_UNIT — 4ª unidad misma clase rechazada');
}

{
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const unitId = state.players[deployer].unitsToDeploy![0];

    const r = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: 'p1',
        unitId,
        position: { q: 2, r: 0 },
        class: 'infantry'
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
    const u1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT',
        playerId: deployer,
        unitId: u1,
        position: { q: 2, r: 0 },
        class: 'infantry'
    });

    const u2 = state.players[other].unitsToDeploy![0];
    const s2 = applyAction(s1, {
        type: 'DEPLOY_UNIT',
        playerId: other,
        unitId: u2,
        position: { q: -2, r: 0 },
        class: 'infantry'
    });

    // Ambos desplegaron 1
    assertEqual(s2.players[deployer].deployedUnits?.length, 1,
        'DEPLOY_UNIT — turno alternado funciona');
}

{
    // Hex ocupado: no se puede colocar sobre otra unidad
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const u1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: u1,
        position: { q: 2, r: 0 }, class: 'infantry'
    });
    const u2 = s1.players[deployer].unitsToDeploy![0];
    const reject = applyAction(s1, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: u2,
        position: { q: 2, r: 0 }, class: 'infantry'
    });
    assert(reject === s1,
        'DEPLOY_UNIT — hex ocupado es rechazado');
}

{
    // Segunda unidad sin aliado cerca → rechazada
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const u1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: u1,
        position: { q: 2, r: 0 }, class: 'infantry'
    });
    const u2 = s1.players[deployer].unitsToDeploy![0];
    const reject = applyAction(s1, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: u2,
        position: { q: 5, r: 0 }, class: 'infantry'
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
        position: { q: 2, r: 0 }, class: 'infantry'
    });
    assert(reject === state,
        'DEPLOY_UNIT — unitId no en pool es rechazada');
}

{
    // Máximo 1 general por jugador
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const other = deployer === 'p1' ? 'p2' : 'p1';

    function dp(s: typeof state, p: string, q: number, r: number, cls: string) {
        const uid = s.players[p].unitsToDeploy![0];
        return applyAction(s, { type: 'DEPLOY_UNIT', playerId: p, unitId: uid, position: { q, r }, class: cls });
    }

    let s = dp(state, deployer, 2, 0, 'infantry');                                 // step 0
    s = dp(s, other, -2, 0, 'infantry'); s = dp(s, other, -2, 1, 'infantry');     // step 1
    s = dp(s, deployer, 2, -1, 'general');                                         // step 2 — 1er general
    const reject = dp(s, deployer, 2, -2, 'general');                              // step 2 — 2º → rechazado
    assert(reject === s,
        'DEPLOY_UNIT — 2º general mismo jugador rechazado');
}

{
    // Última unidad sin general → debe ser general
    const state = prepDeployment();
    const order0 = state.deploymentOrder![0];
    const order1 = state.deploymentOrder![1];

    function d(s: typeof state, p: string, q: number, r: number, cls: string) {
        const uid = s.players[p].unitsToDeploy![0];
        return applyAction(s, { type: 'DEPLOY_UNIT', playerId: p, unitId: uid, position: { q, r }, class: cls });
    }

    let s = state;
    // Step 0: order0 → 1
    s = d(s, order0, 2, 0, 'infantry');
    // Step 1: order1 → 2
    s = d(s, order1, -2, 0, 'infantry'); s = d(s, order1, -2, 1, 'infantry');
    // Step 2: order0 → 2
    s = d(s, order0, 2, -1, 'lancer'); s = d(s, order0, 2, -2, 'lancer');
    // Step 3: order1 → 2
    s = d(s, order1, -2, 2, 'archer'); s = d(s, order1, -2, -1, 'archer');
    // Step 4: order0 → 2
    s = d(s, order0, 3, -2, 'archer'); s = d(s, order0, 3, -3, 'archer');
    // Step 5: order1 → 2
    s = d(s, order1, -3, 2, 'cavalry'); s = d(s, order1, -3, 3, 'cavalry');
    // Step 6: order0 → 2
    s = d(s, order0, 3, -4, 'cavalry'); s = d(s, order0, 4, -4, 'cavalry');
    // Step 7: order1 → 2 (lancer, lancer — no repetir infantería)
    s = d(s, order1, -4, 4, 'lancer'); s = d(s, order1, -4, 5, 'lancer');
    // Step 8: order0 → 2 (10ª desplegada, 1 restante, sin general)
    s = d(s, order0, 4, -5, 'infantry');
    s = d(s, order0, 4, -6, 'infantry');
    // Step 9: order1 → 2 (avanzar turno para que order0 vuelva en step 10)
    s = d(s, order1, -4, 6, 'infantry'); s = d(s, order1, -3, 5, 'lancer');
    // Step 10: order0 tiene 2 restantes, 0 generales
    // Primera unidad: archer → aceptada (remaining=2, no hay constraint)
    const first10 = s.players[order0].unitsToDeploy![0];
    s = applyAction(s, {
        type: 'DEPLOY_UNIT', playerId: order0, unitId: first10,
        position: { q: 3, r: -5 }, class: 'archer'
    });
    // Segunda unidad: 1 restante, sin general
    const lastId = s.players[order0].unitsToDeploy![0];
    const reject = applyAction(s, {
        type: 'DEPLOY_UNIT', playerId: order0, unitId: lastId,
        position: { q: 2, r: -5 }, class: 'cavalry'  // cavalry=2 <3, general=0
    });
    assert(reject === s,
        'DEPLOY_UNIT — última unidad sin general rechazada');

    const accept = applyAction(s, {
        type: 'DEPLOY_UNIT', playerId: order0, unitId: lastId,
        position: { q: 2, r: -5 }, class: 'general'
    });
    assert(accept !== s && accept.players[order0].deployedUnits!.length === 11,
        'DEPLOY_UNIT — última unidad como general aceptada');
}

// Despliegue completo: 12 pasos, 11 unidades por jugador → transición a GAME
{
    const state = prepDeployment();
    const order0 = state.deploymentOrder![0];   // menor dado, despliega primero
    const order1 = state.deploymentOrder![1];   // mayor dado, activo tras juego

    const pos0: {q:number,r:number}[] = [
        {q:2,r:0},{q:2,r:-1},{q:2,r:-2},{q:3,r:-2},{q:3,r:-3},{q:3,r:-4},
        {q:4,r:-4},{q:4,r:-5},{q:4,r:-6},{q:3,r:-5},{q:2,r:-5}
    ];
    const pos1: {q:number,r:number}[] = [
        {q:-2,r:0},{q:-2,r:1},{q:-2,r:2},{q:-3,r:2},{q:-3,r:3},{q:-3,r:4},
        {q:-4,r:4},{q:-4,r:5},{q:-4,r:6},{q:-3,r:5},{q:-2,r:5}
    ];

    // Clases sin exceder 3 por tipo, general antes del final
    const cls0 = ['infantry','infantry','lancer','lancer','archer','archer','cavalry','cavalry','archer','general','infantry'];
    const cls1 = ['infantry','lancer','archer','cavalry','infantry','lancer','archer','cavalry','general','infantry','lancer'];

    const targetPerStep = [1,2,2,2,2,2,2,2,2,2,2,1];
    let i0 = 0, i1 = 0;
    let s: typeof state = state;

    for (let step = 0; step < 12; step++) {
        const player = step % 2 === 0 ? order0 : order1;
        const target = targetPerStep[step];
        for (let j = 0; j < target; j++) {
            const idx = player === order0 ? i0++ : i1++;
            const pos = player === order0 ? pos0 : pos1;
            const cls = player === order0 ? cls0 : cls1;
            const uid = s.players[player].unitsToDeploy![0];
            s = applyAction(s, {
                type: 'DEPLOY_UNIT', playerId: player, unitId: uid,
                position: pos[idx], class: cls[idx]
            });
        }
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

    // Pool vacío
    assertEqual(s.players[order0].unitsToDeploy?.length, 0,
        'DEPLOY completo — order[0] sin unidades pendientes');
    assertEqual(s.players[order1].unitsToDeploy?.length, 0,
        'DEPLOY completo — order[1] sin unidades pendientes');
    assertEqual(s.players[order0].deployedUnits?.length, 11,
        'DEPLOY completo — order[0] tiene 11 desplegadas');
    assertEqual(s.players[order1].deployedUnits?.length, 11,
        'DEPLOY completo — order[1] tiene 11 desplegadas');
}

{
    // Primera unidad a distancia 1 del centro → rechazada (solo distancia 2 permitida)
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const uid = state.players[deployer].unitsToDeploy![0];
    const reject = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: uid,
        position: { q: 1, r: 0 }, class: 'infantry'
    });
    assert(reject === state,
        'DEPLOY_UNIT — primera unidad a distancia 1 rechazada');
}

{
    // Desplegar fuera del mapa → rechazado (segunda unidad, para no caer en distancia)
    const state = prepDeployment();
    const deployer = state.currentDeployingPlayer!;
    const other = deployer === 'p1' ? 'p2' : 'p1';
    const u1 = state.players[deployer].unitsToDeploy![0];
    const s1 = applyAction(state, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: u1,
        position: { q: 2, r: 0 }, class: 'infantry'
    });
    const u2 = s1.players[other].unitsToDeploy![0];
    const s2 = applyAction(s1, {
        type: 'DEPLOY_UNIT', playerId: other, unitId: u2,
        position: { q: -2, r: 0 }, class: 'infantry'
    });
    // Deployer coloca su 2ª unidad (step 2) fuera del mapa
    const u3 = s2.players[deployer].unitsToDeploy![0];
    const reject = applyAction(s2, {
        type: 'DEPLOY_UNIT', playerId: deployer, unitId: u3,
        position: { q: 10, r: 0 }, class: 'infantry'
    });
    assert(reject === s2,
        'DEPLOY_UNIT — fuera del mapa rechazado');
}
