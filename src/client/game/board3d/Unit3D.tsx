import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import type { HexCoord, UnitId } from '@shared';
import { axialToWorld3D } from './hexMath3D';
import { InfantryModel, ArcherModel, CavalryModel, LancerModel } from './UnitModels';
import { PlayerModel } from './PlayerModel';

const USE_BLENDER_MODELS = true;

const UNIT_HEIGHT = 16;

type Props = {
  unitId: UnitId;
  cls: string;
  owner: string;
  hp: number;
  maxHp: number;
  position: HexCoord;
  selected: boolean;
  hovered: boolean;
  animationName?: string;
  onAnimations?: (names: string[]) => void;
  onSelect: (unitId: UnitId) => void;
  onHover: (unitId: string | null) => void;
};

export function Unit3D({
  unitId,
  cls,
  owner,
  hp,
  maxHp,
  position,
  selected,
  hovered,
  animationName,
  onAnimations,
  onSelect,
  onHover,
}: Props) {
  const { x, z } = useMemo(() => axialToWorld3D(position), [position.q, position.r]);

  const model = useMemo(() => {
    if (USE_BLENDER_MODELS) {
      return <PlayerModel cls={cls} owner={owner} animationName={animationName} onAnimations={onAnimations} />;
    }
    const modelProps = { cls, owner };
    switch (cls) {
      case 'infantry': return <InfantryModel {...modelProps} />;
      case 'archer': return <ArcherModel {...modelProps} />;
      case 'cavalry': return <CavalryModel {...modelProps} />;
      case 'lancer': return <LancerModel {...modelProps} />;
      case 'general': return <InfantryModel {...modelProps} />;
      default: return <InfantryModel {...modelProps} />;
    }
  }, [cls, owner, animationName, onAnimations]);

  const hpColor = hp <= 2 ? '#ef4444' : hp <= maxHp * 0.5 ? '#f59e0b' : '#22c55e';

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(unitId);
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        onHover(unitId);
      }}
      onPointerLeave={() => onHover(null)}
    >
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
          <ringGeometry args={[16, 20, 32]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.35} side={2} />
        </mesh>
      )}

      <group position={[0, UNIT_HEIGHT + 8, 0]}>
        <Text
          fontSize={5}
          color="white"
          anchorX="center"
          anchorY="middle"
          strokeColor="#000000"
          strokeWidth={0.5}
        >
          {hp}/{maxHp}
        </Text>
      </group>

      {model}
    </group>
  );
}
