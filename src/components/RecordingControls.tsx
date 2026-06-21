import { useRef, useCallback, useState } from 'react';
import { Circle, Square, FolderOpen, Trash2, Merge, SplitSquareHorizontal } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isRecording = useAppStore((s) => s.recording.isRecording);
  const currentDuration = useAppStore((s) => s.recording.currentRecordingDuration);
  const frameCount = useAppStore((s) => s.recording.recordedFrames.length);
  const startRecording = useAppStore((s) => s.startRecording);
  const isPlaybackActive = useAppStore((s) => s.playback.isPlaying);
  const isComparing = useAppStore((s) => s.comparison.isComparing);

  const recordingLibrary = useAppStore((s) => s.recordingLibrary);
  const selectedRecordingIds = useAppStore((s) => s.selectedRecordingIds);
  const toggleRecordingSelection = useAppStore((s) => s.toggleRecordingSelection);
  const removeRecordingFromLibrary = useAppStore((s) => s.removeRecordingFromLibrary);
  const startPlaybackById = useAppStore((s) => s.startPlaybackById);
  const renameRecording = useAppStore((s) => s.renameRecording);
  const mergeRecordings = useAppStore((s) => s.mergeRecordings);
  const startComparison = useAppStore((s) => s.startComparison);
  const prePlaybackTimelineStateRef = useRef<{ isPlaying: boolean; timeOfDay: number } | null>(null);

  const selectedCount = selectedRecordingIds.size;
  const selectedIdsArr = Array.from(selectedRecordingIds);

  const handleRecordClick = useCallback(() => {
    if (disabled || isPlaybackActive || isComparing) return;
    startRecording();
  }, [startRecording, disabled, isPlaybackActive, isComparing]);

  const handleStopClick = useCallback(() => {
    if (onStop) {
      onStop();
    }
  }, [onStop]);

  const handleLoadClick = useCallback(() => {
    if (disabled || isRecording || isPlaybackActive || isComparing) return;
    fileInputRef.current?.click();
  }, [disabled, isRecording, isPlaybackActive, isComparing]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onLoadFile]);

  const handlePlayClick = useCallback((id: string) => {
    if (isComparing) return;
    const store = useAppStore.getState();
    prePlaybackTimelineStateRef.current = {
      isPlaying: store.timeline.isPlaying,
      timeOfDay: store.timeline.timeOfDay,
    };
    store.setTimelinePlaying(false);
    startPlaybackById(id);
  }, [startPlaybackById, isComparing]);

  const handleDeleteClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecordingFromLibrary(id);
  }, [removeRecordingFromLibrary]);

  const handleMergeClick = useCallback(() => {
    if (selectedCount !== 2) return;
    const [firstId, secondId] = selectedIdsArr;
    const newId = mergeRecordings(firstId, secondId);
    if (newId) {
      // toast would be nice
    }
  }, [selectedCount, selectedIdsArr, mergeRecordings]);

  const handleCompareClick = useCallback(() => {
    if (selectedCount !== 2) return;
    const [leftId, rightId] = selectedIdsArr;
    const store = useAppStore.getState();
    prePlaybackTimelineStateRef.current = {
      isPlaying: store.timeline.isPlaying,
      timeOfDay: store.timeline.timeOfDay,
    };
    store.setTimelinePlaying(false);
    startComparison(leftId, rightId);
  }, [selectedCount, selectedIdsArr, startComparison]);

  const handleDoubleClickLabel = useCallback((id: string, currentName: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentName ?? '');
  }, []);

  const handleEditKeyDown = useCallback((id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      renameRecording(id, editValue.trim());
      setEditingId(null);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  }, [editValue, renameRecording]);

  const handleEditBlur = useCallback((id: string) => {
    if (editingId === id) {
      renameRecording(id, editValue.trim());
      setEditingId(null);
    }
  }, [editingId, editValue, renameRecording]);

  const isDisabled = disabled || isPlaybackActive || isComparing;

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-3 w-[320px]">
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

      <div className="flex gap-2">
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

      {!isRecording && recordingLibrary.length > 0 && (
        <div className="glass-panel px-3 py-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-display text-ocean-foam/60 uppercase tracking-wider">
              录制片段 ({recordingLibrary.length}/5)
            </span>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {recordingLibrary.map((entry, index) => {
              const isSelected = selectedRecordingIds.has(entry.id);
              const displayName = entry.data.metadata.name || `片段 ${index + 1}`;
              const isEditing = editingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer',
                    isSelected
                      ? 'bg-green-500/20 border border-green-400/40'
                      : 'bg-ocean-foam/5 border border-ocean-foam/10 hover:bg-ocean-foam/10'
                  )}
                  onClick={() => {
                    if (!isEditing && !isComparing) {
                      handlePlayClick(entry.id);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRecordingSelection(entry.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isComparing || isPlaybackActive}
                    className="w-3.5 h-3.5 accent-green-500 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(entry.id, e)}
                        onBlur={() => handleEditBlur(entry.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full bg-ocean-foam/10 border border-green-400/40 rounded px-1.5 py-0.5 text-sm text-ocean-foam font-mono outline-none"
                        placeholder="输入名称..."
                      />
                    ) : (
                      <div
                        className="text-sm font-mono text-ocean-foam truncate cursor-pointer select-none"
                        onDoubleClick={(e) => handleDoubleClickLabel(entry.id, entry.data.metadata.name, e)}
                        title={displayName}
                      >
                        {displayName}
                      </div>
                    )}
                    <div className="flex gap-3 mt-0.5 text-[10px] text-ocean-foam/50 font-mono">
                      <span>{formatDuration(entry.data.metadata.duration)}</span>
                      <span>{entry.data.metadata.frameCount}帧</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(entry.id, e)}
                    disabled={isComparing || isPlaybackActive}
                    className={cn(
                      'p-1.5 rounded transition-all shrink-0',
                      isComparing || isPlaybackActive
                        ? 'opacity-30 cursor-not-allowed'
                        : 'text-ocean-foam/50 hover:bg-red-500/20 hover:text-red-400'
                    )}
                    title="删除片段"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {selectedCount === 2 && (
            <div className="flex gap-2 mt-3 pt-2 border-t border-ocean-foam/10">
              <button
                onClick={handleMergeClick}
                disabled={isComparing || isPlaybackActive}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                  'bg-blue-500/20 border border-blue-400/40 text-blue-400',
                  'hover:bg-blue-500/30 hover:border-blue-400/60',
                  (isComparing || isPlaybackActive) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Merge size={13} />
                <span>拼接</span>
              </button>
              <button
                onClick={handleCompareClick}
                disabled={isComparing || isPlaybackActive}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                  'bg-purple-500/20 border border-purple-400/40 text-purple-400',
                  'hover:bg-purple-500/30 hover:border-purple-400/60',
                  (isComparing || isPlaybackActive) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <SplitSquareHorizontal size={13} />
                <span>对比回放</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
