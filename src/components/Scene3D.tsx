import React from 'react';
import { Environment, ContactShadows, OrthographicCamera, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Excavator } from './Excavator';
import { LargeDozer } from './LargeDozer';
import { DumpTruck } from './DumpTruck';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { CameraController } from './CameraController';
import { GuidanceDisplay } from './GuidanceDisplay';
import { EnvironmentMesh } from './EnvironmentMesh';
import { TerrainGrid } from './TerrainGrid';
import { EnvironmentObject } from './EnvironmentObject';
import { RestrictedZone } from './RestrictedZone';
import * as THREE from 'three';

// Import Types
import { TargetSurfaceConfig } from './TargetSurfacePanel';
import { EnvironmentMeshConfig, TerrainGridConfig, Obstacle } from './EnvironmentPanel';
import { RestrictedZoneConfig } from './RestrictedZonePanel';
import { LightingConfig } from './LightingPanel';

interface Scene3DProps {
  vehicleType: 'excavator' | 'dozer' | 'dump';
  excavatorPosition: { x: number, y: number, z: number };
  excavatorRotation: number;
  
  // Excavator Props
  pivotPoint: { x: number, y: number, z: number };
  rotationAngle: number;
  workEquipmentPivot: { x: number, y: number, z: number };
  boomAngle: number;
  armPivot: { x: number, y: number, z: number };
  armAngle: number;
  backetPivot: { x: number, y: number, z: number };
  backetAngle: number;
  cuttingEdge: { x: number, y: number, z: number };
  cuttingEdgeRef: React.RefObject<THREE.Group>;
  
  // Dozer Props
  dozerBladeAngle: number;
  dozerBladePivot: { x: number, y: number, z: number };
  dozerCuttingEdge: { x: number, y: number, z: number };
  
  // Configs
  lightingConfig: LightingConfig;
  envMeshConfig: EnvironmentMeshConfig;
  gridConfig: TerrainGridConfig;
  surfaceConfig: TargetSurfaceConfig;
  gridCenter: { x: number, z: number };
  obstacles: Obstacle[];
  restrictedZones: RestrictedZoneConfig[];
  
  // Camera
  environmentUrl: string;
  onGroundDetected: (y: number) => void;
  onVehicleHeightUpdate?: (y: number) => void;
  cameraMode: 'default' | 'follow' | 'top' | 'section';
  effectiveCameraRotation: number;
  targetPosition: THREE.Vector3;
  cameraRadius: number;
  cameraHeight: number;
  cameraTargetHeight: number;
  sideViewMode: 'true' | 'diagonal';
  topViewMode: 'true' | 'diagonal';
  cameraFollowsVehicle: boolean;
  cameraRotatesWithVehicle: boolean;
  sectionDirection: 'longitudinal' | 'transverse';
  diagonalAngle: number;
  sideCameraType: 'perspective' | 'orthographic';
  topCameraType: 'perspective' | 'orthographic';
}

