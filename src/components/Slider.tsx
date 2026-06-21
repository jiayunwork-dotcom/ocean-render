import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  color?: string;
}

export default function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
  color,
}: SliderProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="hud-label">{label}</span>
        <span
          className="hud-value text-sm"
          style={color ? { color } : undefined}
        >
          {Number.isInteger(step) ? value.toFixed(0) : value.toFixed(2)}
          {unit && <span className="ml-0.5 text-xs opacity-80">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        className={cn('ocean-slider')}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
