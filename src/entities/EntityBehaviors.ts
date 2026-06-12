import * as THREE from 'three';
import { ThreatType } from '../biomes/BiomeTypes';
import { BaseEntity, EntityState, type EntityPerception, type AttackEvent } from './BaseEntity';

// ── MiddleManager (PATROL) ──────────────────────────────────
// Humanoid box figure patrolling waypoints. Chases on sight.
// Stunned by UV light for 3s. Calls nearby entities on detection.

export class MiddleManager extends BaseEntity {
  private _callCooldown: number = 0;

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super(type, position, difficulty);
    this.perception = {
      sightRange: 15,
      sightCone: 60,
      hearingRange: 8,
      detectionSpeed: 0.4 + difficulty * 0.05,
    } satisfies EntityPerception;
    this.speed = 2.5 + difficulty * 0.3;
    this._attackDamage = 15;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'middle_manager';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcc8844,
      roughness: 0.7,
      metalness: 0.1,
    });

    const headMat = new THREE.MeshStandardMaterial({
      color: 0xdda866,
      roughness: 0.6,
    });

    const limbMat = new THREE.MeshStandardMaterial({
      color: 0x886644,
      roughness: 0.8,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), bodyMat);
    body.position.y = 0.8;
    group.add(body);
    this._trackMaterial(body.geometry, bodyMat);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), headMat);
    head.position.set(0, 1.3, 0);
    group.add(head);
    this._trackMaterial(head.geometry, headMat);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), limbMat);
    leftLeg.position.set(-0.15, 0.2, 0);
    group.add(leftLeg);
    this._trackMaterial(leftLeg.geometry, limbMat);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), limbMat);
    rightLeg.position.set(0.15, 0.2, 0);
    group.add(rightLeg);
    this._trackMaterial(rightLeg.geometry, limbMat);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff8844 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    leftEye.position.set(-0.08, 1.35, -0.16);
    group.add(leftEye);
    this._trackMaterial(leftEye.geometry, eyeMat);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    rightEye.position.set(0.08, 1.35, -0.16);
    group.add(rightEye);
    this._trackMaterial(rightEye.geometry, eyeMat);

    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.3,
    });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), badgeMat);
    badge.position.set(0, 0.85, -0.18);
    group.add(badge);
    this._trackMaterial(badge.geometry, badgeMat);

    return group;
  }

  protected _handleChasingState(dt: number, playerPos: THREE.Vector3): void {
    super._handleChasingState(dt, playerPos);

    this._callCooldown -= dt;
    if (this._callCooldown <= 0 && this.awareness >= 0.8) {
      this.emit('call-for-help', { entity: this, position: this.position.clone() });
      this._callCooldown = 10;
    }
  }

  stun(duration: number): void {
    super.stun(duration);
  }
}

// ── Drowned (SOUND_HUNTER) ──────────────────────────────────
// Blind blob-like entity that hunts by sound. Fast chase.
// Distracted by NoiseMaker for 5s.