export function Scene3D({
  vehicleType,
  excavatorPosition,
  excavatorRotation,
  pivotPoint,
  rotationAngle,
  workEquipmentPivot,
  boomAngle,
  armPivot,
  armAngle,
  backetPivot,
  backetAngle,
  cuttingEdge,
  cuttingEdgeRef,
  dozerBladeAngle,
  dozerBladePivot,
  dozerCuttingEdge,
  lightingConfig,
  envMeshConfig,
  gridConfig,
  surfaceConfig,
  gridCenter,
  obstacles,
  restrictedZones,
  environmentUrl,
  onGroundDetected,
  onVehicleHeightUpdate,
  cameraMode,
  effectiveCameraRotation,
  targetPosition,
  cameraRadius,
  cameraHeight,
  cameraTargetHeight,
  sideViewMode,
  topViewMode,
  cameraFollowsVehicle,
  cameraRotatesWithVehicle,
  sectionDirection,
  diagonalAngle,
  sideCameraType,
  topCameraType
}: Scene3DProps) {
  
  const isOrthographic = 
    cameraMode === 'section' || 
    (cameraMode === 'follow' && sideCameraType === 'orthographic') ||
    (cameraMode === 'top' && topCameraType === 'orthographic');

  return (
    <>
      <PerspectiveCamera makeDefault={!isOrthographic} position={[0.1, 0.1, 0.1]} near={0.001} far={1000} fov={50} />
      <OrthographicCamera makeDefault={isOrthographic} position={[5, 5, 5]} zoom={50} near={-50} far={200} />
      
      <OrbitControls makeDefault target={[0, 0, 0]} />

      <ambientLight intensity={lightingConfig.ambientIntensity} />
      <directionalLight 
        position={[
          lightingConfig.directionalPosition.x, 
          lightingConfig.directionalPosition.y, 
          lightingConfig.directionalPosition.z
        ]} 
        intensity={lightingConfig.directionalIntensity} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      {lightingConfig.environmentPreset !== 'none' && (
        <Environment preset={lightingConfig.environmentPreset} />
      )}
      
      {vehicleType === 'excavator' ? (
        <ModelErrorBoundary name="Excavator">
          <Excavator 
            position={[excavatorPosition.x, excavatorPosition.y, excavatorPosition.z]}
            rotation={[0, excavatorRotation + Math.PI, 0]}
            pivotPoint={pivotPoint}
            rotationAngle={rotationAngle}
            workEquipmentPivot={workEquipmentPivot}
            boomAngle={boomAngle}
            armPivot={armPivot}
            armAngle={armAngle}
            backetPivot={backetPivot}
            backetAngle={backetAngle}
            cuttingEdge={cuttingEdge}
            cuttingEdgeRef={cuttingEdgeRef}
          />
        </ModelErrorBoundary>
      ) : vehicleType === 'dozer' ? (
        <ModelErrorBoundary name="LargeDozer">
          <LargeDozer 
            position={[excavatorPosition.x, excavatorPosition.y, excavatorPosition.z]}
            rotation={[0, excavatorRotation + Math.PI, 0]}
            bladeAngle={dozerBladeAngle}
            bladePivot={dozerBladePivot}
            cuttingEdge={dozerCuttingEdge}
            cuttingEdgeRef={cuttingEdgeRef}
          />
        </ModelErrorBoundary>
      ) : (
        <ModelErrorBoundary name="DumpTruck">
           <DumpTruck 
              position={[excavatorPosition.x, excavatorPosition.y, excavatorPosition.z]}
              rotation={[0, excavatorRotation + Math.PI, 0]}
           />
        </ModelErrorBoundary>
      )}

      <CameraController 
        mode={cameraMode} 
        rotationAngle={effectiveCameraRotation} 
        targetPosition={targetPosition}
        radius={cameraRadius}
        height={cameraHeight}
        targetOffset={cameraTargetHeight}
        sideViewMode={sideViewMode}
        topViewMode={topViewMode}
        followVehicle={cameraFollowsVehicle}
        rotateWithVehicle={cameraRotatesWithVehicle}
        sectionDirection={sectionDirection}
        diagonalAngle={diagonalAngle}
        modelRadius={0.005}
      />

      <GuidanceDisplay 
        surfaceConfig={surfaceConfig}
        cuttingEdgeRef={cuttingEdgeRef}
      />

      {surfaceConfig.visible && (
        <mesh 
          position={[surfaceConfig.position.x, surfaceConfig.position.y, surfaceConfig.position.z]}
          rotation={[
            THREE.MathUtils.degToRad(surfaceConfig.gradient.x),
            0,
            THREE.MathUtils.degToRad(surfaceConfig.gradient.z)
          ]}
          userData={{ isTargetSurface: true }}
        >
          <boxGeometry args={[surfaceConfig.size.width, surfaceConfig.thickness, surfaceConfig.size.depth]} />
          <meshStandardMaterial 
            color={surfaceConfig.color} 
            transparent 
            opacity={surfaceConfig.opacity} 
          />
        </mesh>
      )}

      <ModelErrorBoundary name="EnvironmentMesh">
        <EnvironmentMesh 
          url={environmentUrl}
          position={envMeshConfig.position} 
          scale={envMeshConfig.scale} 
          visible={envMeshConfig.visible} 
          opacity={envMeshConfig.opacity}
          onGroundDetected={onGroundDetected}
          vehiclePosition={{ x: excavatorPosition.x, z: excavatorPosition.z }}
          onContactY={onVehicleHeightUpdate}
        />
      </ModelErrorBoundary>

      <TerrainGrid
        visible={gridConfig.visible}
        gridSize={gridConfig.gridSize}
        gridSpacing={gridConfig.gridSpacing}
        lineWidth={gridConfig.lineWidth}
        targetSurfaceConfig={surfaceConfig}
        center={gridCenter}
        circularMask={gridConfig.circularMask}
        maskRadius={gridConfig.maskRadius}
        showFill={gridConfig.showFill}
        opacity={gridConfig.opacity}
        cuttingEdgeRef={cuttingEdgeRef}
        showSectionOnly={gridConfig.showSectionOnly}
        sectionDirection={gridConfig.sectionDirection}
        vehicleRotation={excavatorRotation}
        gridCenterMode={gridConfig.gridCenterMode}
        continuousUpdate={gridConfig.continuousUpdate}
        vehiclePosition={{ x: excavatorPosition.x, z: excavatorPosition.z }}
      />

      {obstacles.map(obs => (
        <EnvironmentObject 
          key={obs.id}
          type={obs.type}
          position={obs.position}
          scale={obs.scale}
        />
      ))}

      {/* Hide Restricted Zones in Section View */}
      {cameraMode !== 'section' && restrictedZones.map(zone => (
        <RestrictedZone key={zone.id} config={zone} />
      ))}

      <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
    </>
  );
}
