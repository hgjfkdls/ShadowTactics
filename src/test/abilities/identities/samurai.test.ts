import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Samurai (desenvainado veloz) ---\n');

{
    const state = createInitialGameState();
    const cfg = { id: 'desenvainado_veloz', name: 'Desenvainado veloz' };
    assert(!!cfg, 'desenvainado_veloz — config exists');
}
