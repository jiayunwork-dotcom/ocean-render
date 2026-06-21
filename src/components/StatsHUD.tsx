import { Activity, Triangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

function getFpsColor(fps: number): string {
  if (fps >= 50) return '#22c55e';
  if (fps >= 30) return '#eab308';
  return '#ef4444';
}

function getTrianglesColor(triangles: number): string {
  if (triangles < 500000) return '#22c55e';
  if (triangles < 2000000) return '#eab308';
  return '#ef4444';
}

function formatTriangles(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function StatsHUD() {
  const fps = useAppStore((state) => state.stats.fps);
  const triangles = useAppStore((state) => state.stats.triangles);

  return (
    <div className="fixed bottom-4 right-4 z-45 pointer-events-none">
      <div className={cn('glass-panel hud-corner p-3 min-w-[180px]')}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-ocean-foam/60" />
              <span className="hud-label">FPS</span>
            </div>
            <span
              className="font-display font-bold text-sm tabular-nums"
              style={{ color: getFpsColor(fps) }}
            >
              {fps.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Triangle size={14} className="text-ocean-foam/60" />
              <span className="hud-label">TRIANGLES</span>
            </div>
            <span
              className="font-display font-bold text-sm tabular-nums"
              style={{ color: getTrianglesColor(triangles) }}
            >
              {formatTriangles(triangles)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
