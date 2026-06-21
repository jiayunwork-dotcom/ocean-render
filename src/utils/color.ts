export type RGB = { r: number; g: number; b: number };

export const hsvToRgb = (h: number, s: number, v: number): RGB => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: r + m,
    g: g + m,
    b: b + m,
  };
};

export const reinhardToneMapping = (color: RGB): RGB => ({
  r: color.r / (1 + color.r),
  g: color.g / (1 + color.g),
  b: color.b / (1 + color.b),
});

export const acesToneMapping = (color: RGB): RGB => {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;

  const aces = (x: number) => (x * (a * x + b)) / (x * (c * x + d) + e);

  return {
    r: aces(color.r),
    g: aces(color.g),
    b: aces(color.b),
  };
};

export const applyExposure = (color: RGB, exposure: number): RGB => {
  const scale = Math.pow(2, exposure);
  return {
    r: color.r * scale,
    g: color.g * scale,
    b: color.b * scale,
  };
};
