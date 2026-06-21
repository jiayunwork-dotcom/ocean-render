import * as THREE from 'three';
import type { SkyPreset } from '../store/useAppStore';
import { deg2rad } from '../utils/math';
import skyVertexShader from '../shaders/sky.vert.glsl';
import skyFragmentShader from '../shaders/sky.frag.glsl';

interface SkyPresetColors {
  horizonTop: THREE.Color;
  horizonBottom: THREE.Color;
  zenith: THREE.Color;
  sun: THREE.Color;
  sunGlow: THREE.Color;
  cloudColor: THREE.Color;
  cloudAmount: number;
}

const PRESET_COLORS: Record<SkyPreset, SkyPresetColors> = {
  clear: {
    horizonTop: new THREE.Color(0x6fb3ff),
    horizonBottom: new THREE.Color(0xbfe0ff),
    zenith: new THREE.Color(0x1e5799),
    sun: new THREE.Color(0xfff8dc),
    sunGlow: new THREE.Color(0xfff0c0),
    cloudColor: new THREE.Color(0xffffff),
    cloudAmount: 0.25,
  },
  cloudy: {
    horizonTop: new THREE.Color(0x9aa4b2),
    horizonBottom: new THREE.Color(0xc0c8d0),
    zenith: new THREE.Color(0x5a6270),
    sun: new THREE.Color(0xe8e8e8),
    sunGlow: new THREE.Color(0xd0d0d0),
    cloudColor: new THREE.Color(0xe8ecf0),
    cloudAmount: 0.8,
  },
  sunset: {
    horizonTop: new THREE.Color(0xff7040),
    horizonBottom: new THREE.Color(0xffa060),
    zenith: new THREE.Color(0x2a1040),
    sun: new THREE.Color(0xff8030),
    sunGlow: new THREE.Color(0xff5020),
    cloudColor: new THREE.Color(0xff8060),
    cloudAmount: 0.4,
  },
  night: {
    horizonTop: new THREE.Color(0x0a0a2e),
    horizonBottom: new THREE.Color(0x101035),
    zenith: new THREE.Color(0x020210),
    sun: new THREE.Color(0xc0c8e0),
    sunGlow: new THREE.Color(0x4040a0),
    cloudColor: new THREE.Color(0x151530),
    cloudAmount: 0.15,
  },
};

const CUBE_FACES = [
  { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), name: 'px' },
  { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), name: 'nx' },
  { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), name: 'py' },
  { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), name: 'ny' },
  { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), name: 'pz' },
  { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), name: 'nz' },
];

export class SkyMaterial extends THREE.ShaderMaterial {
  constructor(preset: SkyPreset = 'clear') {
    super({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        uSunElevation: { value: 0.7 },
        uPreset: { value: preset === 'clear' ? 0 : preset === 'cloudy' ? 1 : preset === 'sunset' ? 2 : 3 },
        uPresetTo: { value: 0 },
        uPresetBlend: { value: 0 },
        uTime: { value: 0 },
      },
    });
  }

  updateSunDirection(azimuth: number, elevation: number): void {
    const azimuthRad = deg2rad(azimuth);
    const elevationRad = deg2rad(elevation);
    const sunDir = new THREE.Vector3(
      Math.cos(elevationRad) * Math.sin(azimuthRad),
      Math.sin(elevationRad),
      Math.cos(elevationRad) * Math.cos(azimuthRad)
    ).normalize();
    (this.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir);
    this.uniforms.uSunElevation.value = Math.sin(elevationRad);
  }

  updateTime(time: number): void {
    this.uniforms.uTime.value = time;
  }

  setPreset(preset: SkyPreset): void {
    this.uniforms.uPreset.value =
      preset === 'clear' ? 0 : preset === 'cloudy' ? 1 : preset === 'sunset' ? 2 : 3;
  }

  setBlend(presetTo: SkyPreset, blendFactor: number): void {
    this.uniforms.uPresetTo.value =
      presetTo === 'clear' ? 0 : presetTo === 'cloudy' ? 1 : presetTo === 'sunset' ? 2 : 3;
    this.uniforms.uPresetBlend.value = blendFactor;
  }
}

