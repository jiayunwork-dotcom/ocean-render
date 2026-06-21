import { useEffect, useRef } from 'react';
import { OceanScene } from '@/ocean/OceanScene';
import ControlPanel from '@/components/ControlPanel';
import StatsHUD from '@/components/StatsHUD';
import CameraToggle from '@/components/CameraToggle';
import TimelineBar from '@/components/TimelineBar';
import { useAppStore } from '@/store/useAppStore';
import { getWeatherParams } from '@/utils/weather';

function applyWeatherToStore(timeOfDay: number) {
  const store = useAppStore.getState();
  const weather = getWeatherParams(timeOfDay);
  store.applyTimelineWeather(
    weather.windSpeed,
    weather.sunAzimuth,
    weather.sunElevation,
    weather.skyPreset,
    weather.skyBlendFactor,
    weather.skyBlendFrom,
    weather.skyBlendTo,
    weather.nightFactor
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OceanScene | null>(null);

  const isPlaying = useAppStore((s) => s.timeline.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    applyWeatherToStore(useAppStore.getState().timeline.timeOfDay);

    const scene = new OceanScene(canvas);
    sceneRef.current = scene;
    scene.start();

    const handleResize = () => {
      scene.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.stop();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    let animFrameId: number;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const store = useAppStore.getState();
      const newTime = (store.timeline.timeOfDay + dt * 10) % 24;
      store.setTimeOfDay(newTime);
      applyWeatherToStore(newTime);

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ocean-dark">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />
      <CameraToggle />
      <ControlPanel />
      <StatsHUD />
      <TimelineBar />
    </div>
  );
}
