const P1_COLOR = '#4c1d95';
const P1_LIGHT = '#a78bfa';
const P2_COLOR = '#155e75';
const P2_LIGHT = '#22d3ee';
function ownerColors(owner: string) {
  return owner === 'p1'
    ? { body: P1_COLOR, accent: P1_LIGHT }
    : { body: P2_COLOR, accent: P2_LIGHT };
}

type Props = {
  cls: string;
  owner: string;
};

export function InfantryModel({ cls, owner }: Props) {
  const { body, accent } = ownerColors(owner);
  const isGeneral = cls === 'general';
  const scale = isGeneral ? 1.3 : 1;
  return (
    <group scale={scale}>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[7, 8, 12, 8]} />
        <meshStandardMaterial color={body} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 13, 0]}>
        <sphereGeometry args={[5, 8, 8]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[8, 6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[8, 2, 0.5]} />
        <meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} />
      </mesh>
      {isGeneral && (
        <mesh position={[0, 16, 0]}>
          <coneGeometry args={[3, 4, 6]} />
          <meshStandardMaterial color="#fde047" roughness={0.3} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}

export function ArcherModel({ cls, owner }: Props) {
  const { body, accent } = ownerColors(owner);
  const isGeneral = cls === 'general';
  const scale = isGeneral ? 1.3 : 1;
  return (
    <group scale={scale}>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[6, 7, 12, 8]} />
        <meshStandardMaterial color={body} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 13, 0]}>
        <coneGeometry args={[6, 6, 8]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[8, 8, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.4, 0.4, 10, 6]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.3} metalness={0.3} />
      </mesh>
      {isGeneral && (
        <mesh position={[0, 17, 0]}>
          <coneGeometry args={[3, 4, 6]} />
          <meshStandardMaterial color="#fde047" roughness={0.3} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}

export function CavalryModel({ cls, owner }: Props) {
  const { body, accent } = ownerColors(owner);
  const isGeneral = cls === 'general';
  const scale = isGeneral ? 1.3 : 1;
  return (
    <group scale={scale}>
      <mesh position={[0, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[4, 4, 16, 8]} />
        <meshStandardMaterial color={body} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[5, 6, 8, 8]} />
        <meshStandardMaterial color={body} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 14, 0]}>
        <sphereGeometry args={[4, 8, 8]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.2} />
      </mesh>
      {isGeneral && (
        <mesh position={[0, 17, 0]}>
          <coneGeometry args={[2.5, 4, 6]} />
          <meshStandardMaterial color="#fde047" roughness={0.3} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}

export function LancerModel({ cls, owner }: Props) {
  const { body, accent } = ownerColors(owner);
  const isGeneral = cls === 'general';
  const scale = isGeneral ? 1.3 : 1;
  return (
    <group scale={scale}>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[6, 7, 12, 8]} />
        <meshStandardMaterial color={body} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 13, 0]}>
        <sphereGeometry args={[4.5, 8, 8]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[8, 8, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.3, 0.5, 14, 6]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[8, 2, 0]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.8, 2, 6]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.3} metalness={0.3} />
      </mesh>
      {isGeneral && (
        <mesh position={[0, 16, 0]}>
          <coneGeometry args={[2.5, 4, 6]} />
          <meshStandardMaterial color="#fde047" roughness={0.3} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}
