import React, { useRef, useMemo } from 'react';
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
  const cuttingEdgePosRef = useRef(new THREE.Vector3());
  const targetYRef = useRef<number | null>(null);
  const bucketRightRef = useRef(new THREE.Vector3(1, 0, 0));
  const normalRef = useRef(new THREE.Vector3(0, 1, 0));
  const planePointRef = useRef(new THREE.Vector3());

  // Refs for direct DOM/geometry manipulation (no React re-renders)
  const distLabelRef = useRef<HTMLDivElement>(null);
  const vertLineRef = useRef<any>(null);
  const longLineRef = useRef<any>(null);
  const bucketLineRef = useRef<any>(null);
  const htmlGroupRef = useRef<THREE.Group>(null);
  const isVisibleRef = useRef(false);

  const BUCKET_WIDTH = 0.0025;

  const getYOnPlane = (x: number, z: number, p: THREE.Vector3, n: THREE.Vector3) => {
    if (Math.abs(n.y) > 0.0001) {
      return p.y - (n.x * (x - p.x) + n.z * (z - p.z)) / n.y;
    }
    return p.y;
  };

  // Reusable line point arrays
  const vertPoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);
  const longPoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);
  const bucketPoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);
  const _dirXZ = useMemo(() => new THREE.Vector3(), []);
  const frameCounterRef = useRef(0);

  useFrame(() => {
    if (!surfaceConfig.visible || !cuttingEdgeRef.current) {
      if (isVisibleRef.current) {
        isVisibleRef.current = false;
        // Hide everything via refs
        if (vertLineRef.current) vertLineRef.current.visible = false;
        if (longLineRef.current) longLineRef.current.visible = false;
        if (bucketLineRef.current) bucketLineRef.current.visible = false;
        if (htmlGroupRef.current) htmlGroupRef.current.visible = false;
      }
      targetYRef.current = null;
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

    frameCounterRef.current = (frameCounterRef.current + 1) % 2;
    const updateGeometry = frameCounterRef.current === 0;

    const pos = _worldPos;
    const distance = pos.y - y;
    const absDistance = Math.abs(distance);
    const color = distance > 0 ? "#ff4444" : "#44ff44";

    // Show elements
    isVisibleRef.current = true;

    if (vertLineRef.current) vertLineRef.current.visible = true;
    if (longLineRef.current) longLineRef.current.visible = true;
    if (bucketLineRef.current) bucketLineRef.current.visible = true;
    if (htmlGroupRef.current) htmlGroupRef.current.visible = true;

    if (updateGeometry) {
      if (vertLineRef.current) {
        const geom = vertLineRef.current.geometry;
        if (geom) geom.setPositions([pos.x, pos.y, pos.z, pos.x, y, pos.z]);
      }
      _dirXZ.set(bucketRightRef.current.x, 0, bucketRightRef.current.z).normalize();
      const EXTENSION_LENGTH = Math.max(surfaceConfig.size.width, surfaceConfig.size.depth) * 2;
      const p1lx = pos.x - _dirXZ.x * EXTENSION_LENGTH;
      const p1lz = pos.z - _dirXZ.z * EXTENSION_LENGTH;
      const p2lx = pos.x + _dirXZ.x * EXTENSION_LENGTH;
      const p2lz = pos.z + _dirXZ.z * EXTENSION_LENGTH;
      const y1l = getYOnPlane(p1lx, p1lz, planePointRef.current, normalRef.current);
      const y2l = getYOnPlane(p2lx, p2lz, planePointRef.current, normalRef.current);
      if (longLineRef.current?.geometry) {
        longLineRef.current.geometry.setPositions([p1lx, y1l, p1lz, p2lx, y2l, p2lz]);
      }
      const OFFSET_Y = 0.0001;
      const p1bx = pos.x - _dirXZ.x * BUCKET_WIDTH / 2;
      const p1bz = pos.z - _dirXZ.z * BUCKET_WIDTH / 2;
      const p2bx = pos.x + _dirXZ.x * BUCKET_WIDTH / 2;
      const p2bz = pos.z + _dirXZ.z * BUCKET_WIDTH / 2;
      const y1b = getYOnPlane(p1bx, p1bz, planePointRef.current, normalRef.current);
      const y2b = getYOnPlane(p2bx, p2bz, planePointRef.current, normalRef.current);
      if (bucketLineRef.current?.geometry) {
        bucketLineRef.current.geometry.setPositions([p1bx, y1b + OFFSET_Y, p1bz, p2bx, y2b + OFFSET_Y, p2bz]);
      }
      if (htmlGroupRef.current) htmlGroupRef.current.position.set(pos.x, (pos.y + y) / 2, pos.z);
      if (distLabelRef.current) {
        const distText = absDistance < 1
          ? `${(distance * 1000).toFixed(0)} mm`
          : `${distance.toFixed(3)} m`;
        distLabelRef.current.textContent = distText;
        distLabelRef.current.style.color = color;
      }
    }
  });

  // Initial render — elements are always mounted but visibility controlled via refs
  return (
    <group>
      <Line
        ref={vertLineRef}
        points={[[0, 0, 0], [0, 1, 0]]}
        color="#ff4444"
        lineWidth={2}
        dashed
        dashScale={50}
        dashSize={0.2}
        visible={false}
      />
      <Line
        ref={longLineRef}
        points={[[0, 0, 0], [1, 0, 0]]}
        color="#ff4444"
        lineWidth={1}
        opacity={0.5}
        transparent
        visible={false}
      />
      <Line
        ref={bucketLineRef}
        points={[[0, 0, 0], [1, 0, 0]]}
        color="#ff4444"
        lineWidth={4}
        visible={false}
      />
      <group ref={htmlGroupRef} visible={false}>
        <Html center zIndexRange={[100, 0]}>
          <div
            ref={distLabelRef}
            style={{
              color: '#ff4444',
              fontWeight: 'bold',
              fontSize: '12px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            --
          </div>
        </Html>
      </group>
    </group>
  );
}
