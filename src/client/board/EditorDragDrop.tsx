import { useEffect, useRef, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { HexCoord } from '@shared';
import { axialToWorld3D } from '../game/board3d/hexMath3D';
import { isInsideMap, TERRAIN_COLORS } from './BoardData';
import type { UnitClass, TerrainType } from './BoardData';
import { EditorDecoration } from './EditorDecorations';
import { getDragPayload, clearDragPayload } from './dragStore';
import type { DragPayload } from './dragStore';

type Props = {
  radius: number;
  hexSize: number;
  onDropTerrain: (terrainType: string, hex: HexCoord) => void;
  onDropUnit: (unitClass: UnitClass, owner: string, hex: HexCoord) => void;
  onDropDecoration: (decorationType: string, hex: HexCoord, kind?: 'glb' | 'effect') => void;
  onDragHover?: (hex: HexCoord | null) => void;
};

function hexRound(hex: { q: number; r: number }): HexCoord {
  const s = -hex.q - hex.r;
  let q = Math.round(hex.q);
  let r = Math.round(hex.r);
  const sRound = Math.round(s);
  const qDiff = Math.abs(q - hex.q);
  const rDiff = Math.abs(r - hex.r);
  const sDiff = Math.abs(sRound - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - sRound;
  } else if (rDiff > sDiff) {
    r = -q - sRound;
  }
  return { q, r };
}

function worldToAxial(x: number, z: number, hexSize: number): { q: number; r: number } {
  const q = (x * Math.sqrt(3) / 3 - z / 3) / hexSize;
  const r = (z * 2 / 3) / hexSize;
  const rounded = hexRound({ q, r });
  return { q: Math.round(rounded.q), r: Math.round(rounded.r) };
}

function DragIndicator({ hex, payload, hexSize }: { hex: HexCoord | null; payload: DragPayload | null; hexSize: number }) {
  if (!hex || !payload) return null;

  const { x, z } = axialToWorld3D(hex, hexSize);

  if (payload.type === 'terrain') {
    const color = TERRAIN_COLORS[payload.terrainType as TerrainType] ?? '#ffffff';
    return (
      <group position={[x, 0.2, z]}>
        <mesh>
          <cylinderGeometry args={[hexSize * 0.9, hexSize * 0.9, 0.3, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      </group>
    );
  }

  if (payload.type === 'decoration') {
    return (
      <group position={[x, 0, z]}>
        <EditorDecoration type={payload.decorationType} hex={hex} hexSize={hexSize} tileHeight={1} opacity={0.5} />
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[hexSize * 0.9, hexSize * 0.9, 0.3, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[hexSize * 0.9, hexSize * 0.9, 0.3, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export function DragDropHandler({ radius, hexSize, onDropTerrain, onDropUnit, onDropDecoration, onDragHover }: Props) {
  const { gl, camera } = useThree();
  const [dragPayload, setDragPayloadState] = useState<DragPayload | null>(null);
  const [dragHex, setDragHex] = useState<HexCoord | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const payloadLoadedRef = useRef(false);

  const getHexFromMouse = useCallback((clientX: number, clientY: number): HexCoord | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersection = new THREE.Vector3();
    const hit = raycasterRef.current.ray.intersectPlane(planeRef.current, intersection);
    if (!hit) return null;

    const hex = worldToAxial(intersection.x, intersection.z, hexSize);
    if (!isInsideMap(hex, radius)) return null;
    return hex;
  }, [gl, camera, radius, hexSize]);

  useEffect(() => {
    const dom = gl.domElement;
    payloadLoadedRef.current = false;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const hex = getHexFromMouse(e.clientX, e.clientY);
      setDragHex(hex);
      onDragHover?.(hex);
      if (!payloadLoadedRef.current) {
        const stored = getDragPayload();
        if (stored) {
          payloadLoadedRef.current = true;
          setDragPayloadState(stored);
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const hex = getHexFromMouse(e.clientX, e.clientY);
      const payload = getDragPayload();
      clearDragPayload();
      payloadLoadedRef.current = false;

      if (hex && payload) {
        if (payload.type === 'terrain') onDropTerrain(payload.terrainType, hex);
        else if (payload.type === 'unit') onDropUnit(payload.unitClass, payload.owner, hex);
        else if (payload.type === 'decoration') onDropDecoration(payload.decorationType, hex, payload.kind);
      }
      setDragPayloadState(null);
      setDragHex(null);
      onDragHover?.(null);
    };

    const handleDragLeave = () => { setDragHex(null); onDragHover?.(null); };

    const handleDragEnd = () => {
      clearDragPayload();
      payloadLoadedRef.current = false;
      setDragPayloadState(null);
      setDragHex(null);
      onDragHover?.(null);
    };

    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('text/plain')) return;
      const stored = getDragPayload();
      if (stored) {
        payloadLoadedRef.current = true;
        setDragPayloadState(stored);
      }
    };

    dom.addEventListener('dragover', handleDragOver);
    dom.addEventListener('drop', handleDrop);
    dom.addEventListener('dragleave', handleDragLeave);
    dom.addEventListener('dragend', handleDragEnd);
    dom.addEventListener('dragenter', handleDragEnter);

    return () => {
      dom.removeEventListener('dragover', handleDragOver);
      dom.removeEventListener('drop', handleDrop);
      dom.removeEventListener('dragleave', handleDragLeave);
      dom.removeEventListener('dragend', handleDragEnd);
      dom.removeEventListener('dragenter', handleDragEnter);
    };
  }, [gl, camera, getHexFromMouse, onDropTerrain, onDropUnit, onDropDecoration, onDragHover]);

  return <DragIndicator hex={dragHex} payload={dragPayload} hexSize={hexSize} />;
}
