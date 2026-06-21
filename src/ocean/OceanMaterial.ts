import * as THREE from 'three';
import oceanVertShader from '../shaders/ocean.vert.glsl';
import oceanFragShader from '../shaders/ocean.frag.glsl';
import type { Ship, EnvironmentState, RenderState } from '../store/useAppStore';
import { deg2rad } from '../utils/math';

interface OceanMaterialParams {
  environment: EnvironmentState;
  render: RenderState;
}

export class OceanMaterial extends THREE.ShaderMaterial {
  constructor(
    heightMap: THREE.DataTexture,
    gradientMap: THREE.DataTexture,
    jacobianMap: THREE.DataTexture,
    envMap: THREE.CubeTexture,
    params: OceanMaterialParams
  ) {
    super({
      vertexShader: oceanVertShader,
      fragmentShader: oceanFragShader,
      transparent: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 200 },
        uChoppyFactor: { value: 1.0 },
        uDisplacementScale: { value: 1.0 },
        uHeightMap: { value: heightMap },
        uGradientMap: { value: gradientMap },
        uJacobianMap: { value: jacobianMap },
        uEnvMap: { value: envMap },
        uDeepColor: { value: new THREE.Color(0x001a33) },
        uShallowColor: { value: new THREE.Color(0x006994) },
        uFoamColor: { value: new THREE.Color(0xffffff) },
        uScatteringColor: { value: new THREE.Color(0x1a4d33) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xffffff) },
        uCameraPos: { value: new THREE.Vector3() },
        uFresnelPower: { value: 5.0 },
        uRoughness: { value: 0.15 },
        uExposure: { value: 1.0 },
        uToneMapping: { value: 1 },
        uFoamEnabled: { value: params.render.foamEnabled },
        uWakeEnabled: { value: params.render.wakeEnabled },
        uShipCount: { value: 0 },
        uShipPositions: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] },
        uShipHeadings: { value: [0, 0, 0] },
        uShipSpeeds: { value: [0, 0, 0] },
        uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
        uMoonColor: { value: new THREE.Color(0xc0c8e0) },
        uNightFactor: { value: 0 },
      },
    });
  }

  update(
    time: number,
    sunDir: THREE.Vector3,
    sunColor: THREE.Color,
    cameraPos: THREE.Vector3,
    ships: Ship[],
    windSpeed: number,
    nightFactor: number = 0
  ): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uSunDir.value.copy(sunDir);
    this.uniforms.uSunColor.value.copy(sunColor);
    this.uniforms.uCameraPos.value.copy(cameraPos);

    const windFactor = Math.max(windSpeed / 10, 0.5);
    this.uniforms.uDisplacementScale.value = 0.5 + windFactor * 1.5;
    this.uniforms.uChoppyFactor.value = 0.5 + windFactor * 0.8;

    this.uniforms.uShipCount.value = Math.min(ships.length, 3);

    for (let i = 0; i < 3; i++) {
      if (i < ships.length) {
        const ship = ships[i];
        this.uniforms.uShipPositions.value[i].set(ship.position.x, ship.position.z);
        this.uniforms.uShipHeadings.value[i] = deg2rad(ship.heading);
        this.uniforms.uShipSpeeds.value[i] = ship.speed;
      } else {
        this.uniforms.uShipPositions.value[i].set(0, 0);
        this.uniforms.uShipHeadings.value[i] = 0;
        this.uniforms.uShipSpeeds.value[i] = 0;
      }
    }

    const moonDir = new THREE.Vector3(-sunDir.x, Math.max(-sunDir.y, 0.3), -sunDir.z).normalize();
    (this.uniforms.uMoonDir.value as THREE.Vector3).copy(moonDir);
    this.uniforms.uNightFactor.value = nightFactor;
  }
}
