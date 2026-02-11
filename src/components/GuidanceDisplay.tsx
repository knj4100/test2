import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TargetSurfaceConfig } from './TargetSurfacePanel';

interface GuidanceDisplayProps {
  surfaceConfig: TargetSurfaceConfig;
  cuttingEdgeRef: React.MutableRefObject<THREE.Group | null>;
}

export function GuidanceDisplay({ surfaceConfig, cuttingEdgeRef }: GuidanceDisplayProps) {
  const [cuttingEdgePos, setCuttingEdgePos] = useState(new THREE.Vector3());
  const [targetY, setTargetY] = useState<number | null>(null);

  // Helper vector for calculation
  const normal = useRef(new THREE.Vector3(0, 1, 0));
  const planePoint = useRef(new THREE.Vector3());
  const bucketRight = useRef(new THREE.Vector3(1, 0, 0));

  // Estimated bucket width in meters (based on model scale)
  const BUCKET_WIDTH = 0.0025; 

  // Helper to calculate Y on the plane for a given X, Z
  const getYOnPlane = (x: number, z: number, p: THREE.Vector3, n: THREE.Vector3) => {
    if (Math.abs(n.y) > 0.0001) {
      const dx = x - p.x;
      const dz = z - p.z;
      return p.y - (n.x * dx + n.z * dz) / n.y;
    }
    return p.y;
  };

  useFrame(() => {
    if (!surfaceConfig.visible || !cuttingEdgeRef.current) {
      setTargetY(null);
      return;
    }

    // 1. Get current cutting edge position and rotation in world coordinates
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    
    cuttingEdgeRef.current.getWorldPosition(worldPos);
    cuttingEdgeRef.current.getWorldQuaternion(worldQuat);
    
    setCuttingEdgePos(worldPos.clone());

    // Extract the "Right" vector (local X-axis) from the rotation
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
    bucketRight.current.copy(right);

    // 2. Calculate the height of the target surface at this X, Z
    
    // Convert gradient angles to radians
    const rotX = THREE.MathUtils.degToRad(surfaceConfig.gradient.x);
    const rotZ = THREE.MathUtils.degToRad(surfaceConfig.gradient.z);

    // Calculate Plane Normal
    const n = new THREE.Vector3(0, 1, 0);
    const euler = new THREE.Euler(rotX, 0, rotZ, 'XYZ');
    n.applyEuler(euler);
    normal.current.copy(n);

    // Plane point (center of surface)
    const p = new THREE.Vector3(surfaceConfig.position.x, surfaceConfig.position.y, surfaceConfig.position.z);
    planePoint.current.copy(p);

    const y = getYOnPlane(worldPos.x, worldPos.z, p, n);
    setTargetY(y);
  });

  if (!surfaceConfig.visible || targetY === null) return null;

  const distance = cuttingEdgePos.y - targetY;
  const absDistance = Math.abs(distance);
  const color = distance > 0 ? "#ff4444" : "#44ff44"; // Red if above, Green if below
  
  const distText = absDistance < 1 
    ? `${(distance * 1000).toFixed(0)} mm`
    : `${distance.toFixed(3)} m`;

  // Calculate points for the long line (across the surface)
  // We use the XZ direction of the bucket right vector to project onto the plane
  const dirXZ = new THREE.Vector3(bucketRight.current.x, 0, bucketRight.current.z).normalize();
  const EXTENSION_LENGTH = Math.max(surfaceConfig.size.width, surfaceConfig.size.depth) * 2;
  
  const p1_long = {
    x: cuttingEdgePos.x - dirXZ.x * EXTENSION_LENGTH,
    z: cuttingEdgePos.z - dirXZ.z * EXTENSION_LENGTH
  };
  const p2_long = {
    x: cuttingEdgePos.x + dirXZ.x * EXTENSION_LENGTH,
    z: cuttingEdgePos.z + dirXZ.z * EXTENSION_LENGTH
  };

  const y1_long = getYOnPlane(p1_long.x, p1_long.z, planePoint.current, normal.current);
  const y2_long = getYOnPlane(p2_long.x, p2_long.z, planePoint.current, normal.current);

  // Calculate points for the bucket width highlight
  // We also project this onto the plane surface to ensure it matches the gradient
  const p1_bucket = {
    x: cuttingEdgePos.x - dirXZ.x * BUCKET_WIDTH / 2,
    z: cuttingEdgePos.z - dirXZ.z * BUCKET_WIDTH / 2
  };
  const p2_bucket = {
    x: cuttingEdgePos.x + dirXZ.x * BUCKET_WIDTH / 2,
    z: cuttingEdgePos.z + dirXZ.z * BUCKET_WIDTH / 2
  };

  const y1_bucket = getYOnPlane(p1_bucket.x, p1_bucket.z, planePoint.current, normal.current);
  const y2_bucket = getYOnPlane(p2_bucket.x, p2_bucket.z, planePoint.current, normal.current);
  
  // Slight offset to prevent z-fighting with the long line and surface
  const OFFSET_Y = 0.0001;

  return (
    <group>
      {/* Vertical Line */}
      <Line
        points={[
          [cuttingEdgePos.x, cuttingEdgePos.y, cuttingEdgePos.z],
          [cuttingEdgePos.x, targetY, cuttingEdgePos.z]
        ]}
        color={color}
        lineWidth={2}
        dashed
        dashScale={50}
        dashSize={0.2}
      />

      {/* Long Line (Across Surface) */}
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

      {/* Bucket Width Highlight (Thicker, on top) */}
      <Line
        points={[
          [p1_bucket.x, y1_bucket + OFFSET_Y, p1_bucket.z],
          [p2_bucket.x, y2_bucket + OFFSET_Y, p2_bucket.z]
        ]}
        color={color}
        lineWidth={4}
      />

      {/* Distance Text */}
      <Html
        position={[cuttingEdgePos.x, (cuttingEdgePos.y + targetY) / 2, cuttingEdgePos.z]}
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
