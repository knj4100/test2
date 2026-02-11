import React from 'react';
import { Trash2, Plus, User, Ban, Map, Eye, EyeOff, Grid3x3 } from 'lucide-react';

export interface Obstacle {
  id: string;
  type: 'cane' | 'human';
  position: { x: number; y: number; z: number };
  scale: number;
}

export interface EnvironmentMeshConfig {
  visible: boolean;
  position: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
}

export interface TerrainGridConfig {
  visible: boolean;
  gridSize: number;
  gridSpacing: number;
  lineWidth?: number;
  circularMask?: boolean;
  showFill?: boolean;
  opacity: number;
  showSectionOnly?: boolean;
  sectionDirection?: 'longitudinal' | 'transverse';
  gridCenterMode?: 'manual' | 'vehicle' | 'bucket';
  continuousUpdate?: boolean;
}

interface EnvironmentPanelProps {
  obstacles: Obstacle[];
  onAdd: (type: 'cane' | 'human') => void;
  onUpdate: (id: string, field: 'x' | 'y' | 'z' | 'scale', value: number) => void;
  onRemove: (id: string) => void;
  
  meshConfig: EnvironmentMeshConfig;
  onUpdateMesh: (field: 'visible' | 'x' | 'y' | 'z' | 'scale' | 'opacity', value: number | boolean) => void;
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  availableModels: { id: string; name: string; url: string }[];
  
  gridConfig: TerrainGridConfig;
  onUpdateGrid: (field: 'visible' | 'gridSize' | 'gridSpacing' | 'circularMask' | 'showFill' | 'opacity' | 'showSectionOnly' | 'sectionDirection' | 'lineWidth' | 'gridCenterMode' | 'continuousUpdate', value: number | boolean | string) => void;
  onUpdateGridCenter: () => void;
}

