import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EffectType, EffectConfig } from '../BoardData';

type Props = {
  type: EffectType;
  effectConfig: EffectConfig;
  scale: number;
  opacity?: number;
  selected?: boolean;
  onClick?: () => void;
};

const FRAGMENT_SHADERS: Record<EffectType, string> = {
  fire: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uOpacity;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.8;
      float n1 = hash(uv * 4.0 + t);
      float n2 = hash(uv * 8.0 - t * 1.3);
      float mask = 1.0 - uv.y;
      float flame = mask + (n1 * 0.3 + n2 * 0.2) * mask;
      flame = clamp(flame * uIntensity, 0.0, 1.0);
      vec3 color = mix(uColor, vec3(1.0, 0.9, 0.4), uv.y + n1 * 0.2);
      float alpha = smoothstep(0.0, 0.6, flame) * uOpacity;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(color, alpha);
    }
  `,
  smoke: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uOpacity;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.3;
      float n1 = hash(uv * 3.0 + t);
      float n2 = hash(uv * 5.0 - t * 0.7 + 1.0);
      float n3 = hash(uv * 7.0 + t * 0.5 + 2.0);
      float mask = uv.y;
      float smoke = mask + (n1 * 0.4 + n2 * 0.3 + n3 * 0.2) * mask;
      smoke = clamp(smoke * uIntensity * 0.8, 0.0, 1.0);
      float alpha = smoothstep(0.0, 0.3, smoke) * smoothstep(1.0, 0.4, smoke) * uOpacity;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  sparks: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uOpacity;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 1.5;
      float mask = 1.0 - uv.y;
      float spark = 0.0;
      for (int i = 0; i < 5; i++) {
        vec2 pos = vec2(
          hash(vec2(float(i), 0.0)),
          hash(vec2(float(i), 1.0))
        );
        float phase = hash(vec2(float(i), 2.0)) * 6.28;
        float speed = 0.8 + hash(vec2(float(i), 3.0)) * 0.5;
        pos.x += sin(t * speed + phase) * 0.3;
        pos.y += t * 0.15 * speed;
        float d = length(uv - pos);
        float size = 0.03 + hash(vec2(float(i), 4.0)) * 0.04;
        float p = smoothstep(size, 0.0, d) * mask;
        p *= 0.5 + 0.5 * sin(t * 3.0 + phase);
        spark += p;
      }
      spark = clamp(spark * uIntensity, 0.0, 1.0);
      float alpha = spark * uOpacity;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  fog: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uOpacity;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.2;
      float n1 = hash(uv * 2.0 + t);
      float n2 = hash(uv * 3.0 - t * 0.6);
      float n3 = hash(uv * 5.0 + t * 0.4);
      float fog = (n1 * 0.4 + n2 * 0.3 + n3 * 0.3) * uIntensity;
      float alpha = smoothstep(0.0, 0.2, fog) * smoothstep(1.0, 0.5, fog) * uOpacity;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
};

export function ShaderEffect({ type, effectConfig, scale, opacity = 1, selected, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(effectConfig.color) },
    uIntensity: { value: effectConfig.intensity },
    uOpacity: { value: opacity },
  });

  const size = 10 * scale;

  useFrame((state, delta) => {
    const u = uniformsRef.current;
    u.uTime.value += delta;
    u.uColor.value.set(effectConfig.color);
    u.uIntensity.value = effectConfig.intensity;
    if (effectConfig.billboard && groupRef.current) {
      groupRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  const shaderMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: uniformsRef.current,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: FRAGMENT_SHADERS[type],
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [type]);

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        <planeGeometry args={[size, size]} />
        <primitive object={shaderMat} attach="material" />
      </mesh>
      {selected && (
        <mesh position={[0, size / 2 + 1, 0]}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