export class Drowned extends BaseEntity {
  private _distractionTimer: number = 0;
  private _particleMeshes: THREE.Mesh[] = [];

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super(type, position, difficulty);
    this.perception = {
      sightRange: 0,
      sightCone: 0,
      hearingRange: 25,
      detectionSpeed: 0.6 + difficulty * 0.05,
    } satisfies EntityPerception;
    this.speed = 3 + difficulty * 0.4;
    this._attackDamage = 20;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'drowned';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a5a4a,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0a3a2a,
      emissiveIntensity: 0.2,
      roughness: 0.9,
      metalness: 0.1,
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), bodyMat);
    body.position.y = 0.4;
    body.scale.set(1, 0.7, 0.9);
    group.add(body);
    this._trackMaterial(body.geometry, bodyMat);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x2a7a6a,
      transparent: true,
      opacity: 0.3,
    });
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), innerMat);
    inner.position.y = 0.4;
    group.add(inner);
    this._trackMaterial(inner.geometry, innerMat);

    const dropletMat = new THREE.MeshBasicMaterial({
      color: 0x4aaaaa,
      transparent: true,
      opacity: 0.4,
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), dropletMat);
      droplet.position.set(Math.cos(angle) * 0.55, 0.2 + Math.sin(i * 2) * 0.15, Math.sin(angle) * 0.55);
      droplet.userData.angle = angle;
      droplet.userData.offset = i * 1.5;
      group.add(droplet);
      this._particleMeshes.push(droplet);
      this._trackMaterial(droplet.geometry, dropletMat);
    }

    return group;
  }

  protected canSee(_target: THREE.Vector3): boolean {
    return false;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    super.update(dt, playerPosition);

    const t = performance.now() / 1000;
    for (let i = 0; i < this._particleMeshes.length; i++) {
      const p = this._particleMeshes[i];
      const angle = (p.userData.angle as number) + t * 0.5;
      const offset = p.userData.offset as number;
      p.position.x = Math.cos(angle + offset * 0.3) * 0.55;
      p.position.z = Math.sin(angle + offset * 0.3) * 0.55;
      p.position.y = 0.2 + Math.sin(t * 2 + offset) * 0.1;
    }
  }

  protected _handleIdleState(dt: number, playerPos: THREE.Vector3): void {
    const hearsPlayer = this.canHear(playerPos, this.noiseSources);
    if (hearsPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      this.targetPosition = playerPos.clone();
      this._transitionState(EntityState.INVESTIGATING);
    }
  }

  protected _handleInvestigatingState(dt: number, playerPos: THREE.Vector3): void {
    const hearsPlayer = this.canHear(playerPos, this.noiseSources);
    if (hearsPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.6) {
        this.speed = 5 + (this._distractionTimer > 0 ? 0 : 0.5);
        this.targetPosition = playerPos.clone();
        this._transitionState(EntityState.CHASING);
        return;
      }
      this.targetPosition = playerPos.clone();
    }

    if (this._distractionTimer > 0) {
      this._distractionTimer -= dt;
      const closestNoise = this._findClosestNoiseSource();
      if (closestNoise) {
        this.targetPosition = closestNoise;
      }
    }

    super._handleInvestigatingState(dt, playerPos);
  }

  protected _handleChasingState(dt: number, playerPos: THREE.Vector3): void {
    if (this._distractionTimer > 0) {
      this._distractionTimer -= dt;
      const closestNoise = this._findClosestNoiseSource();
      if (closestNoise && this.position.distanceTo(closestNoise) < this.position.distanceTo(playerPos)) {
        this.targetPosition = closestNoise;
      } else {
        this.targetPosition = playerPos.clone();
      }
      this.moveTowards(this.targetPosition!, dt);

      if (this._distractionTimer <= 0) {
        this.speed = 5;
        this.targetPosition = playerPos.clone();
      }
      return;
    }

    this.speed = 5;
    super._handleChasingState(dt, playerPos);
  }

  private _findClosestNoiseSource(): THREE.Vector3 | null {
    let closest: THREE.Vector3 | null = null;
    let closestDist = Infinity;
    for (const source of this.noiseSources) {
      const dist = this.position.distanceTo(source);
      if (dist < closestDist) {
        closestDist = dist;
        closest = source;
      }
    }
    return closest;
  }

  distract(duration: number): void {
    this._distractionTimer = duration;
    this.speed = 3;
    if (this.state !== EntityState.CHASING) {
      this._transitionState(EntityState.INVESTIGATING);
    }
  }
}

// ── Archivist (SENTRY) ──────────────────────────────────────
// Floating cube with scanning beam. Stationary sentry.
// 360° LOS immunity to noise. Disabled by EMP for 8s.

