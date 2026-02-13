import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

const MODELS = {
  cane: import.meta.env.VITE_MODEL_ENV_CANE,
  human: import.meta.env.VITE_MODEL_ENV_HUMAN,
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
