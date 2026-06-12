import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import type { Engine } from '../core/Engine';
import type { InputManager } from '../core/InputManager';

const STANDING_HEIGHT = 1.7;
const CROUCHING_HEIGHT = 0.8;
const WALK_SPEED = 4;
const SPRINT_SPEED = 6;
const CROUCH_SPEED = 1.5;
const GRAVITY = -9.81;
const JUMP_FORCE = 5;
const MOUSE_SENSITIVITY = 0.002;
const CROUCH_LERP_SPEED = 12;
const HEAD_BOB_FREQUENCY = 10;
const HEAD_BOB_AMPLITUDE_WALK = 0.04;
const HEAD_BOB_AMPLITUDE_SPRINT = 0.06;
const FOOTSTEP_INTERVAL_WALK = 0.5;
const FOOTSTEP_INTERVAL_SPRINT = 0.35;
const FOOTSTEP_INTERVAL_CROUCH = 0.75;

const PlayerState = {
  IDLE: 'idle',
  WALKING: 'walking',
  SPRINTING: 'sprinting',
  CROUCHING: 'crouching',
  INTERACTING: 'interacting',
} as const;

type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

export interface FootstepEvent {
  surface: string;
  strength: number;
}

export interface PlayerStateEvent {
  previous: PlayerState;
  current: PlayerState;
}

export class PlayerController extends EventEmitter {
  public readonly camera: THREE.PerspectiveCamera;
  public readonly interactionRay: THREE.Raycaster;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public isGrounded = true;
  public isCrouching = false;
  public isSprinting = false;

  private _enabled = true;
  private engine: Engine;
  private input: InputManager;
  private _pitch = 0;
  private _yaw = 0;
  private _currentHeight: number;
  private _targetHeight: number;
  private _state: PlayerState = PlayerState.IDLE;
  private _previousState: PlayerState = PlayerState.IDLE;
  private _bobPhase = 0;
  private _bobTarget = new THREE.Vector3();
  private _groundRaycaster: THREE.Raycaster;
  private _moveDir: THREE.Vector3;
  private _forward: THREE.Vector3;
  private _right: THREE.Vector3;
  private _footstepTimer = 0;
  private _pointerClickHandler: (() => void) | null = null;
  private _pointerLockHandler: (() => void) | null = null;

  constructor(engine: Engine, input: InputManager) {
    super();
    this.engine = engine;
    this.input = input;

    const fov = engine.settings.get<number>('graphics.fov', 75);
    this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.rotation.order = 'YXZ';

    this.interactionRay = new THREE.Raycaster();
    this._groundRaycaster = new THREE.Raycaster();

    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this._currentHeight = STANDING_HEIGHT;
    this._targetHeight = STANDING_HEIGHT;
    this._moveDir = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    this.camera.position.set(0, this._currentHeight, 0);

    this._setupPointerLock();
  }

  private _setupPointerLock(): void {
    const canvas = this.engine.canvas;
    this._pointerClickHandler = () => {
      if (!this.input.isPointerLocked && this._enabled) {
        this.input.requestPointerLock();
      }
    };
    canvas.addEventListener('click', this._pointerClickHandler);

    this._pointerLockHandler = () => {
      if (this.input.isPointerLocked) {
        this.emit('pointer-locked');
      } else {
        this.emit('pointer-unlocked');
      }
    };
    document.addEventListener('pointerlockchange', this._pointerLockHandler);
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) {
      this.velocity.set(0, 0, 0);
      this._updateState(PlayerState.IDLE);
    }
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  getEngine(): Engine {
    return this.engine;
  }

  getInput(): InputManager {
    return this.input;
  }

  getState(): PlayerState {
    return this._state;
  }

  getCurrentHeight(): number {
    return this._currentHeight;
  }

  getPitch(): number {
    return this._pitch;
  }

  getYaw(): number {
    return this._yaw;
  }

  update(dt: number): void {
    if (!this._enabled) return;

    this._handleMouseLook(dt);
    this._handleMovementInput(dt);
    this._handleCrouch(dt);
    this._applyPhysics(dt);
    this._updateCameraTransform(dt);
    this._handleHeadBob(dt);
    this._handleFootsteps(dt);
    this._updateInteractionRay();
    this._checkGround();
  }

