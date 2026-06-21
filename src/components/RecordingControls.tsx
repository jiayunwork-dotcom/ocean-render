import { useRef, useCallback } from 'react';
import { Circle, Square, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { MAX_RECORDING_FRAMES } from '@/store/recordingTypes';

interface RecordingControlsProps {
  onLoadFile: (file: File) => void;
  onStop?: () => void;
  disabled?: boolean;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function RecordingControls({ onLoadFile, onStop, disabled = false }: RecordingControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRecording = useAppStore((s) => s.recording.isRecording);
  const currentDuration = useAppStore((s) => s.recording.currentRecordingDuration);
  const frameCount = useAppStore((s) => s.recording.recordedFrames.length);
  const startRecording = useAppStore((s) => s.startRecording);
  const isPlaybackActive = useAppStore((s) => s.playback.isPlaying);

  const handleRecordClick = useCallback(() => {
    if (disabled || isPlaybackActive) return;
    startRecording();
  }, [startRecording, disabled, isPlaybackActive]);

  const handleStopClick = useCallback(() => {
    if (onStop) {
      onStop();
    }
  }, [onStop]);

  const handleLoadClick = useCallback(() => {
    if (disabled || isRecording || isPlaybackActive) return;
    fileInputRef.current?.click();
  }, [disabled, isRecording, isPlaybackActive]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onLoadFile]);

  const isDisabled = disabled || isPlaybackActive;

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
      <div className="glass-panel px-4 py-2 flex items-center gap-3">
        <button
          onClick={handleRecordClick}
          disabled={isDisabled || isRecording}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0',
            isRecording
              ? 'bg-red-500 border-2 border-red-300 animate-rec-pulse'
              : isDisabled
                ? 'bg-gray-600/50 border border-gray-500/30 cursor-not-allowed'
                : 'bg-red-500/80 border-2 border-red-400/50 hover:bg-red-500 hover:border-red-300 cursor-pointer'
          )}
          title="开始录制"
        >
          <Circle
            size={16}
            fill="currentColor"
            className={cn(
              'transition-colors',
              isRecording ? 'text-red-900' : isDisabled ? 'text-gray-500' : 'text-red-100'
            )}
          />
        </button>

        {isRecording && (
          <button
            onClick={handleStopClick}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600/80 border-2 border-red-400/50 hover:bg-red-600 hover:border-red-300 transition-all shrink-0"
            title="停止录制"
          >
            <Square size={14} fill="currentColor" className="text-red-100" />
          </button>
        )}

        {isRecording && (
          <>
            <div className="h-8 w-px bg-red-400/30" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-display text-red-400 uppercase tracking-wider">REC</span>
                <span className="hud-value text-sm font-mono">
                  {formatDuration(currentDuration)}
                </span>
              </div>
              <span className="text-[10px] text-ocean-foam/50 font-mono">
                {frameCount} / {MAX_RECORDING_FRAMES} 帧
              </span>
            </div>
          </>
        )}

        {!isRecording && (
          <>
            <div className="h-8 w-px bg-ocean-foam/20" />
            <div className="flex flex-col">
              <span className="text-xs font-display text-ocean-foam/60 uppercase tracking-wider">录制</span>
              <span className="text-[10px] text-ocean-foam/40 font-mono">最长5分钟</span>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleLoadClick}
        disabled={isDisabled || isRecording}
        className={cn(
          'glass-panel flex items-center justify-center w-10 h-10 rounded-lg transition-all shrink-0',
          isDisabled || isRecording
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-ocean-foam/10 cursor-pointer'
        )}
        title="加载录制文件"
      >
        <FolderOpen size={18} className="text-ocean-foam/70" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
