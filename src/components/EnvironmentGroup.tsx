import { useState } from 'react';
import { Wind, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import Slider from './Slider';
import Knob from './Knob';
import { useAppStore, type SkyPreset, type ToneMapping, type TimelineOverrideParam } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const skyPresetOptions: { value: SkyPreset; label: string }[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'night', label: 'Night' },
];

const toneMappingOptions: { value: ToneMapping; label: string }[] = [
  { value: 'reinhard', label: 'Reinhard' },
  { value: 'aces', label: 'ACES' },
];

export default function EnvironmentGroup() {
  const [collapsed, setCollapsed] = useState(false);

  const environment = useAppStore((state) => state.environment);
  const overriddenParams = useAppStore((state) => state.timeline.overriddenParams);
  const isPlaying = useAppStore((state) => state.timeline.isPlaying);
  const setWindSpeed = useAppStore((state) => state.setWindSpeed);
  const setWindDirection = useAppStore((state) => state.setWindDirection);
  const setSkyPreset = useAppStore((state) => state.setSkyPreset);
  const setSunAzimuth = useAppStore((state) => state.setSunAzimuth);
  const setSunElevation = useAppStore((state) => state.setSunElevation);
  const setExposure = useAppStore((state) => state.setExposure);
  const setToneMapping = useAppStore((state) => state.setToneMapping);
  const setParamOverride = useAppStore((state) => state.setParamOverride);

  const handleOverrideToggle = (param: TimelineOverrideParam) => {
    setParamOverride(param, !overriddenParams.has(param));
  };

  return (
    <div className={cn('glass-panel-light overflow-hidden')}>
      <button
        className="flex w-full items-center justify-between p-3 hover:bg-ocean-foam/5 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Wind size={16} className="text-ocean-accent" />
          <span className="hud-title text-sm">Environment</span>
        </div>
        {collapsed ? (
          <ChevronDown size={16} className="text-ocean-foam/60" />
        ) : (
          <ChevronUp size={16} className="text-ocean-foam/60" />
        )}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-4">
          <div className="ocean-divider" />

          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              <Slider
                label="Wind Speed"
                min={1}
                max={30}
                step={1}
                value={environment.windSpeed}
                onChange={setWindSpeed}
                unit="m/s"
                overridden={overriddenParams.has('windSpeed')}
                onOverrideToggle={isPlaying ? () => handleOverrideToggle('windSpeed') : undefined}
              />
            </div>
            <Knob
              label="Wind Dir"
              value={environment.windDirection}
              onChange={setWindDirection}
            />
          </div>

          <div className="space-y-2">
            <span className="hud-label">Sky Preset</span>
            <div className="grid grid-cols-4 gap-1.5">
              {skyPresetOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSkyPreset(opt.value)}
                  className={cn(
                    'px-2 py-1.5 rounded text-xs font-display font-medium uppercase transition-all',
                    environment.skyPreset === opt.value
                      ? 'bg-ocean-accent/20 border border-ocean-accent text-ocean-accent'
                      : 'bg-ocean-foam/5 border border-ocean-foam/10 text-ocean-foam/70 hover:bg-ocean-foam/10'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sun size={14} className="text-ocean-accent" />
              <span className="hud-label">Sun</span>
            </div>
            <Slider
              label="Azimuth"
              min={0}
              max={360}
              step={1}
              value={environment.sunAzimuth}
              onChange={setSunAzimuth}
              unit="°"
              overridden={overriddenParams.has('sunAzimuth')}
              onOverrideToggle={isPlaying ? () => handleOverrideToggle('sunAzimuth') : undefined}
            />
            <Slider
              label="Elevation"
              min={-30}
              max={90}
              step={1}
              value={environment.sunElevation}
              onChange={setSunElevation}
              unit="°"
              overridden={overriddenParams.has('sunElevation')}
              onOverrideToggle={isPlaying ? () => handleOverrideToggle('sunElevation') : undefined}
            />
          </div>

          <Slider
            label="Exposure"
            min={-2}
            max={2}
            step={0.1}
            value={environment.exposure}
            onChange={setExposure}
            unit="EV"
          />

          <div className="space-y-2">
            <span className="hud-label">Tone Mapping</span>
            <div className="grid grid-cols-2 gap-1.5">
              {toneMappingOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setToneMapping(opt.value)}
                  className={cn(
                    'px-2 py-1.5 rounded text-xs font-display font-medium uppercase transition-all',
                    environment.toneMapping === opt.value
                      ? 'bg-ocean-accent/20 border border-ocean-accent text-ocean-accent'
                      : 'bg-ocean-foam/5 border border-ocean-foam/10 text-ocean-foam/70 hover:bg-ocean-foam/10'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
