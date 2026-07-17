import { useState } from 'react';
import { l } from '@shared/i18n';
import { ABILITIES } from '@shared/game/data/abilities';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import AbilityIcon from '../../../../icons/AbilityIcon';

function abilityName(abId: string, fallback: string): string {
  const t = l(`ability.${abId}.name`);
  return t && t !== `ability.${abId}.name` ? t : fallback;
}

function abilityDesc(abId: string, fallback: string): string {
  const t = l(`ability.${abId}.desc`);
  return t && t !== `ability.${abId}.desc` ? t : fallback;
}

function abilityRestriction(abId: string): string | null {
  const t = l(`ability.${abId}.restriction`);
  return t && t !== `ability.${abId}.restriction` ? t : null;
}

function DescriptionBox({ abId }: { abId: string }) {
  const ab = ABILITIES[abId];
  if (!ab) return null;
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[9px] font-mono text-zinc-500">
          {ab.type === 'active' ? `⚡${ab.cost ?? '?'}PA` : '🔰'}
        </span>
        <span className="font-semibold text-zinc-200">
          {abilityName(abId, ab.name) || ab.name}
        </span>
      </div>
      <div className="text-[11px] text-zinc-300 leading-relaxed">
        {abilityDesc(abId, ab.description) || ab.description}
      </div>
      {(() => {
        const restriction = abilityRestriction(abId);
        if (!restriction) return null;
        return (
          <div className="text-[10px] text-effect-diff/80 italic">{restriction}</div>
        );
      })()}
      <div className="text-[9px] text-zinc-500">
        {ab.type === 'active' ? l('unitDetail.typeActive') : l('unitDetail.typePassive')}
        {ab.cost !== undefined ? ` · ${l('unitDetail.costLabel', { n: ab.cost })}` : ''}
      </div>
    </div>
  );
}

function IdentityDescriptionBox({ header, description }: { header: string; description: string }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-zinc-200">{header}</span>
      </div>
      <div className="text-[11px] text-zinc-300 leading-relaxed">{description}</div>
    </div>
  );
}

export type IdentityIconData = {
  abilityId?: string;
  header: string;
  description: string;
};

export default function AbilityGrid({ abilities, identityIcons, identityExcludeIds: excludeIds }: {
  abilities: string[];
  identityIcons?: IdentityIconData[];
  identityExcludeIds?: string[];
}) {
  const visible = abilities.filter(abId => !(ABILITY_CONFIG[abId] as any)?.uiHidden);
  const exclude = new Set(excludeIds ?? []);
  const classVisible = visible.filter(abId => !exclude.has(abId));

  const [selectedAb, setSelectedAb] = useState<string>(classVisible[0] ?? '');
  const [selectedIdentityIdx, setSelectedIdentityIdx] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const showIdentity = identityIcons && identityIcons.length > 0;

  return (
    <div className="space-y-2">
      {showIdentity && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">
            {l('unitDetail.identityAbilities')}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {identityIcons!.map((item, idx) => {
              const isSelected = selectedIdentityIdx === idx;
              const hasAbility = !!item.abilityId;
              const tooltip = hoveredId === `id-${idx}` ? (hasAbility ? abilityName(item.abilityId!, item.header) || item.header : item.header) : null;
              return (
                <div key={idx} className="relative flex flex-col items-center">
                  <button
                    onClick={() => { setSelectedIdentityIdx(idx); setSelectedAb(''); }}
                    onMouseEnter={() => setHoveredId(`id-${idx}`)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`rounded-lg p-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-700 ring-1 ring-yellow-500'
                        : 'bg-zinc-800/60 hover:bg-zinc-700/80'
                    }`}
                  >
                    {hasAbility ? (
                      <AbilityIcon abilityId={item.abilityId!} size={40} />
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="11" fill="var(--color-class-general)" stroke="var(--color-gold)" strokeWidth="1.5" />
                        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{idx === 0 ? 'S' : 'G'}</text>
                      </svg>
                    )}
                  </button>
                  <div className="text-[10px] text-zinc-500 mt-1 text-center leading-tight">
                    {item.header.startsWith('Especial') ? '👑' : '🌍'}
                  </div>
                  {tooltip && (
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      {tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {classVisible.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">
            {l('unitDetail.abilities')}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {classVisible.map(abId => {
              const ab = ABILITIES[abId];
              if (!ab) return null;
              const isSelected = abId === selectedAb;
              const tooltip = hoveredId === abId ? (abilityName(abId, ab.name) || ab.name) : null;
              return (
                <div key={abId} className="relative flex flex-col items-center">
                  <button
                    onClick={() => { setSelectedAb(abId); setSelectedIdentityIdx(null); }}
                    onMouseEnter={() => setHoveredId(abId)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`rounded-lg p-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-700 ring-1 ring-blue-500'
                        : 'bg-zinc-800/60 hover:bg-zinc-700/80'
                    }`}
                  >
                    <AbilityIcon abilityId={abId} size={40} />
                  </button>
                  <div className="text-[10px] text-zinc-500 mt-1 text-center leading-tight">
                    {ab.type === 'active' ? `⚡${ab.cost ?? '?'}` : '🔰'}
                  </div>
                  {tooltip && (
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      {tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description box always at bottom */}
      {selectedIdentityIdx !== null && identityIcons && (
        <IdentityDescriptionBox
          header={identityIcons[selectedIdentityIdx].header}
          description={identityIcons[selectedIdentityIdx].description}
        />
      )}
      {selectedAb && ABILITIES[selectedAb] && selectedIdentityIdx === null && (
        <DescriptionBox abId={selectedAb} />
      )}
    </div>
  );
}
