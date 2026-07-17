import { useState } from 'react';
import { l } from '@shared/i18n';

function StatCell({ iconSrc, label, value }: { iconSrc: string; label: string; value: string | number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img src={iconSrc} alt="" className="w-10 h-10" />
      <span className="text-sm font-bold">{value}</span>
      {hovered && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-[10px] text-zinc-200 font-semibold uppercase whitespace-nowrap z-10 pointer-events-none shadow-lg">
          {label}
        </div>
      )}
    </div>
  );
}

export function StatsGrid({ hp, maxHp, shield, attack, difficulty, range, movement }: {
  hp: number; maxHp: number; shield?: number; attack: number; difficulty: number; range: number; movement: number;
}) {
  const sh = shield ?? 0;
  const hasShield = sh > 0;
  const displayMax = hasShield ? (hp + sh > maxHp ? hp + sh : maxHp) : maxHp;
  const hpPct = hp / maxHp;
  const hpColor = hpPct > 0.5 ? 'bg-green-500' : hpPct > 0.25 ? 'bg-yellow-500' : 'bg-red-500';
  const hpWidth = Math.round((hp / displayMax) * 100);
  const shieldWidth = hasShield ? Math.max(1, Math.round(((sh === 1 ? 2 : sh) / displayMax) * 100)) : 0;

  return (
    <div className="space-y-2">
      {/* Panel 1: HP */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
        <div className="mb-1.5">
          <StatCell iconSrc="/icons/stats/hp_icon.png" label={l('unitDetail.hp')} value={hasShield ? `${hp}+${sh}/${maxHp}` : `${hp}/${maxHp}`} />
        </div>
        <div className="w-full h-2.5 bg-zinc-700 relative overflow-hidden rounded">
          {hasShield && (
            <div className="absolute h-full bg-zinc-100/60 rounded" style={{ width: `${Math.min(100, hpWidth + shieldWidth)}%` }} />
          )}
          <div className={`absolute h-full rounded ${hpColor}`} style={{ width: `${hpWidth}%` }} />
        </div>
      </div>

      {/* Panel 2: Atk, Diff, Range, Mov — 2x2 grid */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2">
          <StatCell iconSrc="/icons/stats/atk_icon.png" label={l('unitDetail.attack')} value={attack} />
          <StatCell iconSrc="/icons/stats/diff_icon.png" label={l('unitDetail.difficulty')} value={difficulty} />
          <StatCell iconSrc="/icons/stats/range_icon.png" label={l('unitDetail.range')} value={range} />
          <StatCell iconSrc="/icons/stats/mov_icon.png" label={l('unitDetail.movement')} value={movement} />
        </div>
      </div>
    </div>
  );
}
