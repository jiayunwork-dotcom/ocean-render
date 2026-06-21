import { useCallback, useMemo } from 'react';
import { Play, Pause, X, Video, Gauge } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '@/store/recordingTypes';
import { cn } from '@/lib/utils';

interface PlaybackBarProps {
  onExport: () => void;
}

export default function PlaybackBar({ onExport }: PlaybackBarProps) {
  const playbackData = useAppStore((s) => s.playback.playbackData);
  const currentFrameIndex = useAppStore((s) => s.playback.currentFrameIndex);
  const isPaused = useAppStore((s) => s.playback.isPaused);
  const playbackSpeed = useAppStore((s) => s.playback.playbackSpeed);
  const isExporting = useAppStore((s) => s.playback.isExporting);
  const exportProgress = useAppStore((s) => s.playback.exportProgress);

  const pausePlayback = useAppStore((s) => s.pausePlayback);
  const resumePlayback = useAppStore((s) => s.resumePlayback);
  const stopPlayback = useAppStore((s) => s.stopPlayback);
  const setPlaybackFrame = useAppStore((s) => s.setPlaybackFrame);
  const setPlaybackSpeed = useAppStore((s) => s.setPlaybackSpeed);

  const totalFrames = playbackData?.frames.length ?? 0;
  const progress = totalFrames > 0 ? ((currentFrameIndex + 1) / totalFrames) * 100 : 0;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isExporting) return;
      const value = parseFloat(e.target.value);
      const frameIndex = Math.round((value / 100) * (totalFrames - 1));
      setPlaybackFrame(frameIndex);
    },
    [setPlaybackFrame, totalFrames, isExporting]
  );

  const handlePlayPause = useCallback(() => {
    if (isExporting) return;
    if (isPaused) {
      resumePlayback();
    } else {
      pausePlayback();
    }
  }, [isPaused, isExporting, pausePlayback, resumePlayback]);

  const handleSpeedChange = useCallback(
    (speed: PlaybackSpeed) => {
      if (isExporting) return;
      setPlaybackSpeed(speed);
    },
    [setPlaybackSpeed, isExporting]
  );

  const speedButtons = useMemo(
    () =>
      PLAYBACK_SPEEDS.map((speed) => (
        <button
          key={speed}
          onClick={() => handleSpeedChange(speed)}
          disabled={isExporting}
          className={cn(
            'px-2 py-1 text-xs font-mono rounded transition-all',
            playbackSpeed === speed
              ? 'bg-green-500/30 border border-green-400/50 text-green-400'
              : 'bg-ocean-foam/5 border border-ocean-foam/10 text-ocean-foam/50 hover:bg-ocean-foam/10 hover:text-ocean-foam/70',
            isExporting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {speed}x
        </button>
      )),
    [playbackSpeed, handleSpeedChange, isExporting]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass-panel mx-4 mb-4 px-5 py-3 border-green-500/30">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            disabled={isExporting}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0',
              'bg-green-500/20 border border-green-400/40 text-green-400',
              'hover:bg-green-500/30 hover:border-green-400/60',
              isExporting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isPaused ? <Play size={16} className="ml-0.5" /> : <Pause size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="relative w-full h-6 flex items-center">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-ocean-foam/10 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-green-900/60 via-green-500/60 to-green-400 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                className={cn(
                  'absolute inset-0 w-full opacity-0 cursor-pointer',
                  isExporting && 'cursor-not-allowed'
                )}
                min={0}
                max={100}
                step={0.1}
                value={progress}
                onChange={handleSliderChange}
                disabled={isExporting}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-400 border-2 border-ocean-dark shadow-lg shadow-green-400/30 pointer-events-none transition-all duration-100"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-display text-green-400/70 font-mono">
                帧 {currentFrameIndex + 1} / {totalFrames}
              </span>
              <span className="text-[10px] font-display text-green-400/70">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <Gauge size={14} className="text-green-400/70 mr-1" />
              {speedButtons}
            </div>

            <div className="h-6 w-px bg-green-400/20 mx-1" />

            <button
              onClick={onExport}
              disabled={isExporting}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                isExporting
                  ? 'bg-orange-500/20 border border-orange-400/40 text-orange-400 cursor-not-allowed'
                  : 'bg-green-500/20 border border-green-400/40 text-green-400 hover:bg-green-500/30 hover:border-green-400/60'
              )}
            >
              <Video size={14} />
              {isExporting ? (
                <span className="font-mono">{exportProgress.toFixed(0)}%</span>
              ) : (
                <span>导出MP4</span>
              )}
            </button>

            <button
              onClick={stopPlayback}
              disabled={isExporting}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0',
                'bg-red-500/10 border border-red-400/30 text-red-400',
                'hover:bg-red-500/20 hover:border-red-400/50',
                isExporting && 'opacity-50 cursor-not-allowed'
              )}
              title="停止回放"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
