import { useMemo, useEffect, useState, useRef } from 'react';
import { Mesh, Float32BufferAttribute } from 'three';
import { Edges } from '@react-three/drei';
import type { HexCoord } from '@shared';
import { axialToWorld3D, HEX_HEIGHT } from '../game/board3d/hexMath3D';
import type { TileData, TerrainType } from './BoardData';
import { getTerrainTexture, getTerrainNormalTexture, getTerrainAOTexture } from './textureGenerator';

const OWNER_COLORS: Record<string, string> = { p1: '#a78bfa', p2: '#22d3ee' };

type Props = {
  hex: HexCoord;
  tileData: TileData;
  hexSize: number;
  hovered: boolean;
  dropTarget: boolean;
  selected: boolean;
  onHover: (hex: HexCoord | null) => void;
  onClick: (hex: HexCoord) => void;
};

export function EditorTile({ hex, tileData, hexSize, hovered, dropTarget, selected, onHover, onClick }: Props) {
  const [localHovered, setLocalHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const { x, z } = useMemo(() => axialToWorld3D(hex, hexSize), [hex, hexSize]);

  const isHovered = hovered || localHovered || dropTarget || selected;
  const height = HEX_HEIGHT * (tileData.height || 1);
  const terrain = tileData.terrain as TerrainType;
  const texOff = tileData.texOffset ?? { x: 0, y: 0 };
  const texScl = tileData.texScale ?? 1;
  const texture = getTerrainTexture(terrain, hexSize, texOff, texScl);
  const normalTex = getTerrainNormalTexture(terrain);
  const normalScale = tileData.texNormal ?? 1;
  const aoTex = getTerrainAOTexture(terrain);
  const aoIntensity = tileData.texAO ?? 1;

  useEffect(() => {
    if (!aoTex) return;
    const geo = meshRef.current?.geometry;
    if (!geo || geo.attributes.uv2) return;
    const uv = geo.attributes.uv;
    if (!uv) return;
    geo.setAttribute('uv2', new Float32BufferAttribute(uv.array.slice(), 2));
  }, [aoTex]);

  return (
    <group position={[x, height / 2, z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(hex); }}
        onPointerEnter={(e) => { e.stopPropagation(); setLocalHovered(true); onHover(hex); }}
        onPointerLeave={() => { setLocalHovered(false); onHover(null); }}
      >
        <cylinderGeometry args={[hexSize, hexSize, height, 6]} />
        <meshStandardMaterial
          key={`mat_${hex.q}_${hex.r}_${normalScale}_${aoIntensity}_${texScl}_${texOff.x}_${texOff.y}`}
          map={texture}
          color="#ffffff"
          roughness={0.8}
          metalness={0}
          normalMap={normalTex}
          normalScale={normalScale}
          aoMap={aoTex}
          aoMapIntensity={aoIntensity}
        />
        <Edges color="#4a4a6a" threshold={15} />
      </mesh>

      {(isHovered || dropTarget) && (
        <mesh position={[0, height / 2 + 0.2, 0]}>
          <cylinderGeometry args={[hexSize * 0.9, hexSize * 0.9, 0.3, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={dropTarget ? 0.4 : 0.15} />
        </mesh>
      )}

      {tileData.owner && (
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 6]} position={[0, height / 2 + 0.05, 0]}>
          <ringGeometry args={[hexSize - 5, hexSize - 2, 6]} />
          <meshBasicMaterial color={OWNER_COLORS[tileData.owner] ?? '#ffffff'} transparent opacity={0.5} side={2} />
        </mesh>
      )}
    </group>
  );
}
