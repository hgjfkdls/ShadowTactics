import type { GameState, GameAction } from '@shared';
import type { SelectedInfo } from '../../RightPanel';

export type { SelectedInfo };

export type PanelProps = {
    state: GameState;
    playerId: string;
    selectedInfo: SelectedInfo;
    sendAction?: (action: GameAction) => void;
    children?: React.ReactNode;
};

export type { GameState, GameAction };
