import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';

const CLASS_COLORS: Record<string, string> = {
  infantry: '#60a5fa',
  archer: '#34d399',
  cavalry: '#c084fc',
  lancer: '#fb7185',
  general: '#fbbf24',
};

const MODEL_PATHS: Record<string, string> = {
  infantry: '/models/units/infantry.glb',
  archer: '/models/units/archer.glb',
  cavalry: '/models/units/cavalry.glb',
  lancer: '/models/units/lancer.glb',
  general: '/models/units/general.glb',
};

type Props = { modelClass: string };
type TextureMode = 'flat' | 'embedded' | 'custom';

function HexGround() {
  return (
    <group position={[0, -2, 0]}>
      <mesh>
        <cylinderGeometry args={[40, 40, 4, 6]} />
        <meshStandardMaterial color="#2d2d44" roughness={0.7} metalness={0.1} />
        <Edges color="#4a4a6a" threshold={15} />
      </mesh>
    </group>
  );
}

type ModelHandle = { play: (name: string) => void; stop: () => void };

const Model3D = forwardRef<ModelHandle, {
  path: string;
  cls: string;
  speed: number;
  textureMode: TextureMode;
  customTextureUrl: string | null;
  onAnimations: (list: string[]) => void;
  onCurrent: (name: string | null) => void;
  onEmbeddedTextures: (has: boolean) => void;
}>(({ path, cls, speed, textureMode, customTextureUrl, onAnimations, onCurrent, onEmbeddedTextures }, ref) => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animsRef = useRef<THREE.AnimationClip[]>([]);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const customTextureRef = useRef<THREE.Texture | null>(null);
  const embeddedTexturesRef = useRef<Map<THREE.MeshStandardMaterial, THREE.Texture | null>>(new Map());
  const color = CLASS_COLORS[cls] ?? '#ffffff';
  const CROSS_FADE = 0.3;

  useImperativeHandle(ref, () => ({
    play(name: string) {
      const clip = animsRef.current.find(a => a.name === name);
      const mixer = mixerRef.current;
      if (!clip || !mixer) return;
      const newAction = mixer.clipAction(clip);
      newAction.reset();
      if (currentActionRef.current) {
        newAction.crossFadeFrom(currentActionRef.current, CROSS_FADE, false);
      } else {
        newAction.fadeIn(CROSS_FADE);
      }
      newAction.play();
      currentActionRef.current = newAction;
      onCurrent(name);
    },
    stop() {
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(CROSS_FADE);
        currentActionRef.current = null;
      }
      onCurrent(null);
    },
  }), [onCurrent]);

  useEffect(() => {
    let cancelled = false;
    setModel(null);
    currentActionRef.current = null;
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    embeddedTexturesRef.current.clear();
    onEmbeddedTextures(false);

    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;

        let hasEmbedded = false;
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of materials) {
              if (mat instanceof THREE.MeshStandardMaterial) {
                embeddedTexturesRef.current.set(mat, mat.map ?? null);
                if (mat.map) hasEmbedded = true;
                mat.color.set(color);
              }
            }
          }
        });
        onEmbeddedTextures(hasEmbedded);

        animsRef.current = gltf.animations ?? [];
        onAnimations(animsRef.current.map(a => a.name));

        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(scene);
          mixerRef.current = mixer;
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
  }, [path, color, onAnimations, onEmbeddedTextures]);

  useEffect(() => {
    if (customTextureRef.current) {
      customTextureRef.current.dispose();
      customTextureRef.current = null;
    }

    if (!model) return;

    const meshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });

    function applyFlat() {
      for (const mesh of meshes) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.map = null;
            mat.color.set(color);
            mat.needsUpdate = true;
          }
        }
      }
    }

    function applyEmbedded() {
      for (const mesh of meshes) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            const embedded = embeddedTexturesRef.current.get(mat);
            if (embedded) {
              mat.map = embedded;
              mat.color.set('#ffffff');
            } else {
              mat.map = null;
              mat.color.set(color);
            }
            mat.needsUpdate = true;
          }
        }
      }
    }

    if (textureMode === 'flat') {
      applyFlat();
    } else if (textureMode === 'embedded') {
      applyEmbedded();
    } else if (textureMode === 'custom') {
      applyFlat();
      if (customTextureUrl) {
        let cancelled = false;
        const loader = new THREE.TextureLoader();
        loader.load(
          customTextureUrl,
          (texture) => {
            if (cancelled) return;
            customTextureRef.current = texture;
            for (const mesh of meshes) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const mat of materials) {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.map = texture;
                  mat.color.set('#ffffff');
                  mat.needsUpdate = true;
                }
              }
            }
          },
          undefined,
          () => {}
        );
        return () => { cancelled = true; };
      }
    }
  }, [textureMode, customTextureUrl, model, color]);

  useEffect(() => {
    if (mixerRef.current) mixerRef.current.timeScale = speed;
  }, [speed]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  if (!model) return null;
  return <primitive object={model} />;
});

