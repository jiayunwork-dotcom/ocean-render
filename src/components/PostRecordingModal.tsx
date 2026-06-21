import { useCallback } from 'react';
import { Download, Play, X, Clock, Film, Plus } from 'lucide-react';
import type { RecordingData } from '@/store/recordingTypes';
import { cn } from '@/lib/utils';

interface PostRecordingModalProps {
  recordingData: RecordingData;
  onSave: () => void;
  onReplay: () => void;
  onAddToLibrary: () => void;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function PostRecordingModal({
  recordingData,
  onSave,
  onReplay,
  onAddToLibrary,
  onClose,
}: PostRecordingModalProps) {
  const { metadata } = recordingData;

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="glass-panel w-[420px] overflow-hidden animate-modal-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ocean-foam/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Film size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="hud-title text-lg">录制完成</h3>
              <p className="text-xs text-ocean-foam/50 mt-0.5">
                {new Date(metadata.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ocean-foam/10 text-ocean-foam/60 hover:text-ocean-foam transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel-light px-4 py-3">
              <div className="flex items-center gap-2 text-ocean-foam/50 text-xs mb-1">
                <Clock size={12} />
                <span>时长</span>
              </div>
              <p className="hud-value text-xl">{formatDuration(metadata.duration)}</p>
            </div>
            <div className="glass-panel-light px-4 py-3">
              <div className="flex items-center gap-2 text-ocean-foam/50 text-xs mb-1">
                <Film size={12} />
                <span>帧数</span>
              </div>
              <p className="hud-value text-xl">{metadata.frameCount}</p>
            </div>
          </div>

          <div className="glass-panel-light px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-ocean-foam/50">开始时刻</span>
              <span className="text-ocean-foam">{formatTimestamp(metadata.startTime)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-ocean-foam/50">结束时刻</span>
              <span className="text-ocean-foam">{formatTimestamp(metadata.endTime)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-ocean-foam/10 flex flex-col gap-2">
          <div className="flex gap-3">
            <button
              onClick={onSave}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg',
                'bg-ocean-foam/10 border border-ocean-foam/20 text-ocean-foam',
                'hover:bg-ocean-foam/15 hover:border-ocean-foam/30 transition-all'
              )}
            >
              <Download size={16} />
              <span className="text-sm font-medium">保存为JSON</span>
            </button>
            <button
              onClick={onReplay}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg',
                'bg-green-500/20 border border-green-400/40 text-green-400',
                'hover:bg-green-500/30 hover:border-green-400/60 transition-all'
              )}
            >
              <Play size={16} />
              <span className="text-sm font-medium">立即回放</span>
            </button>
          </div>
          <button
            onClick={onAddToLibrary}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg',
              'bg-blue-500/20 border border-blue-400/40 text-blue-400',
              'hover:bg-blue-500/30 hover:border-blue-400/60 transition-all'
            )}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">加入片段库</span>
          </button>
        </div>
      </div>
    </div>
  );
}
