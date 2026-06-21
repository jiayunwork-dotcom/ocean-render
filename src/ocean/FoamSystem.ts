import * as THREE from 'three';
import type { Ship } from '../store/useAppStore';
import { deg2rad } from '../utils/math';

const MAX_PARTICLES = 2000;
const PARTICLE_LIFETIME = 3;
const WORLD_SIZE = 200;

export class FoamSystem extends THREE.Group {
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private ages: Float32Array;
  private velocities: Float32Array;
  private sizes: Float32Array;
  private particleCount = 0;
  private noiseTexture: THREE.Texture;

  constructor() {
    super();

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.ages = new Float32Array(MAX_PARTICLES);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.noiseTexture = this.createNoiseTexture();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aParticleAge', new THREE.BufferAttribute(this.ages, 1));

    this.material = new THREE.PointsMaterial({
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: this.noiseTexture,
      vertexColors: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.add(this.points);

    this.resetAllParticles();
  }

  private createNoiseTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        let noise = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let octave = 0; octave < 4; octave++) {
          const nx = (x / size) * frequency * 4;
          const ny = (y / size) * frequency * 4;
          noise += this.valueNoise(nx, ny) * amplitude;
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }

        noise = noise / maxValue;
        noise = Math.pow(noise, 1.5);

        const value = Math.floor(noise * 255);
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  private valueNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const aa = this.hash(xi, yi);
    const ab = this.hash(xi, yi + 1);
    const ba = this.hash(xi + 1, yi);
    const bb = this.hash(xi + 1, yi + 1);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const x1 = aa * (1 - u) + ba * u;
    const x2 = ab * (1 - u) + bb * u;

    return x1 * (1 - v) + x2 * v;
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  private resetAllParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.resetParticle(i);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aParticleAge.needsUpdate = true;
  }

  private resetParticle(index: number): void {
    this.ages[index] = 1;
    this.positions[index * 3] = 0;
    this.positions[index * 3 + 1] = -1000;
    this.positions[index * 3 + 2] = 0;
    this.velocities[index * 3] = 0;
    this.velocities[index * 3 + 1] = 0;
    this.velocities[index * 3 + 2] = 0;
    this.sizes[index] = 0;
  }

  private spawnParticle(x: number, z: number, velX: number, velZ: number): void {
    if (this.particleCount >= MAX_PARTICLES) {
      let oldestIdx = 0;
      let oldestAge = -1;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (this.ages[i] > oldestAge) {
          oldestAge = this.ages[i];
          oldestIdx = i;
        }
      }
      this.particleCount = oldestIdx;
    }

    const idx = this.particleCount;
    this.ages[idx] = 0;
    this.positions[idx * 3] = x + (Math.random() - 0.5) * 2;
    this.positions[idx * 3 + 1] = 0.1 + Math.random() * 0.3;
    this.positions[idx * 3 + 2] = z + (Math.random() - 0.5) * 2;
    this.velocities[idx * 3] = velX + (Math.random() - 0.5) * 0.5;
    this.velocities[idx * 3 + 1] = Math.random() * 0.2;
    this.velocities[idx * 3 + 2] = velZ + (Math.random() - 0.5) * 0.5;
    this.sizes[idx] = 0.5 + Math.random() * 1.0;

    this.particleCount++;
  }

  update(
    deltaTime: number,
    oceanFFTResult?: { heightMap?: THREE.DataTexture; gradientMap?: THREE.DataTexture; jacobianMap?: THREE.DataTexture },
    ships?: Ship[]
  ): void {
    const halfWorld = WORLD_SIZE / 2;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.ages[i] < 1) {
        this.ages[i] += deltaTime / PARTICLE_LIFETIME;

        this.positions[i * 3] += this.velocities[i * 3] * deltaTime;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * deltaTime;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * deltaTime;

        this.velocities[i * 3] *= 0.98;
        this.velocities[i * 3 + 1] -= deltaTime * 0.1;
        this.velocities[i * 3 + 2] *= 0.98;

        if (this.ages[i] >= 1) {
          this.resetParticle(i);
        }
      }
    }

    if (ships && ships.length > 0) {
      for (const ship of ships) {
        if (ship.speed > 0.5 && ship.wakeEnabled) {
          const headingRad = deg2rad(ship.heading);
          const forward = new THREE.Vector2(
            Math.sin(headingRad),
            Math.cos(headingRad)
          );
          const perp = new THREE.Vector2(-forward.y, forward.x);

          const spawnCount = Math.min(Math.floor(ship.speed * 3), 15);
          for (let s = 0; s < spawnCount; s++) {
            const offsetBack = -2 - Math.random() * 8;
            const offsetPerp = (Math.random() - 0.5) * 6;

            const spawnX = ship.position.x + forward.x * offsetBack + perp.x * offsetPerp;
            const spawnZ = ship.position.z + forward.y * offsetBack + perp.y * offsetPerp;

            if (spawnX > -halfWorld && spawnX < halfWorld &&
                spawnZ > -halfWorld && spawnZ < halfWorld) {
              this.spawnParticle(
                spawnX,
                spawnZ,
                -forward.x * ship.speed * 0.3,
                -forward.y * ship.speed * 0.3
              );
            }
          }
        }
      }
    }

    const randomSpawnCount = 5;
    for (let s = 0; s < randomSpawnCount; s++) {
      const x = (Math.random() - 0.5) * WORLD_SIZE;
      const z = (Math.random() - 0.5) * WORLD_SIZE;
      this.spawnParticle(x, z, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aParticleAge.needsUpdate = true;
  }

  dispose(): void {
    this.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.noiseTexture.dispose();
  }
}
