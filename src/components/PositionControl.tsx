import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Position {
  x: number;
  y: number;
  z: number;
}

interface PositionControlProps {
  title: string;
  position: Position;
  onChange: (newPos: Position) => void;
}

export function PositionControl({ title, position, onChange }: PositionControlProps) {
  const handleChange = (axis: keyof Position, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({ ...position, [axis]: numValue });
    }
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 items-center">
          <Label htmlFor={`${title}-x`} className="text-right">X</Label>
          <div className="col-span-2">
            <Input
              id={`${title}-x`}
              type="number"
              step="0.1"
              value={position.x}
              onChange={(e) => handleChange("x", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <Label htmlFor={`${title}-y`} className="text-right">Y</Label>
          <div className="col-span-2">
            <Input
              id={`${title}-y`}
              type="number"
              step="0.1"
              value={position.y}
              onChange={(e) => handleChange("y", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <Label htmlFor={`${title}-z`} className="text-right">Z</Label>
          <div className="col-span-2">
            <Input
              id={`${title}-z`}
              type="number"
              step="0.1"
              value={position.z}
              onChange={(e) => handleChange("z", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
