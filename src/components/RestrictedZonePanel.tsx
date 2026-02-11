import React from 'react';
import { Trash2, Plus, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export interface RestrictedZoneConfig {
  id: string;
  position: { x: number; y: number; z: number };
  width: number;
  depth: number;
  height: number;
  active: boolean;
}

interface RestrictedZonePanelProps {
  zones: RestrictedZoneConfig[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof RestrictedZoneConfig | 'x' | 'y' | 'z', value: number | boolean) => void;
  onRemove: (id: string) => void;
}

export function RestrictedZonePanel({ zones, onAdd, onUpdate, onRemove }: RestrictedZonePanelProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-yellow-500" />
        Restricted Zones
      </h3>

      <button
        onClick={onAdd}
        className="w-full mb-4 flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 transition-colors"
      >
        <Plus size={14} />
        Add Zone
      </button>

      <div className="space-y-3">
        {zones.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2 italic">No restricted zones defined</p>
        )}
        
        {zones.map((zone, index) => (
          <div key={zone.id} className="p-3 bg-yellow-50/50 rounded border border-yellow-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">Zone #{index + 1}</span>
              <div className="flex items-center gap-1">
                 <button
                    onClick={() => onUpdate(zone.id, 'active', !zone.active)}
                    className={`p-1 rounded transition-colors ${
                      zone.active ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={zone.active ? "Deactivate Zone" : "Activate Zone"}
                 >
                    {zone.active ? <Eye size={14} /> : <EyeOff size={14} />}
                 </button>
                 <button
                    onClick={() => onRemove(zone.id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                 >
                    <Trash2 size={14} />
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Position X, Z */}
              {(['x', 'z'] as const).map((axis) => (
                <div key={axis} className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-slate-500 w-8 uppercase">Pos {axis}</label>
                   <input
                     type="range"
                     min={-0.3} max={0.3} step={0.001}
                     value={zone.position[axis]}
                     onChange={(e) => onUpdate(zone.id, axis, parseFloat(e.target.value))}
                     className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                     {(zone.position[axis] * 1000).toFixed(0)}mm
                   </span>
                </div>
              ))}

               {/* Dimensions */}
               <div className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-slate-500 w-8">Width</label>
                   <input
                     type="range"
                     min={0.001} max={0.3} step={0.001}
                     value={zone.width}
                     onChange={(e) => onUpdate(zone.id, 'width', parseFloat(e.target.value))}
                     className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                     {(zone.width * 1000).toFixed(0)}mm
                   </span>
               </div>
               <div className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-slate-500 w-8">Depth</label>
                   <input
                     type="range"
                     min={0.001} max={0.3} step={0.001}
                     value={zone.depth}
                     onChange={(e) => onUpdate(zone.id, 'depth', parseFloat(e.target.value))}
                     className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                     {(zone.depth * 1000).toFixed(0)}mm
                   </span>
               </div>
               <div className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-slate-500 w-8">Height</label>
                   <input
                     type="range"
                     min={0.001} max={0.02} step={0.0005}
                     value={zone.height}
                     onChange={(e) => onUpdate(zone.id, 'height', parseFloat(e.target.value))}
                     className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
                     {(zone.height * 1000).toFixed(1)}mm
                   </span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
