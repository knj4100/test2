import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Position {
  x: number;
  y: number;
  z: number;
}

interface PivotControlProps {
  title?: string;
  pivot: Position;
  onChange: (newPos: Position) => void;
}

export function PivotControl({ title = "Rotation Pivot Point", pivot, onChange }: PivotControlProps) {
  const handleChange = (axis: keyof Position, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({ ...pivot, [axis]: numValue });
    }
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 items-center">
          <Label htmlFor="pivot-x" className="text-right">X</Label>
          <div className="col-span-2">
            <Input
              id="pivot-x"
              type="number"
              step="0.0001"
              value={pivot.x}
              onChange={(e) => handleChange("x", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <Label htmlFor="pivot-y" className="text-right">Y</Label>
          <div className="col-span-2">
            <Input
              id="pivot-y"
              type="number"
              step="0.0001"
              value={pivot.y}
              onChange={(e) => handleChange("y", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <Label htmlFor="pivot-z" className="text-right">Z</Label>
          <div className="col-span-2">
            <Input
              id="pivot-z"
              type="number"
              step="0.0001"
              value={pivot.z}
              onChange={(e) => handleChange("z", e.target.value)}
            />
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Use J / L keys to rotate
        </div>
      </CardContent>
    </Card>
  );
}
