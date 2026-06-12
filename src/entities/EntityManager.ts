import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import type { ThreatType } from '../biomes/BiomeTypes';
import { BaseEntity, EntityState } from './BaseEntity';
import { createEntity } from './EntityBehaviors';
import type { AnomalyInstance } from '../systems/AnomalySystem';
import type { Engine } from '../core/Engine';

export interface EntityConfig {
  type: ThreatType;
  position: THREE.Vector3;
  patrolPath?: THREE.Vector3[];
  difficulty: number;
  biomeSeed: number;
}

export interface EntitySpawnEvent {
  entity: BaseEntity;
  config: EntityConfig;
}

export interface EntityDespawnEvent {
  entity: BaseEntity;
  reason: string;
}

export interface EntityAttackEvent {
  entity: BaseEntity;
  damage: number;
}

export interface EntityDetectedPlayerEvent {
  entity: BaseEntity;
  detectionLevel: number;
}

type EntityEffect = {
  speedBoost: number;
  rangeBoost: number;
  aggroMultiplier: number;
};

export class EntityManager extends EventEmitter {
  private entities: BaseEntity[] = [];
  private scene: THREE.Scene;
  private engine: Engine;
  private maxEntities: number = 12;
  private activeEffects: Map<string, EntityEffect> = new Map();
  private _disposed: boolean = false;
  private _reusableVec: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, engine: Engine) {
    super();
    this.scene = scene;
    this.engine = engine;
  }

  spawnEntities(configs: EntityConfig[]): void {
    for (const config of configs) {
      this.spawnEntity(config);
    }
  }

  spawnEntity(config: EntityConfig): BaseEntity {
    if (this.entities.length >= this.maxEntities) {
      console.warn(`[EntityManager] Max entities reached (${this.maxEntities}), cannot spawn ${config.type}`);
      return null as unknown as BaseEntity;
    }

    const entity = this.createEntityForType(config.type, config);
    this.scene.add(entity.mesh);
    this.entities.push(entity);

    entity.on('attack', (data: unknown) => {
      const event = data as { entity: BaseEntity; damage: number };
      this.emit('entity-attack', { entity: event.entity, damage: event.damage } satisfies EntityAttackEvent);
    });

    entity.on('call-for-help', (data: unknown) => {
      const event = data as { entity: BaseEntity; position: THREE.Vector3 };
      this._alertNearbyEntities(event.entity, event.position);
    });

    entity.on('state-changed', (data: unknown) => {
      const event = data as { previous: EntityState; current: EntityState };
      if (event.current === EntityState.CHASING) {
        const detection = entity.getDetectionLevel();
        this.emit('entity-detected-player', {
          entity,
          detectionLevel: detection,
        } satisfies EntityDetectedPlayerEvent);
      }
    });

    entity.on('reflection-touch', (data: unknown) => {
      const event = data as { entity: BaseEntity; resetPosition: THREE.Vector3 };
      this.emit('player-reset', { entity: event.entity, position: event.resetPosition });
    });

    this.emit('entity-spawned', { entity, config } satisfies EntitySpawnEvent);

    return entity;
  }

  private createEntityForType(type: ThreatType, config: EntityConfig): BaseEntity {
    const entity = createEntity(type, config.position, config.difficulty);

    if (config.patrolPath && config.patrolPath.length > 0) {
      entity['patrolPath'] = config.patrolPath;
    }

    return entity;
  }

  despawnEntity(entity: BaseEntity): void {
    const idx = this.entities.indexOf(entity);
    if (idx === -1) return;

    this.entities.splice(idx, 1);
    this.scene.remove(entity.mesh);
    entity.dispose();
    this.emit('entity-despawned', { entity, reason: 'despawned' } satisfies EntityDespawnEvent);
  }

  clearAll(): void {
    for (const entity of [...this.entities]) {
      this.scene.remove(entity.mesh);
      entity.dispose();
    }
    this.entities.length = 0;
    this.activeEffects.clear();
  }

  applyAnomaly(anomaly: AnomalyInstance): void {
    for (const effect of anomaly.effects) {
      if (effect.type === 'entity_empower') {
        const speedBoost = (effect.params.speedBoost as number) ?? 0;
        const rangeBoost = (effect.params.detectionRangeBoost as number) ?? 0;
        const aggroMultiplier = (effect.params.aggroMultiplier as number) ?? 1;

        const eff: EntityEffect = {
          speedBoost,
          rangeBoost,
          aggroMultiplier,
        };

        this.activeEffects.set(anomaly.type, eff);

        for (const entity of this.entities) {
          entity.setSpeed(entity['speed'] * (1 + speedBoost));
          entity.perception.sightRange *= (1 + rangeBoost);
          entity.perception.hearingRange *= (1 + rangeBoost);
          entity.perception.detectionSpeed *= aggroMultiplier;
        }
      }
    }
  }

  removeAnomalyEffects(anomalyType: string): void {
    const effect = this.activeEffects.get(anomalyType);
    if (!effect) return;

    for (const entity of this.entities) {
      entity.setSpeed(entity['speed'] / (1 + effect.speedBoost));
      entity.perception.sightRange /= (1 + effect.rangeBoost);
      entity.perception.hearingRange /= (1 + effect.rangeBoost);
      entity.perception.detectionSpeed /= effect.aggroMultiplier;
    }

    this.activeEffects.delete(anomalyType);
  }

  private _alertNearbyEntities(source: BaseEntity, position: THREE.Vector3): void {
    const alertRadius = 15;
    for (const entity of this.entities) {
      if (entity === source) continue;
      if (entity.state === EntityState.STUNNED || entity.state === EntityState.ATTACKING) continue;

      const dist = entity.position.distanceTo(position);
      if (dist <= alertRadius) {
        entity['targetPosition'] = position.clone();
        if (entity.state === EntityState.IDLE || entity.state === EntityState.PATROLLING) {
          entity['_transitionState'](EntityState.INVESTIGATING);
        }
      }
    }
  }

  update(dt: number, playerPosition: THREE.Vector3, noiseSources: THREE.Vector3[]): void {
    if (this._disposed) return;

    const camera = this.engine.sceneManager.activeCamera;
    const viewDir = this._reusableVec;
    viewDir.set(0, 0, -1).applyQuaternion(camera.quaternion);

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];

      entity.playerViewDirection.copy(viewDir);
      entity.updateNoiseSources(noiseSources);
      entity.update(dt, playerPosition);

      if (entity.state === EntityState.STUNNED && entity['_stunDuration'] > 0) {
        const flash = Math.sin(performance.now() / 100 * 10) * 0.3 + 0.3;
        entity.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
                mat.opacity = flash;
              }
            }
          }
        });
      }

      if (entity.state === EntityState.CHASING) {
        const level = entity.getDetectionLevel();
        if (level > 0.5) {
          this.emit('entity-chasing', { entity, detectionLevel: level });
        }
      }
    }
  }

  setUVActive(active: boolean): void {
    for (const entity of this.entities) {
      const shopper = entity as unknown as { fleeFromUV?: () => void };
      if (shopper.fleeFromUV && active) {
        const dist = entity.position.distanceTo(
          this.engine.sceneManager.activeCamera.position,
        );
        if (dist < 10) {
          shopper.fleeFromUV();
        }
      }
    }
  }

  distractNearbyEntities(position: THREE.Vector3, radius: number, duration: number): void {
    for (const entity of this.entities) {
      const drowned = entity as unknown as { distract?: (d: number) => void };
      if (drowned.distract && entity.position.distanceTo(position) <= radius) {
        drowned.distract(duration);
        continue;
      }

      if (entity.position.distanceTo(position) <= radius) {
        if (entity.state === EntityState.IDLE || entity.state === EntityState.PATROLLING) {
          entity['targetPosition'] = position.clone();
          entity['_transitionState'](EntityState.INVESTIGATING);
        }
      }
    }
  }

  getActiveEntities(): BaseEntity[] {
    return [...this.entities];
  }

  getEntitiesByType(type: ThreatType): BaseEntity[] {
    return this.entities.filter(e => e.type === type);
  }

  getEntitiesByState(state: EntityState): BaseEntity[] {
    return this.entities.filter(e => e.state === state);
  }

  getEntityCount(): number {
    return this.entities.length;
  }

  setMaxEntities(max: number): void {
    this.maxEntities = max;
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    this.clearAll();
    this.activeEffects.clear();
    this.removeAllListeners();
  }
}
