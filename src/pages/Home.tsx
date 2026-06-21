import { useEffect, useRef } from 'react';
import { OceanScene } from '@/ocean/OceanScene';
import ControlPanel from '@/components/ControlPanel';
import StatsHUD from '@/components/StatsHUD';
import CameraToggle from '@/components/CameraToggle';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OceanScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    </div>
  );
}
