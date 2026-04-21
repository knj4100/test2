import React from 'react';
import { Sun, Lightbulb, Globe } from 'lucide-react';

export interface LightingConfig {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: { x: number; y: number; z: number };
  environmentPreset: 'city' | 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'park' | 'lobby' | 'none';
  /** Off for lighter rendering. Default true. */
  shadowEnabled?: boolean;
  /** Default [256, 256]. Use lower for performance. */
  shadowMapSize?: [number, number];
}

interface LightingPanelProps {
  config: LightingConfig;
  onChange: (config: LightingConfig) => void;
}

export function LightingPanel({ config, onChange }: LightingPanelProps) {
  const handleChange = (field: keyof LightingConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onChange({
      ...config,
      directionalPosition: { ...config.directionalPosition, [axis]: value }
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Sun size={16} className="text-orange-500" />
        Lighting
      </h3>

      <div className="space-y-4">
        {/* Ambient Light */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Lightbulb size={12} /> Ambient Intensity
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={config.ambientIntensity}
              onChange={(e) => handleChange('ambientIntensity', parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-500 w-8 text-right">{config.ambientIntensity.toFixed(1)}</span>
          </div>
        </div>

        {/* Directional Light */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Sun size={12} /> Directional Intensity
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={config.directionalIntensity}
              onChange={(e) => handleChange('directionalIntensity', parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-500 w-8 text-right">{config.directionalIntensity.toFixed(1)}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-2">
             {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis} className="flex flex-col">
                <label className="text-[10px] text-slate-500 uppercase text-center">{axis}</label>
                <input
                  type="number"
                  value={config.directionalPosition[axis]}
                  onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value))}
                  className="text-xs p-1 border border-slate-200 rounded text-center w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Environment */}
        <div>
           <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Globe size={12} /> Environment Preset
          </label>
          <select
            value={config.environmentPreset}
            onChange={(e) => handleChange('environmentPreset', e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-md bg-slate-50 cursor-pointer"
          >
            <option value="none">None</option>
            <option value="city">City</option>
            <option value="sunset">Sunset</option>
            <option value="dawn">Dawn</option>
            <option value="night">Night</option>
            <option value="warehouse">Warehouse</option>
            <option value="forest">Forest</option>
            <option value="apartment">Apartment</option>
            <option value="studio">Studio</option>
            <option value="park">Park</option>
            <option value="lobby">Lobby</option>
          </select>
          <p className="text-[10px] text-slate-400 mt-1">None = lighter (no IBL).</p>
        </div>

        {/* Shadows (performance) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <label className="text-xs font-medium text-slate-600">Shadows</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.shadowEnabled !== false}
              onChange={(e) => handleChange('shadowEnabled', e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-xs text-slate-500">On</span>
          </label>
        </div>
      </div>
    </div>
  );
}