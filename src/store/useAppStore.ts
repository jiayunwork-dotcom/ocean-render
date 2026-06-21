import { create } from 'zustand';
import { deg2rad, clamp } from '../utils/math';

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
}

const MAX_SHIPS = 3;

const generateShipId = (): string => `ship_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
}));
