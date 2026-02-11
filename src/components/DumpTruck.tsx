import React, { useMemo, useEffect } from 'react';
import { useFBX } from '@react-three/drei';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

const DUMP_TRUCK_URL = "https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/HD/HD1500_HD.fbx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL0hEL0hEMTUwMF9IRC5mYngiLCJpYXQiOjE3NzA4MDIwMjMsImV4cCI6MTgwMjMzODAyM30.PErkhq4kXaw6ldLyDSgTXb43ulgawL39wlwfXZ0K4IA";

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
