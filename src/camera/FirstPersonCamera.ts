import * as THREE from 'three';

const MOVEMENT_SPEED = 20;
const ACCELERATION = 8;
const DAMPING = 5;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export class FirstPersonCamera {
  camera: THREE.PerspectiveCamera;

  private canvas: HTMLCanvasElement;
  private enabled = false;

  private yaw = 0;
  private pitch = 0;

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();

  private onMouseMove: (event: MouseEvent) => void;
  private onPointerLockChange: () => void;
  private onClick: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 5, 50);
    this.camera.lookAt(0, 0, 0);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    this.yaw = Math.atan2(forward.x, forward.z);
    this.pitch = Math.asin(forward.y);

    this.velocity.set(0, 0, 0);

    this.onMouseMove = (event: MouseEvent) => this.handleMouseMove(event);
    this.onPointerLockChange = () => this.handlePointerLockChange();
    this.onClick = () => this.handleClick();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.enabled) return;
    if (document.pointerLockElement !== this.canvas) return;

    this.yaw -= event.movementX * MOUSE_SENSITIVITY;
    this.pitch -= event.movementY * MOUSE_SENSITIVITY;

    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));

    this.updateCameraRotation();
  }

  private handleClick(): void {
    if (!this.enabled) return;
    this.canvas.requestPointerLock();
  }

  private handlePointerLockChange(): void {
  }

  private updateCameraRotation(): void {
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  update(deltaTime: number, keys: KeyState): void {
    if (!this.enabled) return;

    const moveDir = new THREE.Vector3();

    if (keys.forward) moveDir.z -= 1;
    if (keys.backward) moveDir.z += 1;
    if (keys.left) moveDir.x -= 1;
    if (keys.right) moveDir.x += 1;
    if (keys.up) moveDir.y += 1;
    if (keys.down) moveDir.y -= 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      const rotation = new THREE.Euler(0, this.yaw, 0, 'YXZ');
      this.direction.copy(moveDir).applyEuler(rotation);

      this.velocity.x += this.direction.x * ACCELERATION * deltaTime;
      this.velocity.y += this.direction.y * ACCELERATION * deltaTime;
      this.velocity.z += this.direction.z * ACCELERATION * deltaTime;
    }

    const dampingFactor = Math.exp(-DAMPING * deltaTime);
    this.velocity.multiplyScalar(dampingFactor);

    const maxSpeed = MOVEMENT_SPEED;
    if (this.velocity.length() > maxSpeed) {
      this.velocity.setLength(maxSpeed);
    }

    this.camera.position.addScaledVector(this.velocity, deltaTime);
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.addEventListener('click', this.onClick);
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.removeEventListener('click', this.onClick);

    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  dispose(): void {
    this.disable();
  }
}
