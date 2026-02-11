import { useGLTF } from "@react-three/drei";
import React, { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from 'three';

interface EnvironmentMeshProps {
  url: string;
  position: { x: number; y: number; z: number };
  scale: number;
  visible: boolean;
  opacity?: number;
  onGroundDetected?: (y: number) => void;
  vehiclePosition?: { x: number, z: number };
  onContactY?: (y: number) => void;
}

export const EnvironmentMesh = React.memo(function EnvironmentMesh({ url, position, scale, visible, opacity = 1, onGroundDetected, vehiclePosition, onContactY }: EnvironmentMeshProps) {
  const { scene } = useGLTF(url);

  const meshRef = useRef<THREE.Group>(null);

  // Raycaster for vehicle ground following
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const downDirection = useMemo(() => new THREE.Vector3(0, -1, 0), []);

  // Clone purely to avoid mutation issues if used elsewhere, though single instance is fine too.
  // CRITICAL: We must clone materials too, otherwise changing opacity in one view changes it in all views because they share the same material instance.
  const clone = useMemo(() => {
      const c = scene.clone();
      c.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(m => m.clone());
            } else if (mesh.material) {
                mesh.material = mesh.material.clone();
            }
        }
      });
      return c;
  }, [scene]);

  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Mark this as an environment mesh for the terrain grid
        mesh.userData.isEnvironmentMesh = true;
        
        const updateMaterial = (mat: THREE.Material) => {
          mat.side = THREE.DoubleSide;
          mat.transparent = opacity < 1;
          mat.opacity = opacity;
          mat.needsUpdate = true;
        };

        if (mesh.material) {
          // Handle both single material and array of materials
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(updateMaterial);
          } else {
            updateMaterial(mesh.material);
          }
        }
      }
    });
  }, [clone, opacity]);

  // Auto-adjust height using Raycasting (Initial Alignment)
  useEffect(() => {
    if (!scene || !onGroundDetected) return;

    // Create a temporary clone for collision detection to avoid messing with the displayed model
    const collisionClone = scene.clone();

    // IMPORTANT: Ensure materials are DoubleSide for raycasting to work even if backface culling is on
    collisionClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
         const mesh = child as THREE.Mesh;
         const updateMat = (mat: THREE.Material) => {
            mat.side = THREE.DoubleSide;
         };
         if (Array.isArray(mesh.material)) {
            mesh.material.forEach(updateMat);
         } else if (mesh.material) {
            updateMat(mesh.material);
         }
      }
    });

    // We want to know: "If the model is at (0,0,0) with Scale S, where is the ground at x=0, z=0?"
    const tempParent = new THREE.Scene();
    tempParent.add(collisionClone);
    
    // Ensure the clone has identity transform initially to test local geometry
    collisionClone.position.set(0, 0, 0);
    collisionClone.rotation.set(0, 0, 0);
    collisionClone.scale.set(scale, scale, scale);
    collisionClone.updateMatrixWorld(true);

    // Debug: Log mesh bounds
    const box = new THREE.Box3().setFromObject(collisionClone);
    // console.log("[EnvironmentMesh] Model Bounds:", box.min, box.max);
    
    // Check if the box is valid/non-empty
    if (box.isEmpty()) {
       // console.warn("[EnvironmentMesh] Model bounding box is empty, skipping auto-alignment.");
       return;
    }

    const alignmentRaycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, -1, 0); // Down
    
    const checkPoints = [];
    
    // Use bounds center as primary check
    const center = new THREE.Vector3();
    box.getCenter(center);
    checkPoints.push({ x: center.x, z: center.z });
    
    // Scan the bounding box area
    // Determine step size based on size
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Safety check for very small models or points
    const stepX = Math.max(0.5, size.x / 10);
    const stepZ = Math.max(0.5, size.z / 10);
    
    // Ensure we scan at least some points within bounds
    // Clamp scan range to +/- 50m to avoid insane loops if model is huge, 
    // or respect bounds if model is small.
    const startX = Math.max(box.min.x, -50);
    const endX = Math.min(box.max.x, 50);
    const startZ = Math.max(box.min.z, -50);
    const endZ = Math.min(box.max.z, 50);

    for (let x = startX; x <= endX; x += stepX) {
        for (let z = startZ; z <= endZ; z += stepZ) {
            checkPoints.push({ x, z });
        }
    }
    
    // Fallback: Add original explicit points if bounds are weirdly offset but we expect ground at 0
    checkPoints.push({ x: 0, z: 0 });

    let foundHeight: number | null = null;
    let hitCount = 0;
    let accumulatedHeight = 0;

    for (const point of checkPoints) {
        // Start high enough - increased to 10000 to catch high terrain
        const origin = new THREE.Vector3(point.x, 10000, point.z); 
        alignmentRaycaster.set(origin, direction);
        const intersects = alignmentRaycaster.intersectObject(collisionClone, true);
        
        if (intersects.length > 0) {
            const h = intersects[0].point.y;
            
            // Prioritize center hits if close to 0,0
            if (Math.abs(point.x) < 0.1 && Math.abs(point.z) < 0.1) {
                foundHeight = h;
                // console.log(`[EnvironmentMesh] Center hit at y=${h}`);
                break; 
            }
            
            // Accumulate for average
            accumulatedHeight += h;
            hitCount++;
        }
    }

    // If no center hit, use average of surrounding hits
    if (foundHeight === null && hitCount > 0) {
        foundHeight = accumulatedHeight / hitCount;
        // console.log(`[EnvironmentMesh] Using average height from ${hitCount} points: y=${foundHeight}`);
    }

    if (foundHeight !== null) {
      // console.log(`[EnvironmentMesh] Applying offset=${-foundHeight}`);
      onGroundDetected(-foundHeight);
    } else {
       // console.warn("[EnvironmentMesh] No ground detected for auto-alignment");
    }
    
    // Cleanup
    tempParent.remove(collisionClone);
    // Explicitly dispose to free memory since we created a clone manually
    collisionClone.traverse((child) => {
        // Do not dispose geometry/material as they are shared with the main scene/clone
    });
    
  }, [scene, scale, url]); // Re-run when model or scale changes

  // Continuous Ground Following
  useFrame(() => {
    if (!vehiclePosition || !onContactY || !meshRef.current) return;
    
    // Raycast from high up at vehicle X, Z
    // We raycast against the rendered meshRef (which has position/scale applied)
    // However, raycaster works in world space.
    // The meshRef object is in the scene.
    
    const origin = new THREE.Vector3(vehiclePosition.x, 10000, vehiclePosition.z);
    raycaster.set(origin, downDirection);
    
    // Intersect with the environment mesh
    const intersects = raycaster.intersectObject(meshRef.current, true);
    
    if (intersects.length > 0) {
       // Found ground
       onContactY(intersects[0].point.y);
    }
  });

  if (!visible) return null;

  return (
    <primitive 
      ref={meshRef}
      object={clone} 
      position={[position.x, position.y, position.z]} 
      scale={[scale, scale, scale]} 
    />
  );
});
