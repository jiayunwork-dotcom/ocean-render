import { Lock, Unlock } from 'lucide-react';
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
  overridden?: boolean;
  onOverrideToggle?: () => void;
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
  overridden = false,
  onOverrideToggle,
}: SliderProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="hud-label">{label}</span>
          {onOverrideToggle && (
            <button
              onClick={onOverrideToggle}
              className={cn(
                'transition-all',
                overridden
                  ? 'text-ocean-accent'
                  : 'text-ocean-foam/30 hover:text-ocean-foam/50'
              )}
              title={overridden ? '手动控制中，点击恢复自动' : '自动跟随时间'}
            >
              {overridden ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
          )}
        </div>
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
