import { useState } from 'react';
import { TerrainGridConfig } from '../components/EnvironmentPanel';

const defaultGridConfig: TerrainGridConfig = {
  visible: true,
  gridSize: 40,
  gridSpacing: 0.0025,
  lineWidth: 1,
  circularMask: false,
  showFill: true,
  opacity: 0.8,
  showSectionOnly: false,
  sectionDirection: 'longitudinal',
  gridCenterMode: 'manual',
  continuousUpdate: false
};

export function useGridConfig(
  activeSettingsView: 'view1' | 'view2',
  excavatorPosition: { x: number; y: number; z: number }
) {
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
  const [gridCenter, setGridCenter] = useState({ x: 0, z: 0 });

  const currentGridConfig = activeSettingsView === 'view1' ? view1GridConfig : view2GridConfig;

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

  return {
    view1GridConfig,
    view2GridConfig,
    gridCenter,
    currentGridConfig,
    handleUpdateGrid,
    handleUpdateGridCenter,
  };
}
