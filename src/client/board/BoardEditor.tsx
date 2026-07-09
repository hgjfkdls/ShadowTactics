import { useEffect, useState, useRef, useCallback } from 'react';
import type { HexCoord } from '@shared';
import { generateHexMap } from '@shared';
import { BoardCanvas } from '../game/board3d/BoardCanvas';
import { Unit3D } from '../game/board3d/Unit3D';
import type { BoardData, TileData, TerrainType, DecorationType, UnitClass, EffectConfig } from './BoardData';
import { createBoardData, exportBoard, importBoard, generateAllHexes, defaultTile, EFFECT_DEFAULTS, EFFECT_TYPES } from './BoardData';
import { HEX_HEIGHT, HEX_SIZE, axialToWorld3D } from '../game/board3d/hexMath3D';
import { setAvailableTextures } from './textureGenerator';
import { AVAILABLE_TEXTURES } from './availableTextures';
import { EditorTile } from './EditorTile';
import { EditorDecoration } from './EditorDecorations';
import { DragDropHandler } from './EditorDragDrop';
import { EditorPalette } from './EditorPalette';
import { EditorInfoPanel } from './EditorInfoPanel';
import type { SelectedInfo } from './EditorInfoPanel';
import { SceneLighting } from './SceneLighting';

let nextUnitId = 1;

