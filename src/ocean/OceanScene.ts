import * as THREE from 'three';
import { OceanFFT } from './OceanFFT';
import { OceanMaterial } from './OceanMaterial';
import { OceanMesh } from './OceanMesh';
import { Ship as ShipMesh } from './Ship';
import { FoamSystem } from './FoamSystem';
import { SkyGenerator, SkyMaterial } from './SkyGenerator';
import { OrbitCamera } from '../camera/OrbitCamera';
import { FirstPersonCamera, KeyState } from '../camera/FirstPersonCamera';
import { useAppStore, type Ship as ShipState, type CameraMode } from '@/store/useAppStore';
import { deg2rad } from '../utils/math';

interface Stats {
  fps: number;
  triangles: number;
}

const FPS_SMOOTHING = 0.9;
const SUNSET_COLOR = new THREE.Color(0xff8040);
const NOON_COLOR = new THREE.Color(0xffffff);

export class OceanScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private oceanFFT: OceanFFT;
  private oceanMaterial: OceanMaterial;
  private oceanMesh: OceanMesh;
  private foamSystem: FoamSystem;

  private skyDome: THREE.Mesh;
  private skyMaterial: SkyMaterial;
  private envMap: THREE.CubeTexture;

  private sunLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;

  private orbitCamera: OrbitCamera;
  private firstPersonCamera: FirstPersonCamera;
  private activeCameraMode: CameraMode = 'orbit';

  private shipMeshes: Map<string, ShipMesh> = new Map();

  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastTime = 0;
  private time = 0;

  private fpsFrameCount = 0;
  private fpsLastUpdate = 0;
  private fpsValue = 0;

  private sunDir = new THREE.Vector3();
  private sunColor = new THREE.Color();
  private lastSkyPreset: string = 'clear';

  private keyState: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };

  private onResize: () => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const store = useAppStore.getState();
    this.renderer.toneMapping = store.environment.toneMapping === 'aces'
      ? THREE.ACESFilmicToneMapping
      : THREE.ReinhardToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      10000
    );

    this.oceanFFT = new OceanFFT(this.renderer);
    const fftResult = this.oceanFFT.update(
      store.environment.windSpeed,
      deg2rad(store.environment.windDirection),
      0
    );

    this.envMap = SkyGenerator.generate(store.environment.skyPreset);
    this.lastSkyPreset = store.environment.skyPreset;

    this.oceanMaterial = new OceanMaterial(
      fftResult.heightMap,
      fftResult.gradientMap,
      fftResult.jacobianMap,
      this.envMap,
      {
        environment: store.environment,
        render: store.render,
      }
    );

    this.oceanMesh = new OceanMesh(this.oceanMaterial, store.render.lodLevel);
    this.scene.add(this.oceanMesh);

    this.skyDome = SkyGenerator.generateSkyDome(store.environment.skyPreset);
    this.skyMaterial = this.skyDome.material as SkyMaterial;
    this.scene.add(this.skyDome);

    this.foamSystem = new FoamSystem();
    this.scene.add(this.foamSystem);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = true;
    this.scene.add(this.sunLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a6b8c, 0.4);
    this.scene.add(this.hemisphereLight);

    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.ambientLight);

    this.orbitCamera = new OrbitCamera(canvas, canvas);
    this.firstPersonCamera = new FirstPersonCamera(canvas);

    this.syncCameraFromController(this.orbitCamera.camera);

    this.onResize = () => this.handleResize();
    this.onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.updateSunDirection(store.environment.sunAzimuth, store.environment.sunElevation);
    this.updateShipMeshes(store.ships);
  }

  private handleResize(): void {
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyState.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyState.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keyState.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keyState.right = true;
        break;
      case 'Space':
        this.keyState.up = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyState.down = true;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyState.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyState.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keyState.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keyState.right = false;
        break;
      case 'Space':
        this.keyState.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyState.down = false;
        break;
    }
  }

  private syncCameraFromController(sourceCamera: THREE.PerspectiveCamera): void {
    this.camera.position.copy(sourceCamera.position);
    this.camera.quaternion.copy(sourceCamera.quaternion);
    this.camera.projectionMatrix.copy(sourceCamera.projectionMatrix);
    this.camera.projectionMatrixInverse.copy(sourceCamera.projectionMatrixInverse);
    this.camera.matrixWorld.copy(sourceCamera.matrixWorld);
    this.camera.matrixWorldInverse.copy(sourceCamera.matrixWorldInverse);
    this.camera.fov = sourceCamera.fov;
    this.camera.aspect = sourceCamera.aspect;
    this.camera.near = sourceCamera.near;
    this.camera.far = sourceCamera.far;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  private syncControllerFromCamera(targetCamera: THREE.PerspectiveCamera): void {
    targetCamera.position.copy(this.camera.position);
    targetCamera.quaternion.copy(this.camera.quaternion);
    targetCamera.fov = this.camera.fov;
    targetCamera.aspect = this.camera.aspect;
    targetCamera.near = this.camera.near;
    targetCamera.far = this.camera.far;
    targetCamera.updateProjectionMatrix();
    targetCamera.updateMatrixWorld(true);
  }

  private updateSunDirection(azimuth: number, elevation: number): void {
    const phi = (90 - elevation) * Math.PI / 180;
    const theta = azimuth * Math.PI / 180;
    this.sunDir.set(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).normalize();

    const clampedElevation = Math.max(elevation, 0);
    const elevationFactor = clampedElevation / 90;

    if (elevation < 0) {
      this.sunColor.set(0x1a1a3e);
    } else {
      this.sunColor.copy(SUNSET_COLOR).lerp(NOON_COLOR, Math.pow(elevationFactor, 0.5));
    }

    this.sunLight.position.copy(this.sunDir).multiplyScalar(1000);
    this.sunLight.color.copy(this.sunColor);
    this.sunLight.intensity = elevation < 0 ? 0.05 : 0.3 + elevationFactor * 1.2;

    this.skyMaterial.updateSunDirection(azimuth, elevation);
  }

  private updateShipMeshes(ships: ShipState[]): void {
    const currentIds = new Set(ships.map(s => s.id));

    for (const [id, mesh] of this.shipMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.shipMeshes.delete(id);
      }
    }

    for (const ship of ships) {
      let mesh = this.shipMeshes.get(ship.id);
      if (!mesh) {
        mesh = new ShipMesh();
        this.shipMeshes.set(ship.id, mesh);
        this.scene.add(mesh);
      }
      mesh.setPosition(ship.position.x, ship.position.z);
      mesh.setHeading(ship.heading);
    }
  }

  private updateCameraMode(mode: CameraMode): void {
    if (this.activeCameraMode === mode) return;

    if (mode === 'orbit') {
      this.firstPersonCamera.disable();
      this.syncControllerFromCamera(this.orbitCamera.camera);
      this.orbitCamera.enable();
    } else {
      this.orbitCamera.disable();
      this.syncControllerFromCamera(this.firstPersonCamera.camera);
      this.firstPersonCamera.enable();
    }

    this.activeCameraMode = mode;
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaTime = this.lastTime > 0 ? Math.min((now - this.lastTime) / 1000, 0.1) : 0;
    this.lastTime = now;
    this.time += deltaTime;

    this.fpsFrameCount++;
    if (now - this.fpsLastUpdate >= 500) {
      const elapsed = (now - this.fpsLastUpdate) / 1000;
      const instantFps = this.fpsFrameCount / elapsed;
      this.fpsValue = this.fpsValue === 0
        ? instantFps
        : this.fpsValue * FPS_SMOOTHING + instantFps * (1 - FPS_SMOOTHING);
      this.fpsFrameCount = 0;
      this.fpsLastUpdate = now;
    }

    const store = useAppStore.getState();
    const { environment, ships, render, camera } = store;

    this.updateCameraMode(camera.mode);

    if (camera.mode === 'orbit') {
      this.orbitCamera.update(deltaTime);
      this.syncCameraFromController(this.orbitCamera.camera);
    } else {
      this.firstPersonCamera.update(deltaTime, this.keyState);
      this.syncCameraFromController(this.firstPersonCamera.camera);
    }

    this.updateSunDirection(environment.sunAzimuth, environment.sunElevation);

    if (this.lastSkyPreset !== environment.skyPreset) {
      this.skyMaterial.setPreset(environment.skyPreset);
      this.lastSkyPreset = environment.skyPreset;
    }

    this.skyMaterial.setBlend(environment.skyBlendTo, environment.skyBlendFactor);
    this.skyMaterial.updateTime(this.time);

    const fftResult = this.oceanFFT.update(
      environment.windSpeed,
      deg2rad(environment.windDirection),
      this.time
    );

    this.oceanMaterial.update(
      this.time,
      this.sunDir,
      this.sunColor,
      this.camera.position,
      ships,
      environment.windSpeed,
      environment.nightFactor
    );

    this.oceanMesh.setWireframe(render.wireframe);
    this.oceanMesh.setLODLevel(render.lodLevel);
    this.oceanMesh.update(this.camera);

    this.foamSystem.update(deltaTime, fftResult, ships);

    this.updateShipMeshes(ships);

    this.renderer.toneMapping = environment.toneMapping === 'aces'
      ? THREE.ACESFilmicToneMapping
      : THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = Math.pow(2, environment.exposure);

    store.moveShips(deltaTime);

    const triangles = this.oceanMesh.getTriangleCount();
    store.setFps(Math.round(this.fpsValue));
    store.setTriangles(triangles);

    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = 0;
    this.fpsLastUpdate = performance.now();
    this.fpsFrameCount = 0;

    const store = useAppStore.getState();
    this.updateCameraMode(store.camera.mode);

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.orbitCamera.disable();
    this.firstPersonCamera.disable();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.orbitCamera.camera.aspect = width / height;
    this.orbitCamera.camera.updateProjectionMatrix();

    this.firstPersonCamera.camera.aspect = width / height;
    this.firstPersonCamera.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    this.stop();

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.oceanFFT.dispose();
    this.oceanMesh.dispose();
    this.foamSystem.dispose();
    this.orbitCamera.dispose();
    this.firstPersonCamera.dispose();

    this.oceanMaterial.dispose();
    this.skyMaterial.dispose();
    this.skyDome.geometry.dispose();
    this.envMap.dispose();

    for (const mesh of this.shipMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.shipMeshes.clear();

    this.scene.remove(this.oceanMesh);
    this.scene.remove(this.skyDome);
    this.scene.remove(this.foamSystem);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.hemisphereLight);
    this.scene.remove(this.ambientLight);

    this.renderer.dispose();
  }

  getActiveCamera(): OrbitCamera | FirstPersonCamera {
    return this.activeCameraMode === 'orbit' ? this.orbitCamera : this.firstPersonCamera;
  }

  getStats(): Stats {
    return {
      fps: Math.round(this.fpsValue),
      triangles: this.oceanMesh.getTriangleCount(),
    };
  }

  getCameraState(): { px: number; py: number; pz: number; rx: number; ry: number; rz: number } {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    return {
      px: this.camera.position.x,
      py: this.camera.position.y,
      pz: this.camera.position.z,
      rx: euler.x,
      ry: euler.y,
      rz: euler.z,
    };
  }

  setCameraState(state: { px: number; py: number; pz: number; rx: number; ry: number; rz: number }): void {
    this.camera.position.set(state.px, state.py, state.pz);
    const euler = new THREE.Euler(state.rx, state.ry, state.rz, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
    this.camera.updateMatrixWorld(true);

    if (this.activeCameraMode === 'orbit') {
      this.syncControllerFromCamera(this.orbitCamera.camera);
    } else {
      this.syncControllerFromCamera(this.firstPersonCamera.camera);
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      this.firstPersonCamera['yaw'] = Math.atan2(forward.x, forward.z);
      this.firstPersonCamera['pitch'] = Math.asin(forward.y);
    }
  }
}
