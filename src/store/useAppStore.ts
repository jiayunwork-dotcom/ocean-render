import { create } from 'zustand';
import { deg2rad, clamp } from '../utils/math';
import type {
  RecordingState,
  PlaybackState,
  RecordingFrame,
  RecordingData,
  PlaybackSpeed,
  RecordingEntry,
  CropState,
  ComparisonState,
} from './recordingTypes';
import { PLAYBACK_SPEEDS } from './recordingTypes';

export type SkyPreset = 'clear' | 'cloudy' | 'sunset' | 'night';
export type ToneMapping = 'reinhard' | 'aces';
export type LODLevel = 'auto' | 'high' | 'medium' | 'low';
export type CameraMode = 'orbit' | 'firstPerson';

export interface EnvironmentState {
  windSpeed: number;
  windDirection: number;
  skyPreset: SkyPreset;
  sunAzimuth: number;
  sunElevation: number;
  exposure: number;
  toneMapping: ToneMapping;
  skyBlendFactor: number;
  skyBlendFrom: SkyPreset;
  skyBlendTo: SkyPreset;
  nightFactor: number;
}

export interface Ship {
  id: string;
  position: { x: number; z: number };
  speed: number;
  heading: number;
  wakeEnabled: boolean;
}

export interface RenderState {
  foamEnabled: boolean;
  wakeEnabled: boolean;
  lodLevel: LODLevel;
  wireframe: boolean;
}

export interface CameraState {
  mode: CameraMode;
}

export interface StatsState {
  fps: number;
  triangles: number;
}

export type TimelineOverrideParam = 'windSpeed' | 'sunAzimuth' | 'sunElevation';

export interface TimelineState {
  timeOfDay: number;
  isPlaying: boolean;
  overriddenParams: Set<TimelineOverrideParam>;
}

export interface AppState {
  environment: EnvironmentState;
  ships: Ship[];
  render: RenderState;
  camera: CameraState;
  stats: StatsState;
  timeline: TimelineState;
  recording: RecordingState;
  playback: PlaybackState;
  recordingLibrary: RecordingEntry[];
  selectedRecordingIds: Set<string>;
  crop: CropState;
  comparison: ComparisonState;

  setWindSpeed: (value: number, fromTimeline?: boolean) => void;
  setWindDirection: (value: number) => void;
  setSkyPreset: (value: SkyPreset) => void;
  setSunAzimuth: (value: number, fromTimeline?: boolean) => void;
  setSunElevation: (value: number, fromTimeline?: boolean) => void;
  setExposure: (value: number) => void;
  setToneMapping: (value: ToneMapping) => void;

  setTimeOfDay: (value: number) => void;
  setTimelinePlaying: (value: boolean) => void;
  setParamOverride: (param: TimelineOverrideParam, overridden: boolean) => void;
  clearAllOverrides: () => void;
  applyTimelineWeather: (windSpeed: number, sunAzimuth: number, sunElevation: number, skyPreset: SkyPreset, skyBlendFactor: number, skyBlendFrom: SkyPreset, skyBlendTo: SkyPreset, nightFactor: number) => void;

  addShip: (ship?: Partial<Ship>) => boolean;
  removeShip: (id: string) => void;
  updateShip: (id: string, partial: Partial<Ship>) => void;
  moveShips: (deltaTime: number) => void;

  setFoamEnabled: (value: boolean) => void;
  setWakeEnabled: (value: boolean) => void;
  setLodLevel: (value: LODLevel) => void;
  setWireframe: (value: boolean) => void;

  setCameraMode: (value: CameraMode) => void;

  setFps: (value: number) => void;
  setTriangles: (value: number) => void;

  startRecording: () => void;
  stopRecording: () => RecordingData | null;
  addRecordingFrame: (frame: RecordingFrame) => boolean;
  setRecordingDuration: (duration: number) => void;

  startPlayback: (data: RecordingData, recordingId?: string) => void;
  stopPlayback: () => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  setPlaybackFrame: (index: number) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;

