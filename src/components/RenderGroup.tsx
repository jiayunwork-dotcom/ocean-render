import { useState } from 'react';
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  Waves,
  Grid3X3,
  Orbit,
} from 'lucide-react';
import {
  useAppStore,
  type LODLevel,
  type CameraMode,
} from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const lodOptions: { value: LODLevel; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Med' },
  { value: 'low', label: 'Low' },
];

const cameraOptions: { value: CameraMode; label: string; icon: typeof Orbit }[] = [
  { value: 'orbit', label: 'Orbit', icon: Orbit },
  { value: 'firstPerson', label: 'First Person', icon: Eye },
];

interface ToggleProps {
  label: string;
  icon: typeof Eye;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, icon: Icon, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-ocean-foam/60" />
        <span className="hud-label">{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-ocean-accent' : 'bg-ocean-foam/20'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

export default function RenderGroup() {
  const [collapsed, setCollapsed] = useState(false);

  const render = useAppStore((state) => state.render);
  const camera = useAppStore((state) => state.camera);
  const setFoamEnabled = useAppStore((state) => state.setFoamEnabled);
  const setWakeEnabled = useAppStore((state) => state.setWakeEnabled);
  const setLodLevel = useAppStore((state) => state.setLodLevel);
  const setWireframe = useAppStore((state) => state.setWireframe);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  return (
    <div className={cn('glass-panel-light overflow-hidden')}>
      <button
        className="flex w-full items-center justify-between p-3 hover:bg-ocean-foam/5 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-ocean-accent" />
          <span className="hud-title text-sm">Render</span>
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

          <Toggle
            label="Foam"
            icon={Waves}
            checked={render.foamEnabled}
            onChange={setFoamEnabled}
          />

          <Toggle
            label="Wake"
            icon={Eye}
            checked={render.wakeEnabled}
            onChange={setWakeEnabled}
          />

          <div className="space-y-2">
            <span className="hud-label">LOD Level</span>
            <div className="grid grid-cols-4 gap-1.5">
              {lodOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLodLevel(opt.value)}
                  className={cn(
                    'px-2 py-1.5 rounded text-xs font-display font-medium uppercase transition-all',
                    render.lodLevel === opt.value
                      ? 'bg-ocean-accent/20 border border-ocean-accent text-ocean-accent'
                      : 'bg-ocean-foam/5 border border-ocean-foam/10 text-ocean-foam/70 hover:bg-ocean-foam/10'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Toggle
            label="Wireframe"
            icon={Grid3X3}
            checked={render.wireframe}
            onChange={setWireframe}
          />

          <div className="space-y-2">
            <span className="hud-label">Camera Mode</span>
            <div className="grid grid-cols-2 gap-1.5">
              {cameraOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCameraMode(opt.value)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-2 py-2 rounded text-xs font-display font-medium uppercase transition-all',
                      camera.mode === opt.value
                        ? 'bg-ocean-accent/20 border border-ocean-accent text-ocean-accent'
                        : 'bg-ocean-foam/5 border border-ocean-foam/10 text-ocean-foam/70 hover:bg-ocean-foam/10'
                    )}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
