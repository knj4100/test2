import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { View, Loader } from '@react-three/drei';
import { TargetSurfacePanel, TargetSurfaceConfig } from './components/TargetSurfacePanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { RestrictedZonePanel } from './components/RestrictedZonePanel';
import { LightingPanel, LightingConfig } from './components/LightingPanel';
import { Scene3D } from './components/Scene3D';
import { GameController } from './components/GameController';
import { MachineController } from './components/MachineController';
import { VehicleSelector } from './components/VehicleSelector';
import { ViewSettingsPanel } from './components/ViewSettingsPanel';
import { DebugPanel } from './components/DebugPanel';
import * as THREE from 'three';
import { calculateBucketPosition, toWorldSpace, EXCAVATOR_PIVOTS, DOZER_PIVOTS } from './utils/excavatorKinematics';
import { useViewConfig } from './hooks/useViewConfig';
import { useEnvironmentConfig } from './hooks/useEnvironmentConfig';
import { useGridConfig } from './hooks/useGridConfig';
import { ViewConfig } from './types/viewConfig';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const view1Ref = useRef<HTMLDivElement>(null);
  const view2Ref = useRef<HTMLDivElement>(null);
  const cuttingEdgeRef = useRef<THREE.Group>(null);
  const [splitScreen, setSplitScreen] = useState(true);

  // Vehicle State
  const [rotationAngle, setRotationAngle] = useState(0);
  const [boomAngle, setBoomAngle] = useState(0);
  const [armAngle, setArmAngle] = useState(0);
  const [backetAngle, setBacketAngle] = useState(0);
  const [excavatorPosition, setExcavatorPosition] = useState({ x: 0.0358, y: -0.0074, z: -0.0880 });
  const [excavatorRotation, setExcavatorRotation] = useState(0);
  const [dozerBladeAngle, setDozerBladeAngle] = useState(0);
  const [dozerCuttingEdge, setDozerCuttingEdge] = useState(DOZER_PIVOTS.cuttingEdge);
  const [vehicleType, setVehicleType] = useState<'excavator' | 'dozer' | 'dump'>('dozer');

  // Custom Hooks
  const viewConfig = useViewConfig();
  const { view1Config, view2Config, activeSettingsView, setActiveSettingsView } = viewConfig;

  const envConfig = useEnvironmentConfig(activeSettingsView, setExcavatorPosition);
  const {
    obstacles, restrictedZones, envMeshConfig, view1EnvSettings, view2EnvSettings,
    selectedModelUrl, availableModels, selectedModelId,
    handleGroundDetected, handleVehicleHeightUpdate,
    handleUpdateEnvMesh, handleModelSelect,
    handleAddObstacle, handleUpdateObstacle, handleRemoveObstacle,
    handleAddZone, handleUpdateZone, handleRemoveZone,
  } = envConfig;

  const gridConfig = useGridConfig(activeSettingsView, excavatorPosition);
  const { view1GridConfig, view2GridConfig, gridCenter, currentGridConfig, handleUpdateGrid, handleUpdateGridCenter } = gridConfig;

  // Target Surface State
  const [surfaceConfig, setSurfaceConfig] = useState<TargetSurfaceConfig>({
    position: { x: 0, y: 0, z: 0 },
    size: { width: 0.005, depth: 0.005 },
    gradient: { x: 0, z: 0 },
    thickness: 0.0001,
    color: "#00ffff",
    opacity: 0.5,
    visible: false
  });

  // Lighting State
  const [lightingConfig, setLightingConfig] = useState<LightingConfig>({
    ambientIntensity: 0.5,
    directionalIntensity: 1,
    directionalPosition: { x: 10, y: 10, z: 5 },
    environmentPreset: 'park'
  });

  const handleSnapToEdge = () => {
    if (cuttingEdgeRef.current) {
      const worldPos = new THREE.Vector3();
      cuttingEdgeRef.current.getWorldPosition(worldPos);
      setSurfaceConfig(prev => ({
        ...prev,
        position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        visible: true
      }));
    }
  };

  // State ref for GameController frame loop
  const stateRef = useRef({
    rotationAngle, boomAngle, armAngle, backetAngle, surfaceConfig, excavatorPosition, excavatorRotation, dozerBladeAngle, restrictedZones
  });

  useEffect(() => {
    stateRef.current = { rotationAngle, boomAngle, armAngle, backetAngle, surfaceConfig, excavatorPosition, excavatorRotation, dozerBladeAngle, restrictedZones };
  }, [rotationAngle, boomAngle, armAngle, backetAngle, surfaceConfig, excavatorPosition, excavatorRotation, dozerBladeAngle, restrictedZones]);

  // Calculate Target Position based on config
  const getTargetPosition = (config: ViewConfig) => {
    if (config.targetType === 'body') {
      return toWorldSpace(
        new THREE.Vector3(EXCAVATOR_PIVOTS.body.x, EXCAVATOR_PIVOTS.body.y, EXCAVATOR_PIVOTS.body.z),
        excavatorPosition,
        excavatorRotation + Math.PI
      );
    }

    if (vehicleType === 'excavator') {
      const localPos = calculateBucketPosition({
        rotation: rotationAngle,
        boom: boomAngle,
        arm: armAngle,
        backet: backetAngle
      });
      return toWorldSpace(localPos, excavatorPosition, excavatorRotation + Math.PI);
    } else if (vehicleType === 'dozer') {
      const mBody = new THREE.Matrix4()
        .multiply(new THREE.Matrix4().makeTranslation(excavatorPosition.x, excavatorPosition.y, excavatorPosition.z))
        .multiply(new THREE.Matrix4().makeRotationY(excavatorRotation + Math.PI));

      const mBlade = new THREE.Matrix4()
        .multiply(new THREE.Matrix4().makeTranslation(DOZER_PIVOTS.blade.x, DOZER_PIVOTS.blade.y, DOZER_PIVOTS.blade.z))
        .multiply(new THREE.Matrix4().makeRotationX(dozerBladeAngle))
        .multiply(new THREE.Matrix4().makeTranslation(-DOZER_PIVOTS.blade.x, -DOZER_PIVOTS.blade.y, -DOZER_PIVOTS.blade.z));

      const finalMatrix = new THREE.Matrix4().multiply(mBody).multiply(mBlade);
      const pos = new THREE.Vector3(dozerCuttingEdge.x, dozerCuttingEdge.y, dozerCuttingEdge.z);
      pos.applyMatrix4(finalMatrix);
      return pos;
    } else {
      return toWorldSpace(new THREE.Vector3(0, 0, 0), excavatorPosition, excavatorRotation + Math.PI);
    }
  };

  const targetPosition1 = getTargetPosition(view1Config);
  const targetPosition2 = getTargetPosition(view2Config);

  const getEffectiveCameraRotation = (config: ViewConfig) => {
    return (vehicleType === 'dozer' || vehicleType === 'dump')
      ? excavatorRotation + Math.PI
      : excavatorRotation + Math.PI + (config.targetType === 'bucket' ? rotationAngle : 0);
  };

  const effectiveRot1 = getEffectiveCameraRotation(view1Config);
  const effectiveRot2 = getEffectiveCameraRotation(view2Config);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      {/* 3D Canvas Area */}
      <div ref={containerRef} className="flex-1 relative bg-gray-100 h-[60vh] md:h-full flex flex-col md:flex-row">
        <div ref={view1Ref} className={`relative h-full ${splitScreen ? 'flex-1 border-r border-slate-300' : 'w-full'}`} />
        {splitScreen && <div ref={view2Ref} className="flex-1 relative h-full" />}

        <Canvas className="!absolute inset-0 pointer-events-none" eventSource={containerRef} shadows dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }}>
          <View track={view1Ref}>
            <Suspense fallback={null}>
              <color attach="background" args={['#f0f0f0']} />
              <Scene3D
                vehicleType={vehicleType}
                excavatorPosition={excavatorPosition}
                excavatorRotation={excavatorRotation}
                pivotPoint={EXCAVATOR_PIVOTS.body}
                rotationAngle={rotationAngle}
                workEquipmentPivot={EXCAVATOR_PIVOTS.workEquipment}
                boomAngle={boomAngle}
                armPivot={EXCAVATOR_PIVOTS.arm}
                armAngle={armAngle}
                backetPivot={EXCAVATOR_PIVOTS.backet}
                backetAngle={backetAngle}
                cuttingEdge={EXCAVATOR_PIVOTS.cuttingEdge}
                cuttingEdgeRef={cuttingEdgeRef}
                dozerBladeAngle={dozerBladeAngle}
                dozerBladePivot={DOZER_PIVOTS.blade}
                dozerCuttingEdge={dozerCuttingEdge}
                lightingConfig={lightingConfig}
                envMeshConfig={{ ...envMeshConfig, ...view1EnvSettings }}
                gridConfig={view1GridConfig}
                surfaceConfig={surfaceConfig}
                gridCenter={gridCenter}
                obstacles={obstacles}
                restrictedZones={restrictedZones}
                environmentUrl={selectedModelUrl}
                onGroundDetected={handleGroundDetected}
                onVehicleHeightUpdate={handleVehicleHeightUpdate}
                cameraMode={view1Config.mode}
                effectiveCameraRotation={effectiveRot1}
                targetPosition={targetPosition1}
                cameraRadius={view1Config.radius}
                cameraHeight={view1Config.height}
                cameraTargetHeight={view1Config.targetHeight}
                sideViewMode={view1Config.sideViewMode}
                topViewMode={view1Config.topViewMode}
                cameraFollowsVehicle={view1Config.followsVehicle}
                cameraRotatesWithVehicle={view1Config.rotatesWithVehicle}
                sectionDirection={view1Config.sectionDirection}
                diagonalAngle={view1Config.diagonalAngle}
                sideCameraType={view1Config.sideCameraType}
                topCameraType={view1Config.topCameraType}
              />
              <GameController
                setRotationAngle={setRotationAngle}
                setBoomAngle={setBoomAngle}
                setArmAngle={setArmAngle}
                setBacketAngle={setBacketAngle}
                setExcavatorRotation={setExcavatorRotation}
                setExcavatorPosition={setExcavatorPosition}
                setDozerBladeAngle={setDozerBladeAngle}
                stateRef={stateRef}
                vehicleType={vehicleType}
              />
              <MachineController
                vehicleType={vehicleType}
                surfaceConfig={surfaceConfig}
                excavatorPosition={excavatorPosition}
                excavatorRotation={excavatorRotation}
                dozerBladePivot={DOZER_PIVOTS.blade}
                dozerCuttingEdge={dozerCuttingEdge}
                dozerBladeAngle={dozerBladeAngle}
                setDozerBladeAngle={setDozerBladeAngle}
              />
            </Suspense>
          </View>

          {splitScreen && (
            <View track={view2Ref}>
              <Suspense fallback={null}>
                <color attach="background" args={['#f0f0f0']} />
                <Scene3D
                  vehicleType={vehicleType}
                  excavatorPosition={excavatorPosition}
                  excavatorRotation={excavatorRotation}
                  pivotPoint={EXCAVATOR_PIVOTS.body}
                  rotationAngle={rotationAngle}
                  workEquipmentPivot={EXCAVATOR_PIVOTS.workEquipment}
                  boomAngle={boomAngle}
                  armPivot={EXCAVATOR_PIVOTS.arm}
                  armAngle={armAngle}
                  backetPivot={EXCAVATOR_PIVOTS.backet}
                  backetAngle={backetAngle}
                  cuttingEdge={EXCAVATOR_PIVOTS.cuttingEdge}
                  cuttingEdgeRef={cuttingEdgeRef}
                  dozerBladeAngle={dozerBladeAngle}
                  dozerBladePivot={DOZER_PIVOTS.blade}
                  dozerCuttingEdge={dozerCuttingEdge}
                  lightingConfig={lightingConfig}
                  envMeshConfig={{ ...envMeshConfig, ...view2EnvSettings }}
                  gridConfig={view2GridConfig}
                  surfaceConfig={surfaceConfig}
                  gridCenter={gridCenter}
                  obstacles={obstacles}
                  restrictedZones={restrictedZones}
                  environmentUrl={selectedModelUrl}
                  onGroundDetected={handleGroundDetected}
                  cameraMode={view2Config.mode}
                  effectiveCameraRotation={effectiveRot2}
                  targetPosition={targetPosition2}
                  cameraRadius={view2Config.radius}
                  cameraHeight={view2Config.height}
                  cameraTargetHeight={view2Config.targetHeight}
                  sideViewMode={view2Config.sideViewMode}
                  topViewMode={view2Config.topViewMode}
                  cameraFollowsVehicle={view2Config.followsVehicle}
                  cameraRotatesWithVehicle={view2Config.rotatesWithVehicle}
                  sectionDirection={view2Config.sectionDirection}
                  diagonalAngle={view2Config.diagonalAngle}
                  sideCameraType={view2Config.sideCameraType}
                  topCameraType={view2Config.topCameraType}
                />
              </Suspense>
            </View>
          )}
        </Canvas>
        <Loader />
      </div>

      {/* Controls Sidebar */}
      <div className="w-full md:w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto shadow-xl z-10 flex flex-col gap-4 h-[40vh] md:h-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sim Settings</h1>
          <p className="text-slate-500 text-sm mb-6">Vehicle Configuration</p>
        </div>

        <VehicleSelector vehicleType={vehicleType} setVehicleType={setVehicleType} />

        {splitScreen && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="text-xs text-slate-500 font-semibold mb-2 block">Edit Settings For</label>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSettingsView('view1')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors border ${
                  activeSettingsView === 'view1'
                    ? 'bg-blue-50 text-blue-600 border-blue-200 ring-1 ring-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Left View
              </button>
              <button
                onClick={() => setActiveSettingsView('view2')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors border ${
                  activeSettingsView === 'view2'
                    ? 'bg-blue-50 text-blue-600 border-blue-200 ring-1 ring-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Right View
              </button>
            </div>
          </div>
        )}

        <ViewSettingsPanel
          splitScreen={splitScreen}
          setSplitScreen={setSplitScreen}
          vehicleType={vehicleType}
          dozerCuttingEdge={dozerCuttingEdge}
          setDozerCuttingEdge={setDozerCuttingEdge}
          {...viewConfig}
        />

        <TargetSurfacePanel
          config={surfaceConfig}
          onChange={setSurfaceConfig}
          onSnapToEdge={handleSnapToEdge}
        />

        <EnvironmentPanel
          obstacles={obstacles}
          onAdd={handleAddObstacle}
          onUpdate={handleUpdateObstacle}
          onRemove={handleRemoveObstacle}
          meshConfig={{
            ...envMeshConfig,
            ...(activeSettingsView === 'view1' ? view1EnvSettings : view2EnvSettings)
          }}
          onUpdateMesh={handleUpdateEnvMesh}
          selectedModelId={selectedModelId}
          onSelectModel={handleModelSelect}
          availableModels={availableModels}
          gridConfig={currentGridConfig}
          onUpdateGrid={handleUpdateGrid}
          onUpdateGridCenter={handleUpdateGridCenter}
        />

        <RestrictedZonePanel
          zones={restrictedZones}
          onAdd={handleAddZone}
          onUpdate={handleUpdateZone}
          onRemove={handleRemoveZone}
        />

        <LightingPanel
          config={lightingConfig}
          onChange={setLightingConfig}
        />

        <DebugPanel
          excavatorPosition={excavatorPosition}
          envMeshOffsetY={envMeshConfig.position.y}
          surfaceVisible={surfaceConfig.visible}
        />

        <div className="mt-auto pt-6 text-xs text-slate-400 border-t border-slate-100">
          <p>Coordinate System: Y-up</p>
          <p>Units: Meters</p>
        </div>
      </div>
    </div>
  );
}
