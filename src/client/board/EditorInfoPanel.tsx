import { useState, useEffect } from 'react';
import type { HexCoord } from '@shared';
import type { TileData, TerrainType, PlacedUnit, Vector3, Vector2, TileDecoration } from './BoardData';
import { TERRAIN_COLORS, TERRAIN_LABELS, getDecorationInfo, DECORATION_COLORS, DECORATION_SHAPES, EFFECT_DEFAULTS, defaultTile } from './BoardData';

export type SelectedInfo =
  | { type: 'tile'; hex: HexCoord }
  | { type: 'unit'; unit: PlacedUnit }
  | { type: 'decoration'; hex: HexCoord; decorationIndex: number }
  | null;

type Props = {
  selectedInfo: SelectedInfo;
  tiles: Record<string, TileData>;
  units: PlacedUnit[];
  animNames: Record<string, string[]>;
  currentAnim: Record<string, string | null>;
  onUpdateTile?: (key: string, updater: (t: TileData) => TileData) => void;
  onRemoveUnit?: (unitId: string) => void;
  onPlayUnitAnim?: (unitId: string, name: string) => void;
  onPlayDecoAnim?: (key: string, name: string) => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-sm font-semibold text-zinc-300">{title}</div>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-zinc-500 w-3 text-xs">{label}</span>
      <input
        type="number"
        step="0.1"
        value={local}
        onChange={e => {
          const raw = e.target.value;
          setLocal(raw);
          const num = parseFloat(raw);
          if (!isNaN(num)) onChange(num);
        }}
        onBlur={() => setLocal(String(value))}
        className="flex-1 bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 border border-zinc-700 text-xs w-full"
      />
    </div>
  );
}

function VectorInput({ label, value, onChange }: { label: string; value: Vector3; onChange: (v: Vector3) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex gap-1">
        <NumberInput label="X" value={value.x} onChange={x => onChange({ ...value, x })} />
        <NumberInput label="Y" value={value.y} onChange={y => onChange({ ...value, y })} />
        <NumberInput label="Z" value={value.z} onChange={z => onChange({ ...value, z })} />
      </div>
    </div>
  );
}

function getTileData(tiles: Record<string, TileData>, hex: HexCoord): TileData {
  return tiles[`${hex.q},${hex.r}`] ?? defaultTile();
}

type TileInfoProps = {
  hex: HexCoord;
  tiles: Record<string, TileData>;
  units: PlacedUnit[];
  onUpdateTile?: (key: string, updater: (t: TileData) => TileData) => void;
  onRemoveUnit?: (unitId: string) => void;
};

