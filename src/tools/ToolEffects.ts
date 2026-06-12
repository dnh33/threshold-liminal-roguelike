import * as THREE from 'three';
import { ToolCategory } from './ToolSystem';
import type { ToolDefinition } from './ToolSystem';

export interface EffectContext {
  scene: THREE.Scene;
  playerPosition: THREE.Vector3;
  playerCamera: THREE.PerspectiveCamera;
  origin?: THREE.Vector3;
  target?: THREE.Object3D;
}

const PULSE_DURATION = 2;
const GLOW_DURATION = 5;
const FILTER_DURATION = 15;
const NOISE_RADIUS = 25;
const SCAN_RADIUS = 15;
const UV_RADIUS = 10;

export class ToolEffects {
  private static _pulseMeshes: THREE.Mesh[] = [];
  private static _activeFilters: Map<string, { endTime: number; overlay: HTMLDivElement | null }> = new Map();
  private static _effectTimeouts: Map<string, number> = new Map();

  static execute(toolId: string, ctx: EffectContext): boolean {
    switch (toolId) {
      case 'multitool':
        return ToolEffects._multitoolEffect(ctx);
      case 'uv-light':
        return ToolEffects._uvLightEffect(ctx);
      case 'anomaly-scanner':
        return ToolEffects._anomalyScannerEffect(ctx);
      case 'noise-maker':
        return ToolEffects._noiseMakerEffect(ctx);
      case 'keycard-cloner':
        return ToolEffects._keycardClonerEffect(ctx);
      case 'breather':
        return ToolEffects._breatherEffect(ctx);
      case 'flashlight':
        return ToolEffects._flashlightEffect(ctx);
      default:
        console.warn(`[ToolEffects] Unknown tool: ${toolId}`);
        return false;
    }
  }

  private static _multitoolEffect(ctx: EffectContext): boolean {
    if (!ctx.target) return false;

    const data = ctx.target.userData as Record<string, unknown>;
    if (data.electricalPanel) {
      const flickerInterval = setInterval(() => {
        const lights = ToolEffects._findLights(ctx.scene);
        for (const light of lights) {
          if (light instanceof THREE.Light) {
            light.intensity = Math.random() > 0.5 ? light.intensity * 0.1 : light.intensity;
          }
        }
      }, 100);

      setTimeout(() => {
        clearInterval(flickerInterval);
        const lights = ToolEffects._findLights(ctx.scene);
        for (const light of lights) {
          if (light instanceof THREE.Light) {
            light.intensity = (light.userData.originalIntensity as number) ?? light.intensity;
          }
        }
        ctx.target?.dispatchEvent({ type: 'panel-rewired' } as any);
      }, 2000);

      return true;
    }

    ctx.target.dispatchEvent({ type: 'door-unlock' } as any);
    return true;
  }

