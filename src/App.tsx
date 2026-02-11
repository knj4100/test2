import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Loader, Bounds, OrthographicCamera, PerspectiveCamera, View } from '@react-three/drei';
import { Excavator } from './components/Excavator';
import { TargetSurfacePanel, TargetSurfaceConfig } from './components/TargetSurfacePanel';
import { GuidanceDisplay } from './components/GuidanceDisplay';
import { CameraController } from './components/CameraController';
import { EnvironmentObject } from './components/EnvironmentObject';
import { EnvironmentMesh } from './components/EnvironmentMesh';
import { EnvironmentPanel, Obstacle, EnvironmentMeshConfig, TerrainGridConfig } from './components/EnvironmentPanel';
import { RestrictedZonePanel, RestrictedZoneConfig } from './components/RestrictedZonePanel';
import { LightingPanel, LightingConfig } from './components/LightingPanel';
import { TerrainGrid } from './components/TerrainGrid';
import { LargeDozer } from './components/LargeDozer';
import { ModelErrorBoundary } from './components/ModelErrorBoundary';
import { Scene3D } from './components/Scene3D';
import { Slider } from './components/ui/slider';
import * as THREE from 'three';

// Environment Models (URLs loaded from environment variables)
const AVAILABLE_MODELS = [
  {
    id: 'light4',
    name: 'Environment Light 4',
    url: import.meta.env.VITE_MODEL_URL_LIGHT4 || ''
  },
  {
    id: 'light5',
    name: 'Environment Light 5',
    url: import.meta.env.VITE_MODEL_URL_LIGHT5 || ''
  },
  {
    id: 'light6',
    name: 'Environment Light 6',
    url: import.meta.env.VITE_MODEL_URL_LIGHT6 || ''
  },
  {
    id: 'light7',
    name: 'Environment Light 7',
    url: import.meta.env.VITE_MODEL_URL_LIGHT7 || ''
  },
  {
    id: 'mesh_divide',
    name: '3D Mesh Divide',
    url: import.meta.env.VITE_MODEL_URL_MESH_DIVIDE || ''
  }
];

// Helper function to calculate bucket position
const calculateBucketPosition = (
  rotationAngle: number, 
  boomAngle: number, 
  armAngle: number, 
  backetAngle: number, // Unused in current FK logic but kept for future use if needed? No, matrix logic uses 0,0,0 for bucket group locally?
  // Wait, the original getBucketPosition code used backetPivot but didn't apply backet rotation to the point itself because the point IS the pivot?
  // Let's check the original code carefully.
  // pos = new THREE.Vector3(backetPivot.x, backetPivot.y, backetPivot.z);
  // This is the position of the pivot. The cutting edge is attached to the bucket.
  // The "Cutting Edge" position in the original code (getBucketPosition) seemed to return the bucket pivot position?
  // Let's re-read getBucketPosition in previous App.tsx.
  // It returns: const pos = new THREE.Vector3(backetPivot.x, backetPivot.y, backetPivot.z);
  // pos.applyMatrix4(finalMatrix);
  // Wait, the finalMatrix includes body*boom*arm.
  // The bucket pivot is relative to the Arm group.
  // So transforming backetPivot by Body*Boom*Arm gives the world position of the Bucket Pivot.
  // BUT, we want to check the Cutting Edge position for collision, right?
  // The user asked "Target Surfaceの面に沿って...". Usually this means the cutting edge.
  // The original code defined `cuttingEdge` constant but getBucketPosition didn't use it?
  // Let's look at `cuttingEdge` usage. It's passed to Excavator.
  // Inside Excavator:
  // <group position={[cuttingEdge.x, cuttingEdge.y, cuttingEdge.z]} ...>
  // The cutting edge is relative to the Bucket group.
  // So we need to calculate the full FK chain including the bucket rotation to get the cutting edge world pos.
  
  pivotPoint: {x:number, y:number, z:number},
  workEquipmentPivot: {x:number, y:number, z:number},
  armPivot: {x:number, y:number, z:number},
  backetPivot: {x:number, y:number, z:number},
  cuttingEdge: {x:number, y:number, z:number}
) => {
    const mBody = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeTranslation(pivotPoint.x, pivotPoint.y, pivotPoint.z))
      .multiply(new THREE.Matrix4().makeRotationY(rotationAngle))
      .multiply(new THREE.Matrix4().makeTranslation(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z));
      
    const mBoom = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeTranslation(workEquipmentPivot.x, workEquipmentPivot.y, workEquipmentPivot.z))
      .multiply(new THREE.Matrix4().makeRotationX(boomAngle))
      .multiply(new THREE.Matrix4().makeTranslation(-workEquipmentPivot.x, -workEquipmentPivot.y, -workEquipmentPivot.z));
      
    const mArm = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeTranslation(armPivot.x, armPivot.y, armPivot.z))
      .multiply(new THREE.Matrix4().makeRotationX(armAngle))
      .multiply(new THREE.Matrix4().makeTranslation(-armPivot.x, -armPivot.y, -armPivot.z));
      
    // Add Bucket Rotation
    const mBacket = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeTranslation(backetPivot.x, backetPivot.y, backetPivot.z))
      .multiply(new THREE.Matrix4().makeRotationX(backetAngle))
      .multiply(new THREE.Matrix4().makeTranslation(-backetPivot.x, -backetPivot.y, -backetPivot.z));
      
    const finalMatrix = new THREE.Matrix4()
      .multiply(mBody)
      .multiply(mBoom)
      .multiply(mArm)
      .multiply(mBacket); // Include bucket rotation
    
    // Transform the Cutting Edge position (which is relative to the Bucket)
    const pos = new THREE.Vector3(cuttingEdge.x, cuttingEdge.y, cuttingEdge.z);
    pos.applyMatrix4(finalMatrix);
    
    return pos;
}

