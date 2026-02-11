import { useGLTF } from "@react-three/drei";
import { GroupProps } from "@react-three/fiber";
import React, { useMemo } from 'react';
import * as THREE from 'three';

const LOWER_URL = "https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/PC200/Lower.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL1BDMjAwL0xvd2VyLmdsdGYiLCJpYXQiOjE3NzA4MDE5NjYsImV4cCI6MTgwMjMzNzk2Nn0.N6u6fTH1z9tYwH5Gj9HIxmkIm91OR4oB_BZCLJzzsSY";
const BODY_URL = "https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/PC200/Body.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL1BDMjAwL0JvZHkuZ2x0ZiIsImlhdCI6MTc3MDgwMTk3NiwiZXhwIjoxODAyMzM3OTc2fQ.2YLVdT8Z3Vs9G1zQNy_z42kHy5NuwPBuu9IU9Z-Rpls";
const BOOM_URL = "https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/PC200/Boom.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL1BDMjAwL0Jvb20uZ2x0ZiIsImlhdCI6MTc3MDgwMTk4NCwiZXhwIjoxODAyMzM3OTg0fQ.I4FhU5IQFMy1Qq1ak3JFypyuoIyR3bFa-kMbjHHBtao";
const ARM_URL = "https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/PC200/Arm.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL1BDMjAwL0FybS5nbHRmIiwiaWF0IjoxNzcwODAxOTkyLCJleHAiOjE4MDIzMzc5OTJ9.yDFQOZ_oum0mGetC2TIbVdwY-w58-8VtztCjhyBS9xM";
const BACKET_URL = "https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/PC200/Backet.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL1BDMjAwL0JhY2tldC5nbHRmIiwiaWF0IjoxNzcwODAxOTk5LCJleHAiOjE4MDIzMzc5OTl9.4c5TErv86uzlaivUOeIxL1mzxcZfMsZQi9tUgnSktOM";


interface Position {
  x: number;
  y: number;
  z: number;
}

interface ExcavatorProps extends GroupProps {
  pivotPoint: Position;
  rotationAngle: number;
  workEquipmentPivot: Position;
  boomAngle: number;
  armPivot: Position;
  armAngle: number;
  backetPivot: Position;
  backetAngle: number;
  cuttingEdge: Position;
  cuttingEdgeRef?: React.MutableRefObject<THREE.Group | null>;
}

export function Excavator({ pivotPoint, rotationAngle, workEquipmentPivot, boomAngle, armPivot, armAngle, backetPivot, backetAngle, cuttingEdge, cuttingEdgeRef, ...props }: ExcavatorProps) {
  const lower = useGLTF(LOWER_URL);
  const body = useGLTF(BODY_URL);
  const boom = useGLTF(BOOM_URL);
  const arm = useGLTF(ARM_URL);
  const backet = useGLTF(BACKET_URL);

  const lowerScene = useMemo(() => lower.scene.clone(), [lower.scene]);
  const bodyScene = useMemo(() => body.scene.clone(), [body.scene]);
  const boomScene = useMemo(() => boom.scene.clone(), [boom.scene]);
  const armScene = useMemo(() => arm.scene.clone(), [arm.scene]);
  const backetScene = useMemo(() => backet.scene.clone(), [backet.scene]);

  return (
    <group {...props}>
      {/* Static Lower Part */}
      <primitive 
        object={lowerScene} 
        position={[0, 0, 0]} 
      />

      {/* Rotating Group (Body) */}
      <group position={[pivotPoint.x, pivotPoint.y, pivotPoint.z]} rotation={[0, rotationAngle, 0]}>
        <group position={[-pivotPoint.x, -pivotPoint.y, -pivotPoint.z]}>
          <primitive object={bodyScene} position={[0, 0, 0]} />
          
          {/* Work Equipment Group (Boom) */}
          {/* Rotates around the X-axis based on workEquipmentPivot */}
          <group 
            position={[workEquipmentPivot.x, workEquipmentPivot.y, workEquipmentPivot.z]}
            rotation={[boomAngle, 0, 0]}
          >
            <group position={[-workEquipmentPivot.x, -workEquipmentPivot.y, -workEquipmentPivot.z]}>
              <primitive object={boomScene} position={[0, 0, 0]} />
              
              {/* Arm Group (Arm, Backet) */}
              {/* Rotates around the X-axis based on armPivot */}
              <group 
                position={[armPivot.x, armPivot.y, armPivot.z]}
                rotation={[armAngle, 0, 0]}
              >
                <group position={[-armPivot.x, -armPivot.y, -armPivot.z]}>
                  <primitive object={armScene} position={[0, 0, 0]} />
                  
                  {/* Backet Group (Backet) */}
                  {/* Rotates around the X-axis based on backetPivot */}
                  <group 
                    position={[backetPivot.x, backetPivot.y, backetPivot.z]}
                    rotation={[backetAngle, 0, 0]}
                  >
                    <group position={[-backetPivot.x, -backetPivot.y, -backetPivot.z]}>
                      <primitive object={backetScene} position={[0, 0, 0]} />
                      
                      {/* Cutting Edge Visualization */}
                      <group 
                        ref={cuttingEdgeRef}
                        position={[cuttingEdge.x, cuttingEdge.y, cuttingEdge.z]} 
                        rotation={[Math.PI - (boomAngle + armAngle + backetAngle), 0, 0]}
                      >
                        <mesh position={[0, -0.000125, 0]}>
                          <coneGeometry args={[0.000125, 0.00025, 16]} />
                          <meshBasicMaterial color="green" />
                        </mesh>
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// Preload models
// useGLTF.preload(LOWER_URL);
// useGLTF.preload(BODY_URL);
// useGLTF.preload(BOOM_URL);
// useGLTF.preload(ARM_URL);
// useGLTF.preload(BACKET_URL);
