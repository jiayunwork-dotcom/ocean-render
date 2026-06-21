import type { SkyPreset, ToneMapping, LODLevel } from '@/store/useAppStore';

const VALID_SKY_PRESETS: SkyPreset[] = ['clear', 'cloudy', 'sunset', 'night'];
const VALID_TONE_MAPPINGS: ToneMapping[] = ['reinhard', 'aces'];
const VALID_LOD_LEVELS: LODLevel[] = ['auto', 'high', 'medium', 'low'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateEnvironment(env: unknown, frameIndex: number, errors: string[]): void {
  const prefix = `Frame ${frameIndex}: environment`;
  if (typeof env !== 'object' || env === null) {
    errors.push(`${prefix} must be an object`);
    return;
  }

  const e = env as Record<string, unknown>;

  if (typeof e.windSpeed !== 'number') errors.push(`${prefix}.windSpeed must be a number`);
  if (typeof e.windDirection !== 'number') errors.push(`${prefix}.windDirection must be a number`);
  if (typeof e.sunAzimuth !== 'number') errors.push(`${prefix}.sunAzimuth must be a number`);
  if (typeof e.sunElevation !== 'number') errors.push(`${prefix}.sunElevation must be a number`);
  if (!VALID_SKY_PRESETS.includes(e.skyPreset as SkyPreset)) {
    errors.push(`${prefix}.skyPreset must be one of: ${VALID_SKY_PRESETS.join(', ')}`);
  }
  if (typeof e.exposure !== 'number') errors.push(`${prefix}.exposure must be a number`);
  if (!VALID_TONE_MAPPINGS.includes(e.toneMapping as ToneMapping)) {
    errors.push(`${prefix}.toneMapping must be one of: ${VALID_TONE_MAPPINGS.join(', ')}`);
  }
}

function validateShips(ships: unknown, frameIndex: number, errors: string[]): void {
  const prefix = `Frame ${frameIndex}: ships`;
  if (!Array.isArray(ships)) {
    errors.push(`${prefix} must be an array`);
    return;
  }

  ships.forEach((ship, idx) => {
    const shipPrefix = `${prefix}[${idx}]`;
    if (typeof ship !== 'object' || ship === null) {
      errors.push(`${shipPrefix} must be an object`);
      return;
    }

    const s = ship as Record<string, unknown>;
    if (typeof s.id !== 'string') errors.push(`${shipPrefix}.id must be a string`);
    if (typeof s.x !== 'number') errors.push(`${shipPrefix}.x must be a number`);
    if (typeof s.z !== 'number') errors.push(`${shipPrefix}.z must be a number`);
    if (typeof s.speed !== 'number') errors.push(`${shipPrefix}.speed must be a number`);
    if (typeof s.heading !== 'number') errors.push(`${shipPrefix}.heading must be a number`);
  });
}

function validateCamera(camera: unknown, frameIndex: number, errors: string[]): void {
  const prefix = `Frame ${frameIndex}: camera`;
  if (typeof camera !== 'object' || camera === null) {
    errors.push(`${prefix} must be an object`);
    return;
  }

  const c = camera as Record<string, unknown>;
  if (typeof c.px !== 'number') errors.push(`${prefix}.px must be a number`);
  if (typeof c.py !== 'number') errors.push(`${prefix}.py must be a number`);
  if (typeof c.pz !== 'number') errors.push(`${prefix}.pz must be a number`);
  if (typeof c.rx !== 'number') errors.push(`${prefix}.rx must be a number`);
  if (typeof c.ry !== 'number') errors.push(`${prefix}.ry must be a number`);
  if (typeof c.rz !== 'number') errors.push(`${prefix}.rz must be a number`);
}

function validateRender(render: unknown, frameIndex: number, errors: string[]): void {
  const prefix = `Frame ${frameIndex}: render`;
  if (typeof render !== 'object' || render === null) {
    errors.push(`${prefix} must be an object`);
    return;
  }

  const r = render as Record<string, unknown>;
  if (!VALID_LOD_LEVELS.includes(r.lodLevel as LODLevel)) {
    errors.push(`${prefix}.lodLevel must be one of: ${VALID_LOD_LEVELS.join(', ')}`);
  }
  if (typeof r.foam !== 'boolean') errors.push(`${prefix}.foam must be a boolean`);
  if (typeof r.wake !== 'boolean') errors.push(`${prefix}.wake must be a boolean`);
  if (typeof r.wireframe !== 'boolean') errors.push(`${prefix}.wireframe must be a boolean`);
}

function validateFrame(frame: unknown, index: number, errors: string[]): void {
  if (typeof frame !== 'object' || frame === null) {
    errors.push(`Frame ${index} must be an object`);
    return;
  }

  const f = frame as Record<string, unknown>;

  if (typeof f.index !== 'number') errors.push(`Frame ${index}: index must be a number`);
  if (typeof f.timestamp !== 'number') errors.push(`Frame ${index}: timestamp must be a number`);

  validateEnvironment(f.environment, index, errors);
  validateShips(f.ships, index, errors);
  validateCamera(f.camera, index, errors);
  validateRender(f.render, index, errors);
}

export function validateRecordingData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Root must be an object'] };
  }

  const d = data as Record<string, unknown>;

  if (d.version !== 1) {
    errors.push('version must be 1');
  }

  if (typeof d.metadata !== 'object' || d.metadata === null) {
    errors.push('metadata must be an object');
  } else {
    const m = d.metadata as Record<string, unknown>;
    if (typeof m.duration !== 'number') errors.push('metadata.duration must be a number');
    if (typeof m.frameCount !== 'number') errors.push('metadata.frameCount must be a number');
    if (typeof m.startTime !== 'number') errors.push('metadata.startTime must be a number');
    if (typeof m.endTime !== 'number') errors.push('metadata.endTime must be a number');
    if (typeof m.createdAt !== 'string') errors.push('metadata.createdAt must be a string');
  }

  if (!Array.isArray(d.frames)) {
    errors.push('frames must be an array');
  } else if (d.frames.length === 0) {
    errors.push('frames array must not be empty');
  } else {
    (d.frames as unknown[]).forEach((frame, idx) => {
      validateFrame(frame, idx, errors);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
