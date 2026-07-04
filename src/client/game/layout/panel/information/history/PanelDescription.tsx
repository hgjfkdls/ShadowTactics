import { l } from '@shared/i18n';

export default function PanelDescription({ configId }: { configId: string }) {
    return (
        <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 text-xs text-zinc-300 leading-relaxed">
            {l(`ability.${configId}.desc`)}
        </div>
    );
}
