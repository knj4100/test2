import { useState, useCallback } from 'react';
import { Obstacle, EnvironmentMeshConfig } from '../components/EnvironmentPanel';
import { RestrictedZoneConfig } from '../components/RestrictedZonePanel';
import { ENV } from '../config/environment';

export const AVAILABLE_MODELS = [
  { id: 'light4', name: 'Environment Light 4', url: ENV.MODEL_URLS.LIGHT4 },
  { id: 'light5', name: 'Environment Light 5', url: ENV.MODEL_URLS.LIGHT5 },
  { id: 'light6', name: 'Environment Light 6', url: ENV.MODEL_URLS.LIGHT6 },
  { id: 'light7', name: 'Environment Light 7', url: ENV.MODEL_URLS.LIGHT7 },
  { id: 'mesh_divide', name: '3D Mesh Divide', url: ENV.MODEL_URLS.MESH_DIVIDE }
];

export function useEnvironmentConfig(
  activeSettingsView: 'view1' | 'view2',
  setExcavatorPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>
) {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [restrictedZones, setRestrictedZones] = useState<RestrictedZoneConfig[]>([]);
  const [envMeshConfig, setEnvMeshConfig] = useState<EnvironmentMeshConfig>({
    visible: true,
    position: { x: 0, y: 0.0000, z: 0 },
    scale: 1,
    opacity: 0.3
  });
  const [view1EnvSettings, setView1EnvSettings] = useState({ visible: true, opacity: 0.05 });
  const [view2EnvSettings, setView2EnvSettings] = useState({ visible: true, opacity: 0.7 });
  const [selectedModelId, setSelectedModelId] = useState<string>('mesh_divide');

  const selectedModelUrl = AVAILABLE_MODELS.find(m => m.id === selectedModelId)?.url || AVAILABLE_MODELS[0].url;

  const handleGroundDetected = useCallback((y: number) => {
    setEnvMeshConfig(prev => {
      if (Math.abs(prev.position.y - y) < 0.00001) return prev;
      return { ...prev, position: { ...prev.position, y } };
    });
  }, []);

  const handleVehicleHeightUpdate = useCallback((y: number) => {
    setExcavatorPosition(prev => {
      if (Math.abs(prev.y - y) < 0.0001) return prev;
      return { ...prev, y };
    });
  }, [setExcavatorPosition]);

  const handleUpdateEnvMesh = (field: 'visible' | 'x' | 'y' | 'z' | 'scale' | 'opacity', value: number | boolean) => {
    if (field === 'visible' || field === 'opacity') {
      const setSettings = activeSettingsView === 'view1' ? setView1EnvSettings : setView2EnvSettings;
      setSettings(prev => ({ ...prev, [field]: value }));
      setEnvMeshConfig(prev => ({ ...prev, [field]: value }));
      return;
    }
    setEnvMeshConfig(prev => {
      if (field === 'scale') {
        return { ...prev, [field]: value as number };
      }
      return { ...prev, position: { ...prev.position, [field]: value as number } };
    });
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    if (['light4', 'light5', 'light6', 'light7'].includes(modelId)) {
      setExcavatorPosition({ x: -0.1536, y: -0.0232, z: 0.0990 });
      setEnvMeshConfig(prev => ({ ...prev, position: { ...prev.position, y: 0.2040 } }));
    } else if (modelId === 'mesh_divide') {
      setExcavatorPosition({ x: 0.0358, y: -0.0074, z: -0.0880 });
      setEnvMeshConfig(prev => ({ ...prev, position: { ...prev.position, y: 0.0000 } }));
    }
  };

  const handleAddObstacle = (type: 'cane' | 'human') => {
    setObstacles(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      position: { x: 0.01, y: 0, z: 0.01 },
      scale: 1
    }]);
  };

  const handleUpdateObstacle = (id: string, field: 'x' | 'y' | 'z' | 'scale', value: number) => {
    setObstacles(prev => prev.map(obs => {
      if (obs.id !== id) return obs;
      if (field === 'scale') {
        return { ...obs, scale: value };
      }
      return { ...obs, position: { ...obs.position, [field]: value } };
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

  return {
    obstacles,
    restrictedZones,
    envMeshConfig,
    view1EnvSettings,
    view2EnvSettings,
    selectedModelId,
    selectedModelUrl,
    availableModels: AVAILABLE_MODELS,
    handleGroundDetected,
    handleVehicleHeightUpdate,
    handleUpdateEnvMesh,
    handleModelSelect,
    handleAddObstacle,
    handleUpdateObstacle,
    handleRemoveObstacle,
    handleAddZone,
    handleUpdateZone,
    handleRemoveZone,
  };
}
