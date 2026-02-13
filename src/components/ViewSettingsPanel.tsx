import React from 'react';
import { ViewConfig } from '../types/viewConfig';
import { Slider } from './ui/slider';

interface ViewSettingsPanelProps {
  splitScreen: boolean;
  setSplitScreen: (val: boolean) => void;
  cameraMode: ViewConfig['mode'];
  setCameraMode: (mode: ViewConfig['mode']) => void;
  cameraFollowsVehicle: boolean;
  setCameraFollowsVehicle: (val: boolean) => void;
  cameraRotatesWithVehicle: boolean;
  setCameraRotatesWithVehicle: (val: boolean) => void;
  targetType: ViewConfig['targetType'];
  setTargetType: (val: ViewConfig['targetType']) => void;
  vehicleType: 'excavator' | 'dozer' | 'dump';
  dozerCuttingEdge: { x: number; y: number; z: number };
  setDozerCuttingEdge: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  sideViewMode: ViewConfig['sideViewMode'];
  setSideViewMode: (val: ViewConfig['sideViewMode']) => void;
  sideCameraType: ViewConfig['sideCameraType'];
  setSideCameraType: (val: ViewConfig['sideCameraType']) => void;
  topViewMode: ViewConfig['topViewMode'];
  setTopViewMode: (val: ViewConfig['topViewMode']) => void;
  topCameraType: ViewConfig['topCameraType'];
  setTopCameraType: (val: ViewConfig['topCameraType']) => void;
  diagonalAngle: number;
  setDiagonalAngle: (val: number) => void;
  cameraRadius: number;
  setCameraRadius: (val: number) => void;
  cameraHeight: number;
  setCameraHeight: (val: number) => void;
  cameraTargetHeight: number;
  setCameraTargetHeight: (val: number) => void;
}

export function ViewSettingsPanel({
  splitScreen, setSplitScreen,
  cameraMode, setCameraMode,
  cameraFollowsVehicle, setCameraFollowsVehicle,
  cameraRotatesWithVehicle, setCameraRotatesWithVehicle,
  targetType, setTargetType,
  vehicleType,
  dozerCuttingEdge, setDozerCuttingEdge,
  sideViewMode, setSideViewMode,
  sideCameraType, setSideCameraType,
  topViewMode, setTopViewMode,
  topCameraType, setTopCameraType,
  diagonalAngle, setDiagonalAngle,
  cameraRadius, setCameraRadius,
  cameraHeight, setCameraHeight,
  cameraTargetHeight, setCameraTargetHeight,
}: ViewSettingsPanelProps) {
  return (
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

      {vehicleType === 'dozer' && (
        <div className="mb-4 pt-3 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 mb-2">Blade Control Point</h3>
          <div className="space-y-3">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>{axis.toUpperCase()} Offset</span>
                  <span>{(dozerCuttingEdge[axis] * 1000).toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min={-0.02}
                  max={0.02}
                  step={0.0001}
                  value={dozerCuttingEdge[axis]}
                  onChange={(e) => setDozerCuttingEdge(prev => ({ ...prev, [axis]: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}
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
                    <span>{diagonalAngle}</span>
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
  );
}
