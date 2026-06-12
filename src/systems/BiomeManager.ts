import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import type { Engine } from '../core/Engine';
import { BiomeType, type BiomeDefinition, BIOME_DEFINITIONS } from '../biomes/BiomeTypes';

export const TransitionType = {
  FADE: 'fade',
  ELEVATOR: 'elevator',
  STAIRWELL: 'stairwell',
} as const;

export type TransitionType = (typeof TransitionType)[keyof typeof TransitionType];

export const TransitionPhase = {
  IDLE: 'idle',
  FADING_OUT: 'fading_out',
  SWAPPING: 'swapping',
  FADING_IN: 'fading_in',
} as const;

export type TransitionPhase = (typeof TransitionPhase)[keyof typeof TransitionPhase];

export interface BiomeInstance {
  readonly scene: THREE.Scene;
  readonly definition: BiomeDefinition;
  update(deltaTime: number): void;
  dispose(): void;
}

export interface TransitionState {
  phase: TransitionPhase;
  type: TransitionType;
  progress: number;
  duration: number;
  fromBiome: BiomeType | null;
  toBiome: BiomeType | null;
}

export class BiomeManager extends EventEmitter {
  private engine: Engine;
  private currentBiome: BiomeInstance | null = null;
  private nextBiome: BiomeInstance | null = null;
  private transitionState: TransitionState;
  private transitionOverlay: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight;
  private fogDummy: THREE.Fog;

  private static readonly TRANSITION_DURATION_FADE = 1.5;
  private static readonly TRANSITION_DURATION_ELEVATOR = 3.0;
  private static readonly TRANSITION_DURATION_STAIRWELL = 4.0;

  constructor(engine: Engine) {
    super();
    this.engine = engine;

    this.transitionState = {
      phase: TransitionPhase.IDLE,
      type: TransitionType.FADE,
      progress: 0,
      duration: 0,
      fromBiome: null,
      toBiome: null,
    };

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.engine.sceneManager.scene.add(this.ambientLight);

    this.fogDummy = new THREE.Fog(0x000000, 30, 80);
    this.engine.sceneManager.scene.fog = this.fogDummy;

    this.createTransitionOverlay();
  }