export function BoardEditor() {
  const [boardData, setBoardData] = useState<BoardData>(() => createBoardData(5));
  const [boardName, setBoardName] = useState(boardData.name);
  const [radius, setRadius] = useState(boardData.radius);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [selectedOwner, setSelectedOwner] = useState('p1');
  const [cameraMode, setCameraMode] = useState<'orthographic' | 'perspective'>('orthographic');
  const [selectedInfo, setSelectedInfo] = useState<SelectedInfo>(null);
  const [dragHoverHex, setDragHoverHex] = useState<HexCoord | null>(null);
  const [animNames, setAnimNames] = useState<Record<string, string[]>>({});
  const [currentAnim, setCurrentAnim] = useState<Record<string, string | null>>({});
  const [showLighting, setShowLighting] = useState(false);
  const [, forceUpdate] = useState(0);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvailableTextures(AVAILABLE_TEXTURES);
    forceUpdate(n => n + 1);
  }, []);

  const hexSize = boardData.hexSize;
  const hexes = generateHexMap({ radius });
  const tiles = boardData.tiles;
  const units = boardData.units;

  const updateTile = useCallback((key: string, updater: (t: TileData) => TileData) => {
    setBoardData(prev => ({
      ...prev,
      tiles: { ...prev.tiles, [key]: updater(prev.tiles[key] ?? defaultTile()) },
    }));
  }, []);

  const handleHexClick = useCallback((hex: HexCoord) => {
    setSelectedInfo(prev =>
      prev?.type === 'tile' && prev.hex.q === hex.q && prev.hex.r === hex.r
        ? null
        : { type: 'tile', hex }
    );
  }, []);

  const handleUnitClick = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    setSelectedInfo(prev =>
      prev?.type === 'unit' && prev.unit.id === unitId
        ? null
        : { type: 'unit', unit }
    );
  }, [units]);

  const handleDecorationClick = useCallback((hex: HexCoord, index: number) => {
    setSelectedInfo(prev =>
      prev?.type === 'decoration' && prev.hex.q === hex.q && prev.hex.r === hex.r && prev.decorationIndex === index
        ? null
        : { type: 'decoration', hex, decorationIndex: index }
    );
  }, []);

  const handleDropTerrain = useCallback((terrainType: string, hex: HexCoord) => {
    const key = `${hex.q},${hex.r}`;
    updateTile(key, t => ({ ...t, terrain: terrainType as TerrainType }));
  }, [updateTile]);

  const handleDropUnit = useCallback((unitClass: UnitClass, owner: string, hex: HexCoord) => {
    setBoardData(prev => {
      const existingIdx = prev.units.findIndex(u => u.position.q === hex.q && u.position.r === hex.r);
      if (existingIdx >= 0) return prev;
      return {
        ...prev,
        units: [...prev.units, { id: `editor_unit_${nextUnitId++}`, class: unitClass, owner, position: hex }],
      };
    });
  }, []);

  const handleDropDecoration = useCallback((decorationType: string, hex: HexCoord, kind?: 'glb' | 'effect') => {
    const key = `${hex.q},${hex.r}`;
    const isEffect = kind === 'effect' || EFFECT_TYPES.includes(decorationType as any);
    const effectDefaults = isEffect ? EFFECT_DEFAULTS[decorationType as 'fire'] : undefined;
    updateTile(key, t => ({
      ...t,
      decorations: [...t.decorations, {
        id: decorationType,
        kind: isEffect ? 'effect' : 'glb',
        offset: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        effectConfig: isEffect ? {
          color: effectDefaults?.color ?? '#ff4400',
          intensity: effectDefaults?.intensity ?? 1,
          billboard: true,
        } : undefined,
      }],
    }));
  }, [updateTile]);

  const handleUnitAnimations = useCallback((unitId: string, names: string[]) => {
    setAnimNames(prev => ({ ...prev, [unitId]: names }));
  }, []);

  const handleUnitPlayAnim = useCallback((unitId: string, name: string) => {
    setCurrentAnim(prev => ({ ...prev, [unitId]: prev[unitId] === name ? null : name }));
  }, []);

  const handleDecoAnimations = useCallback((key: string, names: string[]) => {
    setAnimNames(prev => ({ ...prev, [key]: names }));
  }, []);

  const handleDecoPlayAnim = useCallback((key: string, name: string) => {
    setCurrentAnim(prev => ({ ...prev, [key]: prev[key] === name ? null : name }));
  }, []);

  const handleRemoveUnit = useCallback((unitId: string) => {
    setBoardData(prev => ({
      ...prev,
      units: prev.units.filter(u => u.id !== unitId),
    }));
    setSelectedInfo(null);
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    if (newRadius < 0 || newRadius > 10) return;
    setRadius(newRadius);
    setBoardData(prev => {
      const allHexes = generateAllHexes(newRadius);
      const tiles = { ...prev.tiles };
      for (const hex of allHexes) {
        const key = `${hex.q},${hex.r}`;
        if (!tiles[key]) tiles[key] = defaultTile();
      }
      for (const key of Object.keys(tiles)) {
        const [q, r] = key.split(',').map(Number);
        if (!allHexes.some(h => h.q === q && h.r === r)) delete tiles[key];
      }
      return { ...prev, radius: newRadius, tiles };
    });
  };

  const handleHexSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(100, hexSize + delta));
    setBoardData(prev => ({ ...prev, hexSize: newSize }));
  };

  const handleExport = () => {
    exportBoard({ ...boardData, name: boardName, radius });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try {
        const data = importBoard(text);
        if (!data.hexSize) data.hexSize = 40;
        setBoardData(data);
        setBoardName(data.name);
        setRadius(data.radius);
      } catch {
        alert('Invalid board file');
      }
    });
    e.target.value = '';
  };

  const handleClear = () => {
    setBoardData(createBoardData(radius));
    setSelectedInfo(null);
  };

  const flatDecorations: { hex: HexCoord; deco: TileData['decorations'][0]; index: number; tileData: TileData }[] = [];
  for (const hex of hexes) {
    const tileData = tiles[`${hex.q},${hex.r}`];
    if (tileData?.decorations) {
      for (let i = 0; i < tileData.decorations.length; i++) {
        flatDecorations.push({ hex, deco: tileData.decorations[i], index: i, tileData });
      }
    }
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden">
      <header className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 shrink-0 text-xs">
        <button
          onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
          className="text-zinc-500 hover:text-zinc-300 bg-none border-none cursor-pointer"
        >
          ← Back
        </button>
        <span className="font-semibold">Board Editor</span>

        <input
          value={boardName}
          onChange={e => setBoardName(e.target.value)}
          className="bg-zinc-800 text-zinc-200 rounded px-2 py-1 border border-zinc-700 w-40 text-xs"
        />

        <div className="flex items-center gap-1">
          <span className="text-zinc-500">Radius:</span>
          <button onClick={() => handleRadiusChange(radius - 1)} className="bg-zinc-800 hover:bg-zinc-700 rounded px-1.5 py-0.5 cursor-pointer border-none text-xs">-</button>
          <span className="w-6 text-center text-xs">{radius}</span>
          <button onClick={() => handleRadiusChange(radius + 1)} className="bg-zinc-800 hover:bg-zinc-700 rounded px-1.5 py-0.5 cursor-pointer border-none text-xs">+</button>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <span className="text-zinc-500">Size:</span>
          <button onClick={() => handleHexSizeChange(-5)} className="bg-zinc-800 hover:bg-zinc-700 rounded px-1.5 py-0.5 cursor-pointer border-none text-xs">-</button>
          <span className="w-8 text-center text-xs">{hexSize}</span>
          <button onClick={() => handleHexSizeChange(5)} className="bg-zinc-800 hover:bg-zinc-700 rounded px-1.5 py-0.5 cursor-pointer border-none text-xs">+</button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCameraMode(m => m === 'orthographic' ? 'perspective' : 'orthographic')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-2 py-1 cursor-pointer border-none text-xs"
          >
            {cameraMode === 'orthographic' ? 'Persp' : 'Isom'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowLighting(s => !s)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-2 py-1 cursor-pointer border-none text-xs"
            >
              Light
            </button>
            {showLighting && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded p-3 flex flex-col gap-2 z-50 shadow-xl">
                {(['ambientIntensity', 'keyIntensity', 'fillIntensity'] as const).map(key => {
                  const label = key === 'ambientIntensity' ? 'Ambient' : key === 'keyIntensity' ? 'Key' : 'Fill';
                  const val = boardData.lighting[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-400 w-14 shrink-0">{label}</span>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={val}
                        onChange={e => setBoardData(prev => ({ ...prev, lighting: { ...prev.lighting, [key]: Number(e.target.value) } }))}
                        className="flex-1"
                      />
                      <span className="text-zinc-500 w-6 text-right">{val.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <span className="text-zinc-600">{hexes.length} hexes | {units.length} units | {flatDecorations.length} decorations</span>
          <button onClick={handleClear} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded px-2 py-1 cursor-pointer border-none text-xs">Clear</button>
          <button onClick={handleExport} className="bg-blue-700 hover:bg-blue-600 text-white rounded px-2 py-1 cursor-pointer border-none text-xs">Export</button>
          <input ref={importInputRef} type="file" accept=".board.json" className="hidden" onChange={handleImport} />
          <button onClick={() => importInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-2 py-1 cursor-pointer border-none text-xs">Import</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <EditorPalette
          selectedOwner={selectedOwner}
          onOwnerChange={setSelectedOwner}
        />

        <div className="flex-1 relative">
          <BoardCanvas cameraMode={cameraMode}>
            <SceneLighting config={boardData.lighting} />
            {hexes.map(hex => (
              <EditorTile
                key={`${hex.q},${hex.r}`}
                hex={hex}
                tileData={tiles[`${hex.q},${hex.r}`] ?? defaultTile()}
                hexSize={hexSize}
                hovered={hoveredHex?.q === hex.q && hoveredHex?.r === hex.r}
                dropTarget={dragHoverHex?.q === hex.q && dragHoverHex?.r === hex.r}
                selected={
                  (selectedInfo?.type === 'tile' && selectedInfo.hex.q === hex.q && selectedInfo.hex.r === hex.r) ||
                  (selectedInfo?.type === 'unit' && selectedInfo.unit.position.q === hex.q && selectedInfo.unit.position.r === hex.r) ||
                  (selectedInfo?.type === 'decoration' && selectedInfo.hex.q === hex.q && selectedInfo.hex.r === hex.r)
                }
                onHover={setHoveredHex}
                onClick={handleHexClick}
              />
            ))}

            {flatDecorations.map(({ hex, deco, index, tileData }) => {
              const decoKey = `deco_${hex.q}_${hex.r}_${index}`;
              return (
                <EditorDecoration
                  key={decoKey}
                  type={deco.id}
                  hex={hex}
                  hexSize={hexSize}
                  tileHeight={tileData.height || 1}
                  kind={deco.kind}
                  effectConfig={deco.effectConfig}
                  offset={deco.offset}
                  rotation={deco.rotation}
                  scale={deco.scale}
                  animationName={currentAnim[decoKey] ?? undefined}
                  selected={selectedInfo?.type === 'decoration' && selectedInfo.hex.q === hex.q && selectedInfo.hex.r === hex.r && selectedInfo.decorationIndex === index}
                  onClick={(h, _t) => handleDecorationClick(h, index)}
                  onAnimations={names => handleDecoAnimations(decoKey, names)}
                />
              );
            })}

            {units.map(unit => {
              const unitTile = tiles[`${unit.position.q},${unit.position.r}`];
              const unitSurfaceY = HEX_HEIGHT * (unitTile?.height ?? 1);
              const defaultPos = axialToWorld3D(unit.position, HEX_SIZE);
              const customPos = axialToWorld3D(unit.position, hexSize);
              return (
                <group key={unit.id} position={[customPos.x - defaultPos.x, unitSurfaceY, customPos.z - defaultPos.z]}>
                  <Unit3D
                    unitId={unit.id}
                    cls={unit.class}
                    owner={unit.owner}
                    hp={10}
                    maxHp={10}
                    position={unit.position}
                    animationName={currentAnim[unit.id] ?? undefined}
                    selected={selectedInfo?.type === 'unit' && selectedInfo.unit.id === unit.id}
                    hovered={false}
                    onSelect={handleUnitClick}
                    onHover={() => {}}
                    onAnimations={names => handleUnitAnimations(unit.id, names)}
                  />
                </group>
              );
            })}

            <DragDropHandler
              radius={radius}
              hexSize={hexSize}
              onDropTerrain={handleDropTerrain}
              onDropUnit={handleDropUnit}
              onDropDecoration={handleDropDecoration}
              onDragHover={setDragHoverHex}
            />
          </BoardCanvas>
        </div>

        <EditorInfoPanel
          selectedInfo={selectedInfo}
          tiles={tiles}
          units={units}
          animNames={animNames}
          currentAnim={currentAnim}
          onUpdateTile={updateTile}
          onRemoveUnit={handleRemoveUnit}
          onPlayUnitAnim={handleUnitPlayAnim}
          onPlayDecoAnim={handleDecoPlayAnim}
        />
      </div>
    </div>
  );
}
