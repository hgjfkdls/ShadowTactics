import { l } from '@shared/i18n';

export default function PanelSource({ entry, cls }: { entry: any; cls: (c: string) => string }) {
    const srcId = entry.sourceId ?? entry.attackerId ?? entry.unitId;
    const srcClass = entry.sourceClass ?? entry.unitClass ?? entry.attackerClass;
    const srcName = entry.sourceIdentityKey ? l(`identity.${entry.sourceIdentityKey}.name`) || entry.sourceIdentityKey : entry.sourceIdentity;
    if (!srcClass) return null;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-400 font-semibold">{l('cardDetail.source')}</span>
            <span className="text-zinc-200">{srcId ? `[${srcId}]` : ''}{cls(srcClass)}{srcName ? ` · ${srcName}` : ''}</span>
        </div>
    );
}