  private static _uvLightEffect(ctx: EffectContext): boolean {
    const origin = ctx.origin ?? ctx.playerPosition;

    const geometry = new THREE.SphereGeometry(UV_RADIUS, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8844ff,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(origin);
    sphere.position.y += 0.5;
    sphere.userData.toolEffect = 'uv-radiance';
    ctx.scene.add(sphere);

    const startTime = performance.now();
    const timeout = window.setTimeout(() => {
      ctx.scene.remove(sphere);
      geometry.dispose();
      material.dispose();
    }, GLOW_DURATION * 1000);

    ToolEffects._effectTimeouts.set(`uv-${startTime}`, timeout);

    const hiddenObjects: THREE.Object3D[] = [];
    ctx.scene.traverse((obj) => {
      const data = obj.userData as Record<string, unknown>;
      if (data.uvReactive === true && obj.position.distanceTo(origin) <= UV_RADIUS) {
        hiddenObjects.push(obj);
        ToolEffects._applyGlow(obj, 0xaa66ff);
      }
    });

    setTimeout(() => {
      for (const obj of hiddenObjects) {
        ToolEffects._removeGlow(obj);
      }
    }, GLOW_DURATION * 1000);

    return hiddenObjects.length > 0 || true;
  }

  private static _anomalyScannerEffect(ctx: EffectContext): boolean {
    const origin = ctx.origin ?? ctx.playerPosition;

    const ringGeo = new THREE.RingGeometry(0.1, 0.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(origin);
    ring.position.y += 0.3;
    ring.rotation.x = -Math.PI / 2;
    ring.userData.toolEffect = 'scanner-pulse';
    ctx.scene.add(ring);

    const startTime = performance.now();
    const pulseId = `scanner-${startTime}`;
    const pulse = { ring, ringMat, startTime, origin: origin.clone(), id: pulseId };
    ToolEffects._pulseMeshes.push(ring);

    const pulseLoop = () => {
      const elapsed = (performance.now() - pulse.startTime) / 1000;
      if (elapsed > PULSE_DURATION) {
        ctx.scene.remove(pulse.ring);
        pulse.ringMat.dispose();
        pulse.ring.geometry.dispose();
        const idx = ToolEffects._pulseMeshes.indexOf(pulse.ring);
        if (idx !== -1) ToolEffects._pulseMeshes.splice(idx, 1);
        return;
      }

      const progress = elapsed / PULSE_DURATION;
      const radius = 0.5 + progress * SCAN_RADIUS;
      pulse.ring.scale.set(radius, radius, radius);
      pulse.ringMat.opacity = Math.max(0, 0.6 * (1 - progress));

      requestAnimationFrame(pulseLoop);
    };
    requestAnimationFrame(pulseLoop);

    const anomalyObjects: THREE.Object3D[] = [];
    ctx.scene.traverse((obj) => {
      const data = obj.userData as Record<string, unknown>;
      if (data.anomalySource === true && obj.position.distanceTo(origin) <= SCAN_RADIUS) {
        anomalyObjects.push(obj);
        ToolEffects._applyGlow(obj, 0x00ffaa);
      }
    });

    setTimeout(() => {
      for (const obj of anomalyObjects) {
        ToolEffects._removeGlow(obj);
      }
    }, PULSE_DURATION * 1000);

    return anomalyObjects.length > 0 || true;
  }

  private static _noiseMakerEffect(ctx: EffectContext): boolean {
    const origin = ctx.origin ?? ctx.playerPosition.clone().add(new THREE.Vector3(0, 1, 0));

    const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 0.8,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(origin);
    sphere.userData.toolEffect = 'noise-source';
    ctx.scene.add(sphere);

    const pulseGeo = new THREE.SphereGeometry(1, 24, 24);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    pulseMesh.position.copy(origin);
    pulseMesh.userData.toolEffect = 'noise-pulse';
    ctx.scene.add(pulseMesh);

    const startTime = performance.now();
    const animatePulse = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 3) {
        ctx.scene.remove(sphere);
        ctx.scene.remove(pulseMesh);
        sphereMat.dispose();
        sphere.geometry.dispose();
        pulseMat.dispose();
        pulseMesh.geometry.dispose();
        return;
      }

      const radius = 1 + elapsed * 3;
      pulseMesh.scale.set(radius, radius, radius);
      pulseMat.opacity = Math.max(0, 0.15 * (1 - elapsed / 3));
      sphereMat.opacity = Math.max(0, 0.8 * (1 - elapsed / 3));

      requestAnimationFrame(animatePulse);
    };
    requestAnimationFrame(animatePulse);

    ctx.scene.dispatchEvent({ type: 'noise-source', position: origin, radius: NOISE_RADIUS, duration: 3 } as any);

    return true;
  }

