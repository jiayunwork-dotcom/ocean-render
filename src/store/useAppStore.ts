import { create } from 'zustand';
import { deg2rad, clamp } from '../utils/math';

export type SkyPreset = 'clear' | 'cloudy' | 'sunset';
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

export interface AppState {
  environment: EnvironmentState;
  ships: Ship[];
  render: RenderState;
  camera: CameraState;
  stats: StatsState;

  setWindSpeed: (value: number) => void;
  setWindDirection: (value: number) => void;
  setSkyPreset: (value: SkyPreset) => void;
  setSunAzimuth: (value: number) => void;
  setSunElevation: (value: number) => void;
  setExposure: (value: number) => void;
  setToneMapping: (value: ToneMapping) => void;

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

  setWindSpeed: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        windSpeed: clamp(value, 1, 30),
      },
    })),

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

  setSunAzimuth: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        sunAzimuth: ((value % 360) + 360) % 360,
      },
    })),

  setSunElevation: (value) =>
    set((state) => ({
      environment: {
        ...state.environment,
        sunElevation: clamp(value, 0, 90),
      },
    })),

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
