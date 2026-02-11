import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

const MODELS = {
  cane: 'https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/Environment/cane.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL0Vudmlyb25tZW50L2NhbmUuZ2x0ZiIsImlhdCI6MTc2NDMzMDYxMiwiZXhwIjoxNzk1ODY2NjEyfQ.K9sUMHZPexEeddDWLaTVZxPYAsRuNO3Ah5rG51cf7kU',
  human: 'https://fqyinbccxulilbfzqxyg.supabase.co/storage/v1/object/sign/3DMC/Environment/human.gltf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wMDA1YzBjYi1lNTJhLTQzMWUtYmE1NC0yZGNlOGY2NjFhZTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiIzRE1DL0Vudmlyb25tZW50L2h1bWFuLmdsdGYiLCJpYXQiOjE3NjQzMzA2MzMsImV4cCI6MTc5NTg2NjYzM30.NnlFjgf_EtHlyV3vhQCE8tdz3p86pw77BV81_a5CpsM'
};

interface EnvironmentObjectProps {
  type: 'cane' | 'human';
  position: { x: number; y: number; z: number };
  scale: number;
}

export function EnvironmentObject({ type, position, scale }: EnvironmentObjectProps) {
  const { scene } = useGLTF(MODELS[type]);

  // Clone the scene so we can have multiple instances independent of each other
  const clone = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive 
      object={clone} 
      position={[position.x, position.y, position.z]} 
      scale={[scale, scale, scale]} 
    />
  );
}

// Preload models for smoother experience
useGLTF.preload(MODELS.cane);
useGLTF.preload(MODELS.human);
