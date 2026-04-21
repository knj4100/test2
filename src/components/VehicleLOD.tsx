import React from 'react';

interface VehicleLODProps {
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * Wraps vehicle with position/rotation. LOD (distance-based box) is disabled
 * so the full model always displays; re-enable with a larger threshold if needed.
 */
export function VehicleLOD({ children, position, rotation }: VehicleLODProps) {
  return (
    <group position={position} rotation={rotation}>
      {children}
    </group>
  );
}
