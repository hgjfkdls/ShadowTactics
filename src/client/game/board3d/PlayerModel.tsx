import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';

const CLASS_COLORS: Record<string, string> = {
  infantry: '#60a5fa',
  archer: '#34d399',
  cavalry: '#c084fc',
  lancer: '#fb7185',
  general: '#fbbf24',
};

type Props = { cls: string; owner: string; animationName?: string; onAnimations?: (names: string[]) => void };

const MODEL_PATHS: Record<string, string | undefined> = {
  infantry: '/models/units/infantry.glb',
  archer: '/models/units/archer.glb',
  cavalry: '/models/units/cavalry.glb',
  lancer: '/models/units/lancer.glb',
  general: '/models/units/general.glb',
};

function SphereFallback({ cls }: { cls: string }) {
  const color = CLASS_COLORS[cls] ?? '#ffffff';
  return (
    <mesh position={[0, 8, 0]}>
      <sphereGeometry args={[8, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
    </mesh>
  );
}

function LoadedModel({ path, cls, animationName, onAnimations }: { path: string; cls: string; animationName?: string; onAnimations?: (names: string[]) => void }) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [error, setError] = useState(false);
  const color = CLASS_COLORS[cls] ?? '#ffffff';
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipsRef = useRef<Map<string, THREE.AnimationClip>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const onAnimationsRef = useRef(onAnimations);
  onAnimationsRef.current = onAnimations;
  const CROSS_FADE = 0.3;

  useEffect(() => {
    let cancelled = false;
    setModel(null);
    setError(false);
    currentActionRef.current = null;
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    clipsRef.current.clear();

    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of materials) {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.color.set(color);
              }
            }
          }
        });

        const anims = gltf.animations ?? [];
        for (const clip of anims) {
          clipsRef.current.set(clip.name, clip);
        }

        if (anims.length > 0) {
          const mixer = new THREE.AnimationMixer(scene);
          mixerRef.current = mixer;
        }

        onAnimationsRef.current?.(anims.map(a => a.name));
        setModel(scene);
      },
      undefined,
      () => setError(true)
    );
    return () => {
      cancelled = true;
      currentActionRef.current = null;
      mixerRef.current?.stopAllAction();
    };
  }, [path, color]);

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

  if (error) return <SphereFallback cls={cls} />;
  if (!model) return null;
  return <primitive object={model} />;
}

export function PlayerModel({ cls, owner: _owner, animationName, onAnimations }: Props) {
  const path = MODEL_PATHS[cls];

  if (!path) {
    return <SphereFallback cls={cls} />;
  }

  return <LoadedModel path={path} cls={cls} animationName={animationName} onAnimations={onAnimations} />;
}