  private _handleMouseLook(_dt: number): void {
    if (!this.input.isPointerLocked) return;

    const sensitivity = this.engine.settings.get<number>('controls.mouseSensitivity', 1.0);
    const invertY = this.engine.settings.get<boolean>('controls.invertY', false);

    const dx = this.input.mouseDelta.x * MOUSE_SENSITIVITY * sensitivity;
    const dy = this.input.mouseDelta.y * MOUSE_SENSITIVITY * sensitivity * (invertY ? -1 : 1);

    this._yaw -= dx;
    this._pitch -= dy;
    this._pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._pitch));
  }

  private _handleMovementInput(_dt: number): void {
    this._moveDir.set(0, 0, 0);

    const isMoving = this.input.isKeyDown('w') || this.input.isKeyDown('s') ||
      this.input.isKeyDown('a') || this.input.isKeyDown('d');

    this.isSprinting = this.input.isKeyDown('shift') && isMoving && !this.isCrouching && this.isGrounded;

    if (this.input.isKeyDown('w')) this._moveDir.z -= 1;
    if (this.input.isKeyDown('s')) this._moveDir.z += 1;
    if (this.input.isKeyDown('a')) this._moveDir.x -= 1;
    if (this.input.isKeyDown('d')) this._moveDir.x += 1;

    if (this._moveDir.lengthSq() > 0) {
      this._moveDir.normalize();
    }

    let speed = this.isCrouching ? CROUCH_SPEED : WALK_SPEED;
    if (this.isSprinting) speed = SPRINT_SPEED;

    this._forward.set(0, 0, -1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this._yaw);
    this._right.set(1, 0, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this._yaw);

    const targetVelX = (this._forward.x * this._moveDir.z + this._right.x * this._moveDir.x) * speed;
    const targetVelZ = (this._forward.z * this._moveDir.z + this._right.z * this._moveDir.x) * speed;

    this.velocity.x = targetVelX;
    this.velocity.z = targetVelZ;

    if (this.isGrounded && this.input.isKeyJustPressed('space')) {
      this.velocity.y = JUMP_FORCE;
      this.isGrounded = false;
    }

    const moving = this._moveDir.lengthSq() > 0;
    if (moving && this.isGrounded) {
      if (this.isSprinting) this._updateState(PlayerState.SPRINTING);
      else if (this.isCrouching) this._updateState(PlayerState.CROUCHING);
      else this._updateState(PlayerState.WALKING);
    } else if (this.isCrouching && !moving) {
      this._updateState(PlayerState.CROUCHING);
    } else if (!moving && this.isGrounded) {
      this._updateState(PlayerState.IDLE);
    }
  }

  private _handleCrouch(_dt: number): void {
    if (this.input.isKeyDown('control')) {
      this.isCrouching = true;
      this._targetHeight = CROUCHING_HEIGHT;
    } else if (this.isCrouching) {
      this._targetHeight = STANDING_HEIGHT;
    }
  }

  private _applyPhysics(dt: number): void {
    this.velocity.y += GRAVITY * dt;

    if (!this.isGrounded && this.velocity.y < 0) {
      this._checkGround();
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  private _updateCameraTransform(_dt: number): void {
    const prevHeight = this._currentHeight;
    if (this.isCrouching || Math.abs(this._currentHeight - this._targetHeight) > 0.001) {
      this._currentHeight += (this._targetHeight - this._currentHeight) * CROUCH_LERP_SPEED * _dt;
      if (Math.abs(this._currentHeight - this._targetHeight) < 0.001) {
        this._currentHeight = this._targetHeight;
      }
    }

    this.camera.position.set(
      this.position.x + this._bobTarget.x,
      this.position.y + this._currentHeight + this._bobTarget.y,
      this.position.z + this._bobTarget.z,
    );

    this.camera.rotation.set(this._pitch, this._yaw, 0);

    if (!this.isCrouching && this._targetHeight === STANDING_HEIGHT && prevHeight < STANDING_HEIGHT) {
      const standingDelta = this._currentHeight - prevHeight;
      if (standingDelta > 0.01) {
        this.emit('stand-up-attempt', { delta: standingDelta });
      }
    }
  }

  private _handleHeadBob(dt: number): void {
    const bobEnabled = this.engine.settings.get<boolean>('controls.headBob', true);
    if (!bobEnabled) {
      this._bobTarget.set(0, 0, 0);
      return;
    }

    const isMoving = this._moveDir.lengthSq() > 0 && this.isGrounded;
    if (isMoving && (this._state === PlayerState.WALKING || this._state === PlayerState.SPRINTING || this._state === PlayerState.CROUCHING)) {
      const speed = this.isCrouching ? CROUCH_SPEED : (this.isSprinting ? SPRINT_SPEED : WALK_SPEED);
      const amplitude = this.isSprinting ? HEAD_BOB_AMPLITUDE_SPRINT : HEAD_BOB_AMPLITUDE_WALK;
      const frequency = HEAD_BOB_FREQUENCY * (speed / WALK_SPEED);

      this._bobPhase += frequency * dt;

      this._bobTarget.y = Math.sin(this._bobPhase * 2) * amplitude;
      this._bobTarget.x = Math.cos(this._bobPhase) * amplitude * 0.5;
      this._bobTarget.z = 0;
    } else {
      this._bobPhase = 0;
      this._bobTarget.lerp(new THREE.Vector3(0, 0, 0), 10 * dt);
    }
  }

  private _handleFootsteps(dt: number): void {
    const isMoving = this._moveDir.lengthSq() > 0 && this.isGrounded &&
      (this._state === PlayerState.WALKING || this._state === PlayerState.SPRINTING || this._state === PlayerState.CROUCHING);

    if (!isMoving) {
      this._footstepTimer = 0;
      return;
    }

    const interval = this.isCrouching ? FOOTSTEP_INTERVAL_CROUCH :
      (this.isSprinting ? FOOTSTEP_INTERVAL_SPRINT : FOOTSTEP_INTERVAL_WALK);

    this._footstepTimer += dt;
    if (this._footstepTimer >= interval) {
      this._footstepTimer = 0;

      const surface = this._detectSurfaceType();
      const strength = this.isSprinting ? 1 : (this.isCrouching ? 0.3 : 0.6);
      this.emit('footstep', { surface, strength } satisfies FootstepEvent);
    }
  }

  private _detectSurfaceType(): string {
    const scene = this.engine.sceneManager.scene;
    this._groundRaycaster.set(
      new THREE.Vector3(this.position.x, this.position.y + 0.2, this.position.z),
      new THREE.Vector3(0, -1, 0),
    );
    this._groundRaycaster.far = 0.5;
    const hits = this._groundRaycaster.intersectObjects(scene.children, true);

    if (hits.length > 0) {
      const hit = hits[0];
      if (hit.object.userData?.surfaceType) {
        return hit.object.userData.surfaceType as string;
      }
      if (hit.face && hit.object instanceof THREE.Mesh) {
        const material = Array.isArray(hit.object.material)
          ? hit.object.material[hit.face.materialIndex]
          : hit.object.material;
        if (material?.userData?.surfaceType) {
          return material.userData.surfaceType as string;
        }
      }
    }
    return 'concrete';
  }

  private _updateInteractionRay(): void {
    this.interactionRay.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.interactionRay.far = 3;
  }

  private _checkGround(): void {
    const scene = this.engine.sceneManager.scene;
    this._groundRaycaster.set(
      new THREE.Vector3(this.position.x, this.position.y + 0.1, this.position.z),
      new THREE.Vector3(0, -1, 0),
    );
    this._groundRaycaster.far = 0.3;
    const hits = this._groundRaycaster.intersectObjects(scene.children, true);

    if (hits.length > 0 && this.velocity.y <= 0) {
      this.isGrounded = true;
      this.position.y = hits[0].point.y;
      this.velocity.y = 0;
    } else {
      this.isGrounded = false;
    }
  }

  private _updateState(newState: PlayerState): void {
    if (this._state === newState) return;
    this._previousState = this._state;
    this._state = newState;
    this.emit('state-changed', { previous: this._previousState, current: this._state } satisfies PlayerStateEvent);
  }

  setState(state: PlayerState): void {
    this._updateState(state);
  }

  teleport(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
  }

  lookAt(target: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(target, this.position);
    this._yaw = Math.atan2(direction.x, direction.z);
    this._pitch = -Math.asin(direction.y / direction.length());
    this._pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._pitch));
  }

  dispose(): void {
    this.setEnabled(false);
    this.removeAllListeners();

    if (this._pointerClickHandler) {
      this.engine.canvas.removeEventListener('click', this._pointerClickHandler);
      this._pointerClickHandler = null;
    }
    if (this._pointerLockHandler) {
      document.removeEventListener('pointerlockchange', this._pointerLockHandler);
      this._pointerLockHandler = null;
    }

    this.camera.removeFromParent();
  }
}
