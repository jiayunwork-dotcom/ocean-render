import type { SkyPreset, ToneMapping, LODLevel } from './useAppStore';

export interface FrameEnvironment {
  windSpeed: number;
  windDirection: number;
  sunAzimuth: number;
  sunElevation: number;
  skyPreset: SkyPreset;
  exposure: number;
  toneMapping: ToneMapping;
}

export interface FrameShip {
  id: string;
  x: number;
  z: number;
  speed: number;
  heading: number;
}

export interface FrameCamera {
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface FrameRender {
  lodLevel: LODLevel;
  foam: boolean;
  wake: boolean;
  wireframe: boolean;
}

export interface RecordingFrame {
  index: number;
  timestamp: number;
  environment: FrameEnvironment;
  ships: FrameShip[];
  camera: FrameCamera;
  render: FrameRender;
}

export interface RecordingMetadata {
  duration: number;
  frameCount: number;
  startTime: number;
  endTime: number;
  createdAt: string;
}

export interface RecordingData {
  version: 1;
  metadata: RecordingMetadata;
  frames: RecordingFrame[];
}

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface RecordingState {
  isRecording: boolean;
  recordingStartTime: number;
  recordedFrames: RecordingFrame[];
  currentRecordingDuration: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  playbackData: RecordingData | null;
  currentFrameIndex: number;
  playbackSpeed: PlaybackSpeed;
  isExporting: boolean;
  exportProgress: number;
}

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export const SPEED_TO_INTERVAL: Record<PlaybackSpeed, number> = {
  0.5: 200,
  1: 100,
  2: 50,
  4: 25,
};

export const MAX_RECORDING_FRAMES = 3000;
export const RECORDING_INTERVAL = 100;
