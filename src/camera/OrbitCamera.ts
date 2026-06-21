import * as THREE from 'three';

const MIN_DISTANCE = 20;
const MAX_DISTANCE = 500;
const DEFAULT_DISTANCE = 150;
const DEFAULT_POLAR = Math.PI / 4;
const DEFAULT_AZIMUTH = 0;
const DAMPING = 0.08;
const ROTATE_SPEED = 0.005;
const ZOOM_SPEED = 1.0;
const PAN_SPEED = 0.2;

export class OrbitCamera {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;

  private canvas: HTMLCanvasElement;
  private domElement: HTMLCanvasElement;
  private enabled = false;

  private spherical = new THREE.Spherical();
  private sphericalTarget = new THREE.Spherical();
  private targetOffset = new THREE.Vector3();
  private targetOffsetTarget = new THREE.Vector3();

  private isRotating = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private onMouseDown: (event: MouseEvent) => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onMouseUp: (event: MouseEvent) => void;
  private onWheel: (event: WheelEvent) => void;
  private onContextMenu: (event: Event) => void;

  constructor(canvas: HTMLCanvasElement, domElement: HTMLCanvasElement) {
    this.canvas = canvas;
    this.domElement = domElement;

    this.camera = new THREE.PerspectiveCamera(
      60,
      domElement.clientWidth / domElement.clientHeight,
      0.1,
      5000
    );

    this.target = new THREE.Vector3(0, 0, 0);
    this.targetOffset.copy(this.target);
    this.targetOffsetTarget.copy(this.target);

    this.spherical.set(DEFAULT_DISTANCE, DEFAULT_POLAR, DEFAULT_AZIMUTH);
    this.sphericalTarget.copy(this.spherical);

    this.updateCameraPosition();

    this.onMouseDown = (event: MouseEvent) => this.handleMouseDown(event);
    this.onMouseMove = (event: MouseEvent) => this.handleMouseMove(event);
    this.onMouseUp = (event: MouseEvent) => this.handleMouseUp(event);
    this.onWheel = (event: WheelEvent) => this.handleWheel(event);
    this.onContextMenu = (event: Event) => event.preventDefault();
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.enabled) return;

    if (event.button === 0) {
      this.isRotating = true;
    } else if (event.button === 2) {
      this.isPanning = true;
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.enabled) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    if (this.isRotating) {
      this.sphericalTarget.theta -= deltaX * ROTATE_SPEED;
      this.sphericalTarget.phi -= deltaY * ROTATE_SPEED;
      this.sphericalTarget.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, this.sphericalTarget.phi)
      );
    }

    if (this.isPanning) {
      const panOffset = new THREE.Vector3();
      const distance = this.spherical.radius;

      panOffset.setFromMatrixColumn(this.camera.matrix, 0);
      panOffset.y = 0;
      panOffset.normalize();
      panOffset.multiplyScalar(-deltaX * PAN_SPEED * distance * 0.001);
      this.targetOffsetTarget.add(panOffset);

      panOffset.setFromMatrixColumn(this.camera.matrix, 2);
      panOffset.y = 0;
      panOffset.normalize();
      panOffset.multiplyScalar(-deltaY * PAN_SPEED * distance * 0.001);
      this.targetOffsetTarget.add(panOffset);
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private handleMouseUp(_event: MouseEvent): void {
    this.isRotating = false;
    this.isPanning = false;
  }

  private handleWheel(event: WheelEvent): void {
    if (!this.enabled) return;

    const scale = Math.exp(-event.deltaY * 0.001 * ZOOM_SPEED);
    this.sphericalTarget.radius *= scale;
    this.sphericalTarget.radius = Math.max(
      MIN_DISTANCE,
      Math.min(MAX_DISTANCE, this.sphericalTarget.radius)
    );
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.targetOffset).add(offset);
    this.camera.lookAt(this.targetOffset);
    this.target.copy(this.targetOffset);
  }

  update(_deltaTime: number): void {
    this.spherical.radius += (this.sphericalTarget.radius - this.spherical.radius) * DAMPING;
    this.spherical.phi += (this.sphericalTarget.phi - this.spherical.phi) * DAMPING;
    this.spherical.theta += (this.sphericalTarget.theta - this.spherical.theta) * DAMPING;
    this.spherical.makeSafe();

    this.targetOffset.lerp(this.targetOffsetTarget, DAMPING);

    this.target.copy(this.targetOffset);

    this.updateCameraPosition();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    this.disable();
  }
}
