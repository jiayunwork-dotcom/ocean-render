import { useCallback, useMemo, useRef, useState } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { RecordingFrame } from '@/store/recordingTypes';
import { cn } from '@/lib/utils';

interface DiffMetrics {
  windSpeedDiff: number;
  sunElevationDiff: number;
  shipCountDiff: number;
  totalDiff: number;
}

function computeDiff(frameA: RecordingFrame, frameB: RecordingFrame): DiffMetrics {
  const windSpeedDiff = Math.abs(frameA.environment.windSpeed - frameB.environment.windSpeed);
  const sunElevationDiff = Math.abs(frameA.environment.sunElevation - frameB.environment.sunElevation);
  const shipCountDiff = Math.abs(frameA.ships.length - frameB.ships.length);
  const totalDiff = windSpeedDiff + sunElevationDiff + shipCountDiff;
  return { windSpeedDiff, sunElevationDiff, shipCountDiff, totalDiff };
}

function diffToColor(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  const r = Math.round(clamped * 255);
  const g = Math.round((1 - clamped) * 200);
  const b = 40;
  return `rgb(${r}, ${g}, ${b})`;
}

export default function ComparisonPlayback() {
  const comparison = useAppStore((s) => s.comparison);
  const recordingLibrary = useAppStore((s) => s.recordingLibrary);
  const stopComparison = useAppStore((s) => s.stopComparison);
  const setComparisonPlaying = useAppStore((s) => s.setComparisonPlaying);
  const setComparisonFrame = useAppStore((s) => s.setComparisonFrame);

  const sliderRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; frame: number } | null>(null);

  const leftEntry = useMemo(
    () => recordingLibrary.find((r) => r.id === comparison.leftRecordingId),
    [recordingLibrary, comparison.leftRecordingId]
  );
  const rightEntry = useMemo(
    () => recordingLibrary.find((r) => r.id === comparison.rightRecordingId),
    [recordingLibrary, comparison.rightRecordingId]
  );

  const leftFrames = useMemo(() => leftEntry?.data.frames ?? [], [leftEntry]);
  const rightFrames = useMemo(() => rightEntry?.data.frames ?? [], [rightEntry]);
  const totalFrames = comparison.totalFrames;

  const { diffData, maxDiff } = useMemo(() => {
    const diffs: number[] = [];
    let max = 0;
    for (let i = 0; i < totalFrames; i++) {
      if (leftFrames[i] && rightFrames[i]) {
        const d = computeDiff(leftFrames[i], rightFrames[i]);
        diffs.push(d.totalDiff);
        if (d.totalDiff > max) max = d.totalDiff;
      } else {
        diffs.push(0);
      }
    }
    return { diffData: diffs, maxDiff: Math.max(1, max) };
  }, [leftFrames, rightFrames, totalFrames]);

  const progress = totalFrames > 0 ? ((comparison.currentFrameIndex + 1) / totalFrames) * 100 : 0;
  const leftName = leftEntry?.data.metadata.name || (leftEntry ? '片段 1' : '-');
  const rightName = rightEntry?.data.metadata.name || (rightEntry ? '片段 2' : '-');

  const getFrameFromClientX = useCallback(
    (clientX: number, ref: React.RefObject<HTMLDivElement>): number => {
      if (!ref.current || totalFrames <= 0) return 0;
      const rect = ref.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * (totalFrames - 1));
    },
    [totalFrames]
  );

  const handleSliderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const frame = getFrameFromClientX(e.clientX, sliderRef);
      setComparisonFrame(frame);
      setComparisonPlaying(false);
    },
    [getFrameFromClientX, setComparisonFrame, setComparisonPlaying]
  );

  const handlePlayPause = useCallback(() => {
    setComparisonPlaying(!comparison.isPlaying);
  }, [comparison.isPlaying, setComparisonPlaying]);

  const handleHeatmapMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!heatmapRef.current) return;
      const frame = getFrameFromClientX(e.clientX, heatmapRef);
      const rect = heatmapRef.current.getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        frame,
      });
    },
    [getFrameFromClientX]
  );

  const handleHeatmapMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const tooltipMetrics: DiffMetrics | null = useMemo(() => {
    if (tooltip === null || !leftFrames[tooltip.frame] || !rightFrames[tooltip.frame]) return null;
    return computeDiff(leftFrames[tooltip.frame], rightFrames[tooltip.frame]);
  }, [tooltip, leftFrames, rightFrames]);

  const heatmapGradient = useMemo(() => {
    const stops: string[] = [];
    if (diffData.length === 0) return '';
    const step = 100 / Math.max(1, diffData.length - 1);
    for (let i = 0; i < diffData.length; i++) {
      const color = diffToColor(diffData[i] / maxDiff);
      stops.push(`${color} ${i * step}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [diffData, maxDiff]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pointer-events-none">
        <div className="glass-panel px-6 py-3 flex items-center gap-4 pointer-events-auto border-purple-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h2 className="text-sm font-display font-semibold tracking-wider text-purple-300 uppercase">
              对比回放
            </h2>
          </div>
          <div className="h-5 w-px bg-purple-400/30" />
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500/50 border border-blue-400/50" />
              <span className="text-blue-300/80 font-mono truncate max-w-[140px]" title={leftName}>
                {leftName}
              </span>
            </div>
            <span className="text-ocean-foam/40">VS</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-500/50 border border-orange-400/50" />
              <span className="text-orange-300/80 font-mono truncate max-w-[140px]" title={rightName}>
                {rightName}
              </span>
            </div>
          </div>
          <div className="h-5 w-px bg-purple-400/30" />
          <span className="text-[11px] font-mono text-ocean-foam/60">
            帧 {comparison.currentFrameIndex + 1} / {totalFrames}
          </span>
          <button
            onClick={stopComparison}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'bg-red-500/10 border border-red-400/30 text-red-400',
              'hover:bg-red-500/20 hover:border-red-400/50'
            )}
            title="退出对比"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-40">
        <div className="absolute top-0 left-0 w-1/2 h-full flex justify-center pt-24">
          <div className="glass-panel-light px-4 py-1.5 rounded-lg border-blue-400/20 pointer-events-auto">
            <span className="text-xs font-mono text-blue-300/80">左: {leftName}</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full flex justify-center pt-24">
          <div className="glass-panel-light px-4 py-1.5 rounded-lg border-orange-400/20 pointer-events-auto">
            <span className="text-xs font-mono text-orange-300/80">右: {rightName}</span>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-white/20 pointer-events-none" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="glass-panel mx-4 mb-4 px-5 py-3 border-purple-500/30">
          <div
            ref={heatmapRef}
            className="relative w-full h-4 rounded-md mb-3 overflow-hidden cursor-crosshair"
            style={{ background: heatmapGradient || '#333' }}
            onMouseMove={handleHeatmapMouseMove}
            onMouseLeave={handleHeatmapMouseLeave}
          >
            <div className="absolute inset-0 border border-ocean-foam/10 rounded-md pointer-events-none" />
            <div className="absolute inset-y-0 w-px bg-white/70 pointer-events-none" style={{ left: `${progress}%` }} />
            <div className="absolute top-0 left-0 flex items-center h-full px-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: diffToColor(0) }} />
            </div>
            <div className="absolute top-0 right-0 flex items-center h-full px-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: diffToColor(1) }} />
            </div>

            {tooltip !== null && tooltipMetrics && (
              <div
                className="absolute z-10 glass-panel-light px-3 py-2 rounded-lg border-purple-400/40 pointer-events-none text-xs whitespace-nowrap"
                style={{
                  left: tooltip.x,
                  top: `calc(${tooltip.y}px - 130px)`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-mono text-purple-300 mb-1.5 border-b border-purple-400/20 pb-1">
                  帧 {tooltip.frame + 1}
                </div>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-ocean-foam/60">风速差:</span>
                    <span className="text-ocean-foam">{tooltipMetrics.windSpeedDiff.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-ocean-foam/60">仰角差:</span>
                    <span className="text-ocean-foam">{tooltipMetrics.sunElevationDiff.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-ocean-foam/60">船舶数量差:</span>
                    <span className="text-ocean-foam">{tooltipMetrics.shipCountDiff} 艘</span>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 border-t border-purple-400/20">
                    <span className="text-purple-300/80">综合差异:</span>
                    <span className={cn(
                      'font-semibold',
                      tooltipMetrics.totalDiff / maxDiff < 0.33 ? 'text-green-400'
                        : tooltipMetrics.totalDiff / maxDiff < 0.66 ? 'text-yellow-400'
                          : 'text-red-400'
                    )}>
                      {tooltipMetrics.totalDiff.toFixed(2)} ({((tooltipMetrics.totalDiff / maxDiff) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0',
                'bg-purple-500/20 border border-purple-400/40 text-purple-400',
                'hover:bg-purple-500/30 hover:border-purple-400/60'
              )}
            >
              {comparison.isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <div
              ref={sliderRef}
              className="flex-1 relative h-6 flex items-center cursor-pointer"
              onMouseDown={handleSliderMouseDown}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-ocean-foam/10 rounded-full" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-purple-900/60 via-purple-500/60 to-purple-400 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-purple-400 border-2 border-ocean-dark shadow-lg shadow-purple-400/30 pointer-events-none transition-all duration-100"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-display font-mono text-purple-400/70">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
