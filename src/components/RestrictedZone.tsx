import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RestrictedZoneConfig } from './RestrictedZonePanel';

interface RestrictedZoneProps {
  config: RestrictedZoneConfig;
}

export function RestrictedZone({ config }: RestrictedZoneProps) {
  const { position, width, depth, height, active } = config;

  // Generate base striped texture
  const baseTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Semi-transparent yellow background
        ctx.fillStyle = 'rgba(255, 220, 0, 0.5)'; 
        ctx.fillRect(0, 0, 64, 64);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Black stripes
        
        // Draw diagonal stripes
        ctx.beginPath();
        const stripeWidth = 8;
        const gap = 16;
        
        for (let i = -64; i < 128; i += gap) {
            ctx.moveTo(i, -10);
            ctx.lineTo(i + 32 + stripeWidth, 74);
            ctx.lineTo(i + 32, 74);
            ctx.lineTo(i - stripeWidth, -10);
        }
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  // Create materials with cloned textures for independent UV repetition
  const materialFrontBack = useMemo(() => {
     const tex = baseTexture.clone();
     return new THREE.MeshStandardMaterial({ 
        map: tex, 
        transparent: true, 
        opacity: 0.3, 
        side: THREE.DoubleSide, 
        depthWrite: false 
     });
  }, [baseTexture]);

  const materialLeftRight = useMemo(() => {
     const tex = baseTexture.clone();
     return new THREE.MeshStandardMaterial({ 
        map: tex, 
        transparent: true, 
        opacity: 0.3, 
        side: THREE.DoubleSide, 
        depthWrite: false 
     });
  }, [baseTexture]);

  // Update repeats based on dimensions
  useEffect(() => {
    const DENSITY = 200; // Stripes per meter factor
    if (materialFrontBack.map) {
       materialFrontBack.map.repeat.set(width * DENSITY, height * DENSITY);
       materialFrontBack.map.needsUpdate = true;
    }
    if (materialLeftRight.map) {
       materialLeftRight.map.repeat.set(depth * DENSITY, height * DENSITY);
       materialLeftRight.map.needsUpdate = true;
    }
  }, [width, height, depth, materialFrontBack, materialLeftRight]);

  if (!active) return null;

  const halfW = width / 2;
  const halfD = depth / 2;

  return (
    <group position={[position.x, position.y + height / 2, position.z]}>
        {/* Front Wall (+Z) */}
        <mesh position={[0, 0, halfD]} material={materialFrontBack}>
            <planeGeometry args={[width, height]} />
        </mesh>
        
        {/* Back Wall (-Z) */}
        <mesh position={[0, 0, -halfD]} rotation={[0, Math.PI, 0]} material={materialFrontBack}>
            <planeGeometry args={[width, height]} />
        </mesh>

        {/* Right Wall (+X) */}
        <mesh position={[halfW, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materialLeftRight}>
            <planeGeometry args={[depth, height]} />
        </mesh>

        {/* Left Wall (-X) */}
        <mesh position={[-halfW, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={materialLeftRight}>
            <planeGeometry args={[depth, height]} />
        </mesh>

        {/* Wireframe outline for visibility */}
        <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
            <lineBasicMaterial color="#ffaa00" transparent opacity={0.6} />
        </lineSegments>
    </group>
  );
}
