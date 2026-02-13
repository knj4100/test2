import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TargetSurfaceConfig } from './TargetSurfacePanel';

// Pre-allocated reusable objects (avoid GC pressure in useFrame)
const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _right = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _euler = new THREE.Euler();
const _planePoint = new THREE.Vector3();

interface GuidanceDisplayProps {
  surfaceConfig: TargetSurfaceConfig;
  cuttingEdgeRef: React.MutableRefObject<THREE.Group | null>;
}

export function GuidanceDisplay({ surfaceConfig, cuttingEdgeRef }: GuidanceDisplayProps) {
  // Use refs instead of state to avoid re-renders every frame
  const cuttingEdgePosRef = useRef(new THREE.Vector3());
  const targetYRef = useRef<number | null>(null);
  const bucketRightRef = useRef(new THREE.Vector3(1, 0, 0));
  const normalRef = useRef(new THREE.Vector3(0, 1, 0));
  const planePointRef = useRef(new THREE.Vector3());
  // Counter to trigger re-renders at reduced rate
  const frameCount = useRef(0);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const BUCKET_WIDTH = 0.0025;

  const getYOnPlane = (x: number, z: number, p: THREE.Vector3, n: THREE.Vector3) => {
    if (Math.abs(n.y) > 0.0001) {
      return p.y - (n.x * (x - p.x) + n.z * (z - p.z)) / n.y;
    }
    return p.y;
  };

  useFrame(() => {
    if (!surfaceConfig.visible || !cuttingEdgeRef.current) {
      if (targetYRef.current !== null) {
        targetYRef.current = null;
        forceUpdate();
      }
      return;
    }

    cuttingEdgeRef.current.getWorldPosition(_worldPos);
    cuttingEdgeRef.current.getWorldQuaternion(_worldQuat);

    cuttingEdgePosRef.current.copy(_worldPos);

    _right.set(1, 0, 0).applyQuaternion(_worldQuat);
    bucketRightRef.current.copy(_right);

    const rotX = THREE.MathUtils.degToRad(surfaceConfig.gradient.x);
    const rotZ = THREE.MathUtils.degToRad(surfaceConfig.gradient.z);

    _normal.set(0, 1, 0);
    _euler.set(rotX, 0, rotZ, 'XYZ');
    _normal.applyEuler(_euler);
    normalRef.current.copy(_normal);

    _planePoint.set(surfaceConfig.position.x, surfaceConfig.position.y, surfaceConfig.position.z);
    planePointRef.current.copy(_planePoint);

    const y = getYOnPlane(_worldPos.x, _worldPos.z, _planePoint, _normal);
    targetYRef.current = y;

    // Trigger React re-render every 3 frames (~20fps) instead of every frame
    frameCount.current++;
    if (frameCount.current % 3 === 0) {
      forceUpdate();
    }
  });

  if (!surfaceConfig.visible || targetYRef.current === null) return null;

  const pos = cuttingEdgePosRef.current;
  const targetY = targetYRef.current;
  const distance = pos.y - targetY;
  const absDistance = Math.abs(distance);
  const color = distance > 0 ? "#ff4444" : "#44ff44";

  const distText = absDistance < 1
    ? `${(distance * 1000).toFixed(0)} mm`
    : `${distance.toFixed(3)} m`;

  const dirXZ = new THREE.Vector3(bucketRightRef.current.x, 0, bucketRightRef.current.z).normalize();
  const EXTENSION_LENGTH = Math.max(surfaceConfig.size.width, surfaceConfig.size.depth) * 2;

  const p1_long = { x: pos.x - dirXZ.x * EXTENSION_LENGTH, z: pos.z - dirXZ.z * EXTENSION_LENGTH };
  const p2_long = { x: pos.x + dirXZ.x * EXTENSION_LENGTH, z: pos.z + dirXZ.z * EXTENSION_LENGTH };

  const y1_long = getYOnPlane(p1_long.x, p1_long.z, planePointRef.current, normalRef.current);
  const y2_long = getYOnPlane(p2_long.x, p2_long.z, planePointRef.current, normalRef.current);

  const p1_bucket = { x: pos.x - dirXZ.x * BUCKET_WIDTH / 2, z: pos.z - dirXZ.z * BUCKET_WIDTH / 2 };
  const p2_bucket = { x: pos.x + dirXZ.x * BUCKET_WIDTH / 2, z: pos.z + dirXZ.z * BUCKET_WIDTH / 2 };

  const y1_bucket = getYOnPlane(p1_bucket.x, p1_bucket.z, planePointRef.current, normalRef.current);
  const y2_bucket = getYOnPlane(p2_bucket.x, p2_bucket.z, planePointRef.current, normalRef.current);

  const OFFSET_Y = 0.0001;

  return (
    <group>
      <Line
        points={[
          [pos.x, pos.y, pos.z],
          [pos.x, targetY, pos.z]
        ]}
        color={color}
        lineWidth={2}
        dashed
        dashScale={50}
        dashSize={0.2}
      />
      <Line
        points={[
          [p1_long.x, y1_long, p1_long.z],
          [p2_long.x, y2_long, p2_long.z]
        ]}
        color={color}
        lineWidth={1}
        opacity={0.5}
        transparent
      />
      <Line
        points={[
          [p1_bucket.x, y1_bucket + OFFSET_Y, p1_bucket.z],
          [p2_bucket.x, y2_bucket + OFFSET_Y, p2_bucket.z]
        ]}
        color={color}
        lineWidth={4}
      />
      <Html
        position={[pos.x, (pos.y + targetY) / 2, pos.z]}
        center
        zIndexRange={[100, 0]}
      >
        <div
          style={{
            color: color,
            fontWeight: 'bold',
            fontSize: '12px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {distText}
        </div>
      </Html>
    </group>
  );
}
