interface DebugPanelProps {
  excavatorPosition: { x: number; y: number; z: number };
  envMeshOffsetY: number;
  surfaceVisible: boolean;
}

export function DebugPanel({ excavatorPosition, envMeshOffsetY, surfaceVisible }: DebugPanelProps) {
  return (
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
