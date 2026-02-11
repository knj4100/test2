import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react";

export interface TargetSurfaceConfig {
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number };
  gradient: { x: number; z: number }; // In degrees
  thickness: number;
  color: string;
  opacity: number;
  visible: boolean;
}

interface TargetSurfacePanelProps {
  config: TargetSurfaceConfig;
  onChange: (config: TargetSurfaceConfig) => void;
  onSnapToEdge: () => void;
}

export function TargetSurfacePanel({ config, onChange, onSnapToEdge }: TargetSurfacePanelProps) {
  const handleChange = (key: keyof TargetSurfaceConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleNestedChange = (parent: 'size' | 'gradient', key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({
        ...config,
        [parent]: { ...config[parent], [key]: numValue }
      });
    }
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold">Target Surface</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleChange("visible", !config.visible)}
          title={config.visible ? "Hide Surface" : "Show Surface"}
        >
          {config.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Button 
          onClick={onSnapToEdge} 
          className="w-full bg-slate-800 hover:bg-slate-700 text-white"
        >
          Set Position to Cutting Edge
        </Button>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase">Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width" className="text-[10px]">Width</Label>
              <Input
                id="width"
                type="number"
                step="0.0001"
                value={config.size.width}
                onChange={(e) => handleNestedChange('size', 'width', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="depth" className="text-[10px]">Depth</Label>
              <Input
                id="depth"
                type="number"
                step="0.0001"
                value={config.size.depth}
                onChange={(e) => handleNestedChange('size', 'depth', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Gradient */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase">Gradient (Deg)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="grad-x" className="text-[10px]">X-Axis</Label>
              <Input
                id="grad-x"
                type="number"
                step="1"
                value={config.gradient.x}
                onChange={(e) => handleNestedChange('gradient', 'x', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="grad-z" className="text-[10px]">Z-Axis</Label>
              <Input
                id="grad-z"
                type="number"
                step="1"
                value={config.gradient.z}
                onChange={(e) => handleNestedChange('gradient', 'z', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase">Appearance</Label>
          
          <div className="grid grid-cols-3 gap-2 items-center">
            <Label htmlFor="thickness" className="text-right text-xs">Thick</Label>
            <div className="col-span-2">
              <Input
                id="thickness"
                type="number"
                step="0.0001"
                value={config.thickness}
                onChange={(e) => handleChange('thickness', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <Label htmlFor="color" className="text-right text-xs">Color</Label>
            <div className="col-span-2 flex gap-2">
              <Input
                id="color"
                type="color"
                className="w-8 h-8 p-0 border-0"
                value={config.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
              <Input
                type="text"
                value={config.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <Label className="text-right text-xs">Opacity</Label>
            <div className="col-span-2">
              <Slider
                value={[config.opacity]}
                max={1}
                step={0.1}
                onValueChange={(vals) => handleChange('opacity', vals[0])}
              />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