export class Archivist extends BaseEntity {
  private _ring!: THREE.Mesh;
  private _ringMat!: THREE.MeshBasicMaterial;
  private _beam!: THREE.Mesh;
  private _beamMat!: THREE.MeshBasicMaterial;
  private _isAlarmed: boolean = false;
  private _scanAngle: number = 0;

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super(type, position, difficulty);
    this.perception = {
      sightRange: 20,
      sightCone: 360,
      hearingRange: 0,
      detectionSpeed: 0.8 + difficulty * 0.05,
    } satisfies EntityPerception;
    this.speed = 0;
    this._attackDamage = 25;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'archivist';

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xda9a3a,
      emissive: 0xda6a1a,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3,
    });

    const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), coreMat);
    core.position.y = 1.0;
    group.add(core);
    this._trackMaterial(core.geometry, coreMat);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.3,
    });
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), innerMat);
    inner.position.y = 1.0;
    group.add(inner);
    this._trackMaterial(inner.geometry, innerMat);

    this._ringMat = new THREE.MeshBasicMaterial({
      color: 0x44ddff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ringGeo = new THREE.TorusGeometry(0.4, 0.03, 8, 24);
    this._ring = new THREE.Mesh(ringGeo, this._ringMat);
    this._ring.position.y = 1.0;
    this._ring.rotation.x = Math.PI / 2;
    group.add(this._ring);
    this._trackMaterial(ringGeo, this._ringMat);

    this._beamMat = new THREE.MeshBasicMaterial({
      color: 0x44ddff,
      transparent: true,
      opacity: 0.15,
    });
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.3, 2, 6);
    this._beam = new THREE.Mesh(beamGeo, this._beamMat);
    this._beam.position.y = 0.0;
    group.add(this._beam);
    this._trackMaterial(beamGeo, this._beamMat);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    super.update(dt, playerPosition);

    this._scanAngle += dt * 1.5;
    this._ring.rotation.z = this._scanAngle;
    this._ring.position.y = 1.0 + Math.sin(this._scanAngle * 2) * 0.05;

    this._beam.scale.y = 0.5 + Math.abs(Math.sin(this._scanAngle * 3)) * 0.5;

    if (this.state === EntityState.CHASING || this.state === EntityState.ATTACKING) {
      this._ringMat.color.setHex(0xff4444);
      this._beamMat.color.setHex(0xff4444);
      this._isAlarmed = true;
    } else {
      this._ringMat.color.setHex(0x44ddff);
      this._beamMat.color.setHex(0x44ddff);
      this._isAlarmed = false;
    }
  }

  protected canHear(_target: THREE.Vector3, _noiseSources: THREE.Vector3[]): boolean {
    return false;
  }

  protected _handleIdleState(dt: number, playerPos: THREE.Vector3): void {
    const seesPlayer = this.canSee(playerPos);

    if (seesPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.4) {
        this._transitionState(EntityState.CHASING);
        this.emit('call-for-help', { entity: this, position: this.position.clone() });
      }
    } else {
      this.awareness = 0;
    }
  }

  protected _handleChasingState(dt: number, _playerPos: THREE.Vector3): void {
    this._attackCooldown = Math.max(0, this._attackCooldown - dt);

    if (!this.canSee(_playerPos)) {
      this.awareness = Math.max(0, this.awareness - dt * 0.3);
      if (this.awareness <= 0) {
        this._transitionState(EntityState.IDLE);
      }
    } else {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (_playerPos.distanceTo(this.position) < 3) {
        this.emit('attack', { entity: this, damage: this._attackDamage });
      }
    }
  }

  isAlarmed(): boolean {
    return this._isAlarmed;
  }
}

// ── Shopper (AMBUSHER) ──────────────────────────────────────
// Humanoid with wrong proportions. Stands still when watched.
// Rapid chase when player turns away. Flees UV light.