function TileInfo({ hex, tiles, units, onUpdateTile, onRemoveUnit }: TileInfoProps) {
  const key = `${hex.q},${hex.r}`;
  const tileData = getTileData(tiles, hex);
  const tileUnits = units.filter(u => u.position.q === hex.q && u.position.r === hex.r);

  return (
    <>
      <SectionTitle title="Tile" />
      <Field label="Position" value={`(${hex.q}, ${hex.r})`} />
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500">Terrain</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: TERRAIN_COLORS[tileData.terrain as TerrainType] ?? '#fff' }} />
          <span className="text-zinc-200">{TERRAIN_LABELS[tileData.terrain as TerrainType] ?? tileData.terrain}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500 shrink-0">Height</span>
        <input
          type="number"
          step="0.1"
          min={1}
          value={tileData.height}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onUpdateTile?.(key, t => ({ ...t, height: Math.max(1, v) }));
          }}
          className="flex-1 bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 border border-zinc-700 text-xs"
        />
      </div>
      <Field label="Owner" value={tileData.owner ?? '—'} />
      <Field label="Blocked" value={tileData.blocked ? 'Yes' : 'No'} />

      <div className="border-t border-zinc-800 pt-2 mt-1">
        <div className="text-xs font-semibold text-zinc-400 mb-1">Texture</div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Offset</span>
            <div className="flex gap-1">
              <NumberInput label="X" value={tileData.texOffset?.x ?? 0} onChange={x => onUpdateTile?.(key, t => ({ ...t, texOffset: { x, y: tileData.texOffset?.y ?? 0 } }))} />
              <NumberInput label="Y" value={tileData.texOffset?.y ?? 0} onChange={y => onUpdateTile?.(key, t => ({ ...t, texOffset: { x: tileData.texOffset?.x ?? 0, y } }))} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 shrink-0">Scale</span>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={tileData.texScale ?? 1}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onUpdateTile?.(key, t => ({ ...t, texScale: Math.max(0.1, v) }));
              }}
              className="flex-1 bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 border border-zinc-700 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 shrink-0">Normal</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={tileData.texNormal ?? 1}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onUpdateTile?.(key, t => ({ ...t, texNormal: Math.max(0, v) }));
              }}
              className="flex-1 bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 border border-zinc-700 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 shrink-0">AO</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={tileData.texAO ?? 1}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onUpdateTile?.(key, t => ({ ...t, texAO: Math.max(0, v) }));
              }}
              className="flex-1 bg-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 border border-zinc-700 text-xs"
            />
          </div>
          <button
            onClick={() => onUpdateTile?.(key, t => ({ ...t, texOffset: { x: 0, y: 0 }, texScale: 1, texNormal: 1, texAO: 1 }))}
            className="mt-1 w-full text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded px-2 py-0.5 cursor-pointer border-none"
          >
            Reset Texture
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-2">
        <div className="text-xs font-semibold text-zinc-400 mb-1">Decorations ({tileData.decorations.length})</div>
        {tileData.decorations.length === 0 && <div className="text-xs text-zinc-600">None</div>}
        {tileData.decorations.map((d, i) => {
          const info = getDecorationInfo(d.id);
          return (
            <div key={i} className="flex items-center gap-2 text-xs mb-1">
              <span className="text-zinc-300 truncate flex-1">{info?.name ?? d.id}</span>
              <button
                onClick={() => onUpdateTile?.(key, t => ({
                  ...t,
                  decorations: t.decorations.filter((_, idx) => idx !== i),
                }))}
                className="text-red-400 hover:text-red-300 bg-none border-none cursor-pointer shrink-0"
              >
                x
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-800 pt-2">
        <div className="text-xs font-semibold text-zinc-400 mb-1">Units ({tileUnits.length})</div>
        {tileUnits.length === 0 && <div className="text-xs text-zinc-600">None</div>}
        {tileUnits.map(u => (
          <div key={u.id} className="flex items-center gap-2 text-xs mb-1">
            <span className="text-zinc-300 truncate flex-1 capitalize">{u.owner.toUpperCase()} {u.class}</span>
            <button
              onClick={() => onRemoveUnit?.(u.id)}
              className="text-red-400 hover:text-red-300 bg-none border-none cursor-pointer shrink-0"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onUpdateTile?.(key, () => defaultTile())}
        className="mt-2 w-full text-xs bg-red-800 text-red-200 hover:bg-red-700 rounded px-2 py-1 cursor-pointer border-none"
      >
        Reset Tile
      </button>
    </>
  );
}

type UnitInfoProps = {
  unit: PlacedUnit;
  animNames: string[];
  currentAnim: string | null;
  onPlayAnim?: (name: string) => void;
  onRemoveUnit?: (unitId: string) => void;
};

function UnitInfo({ unit, animNames, currentAnim, onPlayAnim, onRemoveUnit }: UnitInfoProps) {
  return (
    <>
      <SectionTitle title="Unit" />
      <Field label="Class" value={unit.class} />
      <Field label="Owner" value={unit.owner.toUpperCase()} />
      <Field label="Position" value={`(${unit.position.q}, ${unit.position.r})`} />

      {animNames.length > 0 && (
        <div className="border-t border-zinc-800 pt-2 mt-1">
          <div className="text-xs font-semibold text-zinc-400 mb-1">Animations</div>
          <div className="flex flex-wrap gap-1">
            {animNames.map(name => (
              <button
                key={name}
                onClick={() => onPlayAnim?.(name)}
                className={`text-[10px] rounded px-1.5 py-0.5 cursor-pointer border-none ${
                  currentAnim === name ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onRemoveUnit?.(unit.id)}
        className="mt-2 w-full text-xs bg-red-800 text-red-200 hover:bg-red-700 rounded px-2 py-1 cursor-pointer border-none"
      >
        Remove Unit
      </button>
    </>
  );
}

type DecorationInfoProps = {
  hex: HexCoord;
  decorationIndex: number;
  tiles: Record<string, TileData>;
  animNames: string[];
  currentAnim: string | null;
  onPlayAnim?: (name: string) => void;
  onUpdateTile?: (key: string, updater: (t: TileData) => TileData) => void;
};

function DecorationInfo({ hex, decorationIndex, tiles, animNames, currentAnim, onPlayAnim, onUpdateTile }: DecorationInfoProps) {
  const key = `${hex.q},${hex.r}`;
  const tileData = getTileData(tiles, hex);
  const deco: TileDecoration | undefined = tileData.decorations[decorationIndex];
  const info = deco ? getDecorationInfo(deco.id) : undefined;

  if (!deco) {
    return (
      <>
        <SectionTitle title="Decoration" />
        <div className="text-xs text-zinc-600">Decoration not found</div>
      </>
    );
  }

  const shape = DECORATION_COLORS[deco.id] ?? '#fff';
  const color = DECORATION_COLORS[deco.id] ?? '#fff';

  return (
    <>
      <SectionTitle title="Decoration" />
      <div className="flex items-center gap-2 text-xs">
        <span className="text-sm" style={{ color }}>{shape}</span>
        <span className="text-zinc-200">{info?.name ?? deco.id}</span>
        <span className="text-zinc-600">#{decorationIndex + 1}</span>
      </div>
      <Field label="Position" value={`(${hex.q}, ${hex.r})`} />

      {animNames.length > 0 && (
        <div className="border-t border-zinc-800 pt-2 mt-1">
          <div className="text-xs font-semibold text-zinc-400 mb-1">Animations</div>
          <div className="flex flex-wrap gap-1">
            {animNames.map(name => (
              <button
                key={name}
                onClick={() => onPlayAnim?.(name)}
                className={`text-[10px] rounded px-1.5 py-0.5 cursor-pointer border-none ${
                  currentAnim === name ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-2 mt-1">
        <VectorInput
          label="Offset"
          value={deco.offset}
          onChange={v => onUpdateTile?.(key, t => ({
            ...t,
            decorations: t.decorations.map((d, i) => i === decorationIndex ? { ...d, offset: v } : d),
          }))}
        />
        <div className="mt-2">
          <VectorInput
            label="Rotation"
            value={deco.rotation}
            onChange={v => onUpdateTile?.(key, t => ({
              ...t,
              decorations: t.decorations.map((d, i) => i === decorationIndex ? { ...d, rotation: v } : d),
            }))}
          />
        </div>
        <div className="mt-2">
          <VectorInput
            label="Scale"
            value={deco.scale}
            onChange={v => onUpdateTile?.(key, t => ({
              ...t,
              decorations: t.decorations.map((d, i) => i === decorationIndex ? { ...d, scale: v } : d),
            }))}
          />
        </div>
        {deco.kind === 'effect' && deco.effectConfig && (
          <div className="border-t border-zinc-800 pt-2 mt-2">
            <div className="text-xs font-semibold text-zinc-400 mb-1">Effect</div>
            <div className="flex items-center gap-2 text-xs mb-1.5">
              <span className="text-zinc-500 shrink-0">Color</span>
              <input
                type="color"
                value={deco.effectConfig.color}
                onChange={e => onUpdateTile?.(key, t => ({
                  ...t,
                  decorations: t.decorations.map((d, i) => i === decorationIndex ? { ...d, effectConfig: { ...d.effectConfig!, color: e.target.value } } : d),
                }))}
                className="w-full h-5 rounded cursor-pointer bg-zinc-800 border-none"
              />
            </div>
            <div className="flex items-center gap-2 text-xs mb-1.5">
              <span className="text-zinc-500 shrink-0">Intensity</span>
              <input
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={deco.effectConfig.intensity}
                onChange={e => onUpdateTile?.(key, t => ({
                  ...t,
                  decorations: t.decorations.map((d, i) => i === decorationIndex ? { ...d, effectConfig: { ...d.effectConfig!, intensity: Number(e.target.value) } } : d),
                }))}
                className="flex-1"
              />
              <span className="text-zinc-500 w-6 text-right text-xs">{deco.effectConfig.intensity.toFixed(2)}</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deco.effectConfig.billboard}
                onChange={e => onUpdateTile?.(key, t => ({
                  ...t,
                  decorations: t.decorations.map((d, i) => i === decorationIndex ? { ...d, effectConfig: { ...d.effectConfig!, billboard: e.target.checked } } : d),
                }))}
                className="cursor-pointer"
              />
              Billboard
            </label>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          const effectDefaults = deco.kind === 'effect' && deco.id ? EFFECT_DEFAULTS[deco.id as 'fire'] : undefined;
          onUpdateTile?.(key, t => ({
            ...t,
            decorations: t.decorations.map((d, i) =>
              i === decorationIndex ? {
                ...d,
                offset: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                effectConfig: effectDefaults ? { color: effectDefaults.color, intensity: effectDefaults.intensity, billboard: true } : d.effectConfig,
              } : d
            ),
          }));
        }}
        className="mt-2 w-full text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded px-2 py-0.5 cursor-pointer border-none"
      >
        Reset Transform
      </button>

      <button
        onClick={() => onUpdateTile?.(key, t => ({
          ...t,
          decorations: t.decorations.filter((_, i) => i !== decorationIndex),
        }))}
        className="mt-2 w-full text-xs bg-red-800 text-red-200 hover:bg-red-700 rounded px-2 py-1 cursor-pointer border-none"
      >
        Remove Decoration
      </button>
    </>
  );
}

export function EditorInfoPanel({ selectedInfo, tiles, units, animNames, currentAnim, onUpdateTile, onRemoveUnit, onPlayUnitAnim, onPlayDecoAnim }: Props) {
  return (
    <div className="w-[220px] shrink-0 h-full bg-zinc-900/95 border-l border-zinc-800 p-3 flex flex-col gap-2 overflow-auto">
      {selectedInfo ? (
        selectedInfo.type === 'tile' ? <TileInfo hex={selectedInfo.hex} tiles={tiles} units={units} onUpdateTile={onUpdateTile} onRemoveUnit={onRemoveUnit} /> :
        selectedInfo.type === 'unit' ? (
          <UnitInfo
            unit={selectedInfo.unit}
            animNames={animNames[selectedInfo.unit.id] ?? []}
            currentAnim={currentAnim[selectedInfo.unit.id] ?? null}
            onPlayAnim={name => onPlayUnitAnim?.(selectedInfo.unit.id, name)}
            onRemoveUnit={onRemoveUnit}
          />
        ) : (
          <DecorationInfo
            hex={selectedInfo.hex}
            decorationIndex={selectedInfo.decorationIndex}
            tiles={tiles}
            animNames={animNames[`deco_${selectedInfo.hex.q}_${selectedInfo.hex.r}_${selectedInfo.decorationIndex}`] ?? []}
            currentAnim={currentAnim[`deco_${selectedInfo.hex.q}_${selectedInfo.hex.r}_${selectedInfo.decorationIndex}`] ?? null}
            onPlayAnim={name => onPlayDecoAnim?.(`deco_${selectedInfo.hex.q}_${selectedInfo.hex.r}_${selectedInfo.decorationIndex}`, name)}
            onUpdateTile={onUpdateTile}
          />
        )
      ) : (
        <div className="text-sm text-zinc-500 mt-4 text-center">Seleccione un elemento</div>
      )}
    </div>
  );
}
