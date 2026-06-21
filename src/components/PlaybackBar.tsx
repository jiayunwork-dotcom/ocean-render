import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, X, Video, Gauge, Crop, Check, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '@/store/recordingTypes';
import { cn } from '@/lib/utils';

interface PlaybackBarProps {
  onExport: () => void;
}

type DragHandle = 'start' | 'end' | null;

export default function PlaybackBar({ onExport }: PlaybackBarProps) {
  const playbackData = useAppStore((s) => s.playback.playbackData);
  const playbackRecordingId = useAppStore((s) => s.playback.playbackRecordingId);
  const currentFrameIndex = useAppStore((s) => s.playback.currentFrameIndex);
  const isPaused = useAppStore((s) => s.playback.isPaused);
  const playbackSpeed = useAppStore((s) => s.playback.playbackSpeed);
  const isExporting = useAppStore((s) => s.playback.isExporting);
  const exportProgress = useAppStore((s) => s.playback.exportProgress);

  const crop = useAppStore((s) => s.crop);
  const startCropping = useAppStore((s) => s.startCropping);
  const setCropStart = useAppStore((s) => s.setCropStart);
  const setCropEnd = useAppStore((s) => s.setCropEnd);
  const applyCrop = useAppStore((s) => s.applyCrop);
  const cancelCrop = useAppStore((s) => s.cancelCrop);

  const pausePlayback = useAppStore((s) => s.pausePlayback);
  const resumePlayback = useAppStore((s) => s.resumePlayback);
  const stopPlayback = useAppStore((s) => s.stopPlayback);
  const setPlaybackFrame = useAppStore((s) => s.setPlaybackFrame);
  const setPlaybackSpeed = useAppStore((s) => s.setPlaybackSpeed);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<DragHandle>(null);

  const totalFrames = playbackData?.frames.length ?? 0;
  const progress = totalFrames > 0 ? ((currentFrameIndex + 1) / totalFrames) * 100 : 0;

  const isCropping = crop.isCropping && crop.recordingId === playbackRecordingId;
  const cropStartPercent = totalFrames > 0 ? (crop.startFrame / (totalFrames - 1)) * 100 : 0;
  const cropEndPercent = totalFrames > 0 ? (crop.endFrame / (totalFrames - 1)) * 100 : 100;

  const getFrameFromClientX = useCallback(
    (clientX: number): number => {
      if (!sliderRef.current || totalFrames <= 0) return 0;
      const rect = sliderRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * (totalFrames - 1));
    },
    [totalFrames]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isExporting || isCropping) return;
      const value = parseFloat(e.target.value);
      const frameIndex = Math.round((value / 100) * (totalFrames - 1));
      setPlaybackFrame(frameIndex);
    },
    [setPlaybackFrame, totalFrames, isExporting, isCropping]
  );

  const handleSliderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isExporting || isCropping) return;
      const frame = getFrameFromClientX(e.clientX);
      setPlaybackFrame(frame);
    },
    [isExporting, isCropping, getFrameFromClientX, setPlaybackFrame]
  );

  const handleHandleMouseDown = useCallback(
    (handle: DragHandle) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isCropping) return;
      setDraggingHandle(handle);
    },
    [isCropping]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingHandle || !isCropping) return;
      const frame = getFrameFromClientX(e.clientX);
      if (draggingHandle === 'start') {
        setCropStart(frame);
      } else {
        setCropEnd(frame);
      }
    },
    [draggingHandle, isCropping, getFrameFromClientX, setCropStart, setCropEnd]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingHandle(null);
  }, []);

  useEffect(() => {
    if (draggingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingHandle, handleMouseMove, handleMouseUp]);

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

  const handleStartCrop = useCallback(() => {
    if (!playbackRecordingId) return;
    pausePlayback();
    startCropping(playbackRecordingId);
  }, [playbackRecordingId, pausePlayback, startCropping]);

  const handleApplyCrop = useCallback(() => {
    applyCrop();
  }, [applyCrop]);

  const handleCancelCrop = useCallback(() => {
    cancelCrop();
  }, [cancelCrop]);

  const speedButtons = useMemo(
    () =>
      PLAYBACK_SPEEDS.map((speed) => (
        <button
          key={speed}
          onClick={() => handleSpeedChange(speed)}
          disabled={isExporting || isCropping}
          className={cn(
            'px-2 py-1 text-xs font-mono rounded transition-all',
            playbackSpeed === speed
              ? 'bg-green-500/30 border border-green-400/50 text-green-400'
              : 'bg-ocean-foam/5 border border-ocean-foam/10 text-ocean-foam/50 hover:bg-ocean-foam/10 hover:text-ocean-foam/70',
            (isExporting || isCropping) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {speed}x
        </button>
      )),
    [playbackSpeed, handleSpeedChange, isExporting, isCropping]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className={cn('glass-panel mx-4 mb-4 px-5 py-3 border-green-500/30', isCropping && 'border-orange-500/30')}>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            disabled={isExporting || isCropping}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0',
              'bg-green-500/20 border border-green-400/40 text-green-400',
              'hover:bg-green-500/30 hover:border-green-400/60',
              (isExporting || isCropping) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isPaused ? <Play size={16} className="ml-0.5" /> : <Pause size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            <div
              ref={sliderRef}
              className="relative w-full h-6 flex items-center cursor-pointer"
              onMouseDown={handleSliderMouseDown}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-ocean-foam/10 rounded-full" />

              {isCropping && (
                <>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 bg-gray-500/60 rounded-l-full pointer-events-none"
                    style={{ left: 0, width: `${cropStartPercent}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 bg-gray-500/60 rounded-r-full pointer-events-none"
                    style={{ left: `${cropEndPercent}%`, right: 0, width: `${100 - cropEndPercent}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 bg-orange-500/40 rounded-full pointer-events-none border border-orange-400/50"
                    style={{ left: `${cropStartPercent}%`, width: `${cropEndPercent - cropStartPercent}%` }}
                  />
                </>
              )}

              <div
                className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-green-900/60 via-green-500/60 to-green-400 rounded-full transition-all duration-100"
                style={{
                  left: isCropping ? `${cropStartPercent}%` : 0,
                  width: isCropping
                    ? `${Math.max(0, Math.min(progress, cropEndPercent) - cropStartPercent)}%`
                    : `${progress}%`,
                }}
              />

              <input
                type="range"
                className={cn(
                  'absolute inset-0 w-full opacity-0',
                  isExporting && 'cursor-not-allowed',
                  isCropping && 'pointer-events-none'
                )}
                min={0}
                max={100}
                step={0.1}
                value={progress}
                onChange={handleSliderChange}
                disabled={isExporting || isCropping}
              />

              {isCropping ? (
                <>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-7 rounded bg-orange-500 border-2 border-orange-300 shadow-lg shadow-orange-500/40 cursor-ew-resize z-10 flex items-center justify-center"
                    style={{ left: `${cropStartPercent}%` }}
                    onMouseDown={handleHandleMouseDown('start')}
                  >
                    <div className="w-0.5 h-3 bg-orange-200 rounded" />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-7 rounded bg-orange-500 border-2 border-orange-300 shadow-lg shadow-orange-500/40 cursor-ew-resize z-10 flex items-center justify-center"
                    style={{ left: `${cropEndPercent}%` }}
                    onMouseDown={handleHandleMouseDown('end')}
                  >
                    <div className="w-0.5 h-3 bg-orange-200 rounded" />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-400 border-2 border-ocean-dark shadow-lg shadow-green-400/30 pointer-events-none z-20 transition-all duration-100"
                    style={{ left: `calc(${progress}% - 8px)` }}
                  />
                </>
              ) : (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-400 border-2 border-ocean-dark shadow-lg shadow-green-400/30 pointer-events-none transition-all duration-100"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className={cn('text-[10px] font-display font-mono', isCropping ? 'text-orange-400/70' : 'text-green-400/70')}>
                {isCropping
                  ? `帧 ${crop.startFrame + 1} - ${crop.endFrame + 1} / ${totalFrames}`
                  : `帧 ${currentFrameIndex + 1} / ${totalFrames}`}
              </span>
              <span className={cn('text-[10px] font-display', isCropping ? 'text-orange-400/70' : 'text-green-400/70')}>
                {isCropping
                  ? `${crop.endFrame - crop.startFrame + 1}帧 (${((crop.endFrame - crop.startFrame + 1) / totalFrames * 100).toFixed(1)}%)`
                  : `${progress.toFixed(1)}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCropping ? (
              <>
                <div className="h-6 w-px bg-orange-400/20 mx-1" />
                <button
                  onClick={handleApplyCrop}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                    'bg-green-500/20 border border-green-400/40 text-green-400',
                    'hover:bg-green-500/30 hover:border-green-400/60'
                  )}
                  title="应用裁剪"
                >
                  <Check size={14} />
                  <span>应用裁剪</span>
                </button>
                <button
                  onClick={handleCancelCrop}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                    'bg-gray-500/20 border border-gray-400/40 text-gray-400',
                    'hover:bg-gray-500/30 hover:border-gray-400/60'
                  )}
                  title="取消裁剪"
                >
                  <XCircle size={14} />
                  <span>取消</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Gauge size={14} className="text-green-400/70 mr-1" />
                  {speedButtons}
                </div>

                <div className="h-6 w-px bg-green-400/20 mx-1" />

                {playbackRecordingId && (
                  <button
                    onClick={handleStartCrop}
                    disabled={isExporting}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                      isExporting
                        ? 'bg-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                        : 'bg-orange-500/20 border border-orange-400/40 text-orange-400 hover:bg-orange-500/30 hover:border-orange-400/60'
                    )}
                    title="裁剪片段"
                  >
                    <Crop size={14} />
                    <span>裁剪</span>
                  </button>
                )}

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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