// Helper function to calculate surface height at (x, z)
const getSurfaceHeight = (x: number, z: number, config: TargetSurfaceConfig) => {
  if (!config.visible) return -Infinity;

  const p0 = new THREE.Vector3(config.position.x, config.position.y, config.position.z);
  
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(config.gradient.x), 
    0, 
    THREE.MathUtils.degToRad(config.gradient.z), 
    'XYZ'
  );
  const normal = new THREE.Vector3(0, 1, 0).applyEuler(euler);

  if (Math.abs(normal.y) < 0.0001) return -Infinity;

  const y = p0.y - (normal.x * (x - p0.x) + normal.z * (z - p0.z)) / normal.y;
  return y;
};

import { GameController } from './components/GameController';

import { MachineController } from './components/MachineController';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const view1Ref = useRef<HTMLDivElement>(null);
  const view2Ref = useRef<HTMLDivElement>(null);
  const [splitScreen, setSplitScreen] = useState(true);

  // Fixed Pivot Point for Rotation (Y-axis)
  const pivotPoint = { x: -0.0014, y: 0.001, z: -0.0018 };
  // Fixed Pivot Point for Work Equipment (Boom) (X-axis)
  const workEquipmentPivot = { x: -0.00155, y: 0.00188, z: -0.00155 };
  // Fixed Pivot Point for Arm (X-axis)
  const armPivot = { x: -0.0015, y: 0.0032, z: 0.004 };
  // Fixed Pivot Point for Backet (X-axis)
  const backetPivot = { x: -0.0015, y: 0.0006, z: 0.00265 };

  // Fixed Cutting Edge Position
  const cuttingEdge = { x: -0.001, y: 0.0013, z: 0.00145 };

  // Helper to transform local point to world space
  const toWorld = (localPos: THREE.Vector3, basePos: {x:number, y:number, z:number}, baseRot: number) => {
    const pos = localPos.clone();
    pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), baseRot);
    pos.add(new THREE.Vector3(basePos.x, basePos.y, basePos.z));
    return pos;
  };
  
  const [rotationAngle, setRotationAngle] = useState(0);
  const [boomAngle, setBoomAngle] = useState(0);
  const [armAngle, setArmAngle] = useState(0);
  const [backetAngle, setBacketAngle] = useState(0);
  const [excavatorPosition, setExcavatorPosition] = useState({ x: 0.0358, y: -0.0074, z: -0.0880 });
  const [excavatorRotation, setExcavatorRotation] = useState(0);

  // Dozer State
  const [dozerBladeAngle, setDozerBladeAngle] = useState(0);
  const dozerBladePivot = { x: 0.0045, y: 0.0023, z: -0.0007 };
  // Dozer Cutting Edge (Local to Blade, relative to blade origin)
  const [dozerCuttingEdge, setDozerCuttingEdge] = useState({ x: 0.0, y: 0.0, z: 0.0126 });

  // Vehicle Selection
  const [vehicleType, setVehicleType] = useState<'excavator' | 'dozer' | 'dump'>('dozer');

  // View Configuration State
  interface ViewConfig {
    mode: 'default' | 'follow' | 'top' | 'section';
    followsVehicle: boolean;
    rotatesWithVehicle: boolean;
    targetType: 'body' | 'bucket';
    sideViewMode: 'true' | 'diagonal';
    topViewMode: 'true' | 'diagonal';
    sectionDirection: 'longitudinal' | 'transverse';
    sideCameraType: 'perspective' | 'orthographic';
    topCameraType: 'perspective' | 'orthographic';
    diagonalAngle: number;
    radius: number;
    height: number;
    targetHeight: number;
  }

  const defaultViewConfig: ViewConfig = {
    mode: 'default',
    followsVehicle: true,
    rotatesWithVehicle: false,
    targetType: 'body',
    sideViewMode: 'true',
    topViewMode: 'true',
    sectionDirection: 'longitudinal',
    sideCameraType: 'perspective',
    topCameraType: 'perspective',
    diagonalAngle: 45,
    radius: 0.014,
    height: 0.008,
    targetHeight: 0.0015
  };

  const [view1Config, setView1Config] = useState<ViewConfig>({ 
    ...defaultViewConfig, 
    mode: 'section',
    targetType: 'bucket',
    radius: 0.0000195, // 0.0195mm
    targetHeight: 0.005 
  });
  const [view2Config, setView2Config] = useState<ViewConfig>({ ...defaultViewConfig, mode: 'default' });
  const [activeSettingsView, setActiveSettingsView] = useState<'view1' | 'view2'>('view1');

  // Helper to update view config
  const updateViewConfig = (view: 'view1' | 'view2', updates: Partial<ViewConfig>) => {
    if (view === 'view1') {
      setView1Config(prev => ({ ...prev, ...updates }));
    } else {
      setView2Config(prev => ({ ...prev, ...updates }));
    }
  };

  // Helper to update currently active view config
  const updateActiveConfig = (updates: Partial<ViewConfig>) => {
    updateViewConfig(activeSettingsView, updates);
  };

  // Get current config for rendering UI
  const currentConfig = activeSettingsView === 'view1' ? view1Config : view2Config;

  // Destructure current config for easier usage in UI and create setter wrappers
  const { 
    mode: cameraMode, 
    followsVehicle: cameraFollowsVehicle,
    rotatesWithVehicle: cameraRotatesWithVehicle,
    targetType,
    sideViewMode,
    topViewMode,
    sectionDirection,
    sideCameraType,
    topCameraType,
    diagonalAngle,
    radius: cameraRadius,
    height: cameraHeight,
    targetHeight: cameraTargetHeight
  } = currentConfig;

  const setCameraMode = (mode: ViewConfig['mode']) => updateActiveConfig({ mode });
  const setCameraFollowsVehicle = (followsVehicle: boolean) => updateActiveConfig({ followsVehicle });
  const setCameraRotatesWithVehicle = (rotatesWithVehicle: boolean) => updateActiveConfig({ rotatesWithVehicle });
  const setTargetType = (targetType: ViewConfig['targetType']) => updateActiveConfig({ targetType });
  const setSideViewMode = (sideViewMode: ViewConfig['sideViewMode']) => updateActiveConfig({ sideViewMode });
  const setTopViewMode = (topViewMode: ViewConfig['topViewMode']) => updateActiveConfig({ topViewMode });
  const setSideCameraType = (sideCameraType: ViewConfig['sideCameraType']) => updateActiveConfig({ sideCameraType });
  const setTopCameraType = (topCameraType: ViewConfig['topCameraType']) => updateActiveConfig({ topCameraType });
  const setDiagonalAngle = (diagonalAngle: number) => updateActiveConfig({ diagonalAngle });
  const setCameraRadius = (radius: number) => updateActiveConfig({ radius });
  const setCameraHeight = (height: number) => updateActiveConfig({ height });
  const setCameraTargetHeight = (targetHeight: number) => updateActiveConfig({ targetHeight });

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

  // Environment Objects State
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  // Restricted Zones State
  const [restrictedZones, setRestrictedZones] = useState<RestrictedZoneConfig[]>([]);

  // Environment Mesh State
  const [envMeshConfig, setEnvMeshConfig] = useState<EnvironmentMeshConfig>({
    visible: true,
    position: { x: 0, y: 0.0000, z: 0 },
    scale: 1,
    opacity: 0.3
  });

  // View-specific Environment Mesh Settings (Opacity/Visible)
  const [view1EnvSettings, setView1EnvSettings] = useState({ visible: true, opacity: 0.05 });
  const [view2EnvSettings, setView2EnvSettings] = useState({ visible: true, opacity: 0.7 });

  // Environment Models
  const availableModels = AVAILABLE_MODELS;

  const [selectedModelId, setSelectedModelId] = useState<string>('mesh_divide'); // Default to latest

  const selectedModelUrl = availableModels.find(m => m.id === selectedModelId)?.url || availableModels[0].url;

  const handleGroundDetected = (y: number) => {
    // Only auto-update if the current position is significantly different to avoid loops
    // or if we just want to snap on load.
    // Let's update the state.
    setEnvMeshConfig(prev => {
        if (Math.abs(prev.position.y - y) < 0.00001) return prev;
        return {
            ...prev,
            position: { ...prev.position, y }
        };
    });
  };

  const handleVehicleHeightUpdate = (y: number) => {
    // This Y is the contact point in World Space.
    // We want the vehicle to sit on this point.
    // But excavatorPosition.y is the position of the vehicle origin.
    // Assuming vehicle origin = bottom of wheels/tracks, then excavatorPosition.y should be y.
    
    setExcavatorPosition(prev => {
        // Prevent jitter/infinite loops with a small threshold
        if (Math.abs(prev.y - y) < 0.0001) return prev;
        return { ...prev, y };
    });
  };

  // Terrain Grid State - Per View
  const defaultGridConfig: TerrainGridConfig = {
    visible: true,
    gridSize: 40,
    gridSpacing: 0.0025,
    lineWidth: 1, // Default thickness
    circularMask: false,
    showFill: true,
    opacity: 0.8,
    showSectionOnly: false,
    sectionDirection: 'longitudinal',
    gridCenterMode: 'manual',
    continuousUpdate: false
  };

  const [view1GridConfig, setView1GridConfig] = useState<TerrainGridConfig>({
    ...defaultGridConfig,
    showSectionOnly: true,
    sectionDirection: 'longitudinal',
    lineWidth: 10
  });
  const [view2GridConfig, setView2GridConfig] = useState<TerrainGridConfig>({
    ...defaultGridConfig,
    circularMask: true,
    lineWidth: 2
  });
  
  // Get current grid config based on active view
  const currentGridConfig = activeSettingsView === 'view1' ? view1GridConfig : view2GridConfig;

  // Grid Center is shared or separate? Usually shared as it tracks the machine?
  // User said "Terrain Grid Display Settings", usually implies visualization options, not the grid data itself.
  // But Grid Center tracks the excavator.
  // The `TerrainGrid` component takes `center` prop.
  // `gridCenter` state is updated by `handleUpdateGridCenter`.
  // Let's keep `gridCenter` shared for now, as it's likely tied to the vehicle position.
  const [gridCenter, setGridCenter] = useState({ x: 0, z: 0 });

  // Lighting State
  const [lightingConfig, setLightingConfig] = useState<LightingConfig>({
    ambientIntensity: 0.5,
    directionalIntensity: 1,
    directionalPosition: { x: 10, y: 10, z: 5 },
    environmentPreset: 'park'
  });

  const handleUpdateEnvMesh = (field: 'visible' | 'x' | 'y' | 'z' | 'scale' | 'opacity', value: number | boolean) => {
    // Handle view-specific settings (visible, opacity)
    if (field === 'visible' || field === 'opacity') {
      const setSettings = activeSettingsView === 'view1' ? setView1EnvSettings : setView2EnvSettings;
      setSettings(prev => ({ ...prev, [field]: value }));
      // Also update the main config just to keep it in sync for debug or default
      // but the real source of truth for rendering will be the merged config
      setEnvMeshConfig(prev => ({ ...prev, [field]: value }));
      return;
    }

    // Handle global settings (position, scale)
    setEnvMeshConfig(prev => {
      if (field === 'scale') {
        return { ...prev, [field]: value as number };
      }
      return { 
        ...prev, 
        position: { 
          ...prev.position, 
          [field]: value as number 
        } 
      };
    });
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    
    if (['light4', 'light5', 'light6', 'light7'].includes(modelId)) {
      setExcavatorPosition({ x: -0.1536, y: -0.0232, z: 0.0990 });
      setEnvMeshConfig(prev => ({
        ...prev,
        position: { ...prev.position, y: 0.2040 }
      }));
    } else if (modelId === 'mesh_divide') {
       setExcavatorPosition({ x: 0.0358, y: -0.0074, z: -0.0880 });
       setEnvMeshConfig(prev => ({
          ...prev,
          position: { ...prev.position, y: 0.0000 }
       }));
    }
  };

  const handleUpdateGrid = (field: 'visible' | 'gridSize' | 'gridSpacing' | 'circularMask' | 'showFill' | 'opacity' | 'showSectionOnly' | 'sectionDirection' | 'lineWidth' | 'gridCenterMode' | 'continuousUpdate', value: number | boolean | string) => {
    const setConfig = activeSettingsView === 'view1' ? setView1GridConfig : setView2GridConfig;

    setConfig(prev => {
      if (field === 'visible' || field === 'circularMask' || field === 'showFill' || field === 'showSectionOnly' || field === 'continuousUpdate') {
        return { ...prev, [field]: value as boolean };
      }
      if (field === 'sectionDirection') {
         return { ...prev, [field]: value as 'longitudinal' | 'transverse' };
      }
      if (field === 'gridCenterMode') {
         return { ...prev, [field]: value as 'manual' | 'vehicle' | 'bucket' };
      }
      return { ...prev, [field]: value as number };
    });
  };

  const handleUpdateGridCenter = () => {
    setGridCenter({ x: excavatorPosition.x, z: excavatorPosition.z });
  };

  const handleAddObstacle = (type: 'cane' | 'human') => {
    setObstacles(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      // Place somewhat near the excavator but not colliding, e.g., 10mm away
      position: { x: 0.01, y: 0, z: 0.01 },
      scale: 1
    }]);
  };

  const handleUpdateObstacle = (id: string, field: 'x' | 'y' | 'z' | 'scale', value: number) => {
    setObstacles(prev => prev.map(obs => {
      if (obs.id !== id) return obs;
      
      if (field === 'scale') {
        return { ...obs, scale: value };
      } else {
        return { ...obs, position: { ...obs.position, [field]: value } };
      }
    }));
  };

  const handleRemoveObstacle = (id: string) => {
    setObstacles(prev => prev.filter(obs => obs.id !== id));
  };

  const handleAddZone = () => {
    setRestrictedZones(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      position: { x: 0.005, y: 0, z: 0.005 },
      width: 0.005,
      depth: 0.005,
      height: 0.005,
      active: true
    }]);
  };

  const handleUpdateZone = (id: string, field: keyof RestrictedZoneConfig | 'x' | 'y' | 'z', value: number | boolean) => {
    setRestrictedZones(prev => prev.map(zone => {
      if (zone.id !== id) return zone;
      if (field === 'x' || field === 'y' || field === 'z') {
        return { ...zone, position: { ...zone.position, [field]: value } };
      }
      return { ...zone, [field]: value as any };
    }));
  };

  const handleRemoveZone = (id: string) => {
    setRestrictedZones(prev => prev.filter(z => z.id !== id));
  };

  const cuttingEdgeRef = useRef<THREE.Group>(null);

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

  // Keep track of state for event listener
  const stateRef = useRef({
    rotationAngle, boomAngle, armAngle, backetAngle, surfaceConfig, excavatorPosition, excavatorRotation, dozerBladeAngle, restrictedZones
  });

  useEffect(() => {
    stateRef.current = { rotationAngle, boomAngle, armAngle, backetAngle, surfaceConfig, excavatorPosition, excavatorRotation, dozerBladeAngle, restrictedZones };
  }, [rotationAngle, boomAngle, armAngle, backetAngle, surfaceConfig, excavatorPosition, excavatorRotation, dozerBladeAngle, restrictedZones]);

  // Calculate Target Position based on config
  const getTargetPosition = (config: ViewConfig) => {
     if (config.targetType === 'body') {
        return toWorld(new THREE.Vector3(pivotPoint.x, pivotPoint.y, pivotPoint.z), excavatorPosition, excavatorRotation + Math.PI);
     }

     if (vehicleType === 'excavator') {
       const localPos = calculateBucketPosition(
          rotationAngle, boomAngle, armAngle, backetAngle,
          pivotPoint, workEquipmentPivot, armPivot, backetPivot, cuttingEdge
       );
       // Apply 180 degree rotation adjustment to match visual model
       return toWorld(localPos, excavatorPosition, excavatorRotation + Math.PI);
     } else if (vehicleType === 'dozer') {
       // Calculate Dozer Blade Edge Position
       const mBody = new THREE.Matrix4()
          .multiply(new THREE.Matrix4().makeTranslation(excavatorPosition.x, excavatorPosition.y, excavatorPosition.z))
          .multiply(new THREE.Matrix4().makeRotationY(excavatorRotation + Math.PI)); // Model is rotated 180
       
       const mBlade = new THREE.Matrix4()
          .multiply(new THREE.Matrix4().makeTranslation(dozerBladePivot.x, dozerBladePivot.y, dozerBladePivot.z))
          .multiply(new THREE.Matrix4().makeRotationX(dozerBladeAngle))
          .multiply(new THREE.Matrix4().makeTranslation(-dozerBladePivot.x, -dozerBladePivot.y, -dozerBladePivot.z));
       
       const finalMatrix = new THREE.Matrix4()
          .multiply(mBody)
          .multiply(mBlade);
          
       const pos = new THREE.Vector3(dozerCuttingEdge.x, dozerCuttingEdge.y, dozerCuttingEdge.z);
       pos.applyMatrix4(finalMatrix);
       
       return pos;
     } else {
       // Dump Truck target (Body center for now)
       return toWorld(new THREE.Vector3(0, 0, 0), excavatorPosition, excavatorRotation + Math.PI);
     }
  };

  const targetPosition1 = getTargetPosition(view1Config);
  const targetPosition2 = getTargetPosition(view2Config);

  // Determine effective rotation for camera (including vehicle body rotation)
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
        {/* View 1 */}
        <div ref={view1Ref} className={`relative h-full ${splitScreen ? 'flex-1 border-r border-slate-300' : 'w-full'}`} />
        {/* View 2 */}
        {splitScreen && <div ref={view2Ref} className="flex-1 relative h-full" />}

        <Canvas className="!absolute inset-0 pointer-events-none" eventSource={containerRef} shadows dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }}>
          <View track={view1Ref}>
             <Suspense fallback={null}>
               <color attach="background" args={['#f0f0f0']} />
               <Scene3D 
                  vehicleType={vehicleType}
                  excavatorPosition={excavatorPosition}
                  excavatorRotation={excavatorRotation}
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
                  dozerBladeAngle={dozerBladeAngle}
                  dozerBladePivot={dozerBladePivot}
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
                  dozerBladePivot={dozerBladePivot}
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
                    dozerBladeAngle={dozerBladeAngle}
                    dozerBladePivot={dozerBladePivot}
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
        
        {/* Keyboard controls panel removed as requested */}
      </div>

      {/* Controls Sidebar */}
      <div className="w-full md:w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto shadow-xl z-10 flex flex-col gap-4 h-[40vh] md:h-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sim Settings</h1>
          <p className="text-slate-500 text-sm mb-6">Vehicle Configuration</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Vehicle Selection</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setVehicleType('excavator')}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                vehicleType === 'excavator' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Excavator
            </button>
            <button
              onClick={() => setVehicleType('dozer')}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                vehicleType === 'dozer' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Large Dozer
            </button>
            <button
              onClick={() => setVehicleType('dump')}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
                vehicleType === 'dump' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dump
            </button>
          </div>
        </div>

        {vehicleType === 'dozer' && (
          // Pivot controls removed as requested
          null
        )}

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

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">View Settings</h3>
          
          <div className="mb-4 pb-4 border-b border-slate-100">
             <label className="text-xs text-slate-500 font-semibold mb-2 block">Layout</label>
             <button
                onClick={() => setSplitScreen(!splitScreen)}
                className={`w-full py-1.5 px-2 text-xs font-medium rounded-md transition-colors border ${
                  splitScreen 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
             >
                {splitScreen ? "Split View (2 Cameras)" : "Single View"}
             </button>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
               <label className="text-xs text-slate-500 font-semibold">View Mode</label>
               {cameraMode === 'default' && (
                 <div className="flex gap-1">
                   <button
                      onClick={() => setCameraFollowsVehicle(!cameraFollowsVehicle)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        cameraFollowsVehicle 
                          ? 'bg-blue-100 text-blue-700 border-blue-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                      title="Move camera with vehicle position"
                   >
                      {cameraFollowsVehicle ? 'Move' : 'Static'}
                   </button>
                   {cameraFollowsVehicle && (
                     <button
                        onClick={() => setCameraRotatesWithVehicle(!cameraRotatesWithVehicle)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          cameraRotatesWithVehicle 
                            ? 'bg-blue-100 text-blue-700 border-blue-200' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                        title="Rotate camera with vehicle turn"
                     >
                        {cameraRotatesWithVehicle ? 'Rot' : 'Fix Rot'}
                     </button>
                   )}
                 </div>
               )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCameraMode('default')}
                className={`flex-1 py-2 px-2 text-[10px] font-medium rounded-md transition-colors ${
                  cameraMode === 'default' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setCameraMode('follow')}
                className={`flex-1 py-2 px-2 text-[10px] font-medium rounded-md transition-colors ${
                  cameraMode === 'follow' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Side
              </button>
              <button
                onClick={() => setCameraMode('top')}
                className={`flex-1 py-2 px-2 text-[10px] font-medium rounded-md transition-colors ${
                  cameraMode === 'top' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => setCameraMode('section')}
                className={`flex-1 py-2 px-2 text-[10px] font-medium rounded-md transition-colors ${
                  cameraMode === 'section' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Section
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-slate-500 font-semibold mb-2 block">Target Focus</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTargetType('body')}
                className={`flex-1 py-2 px-2 text-[10px] font-medium rounded-md transition-colors ${
                  targetType === 'body' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Body
              </button>
              <button
                onClick={() => setTargetType('bucket')}
                className={`flex-1 py-2 px-2 text-[10px] font-medium rounded-md transition-colors ${
                  targetType === 'bucket' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {vehicleType === 'excavator' ? 'Bucket' : (vehicleType === 'dozer' ? 'Blade' : 'Body')}
              </button>
            </div>
          </div>

          {/* Cutting Edge Configuration for Dozer */}
          {vehicleType === 'dozer' && (
            <div className="mb-4 pt-3 border-t border-slate-100">
               <h3 className="text-xs font-semibold text-slate-500 mb-2">Blade Control Point</h3>
               <div className="space-y-3">
                 <div>
                   <div className="flex justify-between text-xs text-slate-600 mb-1">
                     <span>X Offset</span>
                     <span>{(dozerCuttingEdge.x * 1000).toFixed(1)} mm</span>
                   </div>
                   <input 
                     type="range" 
                     min={-0.02} 
                     max={0.02} 
                     step={0.0001} 
                     value={dozerCuttingEdge.x}
                     onChange={(e) => setDozerCuttingEdge(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                     className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                 </div>
                 <div>
                   <div className="flex justify-between text-xs text-slate-600 mb-1">
                     <span>Y Offset</span>
                     <span>{(dozerCuttingEdge.y * 1000).toFixed(1)} mm</span>
                   </div>
                   <input 
                     type="range" 
                     min={-0.02} 
                     max={0.02} 
                     step={0.0001} 
                     value={dozerCuttingEdge.y}
                     onChange={(e) => setDozerCuttingEdge(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                     className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                 </div>
                 <div>
                   <div className="flex justify-between text-xs text-slate-600 mb-1">
                     <span>Z Offset</span>
                     <span>{(dozerCuttingEdge.z * 1000).toFixed(1)} mm</span>
                   </div>
                   <input 
                     type="range" 
                     min={-0.02} 
                     max={0.02} 
                     step={0.0001} 
                     value={dozerCuttingEdge.z}
                     onChange={(e) => setDozerCuttingEdge(prev => ({ ...prev, z: parseFloat(e.target.value) }))}
                     className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                 </div>
               </div>
            </div>
          )}

          {cameraMode !== 'default' && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500">Camera Parameters</p>
              
              {cameraMode === 'follow' && (
                <div className="mb-2">
                   <label className="text-xs text-slate-500 font-semibold mb-1 block">Side Angle</label>
                   <div className="flex gap-2">
                    <button
                      onClick={() => setSideViewMode('true')}
                      className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                        sideViewMode === 'true' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      True Side
                    </button>
                    <button
                      onClick={() => setSideViewMode('diagonal')}
                      className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                        sideViewMode === 'diagonal' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Diagonal
                    </button>
                   </div>
                   
                   {sideViewMode === 'diagonal' && (
                     <div className="mt-2 mb-2 px-1">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Angle</span>
                          <span>{diagonalAngle}°</span>
                        </div>
                        <Slider 
                          defaultValue={[45]} 
                          value={[diagonalAngle]}
                          min={0}
                          max={360}
                          step={5}
                          onValueChange={(vals) => setDiagonalAngle(vals[0])}
                          className="py-1"
                        />
                     </div>
                   )}

                   <div className="mt-3">
                     <label className="text-xs text-slate-500 font-semibold mb-1 block">Projection</label>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => setSideCameraType('perspective')}
                          className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                            sideCameraType === 'perspective' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Perspective
                        </button>
                        <button 
                          onClick={() => setSideCameraType('orthographic')}
                          className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                            sideCameraType === 'orthographic' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Orthographic
                        </button>
                     </div>
                   </div>
                </div>
              )}

              {cameraMode === 'top' && (
                <div className="mb-2">
                   <label className="text-xs text-slate-500 font-semibold mb-1 block">Top Angle</label>
                   <div className="flex gap-2">
                    <button
                      onClick={() => setTopViewMode('true')}
                      className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                        topViewMode === 'true' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      True Top
                    </button>
                    <button
                      onClick={() => setTopViewMode('diagonal')}
                      className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                        topViewMode === 'diagonal' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Diagonal
                    </button>
                   </div>

                   <div className="mt-3">
                     <label className="text-xs text-slate-500 font-semibold mb-1 block">Projection</label>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => setTopCameraType('perspective')}
                          className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                            topCameraType === 'perspective' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Perspective
                        </button>
                        <button 
                          onClick={() => setTopCameraType('orthographic')}
                          className={`flex-1 py-1 px-2 text-[10px] font-medium rounded-md transition-colors ${
                            topCameraType === 'orthographic' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Orthographic
                        </button>
                     </div>
                   </div>
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 items-center">
                  <span>Distance</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={(cameraRadius * 1000).toFixed(4)}
                      onChange={(e) => setCameraRadius(parseFloat(e.target.value) / 1000)}
                      className="w-20 px-1 py-0.5 border border-slate-300 rounded text-right text-xs"
                      step={0.0001}
                    />
                    <span className="text-[10px] text-slate-400">mm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min={0.0000001} 
                  max={0.500} 
                  step={0.0000001} 
                  value={cameraRadius}
                  onChange={(e) => setCameraRadius(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {(cameraMode === 'follow' || cameraMode === 'top') && (
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1 items-center">
                    <span>Height</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={(cameraHeight * 1000).toFixed(1)}
                        onChange={(e) => setCameraHeight(parseFloat(e.target.value) / 1000)}
                        className="w-16 px-1 py-0.5 border border-slate-300 rounded text-right text-xs"
                        step={5}
                      />
                      <span className="text-[10px] text-slate-400">mm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min={0.001} 
                    max={0.500} 
                    step={0.005} 
                    value={cameraHeight}
                    onChange={(e) => setCameraHeight(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 items-center">
                  <span>Target Offset Y</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={(cameraTargetHeight * 1000).toFixed(1)}
                      onChange={(e) => setCameraTargetHeight(parseFloat(e.target.value) / 1000)}
                      className="w-16 px-1 py-0.5 border border-slate-300 rounded text-right text-xs"
                      step={0.1}
                    />
                    <span className="text-[10px] text-slate-400">mm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={0.005} 
                  step={0.0001} 
                  value={cameraTargetHeight}
                  onChange={(e) => setCameraTargetHeight(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
        
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

        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
             <p className="font-semibold mb-2">Current Coordinates (Debug)</p>
             <div className="grid grid-cols-2 gap-y-1 text-xs font-mono">
               <span>Vehicle X:</span>
               <span className="text-right">{excavatorPosition.x.toFixed(4)}</span>
               <span>Vehicle Y:</span>
               <span className="text-right">{excavatorPosition.y.toFixed(4)}</span>
               <span>Vehicle Z:</span>
               <span className="text-right">{excavatorPosition.z.toFixed(4)}</span>
               <div className="col-span-2 h-px bg-slate-200 my-1"></div>
               <span>Env Offset Y:</span>
               <span className="text-right">{envMeshConfig.position.y.toFixed(4)}</span>
             </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
            <p className="font-semibold mb-2">Active Controls</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>Rotation Pivot: Fixed</li>
              <li>Boom Pivot: Fixed</li>
              <li>Arm Pivot: Fixed</li>
              <li>Backet Pivot: Fixed</li>
              <li>Cutting Edge: Fixed</li>
              {surfaceConfig.visible && <li className="text-blue-600 font-bold">Machine Control: Active</li>}
            </ul>
          </div>
        </div>

        <div className="mt-auto pt-6 text-xs text-slate-400 border-t border-slate-100">
          <p>Coordinate System: Y-up</p>
          <p>Units: Meters</p>
        </div>
      </div>
    </div>
  );
}
