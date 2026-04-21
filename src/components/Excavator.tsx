import { useGLTF } from "@react-three/drei";
import { GroupProps } from "@react-three/fiber";
import React, { useMemo } from 'react';
import * as THREE from 'three';

const LOWER_URL = import.meta.env.VITE_MODEL_PC200_LOWER;
const BODY_URL = import.meta.env.VITE_MODEL_PC200_BODY;
const BOOM_URL = import.meta.env.VITE_MODEL_PC200_BOOM;
const ARM_URL = import.meta.env.VITE_MODEL_PC200_ARM;
const BACKET_URL = import.meta.env.VITE_MODEL_PC200_BACKET;

const ALL_URLS = [LOWER_URL, BODY_URL, BOOM_URL, ARM_URL, BACKET_URL];
const URLS_VALID = ALL_URLS.every((url): url is string => !!url);

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

function ExcavatorInner({ pivotPoint, rotationAngle, workEquipmentPivot, boomAngle, armPivot, armAngle, backetPivot, backetAngle, cuttingEdge, cuttingEdgeRef, ...props }: ExcavatorProps) {
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

if (URLS_VALID) {
  ALL_URLS.forEach((url) => url && useGLTF.preload(url));
}

export function Excavator(props: ExcavatorProps) {
  if (!URLS_VALID) {
    const missing = ['LOWER', 'BODY', 'BOOM', 'ARM', 'BACKET']
      .filter((_, i) => !ALL_URLS[i])
      .map(name => `VITE_MODEL_PC200_${name}`);
    console.warn(`[Excavator] Missing model URLs: ${missing.join(', ')}. Check your .env file.`);
    return null;
  }
  return <ExcavatorInner {...props} />;
}