export function EnvironmentPanel({ obstacles, onAdd, onUpdate, onRemove, meshConfig, onUpdateMesh, selectedModelId, onSelectModel, availableModels = [], gridConfig, onUpdateGrid, onUpdateGridCenter }: EnvironmentPanelProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Environment</h3>
      
      {/* Terrain Grid Control */}
      <div className="mb-4 p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
            <Grid3x3 size={12} />
            Terrain Grid
          </span>
          <button
            onClick={() => onUpdateGrid('visible', !gridConfig.visible)}
            className={`p-1 rounded transition-colors ${
              gridConfig.visible ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:text-slate-600'
            }`}
            title={gridConfig.visible ? "Hide grid" : "Show grid"}
          >
            {gridConfig.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>

        {gridConfig.visible && (
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 w-16">Resolution</label>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={gridConfig.gridSize}
                onChange={(e) => onUpdateGrid('gridSize', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-600 w-8 text-right font-mono">
                {gridConfig.gridSize}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 w-16">Spacing</label>
              <input
                type="range"
                min={0.0005}
                max={0.003}
                step={0.0001}
                value={gridConfig.gridSpacing}
                onChange={(e) => onUpdateGrid('gridSpacing', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-600 w-8 text-right font-mono">
                {(gridConfig.gridSpacing * 1000).toFixed(1)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 w-16">Line Width</label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={gridConfig.lineWidth || 1}
                onChange={(e) => onUpdateGrid('lineWidth', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-600 w-8 text-right font-mono">
                {gridConfig.lineWidth || 1}px
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <label className="text-[10px] font-bold text-slate-500 w-16">Opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={gridConfig.opacity ?? 1} // Default to 1 if undefined
                onChange={(e) => onUpdateGrid('opacity', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-600 w-8 text-right font-mono">
                {((gridConfig.opacity ?? 1) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <label className="text-[10px] font-bold text-slate-500 w-16">Style</label>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-1">
                   <button
                      onClick={() => onUpdateGrid('circularMask', !gridConfig.circularMask)}
                      className={`flex-1 py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                        gridConfig.circularMask ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Circle Mask
                    </button>
                    <button
                      onClick={() => onUpdateGrid('showFill', !gridConfig.showFill)}
                      className={`flex-1 py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                        gridConfig.showFill ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Heatmap Fill
                    </button>
                </div>
                <div className="flex gap-1">
                   <button
                      onClick={() => onUpdateGrid('showSectionOnly', !gridConfig.showSectionOnly)}
                      className={`flex-1 py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                        gridConfig.showSectionOnly ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                      title="Show section line at cutting edge only"
                    >
                      Section Line
                    </button>
                </div>
                {gridConfig.showSectionOnly && (
                   <div className="flex gap-1">
                      <button
                        onClick={() => onUpdateGrid('sectionDirection', 'longitudinal')}
                        className={`flex-1 py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                          gridConfig.sectionDirection !== 'transverse' ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        Longitudinal
                      </button>
                      <button
                        onClick={() => onUpdateGrid('sectionDirection', 'transverse')}
                        className={`flex-1 py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                          gridConfig.sectionDirection === 'transverse' ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        Transverse
                      </button>
                   </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <label className="text-[10px] font-bold text-slate-500 w-16">Position</label>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-1">
                  {(['manual', 'vehicle', 'bucket'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onUpdateGrid('gridCenterMode', mode)}
                      className={`flex-1 py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                        (gridConfig.gridCenterMode ?? 'manual') === mode ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {mode === 'manual' ? 'Manual' : mode === 'vehicle' ? 'Vehicle' : 'Bucket'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onUpdateGrid('continuousUpdate', !gridConfig.continuousUpdate)}
                  className={`w-full py-1 px-1 text-[9px] font-medium rounded transition-colors ${
                    gridConfig.continuousUpdate ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  ⟳ Continuous Update
                </button>
              </div>
            </div>

            {(gridConfig.gridCenterMode ?? 'manual') === 'manual' && (
              <button
                onClick={onUpdateGridCenter}
                className="w-full mt-2 py-1 px-2 text-[10px] font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center justify-center gap-1"
              >
                <Grid3x3 size={12} />
                Update Grid Position
              </button>
            )}
          </div>
        )}
      </div>

      {/* Background Mesh Control */}
      <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
            <Map size={12} />
            Background Model
          </span>
          <button
            onClick={() => onUpdateMesh('visible', !meshConfig.visible)}
            className={`p-1 rounded transition-colors ${
              meshConfig.visible ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'
            }`}
            title={meshConfig.visible ? "Hide model" : "Show model"}
          >
            {meshConfig.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>

        {meshConfig.visible && (
          <div className="grid grid-cols-1 gap-2">
             <div className="mb-2">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Select Model</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => onSelectModel(e.target.value)}
                  className="w-full text-xs p-1 rounded border border-slate-200 bg-white"
                >
                  {availableModels?.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
             </div>

             {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis} className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 w-3 uppercase">{axis}</label>
                <input
                  type="range"
                  min={axis === 'y' ? -1 : -0.01}
                  max={axis === 'y' ? 1 : 0.01}
                  step={axis === 'y' ? 0.001 : 0.00001}
                  value={meshConfig.position[axis]}
                  onChange={(e) => onUpdateMesh(axis, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                  {(meshConfig.position[axis] * 1000).toFixed(2)}mm
                </span>
              </div>
            ))}
            
            <div className="flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
              <label className="text-[10px] font-bold text-slate-500 w-3 uppercase">S</label>
              <input
                type="range"
                min={0.1}
                max={100}
                step={0.1}
                value={meshConfig.scale}
                onChange={(e) => onUpdateMesh('scale', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                {meshConfig.scale.toFixed(1)}x
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 w-3 uppercase">A</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={meshConfig.opacity}
                onChange={(e) => onUpdateMesh('opacity', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                {(meshConfig.opacity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Objects</h3>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onAdd('cane')}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Plus size={14} />
          <Ban size={14} className="mr-1" />
          Add Cane
        </button>
        <button
          onClick={() => onAdd('human')}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Plus size={14} />
          <User size={14} className="mr-1" />
          Add Human
        </button>
      </div>

      <div className="space-y-3">
        {obstacles.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2 italic">No environment objects added</p>
        )}
        
        {obstacles.map((obs, index) => (
          <div key={obs.id} className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                {obs.type === 'cane' ? <Ban size={12} /> : <User size={12} />}
                {obs.type === 'cane' ? 'Cane' : 'Human'} #{index + 1}
              </span>
              <button
                onClick={() => onRemove(obs.id)}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
                title="Remove object"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-500 w-3 uppercase">{axis}</label>
                  <input
                    type="range"
                    min={-0.05}
                    max={0.05}
                    step={0.0005}
                    value={obs.position[axis]}
                    onChange={(e) => onUpdate(obs.id, axis, parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                    {(obs.position[axis] * 1000).toFixed(0)}mm
                  </span>
                </div>
              ))}

              <div className="flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
                <label className="text-[10px] font-bold text-slate-500 w-3 uppercase">S</label>
                <input
                  type="range"
                  min={1}
                  max={1000}
                  step={1}
                  value={obs.scale}
                  onChange={(e) => onUpdate(obs.id, 'scale', parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                  {obs.scale.toFixed(0)}x
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}