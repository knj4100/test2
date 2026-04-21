import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RestrictedZoneConfig } from './RestrictedZonePanel';

// Shared stripe texture (one canvas + one texture for all zones)
function getSharedStripeTexture(): THREE.CanvasTexture {
  if ((getSharedStripeTexture as any).tex) return (getSharedStripeTexture as any).tex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(255, 220, 0, 0.5)';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
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
  (getSharedStripeTexture as any).tex = tex;
  return tex;
}

interface RestrictedZoneProps {
  config: RestrictedZoneConfig;
}

export function RestrictedZone({ config }: RestrictedZoneProps) {
  const { position, width, depth, height, active } = config;

  const texFrontBack = useMemo(() => getSharedStripeTexture().clone(), []);
  const texLeftRight = useMemo(() => getSharedStripeTexture().clone(), []);

  const materialFrontBack = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texFrontBack,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, [texFrontBack]);

  const materialLeftRight = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texLeftRight,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, [texLeftRight]);

  useEffect(() => {
    const DENSITY = 200;
    texFrontBack.repeat.set(width * DENSITY, height * DENSITY);
    texFrontBack.needsUpdate = true;
    texLeftRight.repeat.set(depth * DENSITY, height * DENSITY);
    texLeftRight.needsUpdate = true;
  }, [width, height, depth, texFrontBack, texLeftRight]);

  // Cache the edges geometry for wireframe outline
  const edgesBoxGeom = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);

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
        <edgesGeometry args={[edgesBoxGeom]} />
        <lineBasicMaterial color="#ffaa00" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}
