import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import type { HexCoord } from '@shared';
import { axialToWorld3D, HEX_HEIGHT } from '../game/board3d/hexMath3D';
import { getDecorationInfo, DECORATION_COLORS, EFFECT_TYPES } from './BoardData';
import type { Vector3, EffectConfig } from './BoardData';
import { ShaderEffect } from './effects/ShaderEffect';

type Props = {
  type: string;
  hex: HexCoord;
  hexSize: number;
  tileHeight?: number;
  kind?: 'glb' | 'effect';
  effectConfig?: EffectConfig;
  offset?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  opacity?: number;
  selected?: boolean;
  animationName?: string;
  onClick?: (hex: HexCoord, type: string) => void;
  onAnimations?: (names: string[]) => void;
};

function DecorationFallback({ type }: { type: string }) {
  const color = DECORATION_COLORS[type] ?? '#ffffff';
  return (
    <mesh position={[0, 4, 0]}>
      <dodecahedronGeometry args={[5]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

export function EditorDecoration({ type, hex, hexSize, tileHeight = 1, kind = 'glb', effectConfig, offset, rotation, scale, opacity = 1, selected, animationName, onClick, onAnimations }: Props) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipsRef = useRef<Map<string, THREE.AnimationClip>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const onAnimationsRef = useRef(onAnimations);
  onAnimationsRef.current = onAnimations;
  const CROSS_FADE = 0.3;
  const { x, z } = axialToWorld3D(hex, hexSize);
  const info = getDecorationInfo(type);
  const path = info?.path;
  const baseScale = info?.scale ?? 1;
  const surfaceY = HEX_HEIGHT * tileHeight;

  const off = offset ?? { x: 0, y: 0, z: 0 };
  const rot = rotation ?? { x: 0, y: 0, z: 0 };
  const scl = scale ?? { x: 1, y: 1, z: 1 };
  const avgScale = (scl.x + scl.y + scl.z) / 3 * baseScale;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setModel(null);
    clipsRef.current.clear();
    currentActionRef.current = null;
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;

    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;
        const anims = gltf.animations ?? [];

        for (const clip of anims) {
          clipsRef.current.set(clip.name, clip);
        }

        if (anims.length > 0) {
          const mixer = new THREE.AnimationMixer(scene);
          mixerRef.current = mixer;
        }

        onAnimationsRef.current?.(anims.map(a => a.name));

        if (opacity < 1) {
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const mat of materials) {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.transparent = true;
                  mat.opacity = opacity;
                }
              }
            }
          });
        }

        setModel(scene);
      },
      undefined,
      () => {}
    );

    return () => {
      cancelled = true;
      currentActionRef.current = null;
      mixerRef.current?.stopAllAction();
    };
  }, [path, opacity]);

  useEffect(() => {
    const mixer = mixerRef.current;
    if (!model || !mixer) return;

    if (!animationName) {
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(CROSS_FADE);
        currentActionRef.current = null;
      }
      return;
    }

    let clip = clipsRef.current.get(animationName);
    if (!clip) {
      clip = [...clipsRef.current.values()].find(
        c => c.name.toLowerCase() === animationName.toLowerCase()
      );
    }

    if (currentActionRef.current) {
      currentActionRef.current.fadeOut(CROSS_FADE);
    }

    if (clip) {
      const newAction = mixer.clipAction(clip);
      newAction.reset();
      newAction.fadeIn(CROSS_FADE);
      newAction.play();
      currentActionRef.current = newAction;
    } else {
      currentActionRef.current = null;
    }
  }, [animationName, model]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.(hex, type);
  };

  // Effect rendering
  if (kind === 'effect' && effectConfig && EFFECT_TYPES.includes(type as any)) {
    return (
      <group
        position={[x + (off.x || 0), surfaceY + (off.y || 0), z + (off.z || 0)]}
        rotation={[
          (rot.x || 0) * Math.PI / 180,
          (rot.y || 0) * Math.PI / 180,
          (rot.z || 0) * Math.PI / 180,
        ]}
        onClick={handleClick}
      >
        <ShaderEffect
          type={type as any}
          effectConfig={effectConfig}
          scale={avgScale}
          opacity={opacity}
          selected={selected}
          onClick={() => onClick?.(hex, type)}
        />
      </group>
    );
  }

  // GLB rendering
  const content = path && model ? (
    <primitive object={model} />
  ) : path ? null : (
    <DecorationFallback type={type} />
  );

  return (
    <group
      position={[x + (off.x || 0), surfaceY + (off.y || 0), z + (off.z || 0)]}
      rotation={[
        (rot.x || 0) * Math.PI / 180,
        (rot.y || 0) * Math.PI / 180,
        (rot.z || 0) * Math.PI / 180,
      ]}
      scale={[
        (scl.x || 1) * baseScale,
        (scl.y || 1) * baseScale,
        (scl.z || 1) * baseScale,
      ]}
      onClick={handleClick}
    >
      {selected && (
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[2, 8, 8]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.6} />
        </mesh>
      )}
      {content}
    </group>
  );
}
