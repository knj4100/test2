import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

const REPORT_INTERVAL = 0.5;

interface FpsReporterProps {
  onFps: (fps: number) => void;
}

export function FpsReporter({ onFps }: FpsReporterProps) {
  const accumulated = useRef(0);
  const frames = useRef(0);

  useFrame((_, delta) => {
    accumulated.current += delta;
    frames.current += 1;
    if (accumulated.current >= REPORT_INTERVAL) {
      onFps(frames.current / accumulated.current);
      accumulated.current = 0;
      frames.current = 0;
    }
  });

  return null;
}
