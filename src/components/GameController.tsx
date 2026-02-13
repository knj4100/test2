import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TargetSurfaceConfig } from './TargetSurfacePanel';
import { RestrictedZoneConfig } from './RestrictedZonePanel';
import { calculateBucketPosition, toWorldSpace, EXCAVATOR_PIVOTS } from '../utils/excavatorKinematics';

// Helper function to calculate surface height at (x, z)
const getSurfaceHeight = (x: number, z: number, config: TargetSurfaceConfig) => {
  if (!config.visible) return -Infinity;

  const p0 = new THREE.Vector3(config.position.x, config.position.y, config.position.z);

  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(config.gradient.x),
    0,
    THREE.MathUtils.degToRad(config.gradient.z),
    'XYZ'
  );
  const normal = new THREE.Vector3(0, 1, 0).applyEuler(euler);

  if (Math.abs(normal.y) < 0.0001) return -Infinity;

  const y = p0.y - (normal.x * (x - p0.x) + normal.z * (z - p0.z)) / normal.y;
  return y;
};

interface GameControllerProps {
  setRotationAngle: (val: number | ((prev: number) => number)) => void;
  setBoomAngle: (val: number | ((prev: number) => number)) => void;
  setArmAngle: (val: number | ((prev: number) => number)) => void;
  setBacketAngle: (val: number | ((prev: number) => number)) => void;
  setExcavatorRotation: (val: number | ((prev: number) => number)) => void;
  setExcavatorPosition: (val: {x: number, y: number, z: number}) => void;
  setDozerBladeAngle?: (val: number | ((prev: number) => number)) => void;
  stateRef: React.MutableRefObject<{
    rotationAngle: number;
    boomAngle: number;
    armAngle: number;
    backetAngle: number;
    dozerBladeAngle?: number;
    surfaceConfig: TargetSurfaceConfig;
    excavatorPosition: {x: number, y: number, z: number};
    excavatorRotation: number;
    restrictedZones: RestrictedZoneConfig[];
  }>;
}

// Pre-allocated reusable objects (avoid GC pressure in useFrame)
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3(0, -1, 0);

