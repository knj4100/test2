import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Minimal interface for OrbitControls from three-stdlib
interface OrbitControlsImpl {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
  object: THREE.Camera;
  domElement: HTMLElement;
}

interface CameraControllerProps {
  mode: 'default' | 'follow' | 'top' | 'section';
  rotationAngle: number;
  targetPosition: THREE.Vector3;
  radius: number;
  height: number;
  targetOffset: number;
  sideViewMode?: 'true' | 'diagonal';
  topViewMode?: 'true' | 'diagonal';
  followVehicle?: boolean;
  rotateWithVehicle?: boolean;
  sectionDirection?: 'longitudinal' | 'transverse';
  diagonalAngle?: number;
  modelRadius?: number;
}

// Pre-allocated reusable objects (avoid GC pressure in useFrame)
const _desiredUp = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const __lookAtTarget = new THREE.Vector3();
const __desiredPos = new THREE.Vector3();

export function CameraController({
  mode, 
  rotationAngle, 
  targetPosition, 
  radius, 
  height, 
  targetOffset,
  sideViewMode = 'true',
  topViewMode = 'true',
  followVehicle = true,
  rotateWithVehicle = false,
  sectionDirection = 'longitudinal',
  diagonalAngle = 45,
  modelRadius = 0
}: CameraControllerProps) {
  const { camera, controls } = useThree();
  const lastTargetPosition = useRef<THREE.Vector3>(targetPosition.clone());
  const lastRotationAngle = useRef<number>(rotationAngle);
  
  // Refs to hold latest props values for useFrame closure
  const currentRotationAngle = useRef(rotationAngle);
  const currentTargetPosition = useRef(targetPosition);

  const SIDE_OFFSET_ANGLE = Math.PI / 2; // Offset to view from the left side

  useEffect(() => {
    currentRotationAngle.current = rotationAngle;
    currentTargetPosition.current = targetPosition;
  }, [rotationAngle, targetPosition]);

  useEffect(() => {
    lastTargetPosition.current.copy(targetPosition);
    lastRotationAngle.current = rotationAngle;
  }, []); // Initialize on mount

  useEffect(() => {
    // Safety check for initial camera position in default mode to prevent "invisible model" issues
    // if the camera somehow initialized at (0,0,0) or inside the model.
    if (mode === 'default' && camera.position.lengthSq() < 0.0001) {
       camera.position.set(0.1, 0.1, 0.1);
       camera.lookAt(targetPosition);
       const orbitControls = controls as unknown as OrbitControlsImpl;
       if (orbitControls) {
          orbitControls.target.copy(targetPosition);
          orbitControls.update();
       }
    }
  }, []); // Run once on mount

  useEffect(() => {
    const orbitControls = controls as unknown as OrbitControlsImpl;
    if (orbitControls) {
      if (mode === 'default') {
        orbitControls.enabled = true;
        // Ensure target is synced when switching to default mode
        if (targetPosition) {
           orbitControls.target.copy(targetPosition);
           orbitControls.update();
        }
      } else {
        orbitControls.enabled = false;
      }
    }
  }, [mode, controls]); // Removed targetPosition from dep array to avoid snapping during follow logic

  useFrame(() => {
    // Get latest values from refs
    const rot = currentRotationAngle.current;
    const pos = currentTargetPosition.current;

    // Calculate desired Up vector
    _desiredUp.set(0, 1, 0);

    if (mode === 'top' && topViewMode === 'true') {
       // Set Up vector to Body Backward for "Top view, upside down" (Bottom is Forward)
       const backX = Math.sin(rot);
       const backZ = Math.cos(rot);
       _desiredUp.set(backX, 0, backZ);
    }

    // Smoothly interpolate Up vector for all modes to prevent snapping
    camera.up.lerp(_desiredUp, 0.05);

    const orbitControls = controls as unknown as OrbitControlsImpl;

    // Handle Default (Free) Mode with optional Follow
    if (mode === 'default') {
      if (orbitControls) {
        // 1. Position Follow
        if (followVehicle) {
          _delta.subVectors(pos, lastTargetPosition.current);
          if (_delta.lengthSq() > 0.00000001) {
            camera.position.add(_delta);
            orbitControls.target.add(_delta);
            orbitControls.update();
          }
        }
        
        // 2. Rotation Follow
        if (rotateWithVehicle) {
           const deltaRot = rot - lastRotationAngle.current;
           if (Math.abs(deltaRot) > 0.000001) {
              // Rotate camera position around the target (vehicle)
              _offset.copy(camera.position).sub(orbitControls.target);
              _offset.applyAxisAngle(_yAxis, deltaRot);
              camera.position.copy(orbitControls.target).add(_offset);
              orbitControls.update();
           }
        }
      }
      
      // Update last states for next frame
      lastTargetPosition.current.copy(pos);
      lastRotationAngle.current = rot;
      return;
    }

    // Update last position for modes that switch back to default
    lastTargetPosition.current.copy(pos);
    lastRotationAngle.current = rot;

    // Base Target Vector (Position to look at)
    __lookAtTarget.set(pos.x, pos.y + targetOffset, pos.z);

    __desiredPos.set(0, 0, 0);

    if (mode === 'follow') {
      // SIDE FOLLOW MODE
      // View from the left side of the body
      // camera.up is handled above
      
      // 'true' = 90 degrees (Math.PI / 2)
      // 'diagonal' = Custom angle (default 45 degrees)
      const offsetAngle = sideViewMode === 'diagonal' ? THREE.MathUtils.degToRad(diagonalAngle) : Math.PI / 2;
      const angle = rot + offsetAngle;
      
      const effectiveRadius = radius + modelRadius;

      _desiredPos.x = pos.x + Math.sin(angle) * effectiveRadius;
      _desiredPos.z = pos.z + Math.cos(angle) * effectiveRadius;
      _desiredPos.y = pos.y + height;

    } else if (mode === 'top') {
      // TOP FOLLOW MODE
      // View from above, rotated with body
      
      if (topViewMode === 'diagonal') {
        // Diagonal Top: Uses both Height and Radius (Distance)
        // Look from "Back" direction relative to rotation
        
        const effectiveRadius = radius + modelRadius;

        // Body Back vector: (sin(rot), 0, cos(rot))
        const backX = Math.sin(rot);
        const backZ = Math.cos(rot);
        
        _desiredPos.x = pos.x + backX * effectiveRadius;
        _desiredPos.z = pos.z + backZ * effectiveRadius;
        _desiredPos.y = pos.y + height;
        
      } else {
         // True Top: Uses Height only for altitude
         _desiredPos.set(pos.x, pos.y + height, pos.z); 
      }

    } else if (mode === 'section') {
      // SECTION MODE (Orthographic)
      // View from the side (Longitudinal) or back (Transverse)
      // Orthographic camera doesn't use distance for scale, but position determines view direction.
      
      const dist = 5.0; // Arbitrary distance to avoid clipping near plane
      
      let angle = rot; 
      if (sectionDirection === 'longitudinal') {
          // Longitudinal section: View from side (perpendicular to forward)
          // Forward is typically Z (or -Z) rotated by rot.
          // Side view is rot + 90 deg.
          angle += Math.PI / 2;
      } else {
          // Transverse section: View from back (parallel to forward)
          // Looking towards the vehicle back
          angle += Math.PI; 
      }
      
      const offsetX = Math.sin(angle) * dist;
      const offsetZ = Math.cos(angle) * dist;
      
      // Keep height relative to target? Or fixed? 
      // Usually section view is centered vertically on the target.
      _desiredPos.set(pos.x + offsetX, pos.y + targetOffset, pos.z + offsetZ);
    }

    // Handle Zoom for Orthographic Camera (Global)
    // radius prop controls zoom level (inverse relationship)
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const baseRadius = 0.015;
        const baseZoom = 40;
        // Calculate zoom based on radius (closer radius = higher zoom)
        // Allow extremely small radius for high zoom
        const newZoom = baseZoom * (baseRadius / Math.max(0.0000001, radius));
        
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, newZoom, 0.1);
        camera.updateProjectionMatrix();
    }

    // Smoothly interpolate camera position
    camera.position.lerp(_desiredPos, 0.1);
    
    // Make camera look at the target
    camera.lookAt(_lookAtTarget);
    
    // If controls exist, update their target to match where we are looking
    if (orbitControls) {
      orbitControls.target.lerp(_lookAtTarget, 0.1);
      orbitControls.update();
    }
  });

  return null;
}