export function ModelViewer({ modelClass }: Props) {
  const path = MODEL_PATHS[modelClass];
  const color = CLASS_COLORS[modelClass] ?? '#ffffff';
  const modelRef = useRef<ModelHandle>(null);

  const [animNames, setAnimNames] = useState<string[]>([]);
  const [currentAnim, setCurrentAnim] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);

  const [textureMode, setTextureMode] = useState<TextureMode>('flat');
  const [customTextureUrl, setCustomTextureUrl] = useState<string | null>(null);
  const [customTextureName, setCustomTextureName] = useState<string | null>(null);
  const [hasEmbeddedTextures, setHasEmbeddedTextures] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureUrlRef = useRef<string | null>(null);
  textureUrlRef.current = customTextureUrl;

  useEffect(() => {
    return () => {
      if (textureUrlRef.current) URL.revokeObjectURL(textureUrlRef.current);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (customTextureUrl) URL.revokeObjectURL(customTextureUrl);

    const url = URL.createObjectURL(file);
    setCustomTextureUrl(url);
    setCustomTextureName(file.name);
    setTextureMode('custom');
    e.target.value = '';
  };

  const handleRemoveCustomTexture = () => {
    if (customTextureUrl) {
      URL.revokeObjectURL(customTextureUrl);
    }
    setCustomTextureUrl(null);
    setCustomTextureName(null);
    setTextureMode('flat');
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden">
      <header className="border-b border-zinc-800 px-4 py-2 flex items-center gap-4 shrink-0">
        <button
          onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
          className="text-xs text-zinc-500 hover:text-zinc-300 bg-none border-none cursor-pointer"
        >
          ← Back
        </button>
        <span className="font-semibold">Model Preview</span>
        <select
          value={modelClass}
          onChange={e => {
            const cls = e.target.value;
            window.history.pushState({}, '', `/models/${cls}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700 cursor-pointer"
        >
          {Object.keys(MODEL_PATHS).map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <span className="text-xs text-zinc-600">/models/{modelClass}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
          <span className="text-xs text-zinc-500">{color}</span>
        </div>
      </header>

      <div className="flex-1 flex">
        {path ? (
          <>
            <div className="w-[280px] shrink-0 h-full bg-zinc-900/95 border-r border-zinc-800 p-4 flex flex-col gap-3 overflow-auto">
              <div className="text-base font-semibold">Model: {modelClass}</div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full inline-block" style={{ background: color }} />
                <span className="text-xs text-zinc-400">{color}</span>
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <div className="text-sm font-semibold mb-2">Animations</div>
                {animNames.length === 0 && <div className="text-xs text-zinc-600">No animations in this model</div>}
                {animNames.map(name => (
                  <div key={name} className="flex items-center gap-2 mb-1.5">
                    <button
                      onClick={() => modelRef.current?.play(name)}
                      className={`flex-1 text-xs rounded px-2 py-1 text-left border-none cursor-pointer ${currentAnim === name ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                    >
                      {name}
                    </button>
                    {currentAnim === name && (
                      <button
                        onClick={() => modelRef.current?.stop()}
                        className="text-xs bg-red-700 text-white rounded px-2 py-1 border-none cursor-pointer"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <div className="text-sm font-semibold mb-2">Texture</div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="textureMode"
                      checked={textureMode === 'flat'}
                      onChange={() => setTextureMode('flat')}
                      className="cursor-pointer"
                    />
                    Flat Color
                  </label>

                  {hasEmbeddedTextures && (
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="textureMode"
                        checked={textureMode === 'embedded'}
                        onChange={() => setTextureMode('embedded')}
                        className="cursor-pointer"
                      />
                      Embedded Texture
                    </label>
                  )}

                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="textureMode"
                      checked={textureMode === 'custom'}
                      onChange={() => {
                        if (!customTextureUrl) {
                          fileInputRef.current?.click();
                        } else {
                          setTextureMode('custom');
                        }
                      }}
                      className="cursor-pointer"
                    />
                    Custom Texture
                  </label>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {textureMode === 'custom' && !customTextureUrl && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded px-2 py-1 cursor-pointer"
                  >
                    Choose File
                  </button>
                )}

                {customTextureUrl && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-xs text-zinc-400 truncate">{customTextureName}</div>
                    <button
                      onClick={handleRemoveCustomTexture}
                      className="w-full text-xs bg-red-800 text-red-200 hover:bg-red-700 rounded px-2 py-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <div className="text-sm font-semibold mb-2">Speed</div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={speed * 100}
                  onChange={e => setSpeed(Number(e.target.value) / 100)}
                  className="w-full"
                />
                <div className="text-xs text-zinc-500 text-center">{speed.toFixed(2)}x</div>
              </div>
            </div>

            <div className="flex-1 relative">
              <Canvas camera={{ position: [0, 60, 80], fov: 30, near: 1, far: 500 }} className="absolute inset-0">
                <ambientLight intensity={0.6} />
                <directionalLight position={[50, 100, 50]} intensity={1.0} />
                <directionalLight position={[-50, 50, -50]} intensity={0.3} />
                <directionalLight position={[0, -50, 0]} intensity={0.2} />
                <OrbitControls enablePan enableZoom enableRotate target={[0, 12, 0]} minDistance={30} maxDistance={300} />
                <HexGround />
                <Model3D
                  ref={modelRef}
                  path={path}
                  cls={modelClass}
                  speed={speed}
                  textureMode={textureMode}
                  customTextureUrl={customTextureUrl}
                  onAnimations={setAnimNames}
                  onCurrent={setCurrentAnim}
                  onEmbeddedTextures={setHasEmbeddedTextures}
                />
              </Canvas>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-zinc-600">
            No model path for &quot;{modelClass}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