export function GameController({
  setRotationAngle, 
  setBoomAngle, 
  setArmAngle, 
  setBacketAngle, 
  setExcavatorRotation, 
  setExcavatorPosition, 
  setDozerBladeAngle,
  stateRef,
  vehicleType
}: GameControllerProps & { vehicleType: 'excavator' | 'dozer' }) {
  const { scene, camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      keys.current.add(e.key);
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_state, delta) => {
    const { 
      rotationAngle, boomAngle, armAngle, backetAngle, 
      surfaceConfig, excavatorPosition, excavatorRotation, restrictedZones
    } = stateRef.current;

    // --- 1. Movement Logic (Simultaneous) ---
    const ROTATION_SPEED = 1.0; // Radians per second
    const MOVE_SPEED = 0.01;   // Meters per second

    let nextExcavatorRotation = excavatorRotation;
    let nextExcavatorPosition = { ...excavatorPosition };
    let hasMovement = false;

    // Apply Rotation
    if (keys.current.has('ArrowLeft')) {
      nextExcavatorRotation += ROTATION_SPEED * delta;
      hasMovement = true;
    }
    if (keys.current.has('ArrowRight')) {
      nextExcavatorRotation -= ROTATION_SPEED * delta;
      hasMovement = true;
    }

    // Apply Translation (based on NEW or CURRENT rotation? Usually current frame uses current rotation + delta)
    // Using simple Euler integration
    if (keys.current.has('ArrowUp')) {
      // Move "Forward" (Z- direction in local space if model faces -Z)
      // Assuming 0 rotation faces -Z.
      nextExcavatorPosition.x -= Math.sin(nextExcavatorRotation) * MOVE_SPEED * delta;
      nextExcavatorPosition.z -= Math.cos(nextExcavatorRotation) * MOVE_SPEED * delta;
      hasMovement = true;
    }
    if (keys.current.has('ArrowDown')) {
      nextExcavatorPosition.x += Math.sin(nextExcavatorRotation) * MOVE_SPEED * delta;
      nextExcavatorPosition.z += Math.cos(nextExcavatorRotation) * MOVE_SPEED * delta;
      hasMovement = true;
    }

    // Restricted Zone Collision Check - DISABLED per user request
    // if (hasMovement) {
    //   for (const zone of restrictedZones) {
    //     if (zone.active) {
    //       const halfW = zone.width / 2;
    //       const halfD = zone.depth / 2;
    //       const minX = zone.position.x - halfW;
    //       const maxX = zone.position.x + halfW;
    //       const minZ = zone.position.z - halfD;
    //       const maxZ = zone.position.z + halfD;
    //
    //       // Simple point check (assuming excavator is a point for simplicity, 
    //       // or we could expand the zone by vehicle radius)
    //       const vehicleRadius = 0.001; // Approx 1m scaled
    //       if (
    //         nextExcavatorPosition.x >= minX - vehicleRadius && nextExcavatorPosition.x <= maxX + vehicleRadius &&
    //         nextExcavatorPosition.z >= minZ - vehicleRadius && nextExcavatorPosition.z <= maxZ + vehicleRadius
    //       ) {
    //         hasMovement = false;
    //         nextExcavatorPosition = { ...excavatorPosition }; // Reset to previous valid position
    //         break; 
    //       }
    //     }
    //   }
    // }

    // --- 2. Terrain Following (Raycast) ---
    // Raycast from high up downwards at the new position
    const RAY_ORIGIN_HEIGHT = 10000; // High enough to be above any terrain
    raycaster.current.camera = camera;
    _rayOrigin.set(nextExcavatorPosition.x, RAY_ORIGIN_HEIGHT, nextExcavatorPosition.z);
    raycaster.current.set(_rayOrigin, _rayDir);

    // Filter for environment mesh
    // Note: EnvironmentMesh children have userData.isEnvironmentMesh = true
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    const groundHit = intersects.find(hit => hit.object.userData.isEnvironmentMesh);

    if (groundHit) {
      nextExcavatorPosition.y = groundHit.point.y;
    } else {
      // Fallback: If off the map, maybe keep y=0 or last valid Y?
      // For now, keep current y if no hit (avoids falling through void) or clamp to 0
      // nextExcavatorPosition.y = 0; 
    }

    // Update Movement State
    if (hasMovement) {
      setExcavatorRotation(nextExcavatorRotation);
      setExcavatorPosition(nextExcavatorPosition);
    }

    // --- 3. Excavator Arm Controls & Machine Guidance ---
    if (vehicleType === 'excavator') {
      const ARM_SPEED = 1.0; // Radians per second

      let nextRotation = rotationAngle;
      let nextBoom = boomAngle;
      let nextArm = armAngle;
      let nextBacket = backetAngle;
      let hasArmMovement = false;

      if (keys.current.has('l') || keys.current.has('L')) { nextRotation -= ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('j') || keys.current.has('J')) { nextRotation += ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('i') || keys.current.has('I')) { nextBoom += ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('m') || keys.current.has('M')) { nextBoom -= ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('w') || keys.current.has('W')) { nextArm += ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('x') || keys.current.has('X')) { nextArm -= ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('a') || keys.current.has('A')) { nextBacket += ARM_SPEED * delta; hasArmMovement = true; }
      if (keys.current.has('d') || keys.current.has('D')) { nextBacket -= ARM_SPEED * delta; hasArmMovement = true; }

      // Machine Guidance Logic (Newton-Raphson)
      let isValid = true;
      if (surfaceConfig.visible && hasArmMovement) {
        let adjustedBoom = nextBoom;
        const epsilon = 0.00001; 
        const derivativeStep = 0.001;
        const maxIterations = 8;

        // Note: We use nextExcavatorPosition/Rotation here to ensure we check against the NEW position of the vehicle
        for (let i = 0; i < maxIterations; i++) {
            const currentPosLocal = calculateBucketPosition({
              rotation: nextRotation,
              boom: adjustedBoom,
              arm: nextArm,
              backet: nextBacket
            });
            // Apply 180 degree rotation adjustment
            const currentPos = toWorldSpace(currentPosLocal, nextExcavatorPosition, nextExcavatorRotation + Math.PI);

            const currentSurfaceY = getSurfaceHeight(currentPos.x, currentPos.z, surfaceConfig);
            const currentDiff = currentPos.y - currentSurfaceY;

            if (currentDiff >= -epsilon) break;

            const testBoom = adjustedBoom + derivativeStep;
            const testPosLocal = calculateBucketPosition({
              rotation: nextRotation,
              boom: testBoom,
              arm: nextArm,
              backet: nextBacket
            });
            const testPos = toWorldSpace(testPosLocal, nextExcavatorPosition, nextExcavatorRotation + Math.PI);

            const testSurfaceY = getSurfaceHeight(testPos.x, testPos.z, surfaceConfig);
            const testDiff = testPos.y - testSurfaceY;

            const slope = (testDiff - currentDiff) / derivativeStep;

            if (Math.abs(slope) < 0.000001) break;

            const adjustment = -currentDiff / slope;
            const maxStep = 0.1; 
            const clampedAdjustment = Math.max(-maxStep, Math.min(maxStep, adjustment));

            adjustedBoom += clampedAdjustment;
        }

        const finalCheckPosLocal = calculateBucketPosition({
            rotation: nextRotation,
            boom: adjustedBoom,
            arm: nextArm,
            backet: nextBacket
        });
        const finalCheckPos = toWorldSpace(finalCheckPosLocal, nextExcavatorPosition, nextExcavatorRotation + Math.PI);
        const finalCheckSurfaceY = getSurfaceHeight(finalCheckPos.x, finalCheckPos.z, surfaceConfig);
        
        if (finalCheckPos.y < finalCheckSurfaceY - 0.0001) {
            isValid = false;
        } else {
            nextBoom = adjustedBoom;
        }
      }

      if (hasArmMovement && isValid) {
        setRotationAngle(nextRotation);
        setBoomAngle(nextBoom);
        setArmAngle(nextArm);
        setBacketAngle(nextBacket);
      }
    } else {
        // Dozer Controls
        const BLADE_SPEED = 0.5; // Radians per second
        let nextBladeAngle = stateRef.current.dozerBladeAngle || 0;
        let hasBladeMovement = false;

        if (keys.current.has('i') || keys.current.has('I')) { 
            // Up usually means negative rotation depending on pivot? 
            // Or positive. Let's assume + is Up (rotate back) or - is Up.
            // For excavator, Boom Up is +? 
            // Let's test: Boom Up logic above is I => nextBoom += speed. 
            // So let's use + for "Up/Back" rotation.
            nextBladeAngle -= BLADE_SPEED * delta; 
            hasBladeMovement = true; 
        }
        if (keys.current.has('m') || keys.current.has('M')) { 
            nextBladeAngle += BLADE_SPEED * delta; 
            hasBladeMovement = true; 
        }

        if (hasBladeMovement && setDozerBladeAngle) {
            // Optional: Clamp values
            // nextBladeAngle = Math.max(-0.5, Math.min(0.5, nextBladeAngle));
            setDozerBladeAngle(nextBladeAngle);
        }
    }
  });

  return null;
}
