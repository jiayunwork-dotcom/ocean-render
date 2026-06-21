import { Orbit, Eye } from 'lucide-react';
import { useAppStore, type CameraMode } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const options: { value: CameraMode; label: string; icon: typeof Orbit }[] = [
  { value: 'orbit', label: 'Orbit', icon: Orbit },
  { value: 'firstPerson', label: 'First Person', icon: Eye },
];

export default function CameraToggle() {
  const mode = useAppStore((state) => state.camera.mode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  return (
    <div className="fixed top-4 left-4 z-50">
      <div
        className={cn(
          'glass-panel-light p-1 flex gap-1 rounded-full shadow-lg'
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = mode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setCameraMode(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider transition-all duration-200',
                isActive
                  ? 'bg-ocean-accent text-ocean-dark shadow-md'
                  : 'text-ocean-foam/70 hover:text-ocean-foam hover:bg-ocean-foam/10'
              )}
            >
              <Icon size={14} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
