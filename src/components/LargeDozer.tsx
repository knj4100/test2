import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

const DOZER_BODY_URL = import.meta.env.VITE_MODEL_D475_BODY;
const DOZER_BLADE_URL = import.meta.env.VITE_MODEL_D475_BLADE;

interface LargeDozerProps extends GroupProps {
  bladeAngle?: number;
  bladePivot?: { x: number; y: number; z: number };
  cuttingEdge?: { x: number; y: number; z: number };
  cuttingEdgeRef?: React.MutableRefObject<THREE.Group | null>;
}

export function LargeDozer({ 
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
