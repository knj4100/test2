import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

const MODELS: Record<string, string | undefined> = {
  cane: import.meta.env.VITE_MODEL_ENV_CANE,
  human: import.meta.env.VITE_MODEL_ENV_HUMAN,
};

interface EnvironmentObjectProps {
  type: 'cane' | 'human';
  position: { x: number; y: number; z: number };
  scale: number;
}

function EnvironmentObjectInner({ type, position, scale }: EnvironmentObjectProps) {
  const url = MODELS[type]!;
  const { scene } = useGLTF(url);

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

export function EnvironmentObject(props: EnvironmentObjectProps) {
  const url = MODELS[props.type];
  if (!url) {
    console.warn(`[EnvironmentObject] Model URL for type "${props.type}" is not configured. Check VITE_MODEL_ENV_${props.type.toUpperCase()} in .env`);
    return null;
  }
  return <EnvironmentObjectInner {...props} />;
}

// Preload models for smoother experience - only if URLs are configured
if (MODELS.cane) {
  useGLTF.preload(MODELS.cane);
}
if (MODELS.human) {
  useGLTF.preload(MODELS.human);
}
