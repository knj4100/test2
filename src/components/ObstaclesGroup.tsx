import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Obstacle } from './EnvironmentPanel';
import { EnvironmentObject } from './EnvironmentObject';

const MODELS: Record<string, string | undefined> = {
  cane: import.meta.env.VITE_MODEL_ENV_CANE,
  human: import.meta.env.VITE_MODEL_ENV_HUMAN,
};

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function InstancedObstaclesByType({ type, obstacles }: { type: 'cane' | 'human'; obstacles: Obstacle[] }) {
  const url = MODELS[type];
  if (!url || obstacles.length === 0) return null;

  const { scene } = useGLTF(url);
  const ref = useRef<THREE.InstancedMesh>(null);

  const { geometry, material } = useMemo(() => {
    let geom: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !geom) {
        const mesh = child as THREE.Mesh;
        geom = mesh.geometry.clone();
        mat = Array.isArray(mesh.material) ? mesh.material[0].clone() : (mesh.material as THREE.Material).clone();
      }
    });
    return { geometry: geom, material: mat };
  }, [scene]);

  const count = obstacles.length;
  useLayoutEffect(() => {
    if (!ref.current || !geometry || count === 0) return;
    for (let i = 0; i < count; i++) {
      const obs = obstacles[i];
      _position.set(obs.position.x, obs.position.y, obs.position.z);
      _scale.set(obs.scale, obs.scale, obs.scale);
      _quat.identity();
      _matrix.compose(_position, _quat, _scale);
      ref.current.setMatrixAt(i, _matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [obstacles, geometry, count]);

  if (!geometry || !material || count === 0) return null;

  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow receiveShadow />;
}

export function ObstaclesGroup({ obstacles }: { obstacles: Obstacle[] }) {
  const byType = useMemo(() => {
    const map: { cane: Obstacle[]; human: Obstacle[] } = { cane: [], human: [] };
    for (const obs of obstacles) {
      if (obs.type === 'cane' || obs.type === 'human') map[obs.type].push(obs);
    }
    return map;
  }, [obstacles]);

  return (
    <>
      {byType.cane.length >= 2 ? (
        <InstancedObstaclesByType type="cane" obstacles={byType.cane} />
      ) : (
        byType.cane.map((obs) => (
          <EnvironmentObject key={obs.id} type="cane" position={obs.position} scale={obs.scale} />
        ))
      )}
      {byType.human.length >= 2 ? (
        <InstancedObstaclesByType type="human" obstacles={byType.human} />
      ) : (
        byType.human.map((obs) => (
          <EnvironmentObject key={obs.id} type="human" position={obs.position} scale={obs.scale} />
        ))
      )}
    </>
  );
}
