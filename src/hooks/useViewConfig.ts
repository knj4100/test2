import { useState } from 'react';
import { ViewConfig, defaultViewConfig } from '../types/viewConfig';

export function useViewConfig() {
  const [view1Config, setView1Config] = useState<ViewConfig>({
    ...defaultViewConfig,
    mode: 'section',
    targetType: 'bucket',
    radius: 0.0000195,
    targetHeight: 0.005
  });
  const [view2Config, setView2Config] = useState<ViewConfig>({ ...defaultViewConfig, mode: 'default' });
  const [activeSettingsView, setActiveSettingsView] = useState<'view1' | 'view2'>('view1');

  const updateViewConfig = (view: 'view1' | 'view2', updates: Partial<ViewConfig>) => {
    if (view === 'view1') {
      setView1Config(prev => ({ ...prev, ...updates }));
    } else {
      setView2Config(prev => ({ ...prev, ...updates }));
    }
  };

  const updateActiveConfig = (updates: Partial<ViewConfig>) => {
    updateViewConfig(activeSettingsView, updates);
  };

  const currentConfig = activeSettingsView === 'view1' ? view1Config : view2Config;

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

  return {
    view1Config,
    view2Config,
    activeSettingsView,
    setActiveSettingsView,
    currentConfig,
    cameraMode,
    cameraFollowsVehicle,
    cameraRotatesWithVehicle,
    targetType,
    sideViewMode,
    topViewMode,
    sectionDirection,
    sideCameraType,
    topCameraType,
    diagonalAngle,
    cameraRadius,
    cameraHeight,
    cameraTargetHeight,
    setCameraMode,
    setCameraFollowsVehicle,
    setCameraRotatesWithVehicle,
    setTargetType,
    setSideViewMode,
    setTopViewMode,
    setSideCameraType,
    setTopCameraType,
    setDiagonalAngle,
    setCameraRadius,
    setCameraHeight,
    setCameraTargetHeight,
  };
}