  private static _keycardClonerEffect(ctx: EffectContext): boolean {
    if (!ctx.target) return false;

    const cloneGeo = new THREE.BoxGeometry(0.4, 0.6, 0.05);
    const cloneMat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
    });
    const clone = new THREE.Mesh(cloneGeo, cloneMat);
    clone.position.copy(ctx.playerPosition);
    clone.position.y += 1.2;
    clone.userData.toolEffect = 'cloner-card';

    if (ctx.target) {
      const dir = new THREE.Vector3().subVectors(ctx.target.position, clone.position).normalize();
      clone.lookAt(ctx.target.position);
      clone.position.add(dir.multiplyScalar(0.5));
    }

    ctx.scene.add(clone);

    const startTime = performance.now();
    const animateCard = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 1.5) {
        ctx.scene.remove(clone);
        cloneMat.dispose();
        cloneGeo.dispose();
        return;
      }

      clone.position.y += 0.5 * (1 / 60);
      cloneMat.opacity = Math.max(0, 0.7 * (1 - elapsed / 1.5));
      cloneMat.emissiveIntensity = Math.max(0, 0.5 * (1 - elapsed / 1.5));

      requestAnimationFrame(animateCard);
    };
    requestAnimationFrame(animateCard);

    ctx.target.dispatchEvent({ type: 'door-bypass' } as any);

    return true;
  }

  private static _breatherEffect(ctx: EffectContext): boolean {
    const existing = ToolEffects._activeFilters.get('breather');
    if (existing) {
      existing.endTime = performance.now() + FILTER_DURATION * 1000;
      return true;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 100;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(100, 200, 255, 0.15) 100%);
      opacity: 0; transition: opacity 0.5s ease;
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    const endTime = performance.now() + FILTER_DURATION * 1000;
    ToolEffects._activeFilters.set('breather', { endTime, overlay });

    const timeout = window.setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        ToolEffects._activeFilters.delete('breather');
      }, 500);
    }, FILTER_DURATION * 1000);

    ToolEffects._effectTimeouts.set('breather-timeout', timeout);

    ctx.scene.dispatchEvent({ type: 'hazard-immunity', active: true, duration: FILTER_DURATION } as any);

    return true;
  }

  private static _flashlightEffect(_ctx: EffectContext): boolean {
    console.warn('[ToolEffects] Flashlight upgrade not implemented');
    return false;
  }

  private static _findLights(scene: THREE.Scene): THREE.Object3D[] {
    const lights: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Light) {
        if (obj.userData.originalIntensity === undefined) {
          obj.userData.originalIntensity = obj.intensity;
        }
        lights.push(obj);
      }
    });
    return lights;
  }

  private static _applyGlow(obj: THREE.Object3D, color: number): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            if (mat.userData._originalEmissive === undefined) {
              mat.userData._originalEmissive = mat.emissive.getHex();
              mat.userData._originalEmissiveIntensity = mat.emissiveIntensity;
            }
            mat.emissive.setHex(color);
            mat.emissiveIntensity = 0.6;
            mat.needsUpdate = true;
          }
        }
      }
    });
  }

  private static _removeGlow(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            if (mat.userData._originalEmissive !== undefined) {
              mat.emissive.setHex(mat.userData._originalEmissive as number);
              mat.emissiveIntensity = mat.userData._originalEmissiveIntensity as number;
              delete mat.userData._originalEmissive;
              delete mat.userData._originalEmissiveIntensity;
              mat.needsUpdate = true;
            }
          }
        }
      }
    });
  }

  static getToolDefinitions(): ToolDefinition[] {
    return [
      {
        id: 'multitool',
        name: 'Multitool',
        description: 'Hack terminals, rewire panels, and override locked doors',
        category: ToolCategory.TOOL,
        maxUses: -1,
        cooldown: 1.5,
        icon: '🔧',
      },
      {
        id: 'uv-light',
        name: 'UV Light',
        description: 'Reveal hidden messages, entities, and paths within 10m',
        category: ToolCategory.TOOL,
        maxUses: 5,
        cooldown: 0.5,
        icon: '💡',
      },
      {
        id: 'anomaly-scanner',
        name: 'Anomaly Scanner',
        description: 'Detect and highlight anomaly sources within 15m',
        category: ToolCategory.TOOL,
        maxUses: 8,
        cooldown: 1,
        icon: '📡',
      },
      {
        id: 'noise-maker',
        name: 'Noise Maker',
        description: 'Create a distraction at the targeted location',
        category: ToolCategory.CONSUMABLE,
        maxUses: 3,
        cooldown: 0.5,
        icon: '📢',
      },
      {
        id: 'keycard-cloner',
        name: 'Keycard Cloner',
        description: 'Clone nearby keycard credentials to bypass locked doors',
        category: ToolCategory.KEY,
        maxUses: 3,
        cooldown: 2,
        icon: '💳',
      },
      {
        id: 'breather',
        name: 'Breather',
        description: 'Grants 15 seconds of immunity to hazardous environments',
        category: ToolCategory.CONSUMABLE,
        maxUses: 3,
        cooldown: 1,
        icon: '🫁',
      },
      {
        id: 'flashlight',
        name: 'Flashlight Upgrade',
        description: 'Upgrades your flashlight with extended range and battery',
        category: ToolCategory.TOOL,
        maxUses: -1,
        cooldown: 0,
        icon: '🔦',
      },
    ];
  }

  static cleanup(): void {
    for (const [, timeout] of ToolEffects._effectTimeouts) {
      clearTimeout(timeout);
    }
    ToolEffects._effectTimeouts.clear();
    ToolEffects._activeFilters.clear();

    for (const mesh of ToolEffects._pulseMeshes) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }
    ToolEffects._pulseMeshes = [];
  }
}
