import { useState, useMemo } from 'react';
import type { TerrainType, UnitClass } from './BoardData';
import { TERRAIN_COLORS, TERRAIN_LABELS, AVAILABLE_DECORATIONS, DECORATION_SHAPES, DECORATION_COLORS, UNIT_CLASSES, AVAILABLE_TEXTURES, EFFECT_DEFAULTS, EFFECT_TYPES } from './BoardData';
import { setDragPayload } from './dragStore';

const HARDCODED_TERRAIN: TerrainType[] = ['grass', 'dirt', 'sand', 'water', 'snow'];
const OWNERS = ['p1', 'p2'];

type Props = {
  selectedOwner: string;
  onOwnerChange: (owner: string) => void;
};

const TERRAIN_FALLBACK_COLORS: Record<string, string> = {
  normal: '#8ca3af',
};

function getTerrainColor(t: string): string {
  return TERRAIN_COLORS[t as TerrainType] ?? TERRAIN_FALLBACK_COLORS[t] ?? '#666666';
}

function getTerrainLabel(t: string): string {
  return TERRAIN_LABELS[t as TerrainType] ?? t.charAt(0).toUpperCase() + t.slice(1);
}

export function EditorPalette({ selectedOwner, onOwnerChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const allTerrains = useMemo(() => {
    const set = new Set(HARDCODED_TERRAIN);
    for (const key of Object.keys(AVAILABLE_TEXTURES)) {
      set.add(key as TerrainType);
    }
    return [...set] as string[];
  }, []);

  const handleTerrainDragStart = (e: React.DragEvent, t: string) => {
    setDragPayload({ type: 'terrain', terrainType: t });
    e.dataTransfer.setData('text/plain', t);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDecorationDragStart = (e: React.DragEvent, id: string, kind: 'glb' | 'effect') => {
    setDragPayload({ type: 'decoration', decorationType: id, kind });
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleUnitDragStart = (e: React.DragEvent, cls: UnitClass) => {
    setDragPayload({ type: 'unit', unitClass: cls, owner: selectedOwner });
    e.dataTransfer.setData('text/plain', cls);
    e.dataTransfer.effectAllowed = 'copy';
  };

  function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    const isOpen = !collapsed[id];
    return (
      <div>
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center gap-2 text-sm font-semibold mb-2 cursor-pointer bg-none border-none text-zinc-300 hover:text-white text-left"
        >
          <span className="text-xs w-3 shrink-0">{isOpen ? '\u25BC' : '\u25B6'}</span>
          {label}
        </button>
        {isOpen && children}
      </div>
    );
  }

  return (
    <div className="w-[220px] shrink-0 h-full bg-zinc-900/95 border-r border-zinc-800 p-3 flex flex-col gap-4 overflow-auto">

      <Section id="terrain" label="Terrain">
        <div className="grid grid-cols-2 gap-1.5">
          {allTerrains.map(t => (
            <div
              key={t}
              draggable
              onDragStart={e => handleTerrainDragStart(e, t)}
              className="flex items-center gap-2 text-xs rounded px-2 py-1.5 cursor-grab active:cursor-grabbing select-none bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: getTerrainColor(t) }} />
              {getTerrainLabel(t)}
            </div>
          ))}
        </div>
      </Section>

      <Section id="decorations" label="Decorations">
        <div className="flex flex-col gap-1.5">
          {AVAILABLE_DECORATIONS.map(d => (
            <div
              key={d.id}
              draggable
              onDragStart={e => handleDecorationDragStart(e, d.id, 'glb')}
              className="flex items-center gap-2 text-xs rounded px-2 py-1.5 cursor-grab active:cursor-grabbing select-none bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 text-sm leading-none" style={{ color: DECORATION_COLORS[d.id] ?? '#fff' }}>
                {DECORATION_SHAPES[d.id] ?? '\u25CF'}
              </span>
              {d.name}
            </div>
          ))}
          {EFFECT_TYPES.map(id => {
            const def = EFFECT_DEFAULTS[id];
            return (
              <div
                key={id}
                draggable
                onDragStart={e => handleDecorationDragStart(e, id, 'effect')}
                className="flex items-center gap-2 text-xs rounded px-2 py-1.5 cursor-grab active:cursor-grabbing select-none bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                <span className="text-sm" style={{ color: def.shapeColor }}>{def.shape}</span>
                {def.label}
              </div>
            );
          })}
          {AVAILABLE_DECORATIONS.length === 0 && EFFECT_TYPES.length === 0 && (
            <div className="text-xs text-zinc-600">No decorations available</div>
          )}
        </div>
      </Section>

      <Section id="units" label="Units">
        <div className="flex gap-2 mb-3">
          {OWNERS.map(o => (
            <button
              key={o}
              onClick={() => onOwnerChange(o)}
              className={`flex-1 text-xs rounded px-2 py-1 cursor-pointer border-none
                ${selectedOwner === o ? 'ring-2 ring-blue-500' : ''}
                ${o === 'p1' ? 'bg-purple-900 text-purple-200' : 'bg-cyan-900 text-cyan-200'}
                hover:opacity-80`}
            >
              {o.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {UNIT_CLASSES.map(cls => (
            <div
              key={cls}
              draggable
              onDragStart={e => handleUnitDragStart(e, cls)}
              className="flex items-center gap-2 text-xs rounded px-2 py-1.5 cursor-grab active:cursor-grabbing select-none bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              <span className="capitalize">{cls}</span>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}
