import * as THREE from 'three';
import type { LODLevel } from '../store/useAppStore';
import { OceanMaterial } from './OceanMaterial';

interface TileData {
  mesh: THREE.Mesh;
  lodLevel: number;
  baseX: number;
  baseZ: number;
  visible: boolean;
}

const WORLD_SIZE = 200;
const GRID_SIZE = 4;
const TILE_SIZE = WORLD_SIZE / GRID_SIZE;

const LOD_CONFIGS = [
  { segments: 128, distance: 200, name: 'LOD0' },
  { segments: 64, distance: 800, name: 'LOD1' },
  { segments: 32, distance: Infinity, name: 'LOD2' },
];

export class OceanMesh extends THREE.Group {
  private material: OceanMaterial;
  private lodLevel: LODLevel;
  private tiles: TileData[] = [];
  private geometries: THREE.PlaneGeometry[] = [];
  private frustum = new THREE.Frustum();
  private projectionScreenMatrix = new THREE.Matrix4();

  constructor(material: OceanMaterial, lodLevel: LODLevel = 'auto') {
    super();
    this.material = material;
    this.lodLevel = lodLevel;
    this.createGeometries();
    this.createTiles();
  }

  private createGeometries(): void {
    for (const config of LOD_CONFIGS) {
      const geometry = new THREE.PlaneGeometry(
        TILE_SIZE,
        TILE_SIZE,
        config.segments,
        config.segments
      );
      geometry.rotateX(-Math.PI / 2);
      this.geometries.push(geometry);
    }
  }

  private createTiles(): void {
    const halfGrid = GRID_SIZE / 2;

    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const baseX = (x - halfGrid + 0.5) * TILE_SIZE;
        const baseZ = (z - halfGrid + 0.5) * TILE_SIZE;

        const geometryIndex = this.getGeometryIndexForLOD();
        const mesh = new THREE.Mesh(this.geometries[geometryIndex], this.material);
        mesh.position.set(baseX, 0, baseZ);
        mesh.frustumCulled = false;

        this.add(mesh);
        this.tiles.push({
          mesh,
          lodLevel: geometryIndex,
          baseX,
          baseZ,
          visible: true,
        });
      }
    }
  }

  private getGeometryIndexForLOD(): number {
    switch (this.lodLevel) {
      case 'high':
        return 0;
      case 'medium':
        return 1;
      case 'low':
        return 2;
      default:
        return 0;
    }
  }

  private getLODForDistance(distance: number): number {
    if (this.lodLevel !== 'auto') {
      return this.getGeometryIndexForLOD();
    }
    for (let i = 0; i < LOD_CONFIGS.length; i++) {
      if (distance < LOD_CONFIGS[i].distance) {
        return i;
      }
    }
    return LOD_CONFIGS.length - 1;
  }

  update(camera: THREE.Camera): void {
    this.projectionScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix);

    const cameraPos = camera.position;
    const tileHalfSize = TILE_SIZE / 2;

    for (const tile of this.tiles) {
      const distance = Math.sqrt(
        Math.pow(cameraPos.x - tile.baseX, 2) +
        Math.pow(cameraPos.z - tile.baseZ, 2)
      );

      const sphere = new THREE.Sphere(
        new THREE.Vector3(tile.baseX, 0, tile.baseZ),
        tileHalfSize * Math.SQRT2
      );
      const inFrustum = this.frustum.intersectsSphere(sphere);

      tile.visible = inFrustum;
      tile.mesh.visible = inFrustum;

      if (inFrustum && this.lodLevel === 'auto') {
        const targetLOD = this.getLODForDistance(distance);
        if (targetLOD !== tile.lodLevel) {
          tile.lodLevel = targetLOD;
          tile.mesh.geometry = this.geometries[targetLOD];
        }
      }
    }
  }

  setWireframe(wireframe: boolean): void {
    (this.material as unknown as THREE.ShaderMaterial).wireframe = wireframe;
  }

  setLODLevel(level: LODLevel): void {
    this.lodLevel = level;

    if (level !== 'auto') {
      const geometryIndex = this.getGeometryIndexForLOD();
      for (const tile of this.tiles) {
        tile.lodLevel = geometryIndex;
        tile.mesh.geometry = this.geometries[geometryIndex];
      }
    }
  }

  getTriangleCount(): number {
    let count = 0;
    for (const tile of this.tiles) {
      if (tile.visible) {
        const segments = LOD_CONFIGS[tile.lodLevel].segments;
        count += segments * segments * 2;
      }
    }
    return count;
  }

  dispose(): void {
    for (const tile of this.tiles) {
      this.remove(tile.mesh);
    }
    this.tiles = [];

    for (const geometry of this.geometries) {
      geometry.dispose();
    }
    this.geometries = [];
  }
}
