import type { GameState } from '@shared';
import { l } from '@shared/i18n';

export default function PanelDefender({ entry, state, cls }: { entry: any; state: GameState; cls: (c: string) => string }) {
    if (entry.attackerId == null) return null;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-red-400 font-semibold">{l('attackDetail.defender')}</span>
            <span className="text-zinc-200">[{entry.targetId}]{cls(entry.targetClass)}</span>
        </div>
    );
}
