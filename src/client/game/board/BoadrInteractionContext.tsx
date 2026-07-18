import { createContext, useContext } from "react";
import { useBoardInteraction } from "./useBoardInteraction";

type BoadrInteractionValue = ReturnType<typeof useBoardInteraction>;
const BoadrInteractionContext = createContext<BoadrInteractionValue | null>(null);

type GameStateProviderProps = {
    children: React.ReactNode;
};

export function BoardInteractionProvider({ children }: GameStateProviderProps) {
    const board = useBoardInteraction();
    return (
        <BoadrInteractionContext.Provider value={board}>
            {children}
        </BoadrInteractionContext.Provider>
    );
}

export function useBoard() {
    const ctx = useContext(BoadrInteractionContext);

    if (!ctx) {
        throw new Error('useBoard debe usarse dentro de BoardInteractionProvider.');
    }
    
    return ctx;
}