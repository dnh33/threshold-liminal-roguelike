import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import type { PlayerController } from './PlayerController';

const MAX_INTERACTION_DISTANCE = 3;
const INTERACTION_COOLDOWN = 0.3;
const HIGHLIGHT_COLOR = new THREE.Color(0x88ccff);

const InteractionState = {
  IDLE: 'idle',
  HOVERING: 'hovering',
  INTERACTING: 'interacting',
} as const;

type InteractionState = (typeof InteractionState)[keyof typeof InteractionState];

export interface InteractableData {
  interactable: true;
  interactionType?: 'tool-pickup' | 'door-open' | 'terminal' | 'container' | 'custom';
  toolId?: string;
  doorId?: string;
  terminalId?: string;
  customAction?: string;
  label?: string;
  highlightColor?: number;
}

export interface InteractionEvent {
  object: THREE.Object3D;
  point: THREE.Vector3;
  distance: number;
  data: InteractableData;
}

export class InteractionSystem extends EventEmitter {
  private _state: InteractionState = InteractionState.IDLE;
  private _player: PlayerController;
  private _scene: THREE.Scene;
  private _cooldownTimer = 0;
  private _hoveredObject: THREE.Object3D | null = null;
  private _originalMaterialStates: Map<THREE.MeshStandardMaterial | THREE.MeshPhongMaterial, { emissive: number; emissiveIntensity: number }> = new Map();

  constructor(player: PlayerController, scene: THREE.Scene) {
    super();
    this._player = player;
    this._scene = scene;
  }

  getState(): InteractionState {
    return this._state;
  }

  getHoveredObject(): THREE.Object3D | null {
    return this._hoveredObject;
  }

  isHovering(): boolean {
    return this._state === InteractionState.HOVERING;
  }

  update(dt: number): void {
    if (!this._player.isEnabled()) {
      this._clearHover();
      return;
    }

    if (this._cooldownTimer > 0) {
      this._cooldownTimer -= dt;
    }

    const hit = this._castInteractionRay();

    if (hit) {
      this._handleHover(hit);
      if (this._player.getInput().isKeyJustPressed('e') && this._cooldownTimer <= 0) {
        this._handleInteraction(hit);
      }
    } else {
      this._clearHover();
    }
  }

  private _castInteractionRay(): THREE.Intersection | null {
    const raycaster = this._player.interactionRay;
    raycaster.far = MAX_INTERACTION_DISTANCE;
    const intersects = raycaster.intersectObjects(this._scene.children, true);

    for (const hit of intersects) {
      const obj = hit.object;
      let target: THREE.Object3D | null = obj;

      while (target) {
        const data = target.userData as Record<string, unknown>;
        if (data.interactable === true) {
          return hit;
        }
        target = target.parent;
      }
    }

    return null;
  }

  private _handleHover(hit: THREE.Intersection): void {
    const obj = this._getInteractableRoot(hit.object);
    if (!obj) return;

    if (this._hoveredObject !== obj) {
      this._clearHover();
      this._hoveredObject = obj;
      this._state = InteractionState.HOVERING;
      this._applyHighlight(obj);
      const data = obj.userData as InteractableData;
      this.emit('hover-start', {
        object: obj,
        point: hit.point,
        distance: hit.distance,
        data,
      } satisfies InteractionEvent);
    }
  }

  private _clearHover(): void {
    if (this._hoveredObject) {
      this._removeHighlight(this._hoveredObject);
      const data = this._hoveredObject.userData as InteractableData;
      this.emit('hover-end', {
        object: this._hoveredObject,
        point: new THREE.Vector3(),
        distance: 0,
        data,
      } satisfies InteractionEvent);
      this._hoveredObject = null;
    }
    this._state = InteractionState.IDLE;
  }

  private _handleInteraction(hit: THREE.Intersection): void {
    const obj = this._getInteractableRoot(hit.object);
    if (!obj) return;

    this._cooldownTimer = INTERACTION_COOLDOWN;
    this._state = InteractionState.INTERACTING;

    const data = obj.userData as InteractableData;
    const event: InteractionEvent = {
      object: obj,
      point: hit.point,
      distance: hit.distance,
      data,
    };

    this.emit('interact', event);

    if (data.interactionType === 'tool-pickup') {
      this.emit('tool-pickup', event);
    } else if (data.interactionType === 'door-open') {
      this.emit('door-open', event);
    }

    setTimeout(() => {
      if (this._state === InteractionState.INTERACTING) {
        this._state = InteractionState.IDLE;
      }
    }, INTERACTION_COOLDOWN * 1000);
  }

  private _getInteractableRoot(obj: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if ((current.userData as Record<string, unknown>).interactable === true) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  private _applyHighlight(obj: THREE.Object3D): void {
    const color = (obj.userData as InteractableData).highlightColor ?? HIGHLIGHT_COLOR.getHex();

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            if (!this._originalMaterialStates.has(mat)) {
              this._originalMaterialStates.set(mat, {
                emissive: mat.emissive.getHex(),
                emissiveIntensity: mat.emissiveIntensity,
              });
            }
            mat.emissive.setHex(color);
            mat.emissiveIntensity = 0.3;
            mat.needsUpdate = true;
          }
        }
      }
    });
  }

  private _removeHighlight(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            const state = this._originalMaterialStates.get(mat);
            if (state) {
              mat.emissive.setHex(state.emissive);
              mat.emissiveIntensity = state.emissiveIntensity;
              mat.needsUpdate = true;
            }
          }
        }
      }
    });

    this._originalMaterialStates.clear();
  }

  setScene(scene: THREE.Scene): void {
    this._scene = scene;
  }

  dispose(): void {
    this._clearHover();
    this.removeAllListeners();
    this._state = InteractionState.IDLE;
  }
}
