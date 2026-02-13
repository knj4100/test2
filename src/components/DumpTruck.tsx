import React, { useMemo, useEffect } from 'react';
import { useFBX } from '@react-three/drei';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

const DUMP_TRUCK_URL = import.meta.env.VITE_MODEL_HD_DUMP_TRUCK;

interface DumpTruckProps extends GroupProps {}

export const DumpTruck = React.memo(function DumpTruck(props: DumpTruckProps) {
  const fbx = useFBX(DUMP_TRUCK_URL);
  const scene = useMemo(() => fbx.clone(), [fbx]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        // Performance optimization: Disable shadow casting for this heavy model
        child.castShadow = false;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  // Adjusted scale to 0.00001 based on user feedback
  return (
    <group {...props}>
      <primitive object={scene} scale={[0.00001, 0.00001, 0.00001]} />
    </group>
  );
});
