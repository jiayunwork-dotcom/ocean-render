import { useCallback } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime, getWeatherParams } from '@/utils/weather';
import { cn } from '@/lib/utils';

const TIME_MARKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

export default function TimelineBar() {
  const timeOfDay = useAppStore((s) => s.timeline.timeOfDay);
  const isPlaying = useAppStore((s) => s.timeline.isPlaying);
  const setTimeOfDay = useAppStore((s) => s.setTimeOfDay);
  const setTimelinePlaying = useAppStore((s) => s.setTimelinePlaying);
  const applyTimelineWeather = useAppStore((s) => s.applyTimelineWeather);
  const clearAllOverrides = useAppStore((s) => s.clearAllOverrides);

  const handleSliderChange = useCallback(
    (value: number) => {
      setTimeOfDay(value);
      const params = getWeatherParams(value);
      applyTimelineWeather(
        params.windSpeed,
        params.sunAzimuth,
        params.sunElevation,
        params.skyPreset,
        params.skyBlendFactor,
        params.skyBlendFrom,
        params.skyBlendTo,
        params.nightFactor
      );
    },
    [setTimeOfDay, applyTimelineWeather]
  );

  const handlePlayToggle = useCallback(() => {
    if (!isPlaying) {
      clearAllOverrides();
    }
    setTimelinePlaying(!isPlaying);
  }, [isPlaying, setTimelinePlaying, clearAllOverrides]);

  const progress = (timeOfDay / 24) * 100;

  const phaseLabel = (() => {
    if (timeOfDay < 5) return '深夜';
    if (timeOfDay < 7) return '日出';
    if (timeOfDay < 12) return '上午';
    if (timeOfDay < 14) return '正午';
    if (timeOfDay < 17) return '下午';
    if (timeOfDay < 19) return '日落';
    return '夜间';
  })();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass-panel mx-4 mb-4 px-5 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayToggle}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0',
              isPlaying
                ? 'bg-ocean-accent/20 border border-ocean-accent text-ocean-accent'
                : 'bg-ocean-foam/10 border border-ocean-foam/20 text-ocean-foam/70 hover:bg-ocean-foam/15 hover:text-ocean-foam'
            )}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="relative w-full h-6 flex items-center">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-ocean-foam/10 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-ocean-dark via-ocean-accent/60 to-ocean-accent rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                min={0}
                max={24}
                step={0.05}
                value={timeOfDay}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-ocean-accent border-2 border-ocean-dark shadow-lg shadow-ocean-accent/30 pointer-events-none transition-all duration-100"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between mt-1 px-0.5">
              {TIME_MARKS.map((mark) => (
                <span
                  key={mark}
                  className="text-[10px] font-display text-ocean-foam/30"
                >
                  {mark}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-ocean-accent/70" />
              <span className="hud-value text-base tracking-wider">
                {formatTime(timeOfDay)}
              </span>
            </div>
            <span className="text-xs font-display text-ocean-foam/40 uppercase tracking-wider min-w-[3em] text-right">
              {phaseLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
