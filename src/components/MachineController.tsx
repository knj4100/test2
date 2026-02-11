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
    
    const euler = new THREE.Euler(rx, 0, rz, 'XYZ');
    const normal = new THREE.Vector3(0, 1, 0).applyEuler(euler);
    const surfaceCenter = new THREE.Vector3(
      surfaceConfig.position.x,
      surfaceConfig.position.y,
      surfaceConfig.position.z
    );

    // 2. Calculate Current Cutting Edge World Position
    // Dozer Geometry:
    // Global = MachinePos + RotY(MachineRot) * (Pivot + RotX(BladeAngle) * (CuttingEdge - Pivot))
    
    const machinePos = new THREE.Vector3(excavatorPosition.x, excavatorPosition.y, excavatorPosition.z);
    const machineRot = excavatorRotation + Math.PI; // Scene3D adds PI to rotation
    
    const P = new THREE.Vector3(dozerBladePivot.x, dozerBladePivot.y, dozerBladePivot.z);
    const C = new THREE.Vector3(dozerCuttingEdge.x, dozerCuttingEdge.y, dozerCuttingEdge.z);
    
    // Vector from Pivot to Cutting Edge
    const V = new THREE.Vector3().subVectors(C, P);
    
    // Rotate V by current blade angle (around X axis)
    const V_rotated = V.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), dozerBladeAngle);
    
    // Local position of Cutting Edge relative to Machine Center
    const C_local = new THREE.Vector3().addVectors(P, V_rotated);
    
    // World position of Cutting Edge
    const C_world = C_local.clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), machineRot)
      .add(machinePos);
      
    // 3. Calculate Target Height at Cutting Edge Position
    // Plane Equation: N dot (P - S) = 0
    // Nx(x - Sx) + Ny(y - Sy) + Nz(z - Sz) = 0
    // Ny*y = Ny*Sy - Nx(x - Sx) - Nz(z - Sz)
    // y = Sy - (Nx/Ny)(x - Sx) - (Nz/Ny)(z - Sz)
    
    // Avoid division by zero if Ny is 0 (vertical plane) - unlikely for terrain
    if (Math.abs(normal.y) < 0.0001) return;
    
    const targetY = surfaceCenter.y 
      - (normal.x / normal.y) * (C_world.x - surfaceCenter.x)
      - (normal.z / normal.y) * (C_world.z - surfaceCenter.z);
      
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
    
    const K = targetY - machinePos.y - P.y;
    const A = V.y;
    const B = -V.z;
    
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
