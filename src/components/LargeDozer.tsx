import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

const DOZER_BODY_URL = import.meta.env.VITE_MODEL_D475_BODY;
const DOZER_BLADE_URL = import.meta.env.VITE_MODEL_D475_BLADE;

const URLS_VALID = !!(DOZER_BODY_URL && DOZER_BLADE_URL);

if (DOZER_BODY_URL) useGLTF.preload(DOZER_BODY_URL);
if (DOZER_BLADE_URL) useGLTF.preload(DOZER_BLADE_URL);

interface LargeDozerProps extends GroupProps {
  bladeAngle?: number;
  bladePivot?: { x: number; y: number; z: number };
  cuttingEdge?: { x: number; y: number; z: number };
  cuttingEdgeRef?: React.MutableRefObject<THREE.Group | null>;
}

function LargeDozerInner({
  bladeAngle = 0,
  bladePivot = { x: 0, y: 0, z: 0 },
  cuttingEdge = { x: 0, y: 0, z: 0 },
  cuttingEdgeRef,
  ...props
}: LargeDozerProps) {
  const body = useGLTF(DOZER_BODY_URL);
  const blade = useGLTF(DOZER_BLADE_URL);

  const bodyScene = useMemo(() => body.scene.clone(), [body.scene]);
  const bladeScene = useMemo(() => blade.scene.clone(), [blade.scene]);

  useEffect(() => {
    // Traverse the scene to enable shadows and fix materials if needed
    const setupShadows = (scene: THREE.Group) => {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    };
    setupShadows(bodyScene);
    setupShadows(bladeScene);
  }, [bodyScene, bladeScene]);

  return (
    <group {...props}>
      {/* Main Body */}
      <primitive object={bodyScene} scale={[0.001, 0.001, 0.001]} />

      {/* Blade Group - Rotates around pivot */}
      <group position={[bladePivot.x, bladePivot.y, bladePivot.z]} rotation={[bladeAngle, 0, 0]}>
        <group position={[-bladePivot.x, -bladePivot.y, -bladePivot.z]}>
          <primitive object={bladeScene} scale={[0.001, 0.001, 0.001]} />

          {/* Cutting Edge Visualization */}
          <group
            ref={cuttingEdgeRef}
            position={[cuttingEdge.x, cuttingEdge.y, cuttingEdge.z]}
          >
            <mesh position={[0, 0.000125, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.000125, 0.00025, 16]} />
              <meshBasicMaterial color="green" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export function LargeDozer(props: LargeDozerProps) {
  if (!URLS_VALID) {
    const missing = [];
    if (!DOZER_BODY_URL) missing.push('VITE_MODEL_D475_BODY');
    if (!DOZER_BLADE_URL) missing.push('VITE_MODEL_D475_BLADE');
    console.warn(`[LargeDozer] Missing model URLs: ${missing.join(', ')}. Check your .env file.`);
    return null;
  }
  return <LargeDozerInner {...props} />;
}