export class Shopper extends BaseEntity {
  private _isBeingWatched: boolean = false;
  private _uvFleeTimer: number = 0;
  private _sneakSpeed: number;
  private _chaseSpeed: number;

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super(type, position, difficulty);
    this.perception = {
      sightRange: 12,
      sightCone: 90,
      hearingRange: 10,
      detectionSpeed: 0.5 + difficulty * 0.05,
    } satisfies EntityPerception;
    this._sneakSpeed = 1.5 + difficulty * 0.2;
    this._chaseSpeed = 6 + difficulty * 0.3;
    this.speed = this._sneakSpeed;
    this._attackDamage = 12;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'shopper';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7a6a5a,
      roughness: 0.8,
      metalness: 0.05,
    });

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a6a,
      roughness: 0.7,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), bodyMat);
    body.position.y = 0.7;
    group.add(body);
    this._trackMaterial(body.geometry, bodyMat);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.3), headMat);
    head.position.set(0, 1.15, 0);
    group.add(head);
    this._trackMaterial(head.geometry, headMat);

    const armMat = new THREE.MeshStandardMaterial({
      color: 0x7a6a5a,
      roughness: 0.8,
    });

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), armMat);
    leftArm.position.set(-0.3, 0.8, 0);
    group.add(leftArm);
    this._trackMaterial(leftArm.geometry, armMat);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), armMat);
    rightArm.position.set(0.3, 0.8, 0);
    group.add(rightArm);
    this._trackMaterial(rightArm.geometry, armMat);

    const legMat = new THREE.MeshStandardMaterial({
      color: 0x6a5a4a,
      roughness: 0.9,
    });

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), legMat);
    leftLeg.position.set(-0.12, 0.2, 0);
    group.add(leftLeg);
    this._trackMaterial(leftLeg.geometry, legMat);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), legMat);
    rightLeg.position.set(0.12, 0.2, 0);
    group.add(rightLeg);
    this._trackMaterial(rightLeg.geometry, legMat);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    leftEye.position.set(-0.1, 1.2, -0.16);
    group.add(leftEye);
    this._trackMaterial(leftEye.geometry, eyeMat);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    rightEye.position.set(0.1, 1.2, -0.16);
    group.add(rightEye);
    this._trackMaterial(rightEye.geometry, eyeMat);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    const toEntity = new THREE.Vector3().copy(this.position).sub(playerPosition).normalize();
    const dot = this.playerViewDirection.dot(toEntity);
    this._isBeingWatched = dot > 0.25;

    if (this._uvFleeTimer > 0) {
      this._uvFleeTimer -= dt;
      this._fleeFromPlayer(playerPosition, dt);
      this.mesh.position.copy(this.position);
      if (this._uvFleeTimer <= 0) {
        this._transitionState(EntityState.RETURNING);
      }
      return;
    }

    super.update(dt, playerPosition);
  }

  private _fleeFromPlayer(playerPos: THREE.Vector3, dt: number): void {
    this._direction.copy(this.position).sub(playerPos);
    this._direction.y = 0;
    if (this._direction.lengthSq() < 0.01) return;
    this._direction.normalize();
    this.position.x += this._direction.x * this._chaseSpeed * dt;
    this.position.z += this._direction.z * this._chaseSpeed * dt;
    this.rotateTowards(
      new THREE.Vector3().copy(this.position).add(this._direction),
      dt,
    );
  }

  protected _handleIdleState(dt: number, playerPos: THREE.Vector3): void {
    if (this._isBeingWatched) {
      this.awareness = Math.max(0, this.awareness - dt * 0.2);
      return;
    }

    const seesPlayer = this.canSee(playerPos);
    if (seesPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.6) {
        this.speed = this._chaseSpeed;
        this._transitionState(EntityState.CHASING);
        return;
      }
    }

    if (this.patrolPath.length > 0) {
      this._transitionState(EntityState.PATROLLING);
    }
  }

  protected _handlePatrollingState(dt: number, playerPos: THREE.Vector3): void {
    if (this._isBeingWatched) {
      return;
    }

    const seesPlayer = this.canSee(playerPos);
    if (seesPlayer) {
      this.awareness = Math.min(1, this.awareness + dt * this.perception.detectionSpeed);
      if (this.awareness >= 0.6) {
        this.speed = this._chaseSpeed;
        this._transitionState(EntityState.CHASING);
        return;
      }
    }

    this.updatePatrolling(dt);
  }

  protected _handleChasingState(dt: number, playerPos: THREE.Vector3): void {
    if (this._isBeingWatched && this.position.distanceTo(playerPos) > 3) {
      this.speed = this._sneakSpeed;
      return;
    }

    this.speed = this._chaseSpeed;
    super._handleChasingState(dt, playerPos);
  }

  fleeFromUV(): void {
    this._uvFleeTimer = 4;
    this.speed = this._chaseSpeed;
    if (this.state !== EntityState.STUNNED) {
      this._transitionState(EntityState.CHASING);
    }
  }
}

// ── Stairwalker (STALKER) ────────────────────────────────────
// Thin elongated figure. Teleports between floors.
// Always aware of player. Only evasion is vertical movement.

