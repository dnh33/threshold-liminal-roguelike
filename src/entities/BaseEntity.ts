import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import type { ThreatType } from '../biomes/BiomeTypes';

export const EntityState = {
  IDLE: 'idle',
  PATROLLING: 'patrolling',
  INVESTIGATING: 'investigating',
  CHASING: 'chasing',
  ATTACKING: 'attacking',
  STUNNED: 'stunned',
  RETURNING: 'returning',
} as const;

export type EntityState = (typeof EntityState)[keyof typeof EntityState];

export interface EntityPerception {
  sightRange: number;
  sightCone: number;
  hearingRange: number;
  detectionSpeed: number;
}

export interface AttackEvent {
  entity: BaseEntity;
  damage: number;
}

export interface StateChangeEvent {
  previous: EntityState;
  current: EntityState;
}

const DEFAULT_HEIGHT = 0.5;

export class BaseEntity extends EventEmitter {
  public mesh: THREE.Group;
  public state: EntityState = EntityState.IDLE;
  public type: ThreatType;
  public position: THREE.Vector3;
  public perception: EntityPerception;
  public playerViewDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

  protected speed: number;
  protected patrolPath: THREE.Vector3[];
  protected patrolIndex: number = 0;
  protected awareness: number = 0;
  protected targetPosition: THREE.Vector3 | null = null;
  protected stateTimer: number = 0;
  protected noiseSources: THREE.Vector3[] = [];

  protected _direction: THREE.Vector3;
  protected _lookTarget: THREE.Vector3;
  protected _previousState: EntityState = EntityState.IDLE;
  protected _heightOffset: number;
  protected _stunDuration: number = 0;
  protected _attackCooldown: number = 0;
  protected _attackDamage: number = 10;

  private _disposed: boolean = false;
  private _boundMeshes: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super();
    this.type = type;
    this.position = position.clone();
    this.patrolPath = [];
    this._direction = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this._heightOffset = DEFAULT_HEIGHT;

    this.perception = {
      sightRange: 10,
      sightCone: 60,
      hearingRange: 10,
      detectionSpeed: 0.3,
    };

    this.speed = 2 + difficulty * 0.4;

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.mesh.userData.entity = this;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = `entity_${this.type}`;

    const bodyGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xff2222,
      emissiveIntensity: 0.2,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    group.add(body);

    this._trackMaterial(bodyGeo, bodyMat);

