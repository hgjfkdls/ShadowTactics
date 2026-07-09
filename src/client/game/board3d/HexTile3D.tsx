import { useMemo, useState, useRef } from 'react';
import { Mesh, CylinderGeometry } from 'three';
import { Edges } from '@react-three/drei';
import type { HexCoord } from '@shared';
import { HEX_SIZE, HEX_HEIGHT, axialToWorld3D } from './hexMath3D';

const PLAYER_COLORS: Record<string, string> = { p1: '#a78bfa', p2: '#22d3ee' };

const COLORS = {
  default: '#2d2d44',
  defaultStroke: '#4a4a6a',
  hover: '#3a3a5a',
  move: '#1a3a2a',
  attack: '#3a1a1a',
  identityTarget: '#3a2a1a',
  allyTarget: '#1a2a3a',
  range: '#2a2a3a',
  highlighted: '#3a3a1a',
  enemyDeployable: '#2a1a1a',
  moveOverlay: '#4ade80',
  attackOverlay: '#f87171',
  rangeOverlay: '#94a3b4',
  identityOverlay: '#fbbf24',
  buffOverlay: '#60a5fa',
  historyOverlay: '#facc15',
};

type Props = {
  hex: HexCoord;
  hovered: boolean;
  selected: boolean;
  reachable: boolean;
  attackable: boolean;
  identityTarget: boolean;
  allyTarget: boolean;
  inRange: boolean;
  enemyDeployable: boolean;
  highlighted: boolean;
  owner?: string;
  onHover: (hex: HexCoord | null) => void;
  onClick: (hex: HexCoord) => void;
};

export function HexTile3D({
  hex,
  hovered,
  selected,
  reachable,
  attackable,
  identityTarget,
  allyTarget,
  inRange,
  enemyDeployable,
  highlighted,
  owner,
  onHover,
  onClick,
}: Props) {
  const [localHovered, setLocalHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);
  const { x, z } = useMemo(() => axialToWorld3D(hex), [hex]);

  const isHovered = hovered || localHovered;

  const baseColor = selected
    ? COLORS.default
    : attackable
      ? COLORS.attack
      : identityTarget
        ? COLORS.identityTarget
        : allyTarget
          ? COLORS.allyTarget
          : reachable
            ? COLORS.move
            : isHovered
              ? COLORS.hover
              : COLORS.default;

  const showOverlay = reachable || attackable || inRange || identityTarget || allyTarget || highlighted || enemyDeployable;

  const overlayColor = attackable
    ? COLORS.attackOverlay
    : identityTarget
      ? COLORS.identityOverlay
      : allyTarget
        ? COLORS.buffOverlay
        : reachable
          ? COLORS.moveOverlay
          : highlighted
            ? COLORS.historyOverlay
            : COLORS.rangeOverlay;

  const height = selected ? HEX_HEIGHT * 1.5 : isHovered ? HEX_HEIGHT * 1.2 : HEX_HEIGHT;

  const geoArgs: [number, number, number, number] = [HEX_SIZE, HEX_SIZE, height, 6];

  return (
    <group position={[x, -height / 2, z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(hex);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setLocalHovered(true);
          onHover(hex);
        }}
        onPointerLeave={() => {
          setLocalHovered(false);
          onHover(null);
        }}
      >
        <cylinderGeometry args={geoArgs} />
        <meshStandardMaterial color={baseColor} roughness={0.7} metalness={0.1} />
        <Edges color={COLORS.defaultStroke} threshold={15} />
      </mesh>

      {showOverlay && (
        <mesh position={[0, height / 2 + 0.1, 0]}>
          <cylinderGeometry args={[HEX_SIZE * 0.9, HEX_SIZE * 0.9, 0.3, 6]} />
          <meshBasicMaterial color={overlayColor} transparent opacity={0.35} />
        </mesh>
      )}

      {owner && (
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 6]} position={[0, height / 2 + 0.05, 0]}>
          <ringGeometry args={[HEX_SIZE - 5, HEX_SIZE - 2, 6]} />
          <meshBasicMaterial color={PLAYER_COLORS[owner] ?? '#ffffff'} transparent opacity={0.7} side={2} />
        </mesh>
      )}
    </group>
  );
}