export class Stairwalker extends BaseEntity {
  private _targetFloor: number = 0;
  private _currentFloor: number = 0;
  private _teleportCooldown: number = 3;
  private _floorHeight: number = 3;

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super(type, position, difficulty);
    this.perception = {
      sightRange: 50,
      sightCone: 360,
      hearingRange: 50,
      detectionSpeed: 1.0,
    } satisfies EntityPerception;
    this.speed = 0;
    this._attackDamage = 30;
    this._currentFloor = Math.round(position.y / this._floorHeight);
    this._targetFloor = this._currentFloor;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'stairwalker';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: 0x1a0a0a,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.5,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), bodyMat);
    body.position.y = 1.2;
    group.add(body);
    this._trackMaterial(body.geometry, bodyMat);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: 0x2a0a0a,
      emissiveIntensity: 0.2,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), headMat);
    head.position.set(0, 2.15, 0);
    group.add(head);
    this._trackMaterial(head.geometry, headMat);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xaa3a3a,
      transparent: true,
      opacity: 0.08,
    });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), glowMat);
    glow.position.y = 1.1;
    group.add(glow);
    this._trackMaterial(glow.geometry, glowMat);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
    leftEye.position.set(-0.04, 2.15, -0.06);
    group.add(leftEye);
    this._trackMaterial(leftEye.geometry, eyeMat);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
    rightEye.position.set(0.04, 2.15, -0.06);
    group.add(rightEye);
    this._trackMaterial(rightEye.geometry, eyeMat);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    this._updateFloorTracking(playerPosition, dt);
    super.update(dt, playerPosition);
  }

  private _updateFloorTracking(playerPos: THREE.Vector3, dt: number): void {
    const playerFloor = Math.round(playerPos.y / this._floorHeight);
    const floorDiff = playerFloor - this._currentFloor;

    this._teleportCooldown -= dt;

    if (Math.abs(floorDiff) > 0 && this._teleportCooldown <= 0) {
      const floorsToMove = Math.sign(floorDiff) * Math.max(2, Math.abs(floorDiff) - 1);
      this._targetFloor = this._currentFloor + floorsToMove;

      if (this._teleportToFloor(this._targetFloor, playerPos)) {
        this._teleportCooldown = 4 - Math.abs(floorsToMove) * 0.3;
      }
    }

    if (Math.abs(floorDiff) <= 2 && this._teleportCooldown <= 0) {
      this._targetFloor = playerFloor;
      this._teleportToFloor(this._targetFloor, playerPos);
      this._teleportCooldown = 6;
    }
  }

  private _teleportToFloor(floor: number, playerPos: THREE.Vector3): boolean {
    const newY = floor * this._floorHeight;
    const offsetX = (Math.random() - 0.5) * 4;
    const offsetZ = (Math.random() - 0.5) * 4;

    this._currentFloor = floor;
    this.position.set(
      playerPos.x + offsetX,
      newY,
      playerPos.z + offsetZ,
    );

    this.mesh.position.copy(this.position);
    return true;
  }

  protected _handleIdleState(_dt: number, playerPos: THREE.Vector3): void {
    const dist = this.position.distanceTo(playerPos);
    if (dist < 5) {
      this.emit('attack', { entity: this, damage: this._attackDamage } satisfies AttackEvent);
      return;
    }
    this.awareness = 1.0;
    this._transitionState(EntityState.CHASING);
  }

  protected _handleChasingState(_dt: number, playerPos: THREE.Vector3): void {
    const dist = this.position.distanceTo(playerPos);
    if (dist < 5) {
      this.emit('attack', { entity: this, damage: this._attackDamage } satisfies AttackEvent);
    }
  }

  protected canHear(_target: THREE.Vector3, _noiseSources: THREE.Vector3[]): boolean {
    return true;
  }

  protected canSee(_target: THREE.Vector3): boolean {
    return true;
  }

  protected moveTowards(_target: THREE.Vector3, _dt: number): void {
    // Stairwalker uses teleportation, not standard movement
  }
}

// ── Reflection (MIMIC) ──────────────────────────────────────
// Perfect copy of player. Rises from reflective surfaces.
// Mirrors player movement. Contact = damage + reset.

export class Reflection extends BaseEntity {
  private _mirrorOffset: THREE.Vector3;
  private _riseProgress: number = 0;
  private _isRising: boolean = true;
  private _playerLastPos: THREE.Vector3;