  addRecordingToLibrary: (data: RecordingData) => string | null;
  removeRecordingFromLibrary: (id: string) => void;
  toggleRecordingSelection: (id: string) => void;
  clearRecordingSelection: () => void;
  getRecordingById: (id: string) => RecordingEntry | undefined;
  renameRecording: (id: string, name: string) => void;
  mergeRecordings: (firstId: string, secondId: string) => string | null;
  startPlaybackById: (id: string) => void;

  startCropping: (recordingId: string) => void;
  setCropStart: (frame: number) => void;
  setCropEnd: (frame: number) => void;
  applyCrop: () => boolean;
  cancelCrop: () => void;

  startComparison: (leftId: string, rightId: string) => void;
  stopComparison: () => void;
  setComparisonPlaying: (playing: boolean) => void;
  setComparisonFrame: (index: number) => void;
}

const MAX_SHIPS = 3;
const MAX_RECORDINGS = 5;

const generateShipId = (): string => `ship_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const generateRecordingId = (): string => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useAppStore = create<AppState>((set, get) => ({
  environment: {
    windSpeed: 10,
    windDirection: 45,
    skyPreset: 'clear',
    sunAzimuth: 180,
    sunElevation: 45,
    exposure: 0,
    toneMapping: 'aces',
    skyBlendFactor: 0,
    skyBlendFrom: 'clear',
    skyBlendTo: 'clear',
    nightFactor: 0,
  },
  ships: [],
  render: {
    foamEnabled: true,
    wakeEnabled: true,
    lodLevel: 'auto',
    wireframe: false,
  },
  camera: {
    mode: 'orbit',
  },
  stats: {
    fps: 0,
    triangles: 0,
  },
  timeline: {
    timeOfDay: 12,
    isPlaying: false,
    overriddenParams: new Set<TimelineOverrideParam>(),
  },
  recording: {
    isRecording: false,
    recordingStartTime: 0,
    recordedFrames: [],
    currentRecordingDuration: 0,
  },
  playback: {
    isPlaying: false,
    isPaused: false,
    playbackData: null,
    playbackRecordingId: null,
    currentFrameIndex: 0,
    playbackSpeed: 1,
    isExporting: false,
    exportProgress: 0,
  },
  recordingLibrary: [],
  selectedRecordingIds: new Set<string>(),
  crop: {
    isCropping: false,
    recordingId: null,
    startFrame: 0,
    endFrame: 0,
  },
  comparison: {
    isComparing: false,
    leftRecordingId: null,
    rightRecordingId: null,
    isPlaying: false,
    currentFrameIndex: 0,
    totalFrames: 0,
  },

  setWindSpeed: (value, fromTimeline = false) =>
    set((state) => {
      if (!fromTimeline && state.timeline.isPlaying) {
        const newOverrides = new Set(state.timeline.overriddenParams);
        newOverrides.add('windSpeed');
        return {
          environment: { ...state.environment, windSpeed: clamp(value, 1, 30) },
          timeline: { ...state.timeline, overriddenParams: newOverrides },
        };
      }
      return { environment: { ...state.environment, windSpeed: clamp(value, 1, 30) } };
    }),

  setWindDirection: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        windDirection: ((value % 360) + 360) % 360,
      },
    })),

  setSkyPreset: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        skyPreset: value,
      },
    })),

  setSunAzimuth: (value, fromTimeline = false) =>
    set((state) => {
      if (!fromTimeline && state.timeline.isPlaying) {
        const newOverrides = new Set(state.timeline.overriddenParams);
        newOverrides.add('sunAzimuth');
        return {
          environment: { ...state.environment, sunAzimuth: ((value % 360) + 360) % 360 },
          timeline: { ...state.timeline, overriddenParams: newOverrides },
        };
      }
      return { environment: { ...state.environment, sunAzimuth: ((value % 360) + 360) % 360 } };
    }),

  setSunElevation: (value, fromTimeline = false) =>
    set((state) => {
      if (!fromTimeline && state.timeline.isPlaying) {
        const newOverrides = new Set(state.timeline.overriddenParams);
        newOverrides.add('sunElevation');
        return {
          environment: { ...state.environment, sunElevation: clamp(value, -30, 90) },
          timeline: { ...state.timeline, overriddenParams: newOverrides },
        };
      }
      return { environment: { ...state.environment, sunElevation: clamp(value, -30, 90) } };
    }),

  setExposure: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        exposure: clamp(value, -2, 2),
      },
    })),

  setToneMapping: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        toneMapping: value,
      },
    })),

  setTimeOfDay: (value) =>
    set((state) => ({
      timeline: { ...state.timeline, timeOfDay: ((value % 24) + 24) % 24 },
    })),

  setTimelinePlaying: (value) =>
    set((state) => ({
      timeline: { ...state.timeline, isPlaying: value },
    })),

  setParamOverride: (param, overridden) =>
    set((state) => {
      const newOverrides = new Set(state.timeline.overriddenParams);
      if (overridden) {
        newOverrides.add(param);
      } else {
        newOverrides.delete(param);
      }
      return { timeline: { ...state.timeline, overriddenParams: newOverrides } };
    }),

  clearAllOverrides: () =>
    set((state) => ({
      timeline: { ...state.timeline, overriddenParams: new Set<TimelineOverrideParam>() },
    })),

  applyTimelineWeather: (windSpeed, sunAzimuth, sunElevation, skyPreset, skyBlendFactor, skyBlendFrom, skyBlendTo, nightFactor) =>
    set((state) => {
      const env = { ...state.environment };
      if (!state.timeline.overriddenParams.has('windSpeed')) {
        env.windSpeed = clamp(windSpeed, 1, 30);
      }
      if (!state.timeline.overriddenParams.has('sunAzimuth')) {
        env.sunAzimuth = ((sunAzimuth % 360) + 360) % 360;
      }
      if (!state.timeline.overriddenParams.has('sunElevation')) {
        env.sunElevation = clamp(sunElevation, -30, 90);
      }
      env.skyPreset = skyPreset;
      env.skyBlendFactor = skyBlendFactor;
      env.skyBlendFrom = skyBlendFrom;
      env.skyBlendTo = skyBlendTo;
      env.nightFactor = nightFactor;
      return { environment: env };
    }),

  addShip: (ship) => {
    const currentShips = get().ships;
    if (currentShips.length >= MAX_SHIPS) return false;

    const newShip: Ship = {
      id: ship?.id ?? generateShipId(),
      position: ship?.position ?? { x: -30, z: 0 },
      speed: ship?.speed ?? 8,
      heading: ship?.heading ?? 90,
      wakeEnabled: ship?.wakeEnabled ?? true,
    };

    set({ ships: [...currentShips, newShip] });
    return true;
  },

  removeShip: (id) =>
    set((state) => ({
      ships: state.ships.filter((s) => s.id !== id),
    })),

  updateShip: (id, partial) =>
    set((state) => ({
      ships: state.ships.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...partial };
        if (partial.speed !== undefined) updated.speed = clamp(partial.speed, 0, 20);
        if (partial.heading !== undefined) updated.heading = ((partial.heading % 360) + 360) % 360;
        return updated;
      }),
    })),

  moveShips: (deltaTime) =>
    set((state) => ({
      ships: state.ships.map((ship) => {
        if (ship.speed === 0) return ship;
        const headingRad = deg2rad(ship.heading);
        const distance = ship.speed * deltaTime;
        return {
          ...ship,
          position: {
            x: ship.position.x + Math.sin(headingRad) * distance,
            z: ship.position.z + Math.cos(headingRad) * distance,
          },
        };
      }),
    })),

  setFoamEnabled: (value) =>
    set((state) => ({
      render: {
        ...state.render,
        foamEnabled: value,
      },
    })),

  setWakeEnabled: (value) =>
    set((state) => ({
      render: {
        ...state.render,
        wakeEnabled: value,
      },
    })),

  setLodLevel: (value) =>
    set((state) => ({
      render: {
        ...state.render,
        lodLevel: value,
      },
    })),

  setWireframe: (value) =>
    set((state) => ({
      render: {
        ...state.render,
        wireframe: value,
      },
    })),

  setCameraMode: (value) =>
    set({
      camera: { mode: value },
    }),

  setFps: (value) =>
    set((state) => ({
      stats: {
        ...state.stats,
        fps: value,
      },
    })),

  setTriangles: (value) =>
    set((state) => ({
      stats: {
        ...state.stats,
        triangles: value,
      },
    })),

  startRecording: () =>
    set({
      recording: {
        isRecording: true,
        recordingStartTime: Date.now(),
        recordedFrames: [],
        currentRecordingDuration: 0,
      },
    }),

  stopRecording: () => {
    const state = get();
    if (!state.recording.isRecording || state.recording.recordedFrames.length === 0) {
      set({
        recording: {
          isRecording: false,
          recordingStartTime: 0,
          recordedFrames: [],
          currentRecordingDuration: 0,
        },
      });
      return null;
    }

    const frames = state.recording.recordedFrames;
    const firstFrame = frames[0];
    const lastFrame = frames[frames.length - 1];

    const recordingData: RecordingData = {
      version: 1,
      metadata: {
        duration: lastFrame.timestamp - firstFrame.timestamp,
        frameCount: frames.length,
        startTime: firstFrame.timestamp,
        endTime: lastFrame.timestamp,
        createdAt: new Date().toISOString(),
      },
      frames,
    };

    set({
      recording: {
        isRecording: false,
        recordingStartTime: 0,
        recordedFrames: [],
        currentRecordingDuration: 0,
      },
    });

    return recordingData;
  },

  addRecordingFrame: (frame) => {
    const state = get();
    if (!state.recording.isRecording) return false;
    if (state.recording.recordedFrames.length >= 3000) {
      return false;
    }
    set((s) => ({
      recording: {
        ...s.recording,
        recordedFrames: [...s.recording.recordedFrames, frame],
      },
    }));
    return true;
  },

  setRecordingDuration: (duration) =>
    set((state) => ({
      recording: {
        ...state.recording,
        currentRecordingDuration: duration,
      },
    })),

  startPlayback: (data, recordingId) =>
    set({
      playback: {
        isPlaying: true,
        isPaused: false,
        playbackData: data,
        playbackRecordingId: recordingId ?? null,
        currentFrameIndex: 0,
        playbackSpeed: 1,
        isExporting: false,
        exportProgress: 0,
      },
    }),

  stopPlayback: () =>
    set({
      playback: {
        isPlaying: false,
        isPaused: false,
        playbackData: null,
        playbackRecordingId: null,
        currentFrameIndex: 0,
        playbackSpeed: 1,
        isExporting: false,
        exportProgress: 0,
      },
    }),

  pausePlayback: () =>
    set((state) => ({
      playback: {
        ...state.playback,
        isPaused: true,
      },
    })),

  resumePlayback: () =>
    set((state) => ({
      playback: {
        ...state.playback,
        isPaused: false,
      },
    })),

  setPlaybackFrame: (index) =>
    set((state) => ({
      playback: {
        ...state.playback,
        currentFrameIndex: Math.max(0, Math.min(index, state.playback.playbackData?.frames.length ? state.playback.playbackData.frames.length - 1 : 0)),
      },
    })),

  setPlaybackSpeed: (speed) =>
    set((state) => ({
      playback: {
        ...state.playback,
        playbackSpeed: PLAYBACK_SPEEDS.includes(speed) ? speed : state.playback.playbackSpeed,
      },
    })),

  setExporting: (exporting) =>
    set((state) => ({
      playback: {
        ...state.playback,
        isExporting: exporting,
        exportProgress: exporting ? 0 : state.playback.exportProgress,
      },
    })),

  setExportProgress: (progress) =>
    set((state) => ({
      playback: {
        ...state.playback,
        exportProgress: Math.max(0, Math.min(100, progress)),
      },
    })),

  addRecordingToLibrary: (data) => {
    const state = get();
    if (state.recordingLibrary.length >= MAX_RECORDINGS) {
      return null;
    }
    const id = generateRecordingId();
    const entry: RecordingEntry = { id, data };
    set({ recordingLibrary: [...state.recordingLibrary, entry] });
    return id;
  },

  removeRecordingFromLibrary: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedRecordingIds);
      newSelected.delete(id);
      const wasPlaying = state.playback.playbackRecordingId === id;
      return {
        recordingLibrary: state.recordingLibrary.filter((r) => r.id !== id),
        selectedRecordingIds: newSelected,
        playback: wasPlaying
          ? {
              isPlaying: false,
              isPaused: false,
              playbackData: null,
              playbackRecordingId: null,
              currentFrameIndex: 0,
              playbackSpeed: 1,
              isExporting: false,
              exportProgress: 0,
            }
          : state.playback,
        crop:
          state.crop.recordingId === id
            ? { isCropping: false, recordingId: null, startFrame: 0, endFrame: 0 }
            : state.crop,
        comparison:
          state.comparison.leftRecordingId === id || state.comparison.rightRecordingId === id
            ? {
                isComparing: false,
                leftRecordingId: null,
                rightRecordingId: null,
                isPlaying: false,
                currentFrameIndex: 0,
                totalFrames: 0,
              }
            : state.comparison,
      };
    }),

  toggleRecordingSelection: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedRecordingIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedRecordingIds: newSelected };
    }),

  clearRecordingSelection: () => set({ selectedRecordingIds: new Set() }),

  getRecordingById: (id) => get().recordingLibrary.find((r) => r.id === id),

  renameRecording: (id, name) =>
    set((state) => ({
      recordingLibrary: state.recordingLibrary.map((r) =>
        r.id === id
          ? { ...r, data: { ...r.data, metadata: { ...r.data.metadata, name } } }
          : r
      ),
    })),

  mergeRecordings: (firstId, secondId) => {
    const state = get();
    const first = state.recordingLibrary.find((r) => r.id === firstId);
    const second = state.recordingLibrary.find((r) => r.id === secondId);
    if (!first || !second) return null;

    const firstFrames = first.data.frames;
    const secondFrames = second.data.frames;
    const baseTimestamp = firstFrames[0].timestamp;
    const firstEndTimestamp = firstFrames[firstFrames.length - 1].timestamp;
    const timeOffset = firstEndTimestamp - baseTimestamp + 100;

    const mergedFrames: RecordingFrame[] = [
      ...firstFrames.map((f, i) => ({ ...f, index: i, timestamp: f.timestamp - baseTimestamp })),
      ...secondFrames.map((f, i) => ({
        ...f,
        index: firstFrames.length + i,
        timestamp: f.timestamp - secondFrames[0].timestamp + timeOffset,
      })),
    ];

    const lastFrame = mergedFrames[mergedFrames.length - 1];
    const mergedData: RecordingData = {
      version: 1,
      metadata: {
        duration: lastFrame.timestamp,
        frameCount: mergedFrames.length,
        startTime: baseTimestamp,
        endTime: baseTimestamp + lastFrame.timestamp,
        createdAt: new Date().toISOString(),
      },
      frames: mergedFrames,
    };

    const newId = generateRecordingId();
    const newEntry: RecordingEntry = { id: newId, data: mergedData };

    set((s) => ({
      recordingLibrary: [...s.recordingLibrary.filter((r) => r.id !== firstId && r.id !== secondId), newEntry],
      selectedRecordingIds: new Set(),
    }));

    return newId;
  },

  startPlaybackById: (id) => {
    const entry = get().recordingLibrary.find((r) => r.id === id);
    if (!entry) return;
    get().startPlayback(entry.data, id);
  },

  startCropping: (recordingId) => {
    const entry = get().recordingLibrary.find((r) => r.id === recordingId);
    if (!entry) return;
    const frameCount = entry.data.frames.length;
    set({
      crop: {
        isCropping: true,
        recordingId,
        startFrame: 0,
        endFrame: frameCount - 1,
      },
    });
  },

  setCropStart: (frame) =>
    set((state) => {
      if (!state.crop.isCropping) return state;
      const entry = state.recordingLibrary.find((r) => r.id === state.crop.recordingId);
      if (!entry) return state;
      const maxEnd = state.crop.endFrame - 1;
      return {
        crop: {
          ...state.crop,
          startFrame: Math.max(0, Math.min(frame, maxEnd)),
        },
      };
    }),

  setCropEnd: (frame) =>
    set((state) => {
      if (!state.crop.isCropping) return state;
      const entry = state.recordingLibrary.find((r) => r.id === state.crop.recordingId);
      if (!entry) return state;
      const maxEnd = entry.data.frames.length - 1;
      const minStart = state.crop.startFrame + 1;
      return {
        crop: {
          ...state.crop,
          endFrame: Math.max(minStart, Math.min(frame, maxEnd)),
        },
      };
    }),

  applyCrop: () => {
    const state = get();
    if (!state.crop.isCropping || !state.crop.recordingId) return false;
    const entry = state.recordingLibrary.find((r) => r.id === state.crop.recordingId);
    if (!entry) return false;

    const { startFrame, endFrame } = state.crop;
    const croppedFrames = entry.data.frames.slice(startFrame, endFrame + 1);
    const firstOrigTs = croppedFrames[0].timestamp;
    const renumberedFrames = croppedFrames.map((f, i) => ({
      ...f,
      index: i,
      timestamp: f.timestamp - firstOrigTs,
    }));

    const lastFrame = renumberedFrames[renumberedFrames.length - 1];
    const newData: RecordingData = {
      ...entry.data,
      metadata: {
        ...entry.data.metadata,
        duration: lastFrame.timestamp,
        frameCount: renumberedFrames.length,
      },
      frames: renumberedFrames,
    };

    const wasPlaying = state.playback.playbackRecordingId === state.crop.recordingId;

    set((s) => ({
      recordingLibrary: s.recordingLibrary.map((r) =>
        r.id === state.crop.recordingId ? { ...r, data: newData } : r
      ),
      crop: { isCropping: false, recordingId: null, startFrame: 0, endFrame: 0 },
      playback: wasPlaying
        ? {
            ...s.playback,
            playbackData: newData,
            currentFrameIndex: 0,
          }
        : s.playback,
    }));

    return true;
  },

  cancelCrop: () =>
    set({
      crop: { isCropping: false, recordingId: null, startFrame: 0, endFrame: 0 },
    }),

  startComparison: (leftId, rightId) => {
    const state = get();
    const left = state.recordingLibrary.find((r) => r.id === leftId);
    const right = state.recordingLibrary.find((r) => r.id === rightId);
    if (!left || !right) return;
    const totalFrames = Math.min(left.data.frames.length, right.data.frames.length);
    set({
      comparison: {
        isComparing: true,
        leftRecordingId: leftId,
        rightRecordingId: rightId,
        isPlaying: false,
        currentFrameIndex: 0,
        totalFrames,
      },
    });
  },

  stopComparison: () =>
    set({
      comparison: {
        isComparing: false,
        leftRecordingId: null,
        rightRecordingId: null,
        isPlaying: false,
        currentFrameIndex: 0,
        totalFrames: 0,
      },
    }),

  setComparisonPlaying: (playing) =>
    set((state) => ({
      comparison: { ...state.comparison, isPlaying: playing },
    })),

  setComparisonFrame: (index) =>
    set((state) => ({
      comparison: {
        ...state.comparison,
        currentFrameIndex: Math.max(0, Math.min(index, state.comparison.totalFrames - 1)),
      },
    })),
}));
