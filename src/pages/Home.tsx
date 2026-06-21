import { useEffect, useRef, useState, useCallback } from 'react';
import { OceanScene } from '@/ocean/OceanScene';
import ControlPanel from '@/components/ControlPanel';
import StatsHUD from '@/components/StatsHUD';
import CameraToggle from '@/components/CameraToggle';
import TimelineBar from '@/components/TimelineBar';
import RecordingControls from '@/components/RecordingControls';
import PostRecordingModal from '@/components/PostRecordingModal';
import PlaybackBar from '@/components/PlaybackBar';
import { ToastContainer, type ToastState, type ToastType } from '@/components/Toast';
import { useAppStore } from '@/store/useAppStore';
import { getWeatherParams } from '@/utils/weather';
import { validateRecordingData } from '@/utils/recordingValidation';
import type {
  RecordingData,
  RecordingFrame,
} from '@/store/recordingTypes';
import {
  MAX_RECORDING_FRAMES,
  RECORDING_INTERVAL,
  SPEED_TO_INTERVAL,
} from '@/store/recordingTypes';
import { cn } from '@/lib/utils';

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

function downloadJSON(data: RecordingData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ocean-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function restoreFrameState(frame: RecordingFrame, scene: OceanScene, store: ReturnType<typeof useAppStore.getState>): void {
  store.setWindSpeed(frame.environment.windSpeed, true);
  store.setWindDirection(frame.environment.windDirection);
  store.setSkyPreset(frame.environment.skyPreset);
  store.setSunAzimuth(frame.environment.sunAzimuth, true);
  store.setSunElevation(frame.environment.sunElevation, true);
  store.setExposure(frame.environment.exposure);
  store.setToneMapping(frame.environment.toneMapping);

  store.setFoamEnabled(frame.render.foam);
  store.setWakeEnabled(frame.render.wake);
  store.setLodLevel(frame.render.lodLevel);
  store.setWireframe(frame.render.wireframe);

  const currentShipIds = new Set(store.ships.map(s => s.id));
  const frameShipIds = new Set(frame.ships.map(s => s.id));

  for (const id of currentShipIds) {
    if (!frameShipIds.has(id)) {
      store.removeShip(id);
    }
  }

  for (const frameShip of frame.ships) {
    if (!currentShipIds.has(frameShip.id)) {
      store.addShip({
        id: frameShip.id,
        position: { x: frameShip.x, z: frameShip.z },
        speed: frameShip.speed,
        heading: frameShip.heading,
        wakeEnabled: frame.render.wake,
      });
    } else {
      store.updateShip(frameShip.id, {
        position: { x: frameShip.x, z: frameShip.z },
        speed: frameShip.speed,
        heading: frameShip.heading,
      });
    }
  }

  scene.setCameraState(frame.camera);
}

function captureFrame(scene: OceanScene, index: number): RecordingFrame {
  const store = useAppStore.getState();
  const cameraState = scene.getCameraState();

  return {
    index,
    timestamp: Date.now(),
    environment: {
      windSpeed: store.environment.windSpeed,
      windDirection: store.environment.windDirection,
      sunAzimuth: store.environment.sunAzimuth,
      sunElevation: store.environment.sunElevation,
      skyPreset: store.environment.skyPreset,
      exposure: store.environment.exposure,
      toneMapping: store.environment.toneMapping,
    },
    ships: store.ships.map(ship => ({
      id: ship.id,
      x: ship.position.x,
      z: ship.position.z,
      speed: ship.speed,
      heading: ship.heading,
    })),
    camera: cameraState,
    render: {
      lodLevel: store.render.lodLevel,
      foam: store.render.foamEnabled,
      wake: store.render.wakeEnabled,
      wireframe: store.render.wireframe,
    },
  };
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OceanScene | null>(null);

  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [completedRecording, setCompletedRecording] = useState<RecordingData | null>(null);

  const recordingIntervalRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);
  const prePlaybackTimelineStateRef = useRef<{
    isPlaying: boolean;
    timeOfDay: number;
  } | null>(null);

  const isRecording = useAppStore((s) => s.recording.isRecording);
  const isPlaybackActive = useAppStore((s) => s.playback.isPlaying);
  const isExporting = useAppStore((s) => s.playback.isExporting);
  const isTimelinePlaying = useAppStore((s) => s.timeline.isPlaying);
  const playbackCurrentFrame = useAppStore((s) => s.playback.currentFrameIndex);
  const playbackSpeed = useAppStore((s) => s.playback.playbackSpeed);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLoadFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateRecordingData(data);

      if (!result.valid) {
        addToast(`校验失败: ${result.errors[0]}`, 'error');
        return;
      }

      const store = useAppStore.getState();
      prePlaybackTimelineStateRef.current = {
        isPlaying: store.timeline.isPlaying,
        timeOfDay: store.timeline.timeOfDay,
      };
      store.setTimelinePlaying(false);
      store.startPlayback(data as RecordingData);
      addToast('加载成功，开始回放', 'success');
    } catch {
      addToast('文件读取失败: 无效的JSON格式', 'error');
    }
  }, [addToast]);

  const handleExportMP4 = useCallback(async () => {
    const canvas = canvasRef.current;
    const store = useAppStore.getState();
    const playbackData = store.playback.playbackData;

    if (!canvas || !playbackData || store.playback.isExporting) return;

    try {
      store.setExporting(true);
      store.setPlaybackFrame(0);

      const speed = store.playback.playbackSpeed;
      const frameInterval = SPEED_TO_INTERVAL[speed];
      const totalFrames = playbackData.frames.length;

      const stream = canvas.captureStream(30);
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];

      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        addToast('浏览器不支持视频录制', 'error');
        store.setExporting(false);
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      let currentFrame = 0;
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocean-playback-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        store.setExporting(false);
        addToast('视频导出完成', 'success');
      };

      mediaRecorder.start();

      const exportFrame = () => {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        const frame = playbackData.frames[currentFrame];
        restoreFrameState(frame, sceneRef.current!, useAppStore.getState());
        store.setPlaybackFrame(currentFrame);
        store.setExportProgress((currentFrame / totalFrames) * 100);

        currentFrame++;
        setTimeout(exportFrame, frameInterval);
      };

      setTimeout(exportFrame, 100);
    } catch (e) {
      console.error('Export error:', e);
      store.setExporting(false);
      addToast('视频导出失败', 'error');
    }
  }, [addToast]);

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
    if (!isTimelinePlaying || isPlaybackActive) return;

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
  }, [isTimelinePlaying, isPlaybackActive]);

  useEffect(() => {
    if (!isRecording) {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      return;
    }

    let frameIndex = 0;

    const sampleFrame = () => {
      if (!sceneRef.current) return;

      const currentStore = useAppStore.getState();
      if (frameIndex >= MAX_RECORDING_FRAMES) {
        const data = currentStore.stopRecording();
        if (data) {
          setCompletedRecording(data);
          setShowPostModal(true);
        }
        return;
      }

      const frame = captureFrame(sceneRef.current, frameIndex);
      const added = currentStore.addRecordingFrame(frame);

      if (added) {
        currentStore.setRecordingDuration(frame.timestamp - currentStore.recording.recordingStartTime);
        frameIndex++;
      }
    };

    sampleFrame();
    recordingIntervalRef.current = window.setInterval(sampleFrame, RECORDING_INTERVAL);

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isPlaybackActive || !sceneRef.current) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    const store = useAppStore.getState();
    const playbackData = store.playback.playbackData;
    if (!playbackData) return;

    if (prePlaybackTimelineStateRef.current === null) {
      prePlaybackTimelineStateRef.current = {
        isPlaying: store.timeline.isPlaying,
        timeOfDay: store.timeline.timeOfDay,
      };
    }
    store.setTimelinePlaying(false);

    const advanceFrame = () => {
      const currentStore = useAppStore.getState();
      const data = currentStore.playback.playbackData;
      if (!data) return;

      if (currentStore.playback.isPaused || currentStore.playback.isExporting) return;

      const nextIndex = currentStore.playback.currentFrameIndex + 1;
      if (nextIndex >= data.frames.length) {
        if (prePlaybackTimelineStateRef.current) {
          const state = prePlaybackTimelineStateRef.current;
          currentStore.setTimelinePlaying(state.isPlaying);
          currentStore.setTimeOfDay(state.timeOfDay);
          prePlaybackTimelineStateRef.current = null;
        }
        currentStore.stopPlayback();
        addToast('回放完成', 'info');
        return;
      }

      const frame = data.frames[nextIndex];
      restoreFrameState(frame, sceneRef.current!, currentStore);
      currentStore.setPlaybackFrame(nextIndex);
    };

    const speed = store.playback.playbackSpeed;
    const interval = SPEED_TO_INTERVAL[speed];

    advanceFrame();
    playbackIntervalRef.current = window.setInterval(advanceFrame, interval);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaybackActive, addToast]);

  useEffect(() => {
    if (!isPlaybackActive || !sceneRef.current) return;

    const store = useAppStore.getState();
    const frame = store.playback.playbackData?.frames[playbackCurrentFrame];
    if (frame) {
      restoreFrameState(frame, sceneRef.current, store);
    }
  }, [isPlaybackActive, playbackCurrentFrame]);

  useEffect(() => {
    if (!isPlaybackActive || !sceneRef.current || isExporting) return;

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }

    const interval = SPEED_TO_INTERVAL[playbackSpeed];

    const advanceFrame = () => {
      const currentStore = useAppStore.getState();
      const data = currentStore.playback.playbackData;
      if (!data) return;

      if (currentStore.playback.isPaused || currentStore.playback.isExporting) return;

      const nextIndex = currentStore.playback.currentFrameIndex + 1;
      if (nextIndex >= data.frames.length) {
        if (prePlaybackTimelineStateRef.current) {
          const state = prePlaybackTimelineStateRef.current;
          currentStore.setTimelinePlaying(state.isPlaying);
          currentStore.setTimeOfDay(state.timeOfDay);
          prePlaybackTimelineStateRef.current = null;
        }
        currentStore.stopPlayback();
        addToast('回放完成', 'info');
        return;
      }

      const frame = data.frames[nextIndex];
      restoreFrameState(frame, sceneRef.current!, currentStore);
      currentStore.setPlaybackFrame(nextIndex);
    };

    playbackIntervalRef.current = window.setInterval(advanceFrame, interval);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [playbackSpeed, isPlaybackActive, isExporting, addToast]);

  const handleSaveRecording = useCallback(() => {
    if (completedRecording) {
      downloadJSON(completedRecording);
      addToast('录制数据已保存', 'success');
    }
    setShowPostModal(false);
    setCompletedRecording(null);
  }, [completedRecording, addToast]);

  const handleReplayRecording = useCallback(() => {
    if (completedRecording) {
      const store = useAppStore.getState();
      prePlaybackTimelineStateRef.current = {
        isPlaying: store.timeline.isPlaying,
        timeOfDay: store.timeline.timeOfDay,
      };
      store.setTimelinePlaying(false);
      store.startPlayback(completedRecording);
      addToast('开始回放', 'info');
    }
    setShowPostModal(false);
    setCompletedRecording(null);
  }, [completedRecording, addToast]);

  const handleStopRecording = useCallback(() => {
    const store = useAppStore.getState();
    const data = store.stopRecording();
    if (data && data.frames.length > 0) {
      setCompletedRecording(data);
      setShowPostModal(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowPostModal(false);
    setCompletedRecording(null);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ocean-dark">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      <RecordingControls
        onLoadFile={handleLoadFile}
        onStop={handleStopRecording}
        disabled={isPlaybackActive}
      />

      <div className={cn(isPlaybackActive && 'playback-controls-disabled')}>
        <CameraToggle />
        <ControlPanel />
      </div>

      <StatsHUD />

      {isPlaybackActive ? (
        <PlaybackBar onExport={handleExportMP4} />
      ) : (
        <TimelineBar />
      )}

      {showPostModal && completedRecording && (
        <PostRecordingModal
          recordingData={completedRecording}
          onSave={handleSaveRecording}
          onReplay={handleReplayRecording}
          onClose={handleCloseModal}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