  private createTransitionOverlay(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float alpha = uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      uniforms: {
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(0x000000) },
      },
    });

    this.transitionOverlay = new THREE.Mesh(geometry, material);
    this.transitionOverlay.renderOrder = 999;
    this.transitionOverlay.frustumCulled = false;
    this.transitionOverlay.visible = false;
    this.engine.sceneManager.scene.add(this.transitionOverlay);
  }

  private createBiomeScene(definition: BiomeDefinition): BiomeInstance {
    const scene = new THREE.Scene();
    const { primary, secondary, accent, fog } = definition.colorPalette;

    const color = new THREE.Color(primary);
    scene.background = color;

    const fogColor = new THREE.Color(fog);
    scene.fog = new THREE.Fog(fogColor, definition.fogSettings.near, definition.fogSettings.far);

    const light = new THREE.AmbientLight(definition.ambientLight.color, definition.ambientLight.intensity);
    scene.add(light);

    const roomGroup = new THREE.Group();
    roomGroup.name = 'room_container';
    scene.add(roomGroup);

    for (let i = 0; i < 4; i++) {
      const wallMat = new THREE.MeshStandardMaterial({
        color: secondary,
        roughness: 0.8,
        metalness: 0.2,
      });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 0.2), wallMat);
      wall.position.set(0, 2, -5 + i * 3.5);
      wall.castShadow = true;
      wall.receiveShadow = true;
      roomGroup.add(wall);
    }

    const floorMat = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    const ambientPoint = new THREE.PointLight(accent, 0.3, 15);
    ambientPoint.position.set(0, 3, 0);
    roomGroup.add(ambientPoint);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.2);
    topLight.position.set(0, 10, 0);
    roomGroup.add(topLight);

    return {
      scene,
      definition,
      update: (_dt: number) => {
        const t = this.engine.time.elapsedTime;
        ambientPoint.intensity = 0.2 + Math.sin(t * 0.5) * 0.1;
      },
      dispose: () => {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      },
    };
  }

  getDefinition(biomeType: BiomeType): BiomeDefinition {
    return BIOME_DEFINITIONS[biomeType];
  }

  async loadBiome(biomeType: BiomeType): Promise<BiomeInstance> {
    const definition = this.getDefinition(biomeType);
    return this.createBiomeScene(definition);
  }

  async transitionTo(biomeType: BiomeType, transitionType?: TransitionType): Promise<void> {
    if (this.transitionState.phase !== TransitionPhase.IDLE) return;

    const type = transitionType ?? this.selectTransitionType(biomeType);
    const fromBiome = this.currentBiome?.definition.id ?? null;
    const toBiome = biomeType;

    this.nextBiome = await this.loadBiome(biomeType);
    this.nextBiome.scene.visible = false;
    this.engine.sceneManager.scene.add(this.nextBiome.scene);

    const duration = this.getTransitionDuration(type);

    this.transitionState = {
      phase: TransitionPhase.FADING_OUT,
      type,
      progress: 0,
      duration,
      fromBiome,
      toBiome,
    };

    this.emit('transition_started', { from: fromBiome, to: toBiome, type });

    return new Promise((resolve) => {
      const onComplete = () => {
        this.off('transition_completed', onComplete);
        resolve();
      };
      this.on('transition_completed', onComplete);
    });
  }

  private selectTransitionType(_targetBiome: BiomeType): TransitionType {
    if (this.transitionState.fromBiome === BiomeType.STAIRWELL_INFINITE) {
      return TransitionType.STAIRWELL;
    }
    const r = Math.random();
    if (r < 0.4) return TransitionType.FADE;
    if (r < 0.7) return TransitionType.ELEVATOR;
    return TransitionType.STAIRWELL;
  }

  private getTransitionDuration(type: TransitionType): number {
    switch (type) {
      case TransitionType.FADE: return BiomeManager.TRANSITION_DURATION_FADE;
      case TransitionType.ELEVATOR: return BiomeManager.TRANSITION_DURATION_ELEVATOR;
      case TransitionType.STAIRWELL: return BiomeManager.TRANSITION_DURATION_STAIRWELL;
    }
  }

  private swapBiomes(): void {
    if (this.currentBiome) {
      this.engine.sceneManager.scene.remove(this.currentBiome.scene);
      this.currentBiome.dispose();
    }

    if (this.nextBiome) {
      this.currentBiome = this.nextBiome;
      this.nextBiome = null;

      const fog = this.currentBiome.scene.fog as THREE.Fog;
      if (fog) {
        this.engine.sceneManager.setFog(fog.far, fog.near, fog.color);
      }

      const bg = this.currentBiome.scene.background as THREE.Color;
      if (bg) {
        this.engine.sceneManager.scene.background = bg;
      }

      this.currentBiome.scene.visible = true;
      this.emit('biome_loaded', { biomeType: this.currentBiome.definition.id });
    }
  }

  private getTransitionProgress(deltaTime: number): number {
    this.transitionState.progress += deltaTime;
    const t = Math.min(this.transitionState.progress / this.transitionState.duration, 1);

    let eased: number;
    switch (this.transitionState.phase) {
      case TransitionPhase.FADING_OUT:
        eased = this.easeInCubic(t);
        break;
      case TransitionPhase.FADING_IN:
        eased = this.easeOutCubic(t);
        break;
      default:
        eased = t;
    }
    return eased;
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }


  private updateTransitionFade(deltaTime: number): void {
    const t = this.getTransitionProgress(deltaTime);
    const overlay = this.transitionOverlay!;
    const uniforms = (overlay.material as THREE.ShaderMaterial).uniforms;

    overlay.visible = true;

    switch (this.transitionState.phase) {
      case TransitionPhase.FADING_OUT: {
        uniforms.uOpacity.value = t;
        if (t >= 1) {
          this.transitionState.phase = TransitionPhase.SWAPPING;
          this.swapBiomes();
          this.transitionState.phase = TransitionPhase.FADING_IN;
          this.transitionState.progress = 0;
          uniforms.uOpacity.value = 1;
        }
        break;
      }
      case TransitionPhase.FADING_IN: {
        uniforms.uOpacity.value = 1 - t;
        if (t >= 1) {
          uniforms.uOpacity.value = 0;
          overlay.visible = false;
          this.completeTransition();
        }
        break;
      }
    }
  }

  private updateTransitionElevator(deltaTime: number): void {
    const t = this.getTransitionProgress(deltaTime);
    const camera = this.engine.sceneManager.activeCamera;
    const overlay = this.transitionOverlay!;
    const uniforms = (overlay.material as THREE.ShaderMaterial).uniforms;

    overlay.visible = true;

    switch (this.transitionState.phase) {
      case TransitionPhase.FADING_OUT: {
        uniforms.uOpacity.value = Math.min(t * 2, 1);
        const shakeX = Math.sin(t * 40) * 0.02 * (1 - t);
        const shakeY = Math.sin(t * 35) * 0.02 * (1 - t);
        camera.position.x += shakeX;
        camera.position.y -= t * 0.5;
        camera.position.z += shakeY;

        if (t >= 0.5) {
          this.transitionState.phase = TransitionPhase.SWAPPING;
          this.swapBiomes();
          camera.position.y = t * 2;
          uniforms.uOpacity.value = 1;
          this.transitionState.phase = TransitionPhase.FADING_IN;
          this.transitionState.progress = 0.5;
        }
        break;
      }
      case TransitionPhase.FADING_IN: {
        const ft = (t - 0.5) * 2;
        if (ft >= 0) {
          uniforms.uOpacity.value = Math.max(0, 1 - ft * 2);
          const shakeX = Math.sin(ft * 30) * 0.01 * ft;
          const shakeZ = Math.sin(ft * 25) * 0.01 * ft;
          camera.position.x += shakeX;
          camera.position.z += shakeZ;
        }

        if (t >= 1) {
          uniforms.uOpacity.value = 0;
          overlay.visible = false;
          this.completeTransition();
        }
        break;
      }
    }
  }

  private updateTransitionStairwell(deltaTime: number): void {
    const t = this.getTransitionProgress(deltaTime);
    const camera = this.engine.sceneManager.activeCamera;
    const overlay = this.transitionOverlay!;
    const uniforms = (overlay.material as THREE.ShaderMaterial).uniforms;

    overlay.visible = true;

    switch (this.transitionState.phase) {
      case TransitionPhase.FADING_OUT: {
        uniforms.uOpacity.value = Math.min(t * 1.5, 1);
        const angle = t * Math.PI * 4;
        const radius = 2 * (1 - t * 0.5);
        camera.position.x = Math.cos(angle) * radius;
        camera.position.z = Math.sin(angle) * radius;
        camera.position.y -= t * 2;
        camera.lookAt(0, camera.position.y + 1, 0);

        if (t >= 0.4) {
          this.transitionState.phase = TransitionPhase.SWAPPING;
          this.swapBiomes();
          this.transitionState.phase = TransitionPhase.FADING_IN;
          this.transitionState.progress = 0.4;
          uniforms.uOpacity.value = 1;
        }
        break;
      }
      case TransitionPhase.FADING_IN: {
        const ft = (t - 0.4) / 0.6;
        if (ft >= 0) {
          uniforms.uOpacity.value = Math.max(0, 1 - ft * 1.5);
          const angle = Math.PI * 2 * (1 - ft);
          const radius = 1 * ft;
          camera.position.x = Math.cos(angle) * radius;
          camera.position.z = Math.sin(angle) * radius;
          camera.position.y = -2 + ft * 2;
          camera.lookAt(0, ft * 2, 0);
        }

        if (t >= 1) {
          uniforms.uOpacity.value = 0;
          overlay.visible = false;
          this.completeTransition();
        }
        break;
      }
    }
  }

  private completeTransition(): void {
    const state = { ...this.transitionState };
    this.transitionState.phase = TransitionPhase.IDLE;
    this.transitionState.progress = 0;
    this.emit('transition_completed', { from: state.fromBiome, to: state.toBiome, type: state.type });
  }

  update(deltaTime: number): void {
    if (this.currentBiome) {
      this.currentBiome.update(deltaTime);
    }
    if (this.nextBiome) {
      this.nextBiome.update(deltaTime);
    }

    if (this.transitionState.phase !== TransitionPhase.IDLE) {
      switch (this.transitionState.type) {
        case TransitionType.FADE:
          this.updateTransitionFade(deltaTime);
          break;
        case TransitionType.ELEVATOR:
          this.updateTransitionElevator(deltaTime);
          break;
        case TransitionType.STAIRWELL:
          this.updateTransitionStairwell(deltaTime);
          break;
      }
    }
  }

  getCurrentBiomeType(): BiomeType | null {
    return this.currentBiome?.definition.id ?? null;
  }

  getCurrentDefinition(): BiomeDefinition | null {
    return this.currentBiome?.definition ?? null;
  }

  isTransitioning(): boolean {
    return this.transitionState.phase !== TransitionPhase.IDLE;
  }

  getTransitionState(): TransitionState {
    return { ...this.transitionState };
  }

  dispose(): void {
    if (this.currentBiome) {
      this.engine.sceneManager.scene.remove(this.currentBiome.scene);
      this.currentBiome.dispose();
      this.currentBiome = null;
    }
    if (this.nextBiome) {
      this.engine.sceneManager.scene.remove(this.nextBiome.scene);
      this.nextBiome.dispose();
      this.nextBiome = null;
    }
    if (this.transitionOverlay) {
      this.engine.sceneManager.scene.remove(this.transitionOverlay);
      this.transitionOverlay.geometry.dispose();
      (this.transitionOverlay.material as THREE.ShaderMaterial).dispose();
      this.transitionOverlay = null;
    }
    this.engine.sceneManager.scene.remove(this.ambientLight);
    this.removeAllListeners();
  }
}
