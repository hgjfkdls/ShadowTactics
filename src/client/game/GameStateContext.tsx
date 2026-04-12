import { createContext, useContext } from "react";
import { useGameState } from "./useGameState";

type GameContextValue = ReturnType<typeof useGameState>;
const GameStateContext = createContext<GameContextValue | null>(null);

type GameStateProviderProps = {
    children: React.ReactNode;
};

export function GameStateProvider({ children }: GameStateProviderProps) {
    const game = useGameState();
    return (
        <GameStateContext.Provider value={game}>
            {children}
        </GameStateContext.Provider>
    );
}

export function useGame() {
    const ctx = useContext(GameStateContext);

    if (!ctx) {
        throw new Error('useGame debe usarse dentro de GameStateProvider.');
    }
    
    return ctx;
}