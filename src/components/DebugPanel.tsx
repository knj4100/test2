interface DebugPanelProps {
  excavatorPosition: { x: number; y: number; z: number };
  envMeshOffsetY: number;
  surfaceVisible: boolean;
  fps?: number;
  performanceFrameloopDemand?: boolean;
  setPerformanceFrameloopDemand?: (v: boolean) => void;
  performanceNoPreserveBuffer?: boolean;
  setPerformanceNoPreserveBuffer?: (v: boolean) => void;
}

export function DebugPanel({
  excavatorPosition,
  envMeshOffsetY,
  surfaceVisible,
  fps = 0,
  performanceFrameloopDemand = false,
  setPerformanceFrameloopDemand,
  performanceNoPreserveBuffer = false,
  setPerformanceNoPreserveBuffer
}: DebugPanelProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
        <p className="font-semibold mb-2">Performance</p>
        <div className="grid grid-cols-2 gap-y-1 text-xs font-mono mb-3">
          <span>FPS:</span>
          <span className="text-right">{fps > 0 ? fps.toFixed(1) : '—'}</span>
        </div>
        <div className="space-y-2 pt-1 border-t border-slate-200">
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-xs">Frameloop demand</span>
            <input
              type="checkbox"
              checked={performanceFrameloopDemand}
              onChange={(e) => setPerformanceFrameloopDemand?.(e.target.checked)}
              className="rounded border-slate-300"
            />
          </label>
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-xs">No preserve buffer</span>
            <input
              type="checkbox"
              checked={performanceNoPreserveBuffer}
              onChange={(e) => setPerformanceNoPreserveBuffer?.(e.target.checked)}
              className="rounded border-slate-300"
            />
          </label>
        </div>
      </div>

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
          <span className="text-right">{envMeshOffsetY.toFixed(4)}</span>
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
          {surfaceVisible && <li className="text-blue-600 font-bold">Machine Control: Active</li>}
        </ul>
      </div>
    </div>
  );
}