    return group;
  }

  protected _trackMaterial(geometry: THREE.BufferGeometry, material: THREE.Material): void {
    this._boundMeshes.push({ geometry, material });
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    if (this._disposed) return;

    this.stateTimer += dt;
    this.updateState(dt, playerPosition);
    this.mesh.position.copy(this.position);

    if (this.awareness > 0 && this.state !== EntityState.CHASING && this.state !== EntityState.ATTACKING) {
      this.awareness = Math.max(0, this.awareness - dt * 0.15);
    }
  }

  protected updateState(dt: number, playerPos: THREE.Vector3): void {
    switch (this.state) {
      case EntityState.IDLE:
        this._handleIdleState(dt, playerPos);
        break;
      case EntityState.PATROLLING:
        this._handlePatrollingState(dt, playerPos);
        break;
      case EntityState.INVESTIGATING:
        this._handleInvestigatingState(dt, playerPos);
        break;
      case EntityState.CHASING:
        this._handleChasingState(dt, playerPos);
        break;
      case EntityState.ATTACKING:
        this._handleAttackingState(dt, playerPos);
        break;
      case EntityState.STUNNED:
        this._handleStunnedState(dt);
        break;
      case EntityState.RETURNING:
        this._handleReturningState(dt, playerPos);
        break;
    }
  }

  protected _handleIdleState(dt: number, playerPos: THREE.Vector3): void {
    const seesPlayer = this.canSee(playerPos);
    const hearsPlayer = this.canHear(playerPos, this.noiseSources);

    if (seesPlayer || hearsPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.5) {
        this._transitionState(EntityState.CHASING);
        return;
      }
      if (this.targetPosition === null) {
        this.targetPosition = playerPos.clone();
        this._transitionState(EntityState.INVESTIGATING);
        return;
      }
    }

    if (this.patrolPath.length > 0 && this.stateTimer > 1) {
      this._transitionState(EntityState.PATROLLING);
    }
  }

  protected _handlePatrollingState(dt: number, playerPos: THREE.Vector3): void {
    const seesPlayer = this.canSee(playerPos);
    const hearsPlayer = this.canHear(playerPos, this.noiseSources);

    if (seesPlayer || hearsPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.5) {
        this._transitionState(EntityState.CHASING);
        return;
      }
      this.targetPosition = playerPos.clone();
      this._transitionState(EntityState.INVESTIGATING);
      return;
    }

    this.updatePatrolling(dt);
  }

  protected _handleInvestigatingState(dt: number, playerPos: THREE.Vector3): void {
    const seesPlayer = this.canSee(playerPos);
    const hearsPlayer = this.canHear(playerPos, this.noiseSources);

    if (seesPlayer || hearsPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.5) {
        this.targetPosition = playerPos.clone();
        this._transitionState(EntityState.CHASING);
        return;
      }
    }

    if (this.stateTimer > 8) {
      this.targetPosition = null;
      this._transitionState(this.patrolPath.length > 0 ? EntityState.RETURNING : EntityState.IDLE);
      return;
    }

    this.updateInvestigating(dt);
  }

  protected _handleChasingState(dt: number, playerPos: THREE.Vector3): void {
    this.updateChasing(dt, playerPos);

    const dist = this.position.distanceTo(playerPos);
    if (dist < 1.5 && this._attackCooldown <= 0) {
      this._transitionState(EntityState.ATTACKING);
      this.stateTimer = 0;
    }

    const canSense = this.canSee(playerPos) || this.canHear(playerPos, this.noiseSources);
    if (!canSense) {
      this.awareness = Math.max(0, this.awareness - dt * 0.25);
      if (this.awareness <= 0) {
        this.targetPosition = playerPos.clone();
        this._transitionState(EntityState.INVESTIGATING);
      }
    } else {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
    }
  }

  protected _handleAttackingState(_dt: number, playerPos: THREE.Vector3): void {
    if (this.stateTimer >= 0.5) {
      this.emit('attack', { entity: this, damage: this._attackDamage } satisfies AttackEvent);
      this._attackCooldown = 1.5;
      this._transitionState(EntityState.CHASING);
    }

    const dist = this.position.distanceTo(playerPos);
    if (dist > 2.5) {
      this._transitionState(EntityState.CHASING);
    }
  }

  protected _handleStunnedState(dt: number): void {
    this._stunDuration -= dt;
    if (this._stunDuration <= 0) {
      this._transitionState(
        this.patrolPath.length > 0 ? EntityState.RETURNING : EntityState.IDLE,
      );
    }
  }

  protected _handleReturningState(dt: number, _playerPos: THREE.Vector3): void {
    this.updateReturning(dt);
  }

  protected _transitionState(newState: EntityState): void {
    if (this.state === newState) return;
    this._previousState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    this.emit('state-changed', { previous: this._previousState, current: this.state } satisfies StateChangeEvent);
  }

  protected updatePatrolling(dt: number): void {
    if (this.patrolPath.length === 0) {
      this._transitionState(EntityState.IDLE);
      return;
    }

    const target = this.patrolPath[this.patrolIndex];
    this.moveTowards(target, dt);

    if (this.position.distanceTo(target) < 0.3) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
    }
  }

  protected updateInvestigating(dt: number): void {
    if (!this.targetPosition) {
      this._transitionState(this.patrolPath.length > 0 ? EntityState.RETURNING : EntityState.IDLE);
      return;
    }

    this.moveTowards(this.targetPosition, dt);

    if (this.position.distanceTo(this.targetPosition) < 0.5) {
      this.targetPosition = null;
      this._transitionState(this.patrolPath.length > 0 ? EntityState.RETURNING : EntityState.IDLE);
    }
  }

  protected updateChasing(dt: number, playerPos: THREE.Vector3): void {
    this._attackCooldown = Math.max(0, this._attackCooldown - dt);
    this.moveTowards(playerPos, dt);
  }

  protected updateReturning(dt: number): void {
    if (this.patrolPath.length === 0) {
      this._transitionState(EntityState.IDLE);
      return;
    }

    const returnTarget = this.patrolPath[0];
    this.moveTowards(returnTarget, dt);

    if (this.position.distanceTo(returnTarget) < 0.5) {
      this.patrolIndex = 0;
      this._transitionState(EntityState.PATROLLING);
    }
  }

  protected canSee(target: THREE.Vector3): boolean {
    if (this.perception.sightRange <= 0) return false;

    this._direction.copy(target).sub(this.position);
    const dist = this._direction.length();
    if (dist > this.perception.sightRange) return false;

    this._direction.normalize();
    this._lookTarget.set(0, 0, -1).applyQuaternion(this.mesh.quaternion);

    const angle = this._lookTarget.angleTo(this._direction);
    const halfCone = THREE.MathUtils.degToRad(this.perception.sightCone / 2);

    return angle <= halfCone;
  }

  protected canHear(target: THREE.Vector3, noiseSources: THREE.Vector3[]): boolean {
    if (this.perception.hearingRange <= 0) return false;

    const distToPlayer = this.position.distanceTo(target);
    if (distToPlayer <= this.perception.hearingRange) return true;

    for (const source of noiseSources) {
      if (this.position.distanceTo(source) <= this.perception.hearingRange) {
        return true;
      }
    }

    return false;
  }

  protected moveTowards(target: THREE.Vector3, dt: number): void {
    this._direction.copy(target).sub(this.position);
    this._direction.y = 0;
    if (this._direction.lengthSq() < 0.01) return;

    this._direction.normalize();
    this.position.x += this._direction.x * this.speed * dt;
    this.position.z += this._direction.z * this.speed * dt;

    this.rotateTowards(target, dt);
  }

  protected rotateTowards(target: THREE.Vector3, dt: number): void {
    this._direction.copy(target).sub(this.position);
    if (this._direction.lengthSq() < 0.01) return;

    const targetAngle = Math.atan2(this._direction.x, this._direction.z);
    const currentAngle = this.mesh.rotation.y;
    let diff = targetAngle - currentAngle;

    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    this.mesh.rotation.y += diff * Math.min(1, 5 * dt);
  }

  updateNoiseSources(sources: THREE.Vector3[]): void {
    this.noiseSources = sources;
  }

  getDetectionLevel(): number {
    return this.awareness;
  }

  stun(duration: number): void {
    if (this.state === EntityState.STUNNED) {
      this._stunDuration = Math.max(this._stunDuration, duration);
      return;
    }
    this._previousState = this.state;
    this.state = EntityState.STUNNED;
    this.stateTimer = 0;
    this._stunDuration = duration;
    this.emit('state-changed', { previous: this._previousState, current: this.state } satisfies StateChangeEvent);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    this.removeAllListeners();

    for (const { geometry, material } of this._boundMeshes) {
      geometry.dispose();
      material.dispose();
    }
    this._boundMeshes.length = 0;

    this.mesh.removeFromParent();
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }
}
