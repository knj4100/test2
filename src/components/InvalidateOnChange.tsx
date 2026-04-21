import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

interface InvalidateOnChangeProps {
  whenDemand: boolean;
  stateDeps: string;
}

export function InvalidateOnChange({ whenDemand, stateDeps }: InvalidateOnChangeProps) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (whenDemand) invalidate();
  }, [whenDemand, stateDeps, invalidate]);
  return null;
}
