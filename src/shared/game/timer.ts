export type TimerPhase =
    | 'IDENTITY_SELECTION'
    | 'REVEAL'
    | 'ROLL'
    | 'ROLL_RESULT'
    | 'DEPLOYMENT'
    | 'DISCARD'
    | 'COUNTER'
    | 'TURN';

export type TimerInfo = {
    phase: TimerPhase;
    remaining: number;
    duration: number;
    playerId?: string;
    isActive?: boolean;
};