export class SkyGenerator {
  static generate(preset: SkyPreset = 'clear'): THREE.CubeTexture {
    const faceSize = 512;
    const textures: THREE.Texture[] = [];
    const colors = PRESET_COLORS[preset];

    const sunAzimuth = preset === 'sunset' ? Math.PI * 0.8 : Math.PI * 0.25;
    const sunElevation = preset === 'sunset' ? 0.1 : preset === 'cloudy' ? 0.4 : 0.7;
    const sunDir = new THREE.Vector3(
      Math.cos(sunElevation) * Math.cos(sunAzimuth),
      Math.sin(sunElevation),
      Math.cos(sunElevation) * Math.sin(sunAzimuth)
    ).normalize();

    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
      const face = CUBE_FACES[faceIndex];
      const canvas = document.createElement('canvas');
      canvas.width = faceSize;
      canvas.height = faceSize;
      const ctx = canvas.getContext('2d')!;

      const imageData = ctx.createImageData(faceSize, faceSize);
      const data = imageData.data;

      const right = new THREE.Vector3().crossVectors(face.up, face.dir).normalize();
      const actualUp = new THREE.Vector3().crossVectors(face.dir, right).normalize();

      for (let y = 0; y < faceSize; y++) {
        for (let x = 0; x < faceSize; x++) {
          const u = (x / (faceSize - 1)) * 2 - 1;
          const v = (y / (faceSize - 1)) * 2 - 1;

          const dir = new THREE.Vector3()
            .copy(face.dir)
            .addScaledVector(right, u)
            .addScaledVector(actualUp, -v)
            .normalize();

          const pixelColor = SkyGenerator.renderSkyPixel(dir, sunDir, colors, preset);

          const idx = (y * faceSize + x) * 4;
          data[idx] = Math.floor(pixelColor.r * 255);
          data[idx + 1] = Math.floor(pixelColor.g * 255);
          data[idx + 2] = Math.floor(pixelColor.b * 255);
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      textures.push(texture);
    }

    const cubeTexture = new THREE.CubeTexture(textures.map(t => t.image));
    cubeTexture.needsUpdate = true;
    cubeTexture.format = THREE.RGBAFormat;

    return cubeTexture;
  }

  private static renderSkyPixel(
    dir: THREE.Vector3,
    sunDir: THREE.Vector3,
    colors: SkyPresetColors,
    preset: SkyPreset
  ): THREE.Color {
    const result = new THREE.Color();

    const heightFactor = Math.max(0, dir.y);
    const horizonFactor = 1 - heightFactor;

    const horizonColor = new THREE.Color().lerpColors(
      colors.horizonBottom,
      colors.horizonTop,
      heightFactor * 2
    );
    result.lerpColors(horizonColor, colors.zenith, Math.pow(heightFactor, 0.5));

    const sunDot = Math.max(0, dir.dot(sunDir));
    const sunDisc = Math.pow(sunDot, 256) * 2;
    const sunGlow = Math.pow(sunDot, 8) * 0.5;

    const sunContrib = new THREE.Color().copy(colors.sun).multiplyScalar(sunDisc);
    const glowContrib = new THREE.Color().copy(colors.sunGlow).multiplyScalar(sunGlow);
    result.add(sunContrib).add(glowContrib);

    if (preset !== 'sunset' && colors.cloudAmount > 0 && dir.y > 0) {
      const cloudUv = new THREE.Vector2(dir.x, dir.z).divideScalar(Math.max(dir.y, 0.1)).multiplyScalar(0.5);
      const clouds = SkyGenerator.cloudNoise(cloudUv) * colors.cloudAmount;
      const cloudAlpha = clouds * Math.pow(heightFactor, 0.3);
      const cloudCol = new THREE.Color().copy(colors.cloudColor);
      result.lerp(cloudCol, cloudAlpha);
    }

    if (preset === 'sunset') {
      const hazeColor = new THREE.Color(0xff4020);
      result.lerp(hazeColor, Math.pow(horizonFactor, 3) * 0.5);
    }

    result.r = Math.min(1, result.r);
    result.g = Math.min(1, result.g);
    result.b = Math.min(1, result.b);

    return result;
  }

  private static hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  private static valueNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const aa = SkyGenerator.hash(xi, yi);
    const ab = SkyGenerator.hash(xi, yi + 1);
    const ba = SkyGenerator.hash(xi + 1, yi);
    const bb = SkyGenerator.hash(xi + 1, yi + 1);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const x1 = aa * (1 - u) + ba * u;
    const x2 = ab * (1 - u) + bb * u;

    return x1 * (1 - v) + x2 * v;
  }

  private static cloudNoise(uv: THREE.Vector2): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for (let i = 0; i < 5; i++) {
      value += amplitude * SkyGenerator.valueNoise(uv.x * frequency, uv.y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }

    value = (value - 0.3) / 0.7;
    return Math.max(0, Math.min(1, value));
  }

  static generateSkyDomeMaterial(preset: SkyPreset = 'clear'): SkyMaterial {
    return new SkyMaterial(preset);
  }

  static generateSkyDome(preset: SkyPreset = 'clear'): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(5000, 32, 16);
    const material = SkyGenerator.generateSkyDomeMaterial(preset);
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }
}
