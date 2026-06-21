import type { SkyPreset } from '../store/useAppStore';

export interface WeatherParams {
  windSpeed: number;
  sunAzimuth: number;
  sunElevation: number;
  skyPreset: SkyPreset;
  skyBlendFactor: number;
  skyBlendFrom: SkyPreset;
  skyBlendTo: SkyPreset;
  nightFactor: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function nightWindSpeed(hour: number): number {
  return 4 + Math.sin(hour * 0.8) * 1;
}

function daytimeWindSpeed(hour: number): number {
  const t = (hour - 7) / 10;
  return 11.5 + 3.5 * Math.sin(t * Math.PI * 2);
}

function daytimeSunElevation(hour: number): number {
  const noon = 12;
  const halfSpan = 5;
  const t = (hour - noon) / halfSpan;
  return 15 + 60 * (1 - t * t);
}

export function getWeatherParams(hour: number): WeatherParams {
  const h = ((hour % 24) + 24) % 24;

  if (h < 5) {
    const nightProgress = h / 5;
    const nightWind = nightWindSpeed(h);
    return {
      windSpeed: nightWind,
      sunAzimuth: lerp(315, 90, nightProgress),
      sunElevation: -15 + h * 3,
      skyPreset: 'night',
      skyBlendFactor: 0,
      skyBlendFrom: 'night',
      skyBlendTo: 'night',
      nightFactor: 1.0,
    };
  }

  if (h < 7) {
    const t = smoothstep(5, 7, h);
    const windFrom = nightWindSpeed(5);
    const windTo = 8;
    return {
      windSpeed: lerp(windFrom, windTo, t),
      sunAzimuth: lerp(90, 105, t),
      sunElevation: lerp(0, 15, t),
      skyPreset: 'sunset',
      skyBlendFactor: t,
      skyBlendFrom: 'night',
      skyBlendTo: 'sunset',
      nightFactor: 1.0 - t,
    };
  }

  if (h < 17) {
    const dayProgress = (h - 7) / 10;
    const azimuth = lerp(90, 270, dayProgress);
    const elevation = daytimeSunElevation(h);
    const wind = daytimeWindSpeed(h);
    return {
      windSpeed: wind,
      sunAzimuth: azimuth,
      sunElevation: elevation,
      skyPreset: 'clear',
      skyBlendFactor: 0,
      skyBlendFrom: 'clear',
      skyBlendTo: 'clear',
      nightFactor: 0,
    };
  }

  if (h < 19) {
    const t = smoothstep(17, 19, h);
    const windFrom = daytimeWindSpeed(17);
    const windTo = 5;
    return {
      windSpeed: lerp(windFrom, windTo, t),
      sunAzimuth: 270,
      sunElevation: lerp(15, 0, t),
      skyPreset: 'sunset',
      skyBlendFactor: t,
      skyBlendFrom: 'clear',
      skyBlendTo: 'sunset',
      nightFactor: 0,
    };
  }

  const nightT = smoothstep(19, 21, h);
  const windFrom = 5;
  const windTo = nightWindSpeed(21);
  const nightWind = nightWindSpeed(h);
  return {
    windSpeed: h < 21 ? lerp(windFrom, windTo, nightT) : nightWind,
    sunAzimuth: lerp(270, 315, nightT),
    sunElevation: lerp(0, -15, nightT),
    skyPreset: 'night',
    skyBlendFactor: nightT,
    skyBlendFrom: 'sunset',
    skyBlendTo: 'night',
    nightFactor: nightT,
  };
}

export function formatTime(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hours = Math.floor(h);
  const minutes = Math.floor((h - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
