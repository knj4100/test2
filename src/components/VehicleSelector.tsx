interface VehicleSelectorProps {
  vehicleType: 'excavator' | 'dozer' | 'dump';
  setVehicleType: (type: 'excavator' | 'dozer' | 'dump') => void;
}

export function VehicleSelector({ vehicleType, setVehicleType }: VehicleSelectorProps) {
  return (
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
  );
}
