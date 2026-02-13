import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TargetSurfaceConfig } from './TargetSurfacePanel';

interface MachineControllerProps {
  vehicleType: 'excavator' | 'dozer';
  surfaceConfig: TargetSurfaceConfig;
  excavatorPosition: { x: number; y: number; z: number };
  excavatorRotation: number;
  dozerBladePivot: { x: number; y: number; z: number };
  dozerCuttingEdge: { x: number; y: number; z: number };
  dozerBladeAngle: number;
  setDozerBladeAngle: (angle: number) => void;
}

// Pre-allocated reusable objects (avoid GC pressure in useFrame)
const _euler = new THREE.Euler();
const _normal = new THREE.Vector3();
const _surfaceCenter = new THREE.Vector3();
const _machinePos = new THREE.Vector3();
const _P = new THREE.Vector3();
const _C = new THREE.Vector3();
const _V = new THREE.Vector3();
const _V_rotated = new THREE.Vector3();
const _C_local = new THREE.Vector3();
const _C_world = new THREE.Vector3();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);

export function MachineController({
  vehicleType,
  surfaceConfig,
  excavatorPosition,
  excavatorRotation,
  dozerBladePivot,
  dozerCuttingEdge,
  dozerBladeAngle,
  setDozerBladeAngle
}: MachineControllerProps) {
  
  useFrame((state, delta) => {
    // Only run for Dozer and if Machine Control (Target Surface) is active
    if (vehicleType !== 'dozer' || !surfaceConfig.visible) {
      return;
    }

    // 1. Calculate Target Surface Plane Normal and Point
    // Rotation order: X then Z (based on App.tsx Scene3D implementation)
    // Scene3D uses: rotation={[degToRad(gradient.x), 0, degToRad(gradient.z)]}
    // Three.js Euler order is XYZ.
    // N = Rz * Ry * Rx * (0, 1, 0)
    
    const rx = THREE.MathUtils.degToRad(surfaceConfig.gradient.x);
    const rz = THREE.MathUtils.degToRad(surfaceConfig.gradient.z);

    _euler.set(rx, 0, rz, 'XYZ');
    _normal.set(0, 1, 0).applyEuler(_euler);
    _surfaceCenter.set(surfaceConfig.position.x, surfaceConfig.position.y, surfaceConfig.position.z);

    _machinePos.set(excavatorPosition.x, excavatorPosition.y, excavatorPosition.z);
    const machineRot = excavatorRotation + Math.PI;

    _P.set(dozerBladePivot.x, dozerBladePivot.y, dozerBladePivot.z);
    _C.set(dozerCuttingEdge.x, dozerCuttingEdge.y, dozerCuttingEdge.z);

    _V.subVectors(_C, _P);

    _V_rotated.copy(_V).applyAxisAngle(_xAxis, dozerBladeAngle);

    _C_local.addVectors(_P, _V_rotated);

    _C_world.copy(_C_local).applyAxisAngle(_yAxis, machineRot).add(_machinePos);
      
    // 3. Calculate Target Height at Cutting Edge Position
    // Plane Equation: N dot (P - S) = 0
    // Nx(x - Sx) + Ny(y - Sy) + Nz(z - Sz) = 0
    // Ny*y = Ny*Sy - Nx(x - Sx) - Nz(z - Sz)
    // y = Sy - (Nx/Ny)(x - Sx) - (Nz/Ny)(z - Sz)
    
    // Avoid division by zero if Ny is 0 (vertical plane) - unlikely for terrain
    if (Math.abs(_normal.y) < 0.0001) return;

    const targetY = _surfaceCenter.y
      - (_normal.x / _normal.y) * (_C_world.x - _surfaceCenter.x)
      - (_normal.z / _normal.y) * (_C_world.z - _surfaceCenter.z);
      
    // 4. Calculate Required Blade Angle
    // We need C_world.y to be targetY.
    // C_world.y = machinePos.y + C_local.y (since machine rotation is around Y, it doesn't affect Y coord)
    // Wait, machine rotation around Y does not change Y coordinate.
    // So C_world.y = machinePos.y + C_local.y
    // C_local.y = P.y + V_rotated.y
    // V_rotated.y = V.y * cos(theta) - V.z * sin(theta)
    
    // So: targetY = machinePos.y + P.y + V.y * cos(theta) - V.z * sin(theta)
    // Let K = targetY - machinePos.y - P.y
    // K = A * cos(theta) + B * sin(theta)
    // Where A = V.y, B = -V.z

    const K = targetY - _machinePos.y - _P.y;
    const A = _V.y;
    const B = -_V.z;
    
    const R = Math.sqrt(A*A + B*B);
    
    if (Math.abs(K) > R) {
      // Cannot reach target
      return;
    }
    
    // theta - alpha = acos(K/R)
    // cos(alpha) = A/R, sin(alpha) = B/R
    const alpha = Math.atan2(B, A);
    const offset = Math.acos(K / R);
    
    // Two solutions: alpha + offset, alpha - offset
    const theta1 = alpha + offset;
    const theta2 = alpha - offset;
    
    // Choose the one closer to 0 or current angle.
    // Usually blade angles are small.
    // Let's normalize angles to -PI to PI
    
    const normalize = (a: number) => {
        a = a % (2 * Math.PI);
        if (a > Math.PI) a -= 2 * Math.PI;
        if (a < -Math.PI) a += 2 * Math.PI;
        return a;
    };
    
    let t1 = normalize(theta1);
    let t2 = normalize(theta2);
    
    // Prefer smaller angle (mechanical limit approximation)
    const targetTheta = Math.abs(t1) < Math.abs(t2) ? t1 : t2;
    
    // 5. Update Blade Angle
    // Apply some smoothing or just set it?
    // Direct set for responsiveness.
    
    // Check if change is significant to avoid infinite loop / jitter
    if (Math.abs(targetTheta - dozerBladeAngle) > 0.0001) {
       setDozerBladeAngle(targetTheta);
    }
  });

  return null;
}