  constructor(type: ThreatType, position: THREE.Vector3, difficulty: number) {
    super(type, position, difficulty);
    this.perception = {
      sightRange: 0,
      sightCone: 0,
      hearingRange: 0,
      detectionSpeed: 0,
    } satisfies EntityPerception;
    this.speed = 0;
    this._attackDamage = 20 + difficulty * 2;
    this._mirrorOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      0,
      (Math.random() - 0.5) * 3,
    );
    this._playerLastPos = position.clone();
    this.position.y = -1;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'reflection';

    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.45,
      emissive: 0x4488ff,
      emissiveIntensity: 0.3,
      shininess: 100,
      specular: 0x4488ff,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.35), bodyMat);
    body.position.y = 0.8;
    group.add(body);
    this._trackMaterial(body.geometry, bodyMat);

    const headMat = new THREE.MeshPhongMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.5,
      emissive: 0x4488ff,
      emissiveIntensity: 0.2,
      shininess: 100,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), headMat);
    head.position.set(0, 1.3, 0);
    group.add(head);
    this._trackMaterial(head.geometry, headMat);

    const limbMat = new THREE.MeshPhongMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.35,
      emissive: 0x4488ff,
      emissiveIntensity: 0.15,
    });

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), limbMat);
    leftArm.position.set(-0.3, 0.8, 0);
    group.add(leftArm);
    this._trackMaterial(leftArm.geometry, limbMat);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), limbMat);
    rightArm.position.set(0.3, 0.8, 0);
    group.add(rightArm);
    this._trackMaterial(rightArm.geometry, limbMat);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), limbMat);
    leftLeg.position.set(-0.12, 0.2, 0);
    group.add(leftLeg);
    this._trackMaterial(leftLeg.geometry, limbMat);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), limbMat);
    rightLeg.position.set(0.12, 0.2, 0);
    group.add(rightLeg);
    this._trackMaterial(rightLeg.geometry, limbMat);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    if (this._isRising) {
      this._riseProgress += dt * 0.5;
      this.position.y = -1 + this._riseProgress * 1.2;
      this.mesh.position.copy(this.position);

      const opacity = Math.min(0.45, this._riseProgress * 0.45);
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            if ('opacity' in mat) {
              mat.opacity = opacity;
            }
          }
        }
      });

      if (this._riseProgress >= 1) {
        this._isRising = false;
        this._playerLastPos.copy(playerPosition);
        this.position.y = 0.2;
      }
      return;
    }

    this._mirrorPlayerMovement(dt, playerPosition);
    this.mesh.position.copy(this.position);

    const dist = this.position.distanceTo(playerPosition);
    if (dist < 1.2) {
      this.emit('attack', { entity: this, damage: this._attackDamage } satisfies AttackEvent);
      this.emit('reflection-touch', { entity: this, resetPosition: this._playerLastPos.clone() });
    }
  }

  private _mirrorPlayerMovement(_dt: number, playerPos: THREE.Vector3): void {
    const dx = playerPos.x - this._playerLastPos.x;
    const dz = playerPos.z - this._playerLastPos.z;

    this.position.x += dx;
    this.position.z += dz;

    this._playerLastPos.copy(playerPos);
  }

  breakLineOfSight(): void {
    this._isRising = true;
    this._riseProgress = 0;
    this.position.y = -1;
    this._mirrorOffset.set(
      (Math.random() - 0.5) * 3,
      0,
      (Math.random() - 0.5) * 3,
    );
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createEntity(type: ThreatType, position: THREE.Vector3, difficulty: number): BaseEntity {
  switch (type) {
    case ThreatType.PATROL:
      return new MiddleManager(type, position, difficulty);
    case ThreatType.SOUND_HUNTER:
      return new Drowned(type, position, difficulty);
    case ThreatType.SENTRY:
      return new Archivist(type, position, difficulty);
    case ThreatType.AMBUSHER:
      return new Shopper(type, position, difficulty);
    case ThreatType.STALKER:
      return new Stairwalker(type, position, difficulty);
    case ThreatType.MIMIC:
      return new Reflection(type, position, difficulty);
    default: {
      const _exhaustive: never = type;
      console.warn(`Unknown threat type: ${_exhaustive}, defaulting to Patrol`);
      return new MiddleManager(ThreatType.PATROL, position, difficulty);
    }
  }
}
