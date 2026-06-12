import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import type { Engine } from '../core/Engine';
import type { BiomeType } from '../biomes/BiomeTypes';
import { BIOME_DEFINITIONS } from '../biomes/BiomeTypes';
import type { AnomalyType } from '../systems/AnomalySystem';

export interface AtmosphereState {
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  tintColor: THREE.Color;
  tintIntensity: number;
  vignette: number;
  saturation: number;
  contrast: number;
  noise: number;
  scanlines: number;
}

const DEFAULT_STATE: AtmosphereState = {
  fogColor: new THREE.Color(0x000000),
  fogNear: 10,
  fogFar: 50,
  ambientColor: new THREE.Color(0x404060),
  ambientIntensity: 0.5,
  tintColor: new THREE.Color(0xffffff),
  tintIntensity: 0,
  vignette: 0.3,
  saturation: 1,
  contrast: 1,
  noise: 0,
  scanlines: 0,
};

const BIOME_ATMOSPHERES: Record<string, Partial<AtmosphereState>> = {
  cubicle_sea: {
    fogColor: new THREE.Color(0x3a4a5a),
    fogNear: 15,
    fogFar: 50,
    ambientColor: new THREE.Color(0x8f9faf),
    ambientIntensity: 0.4,
    tintColor: new THREE.Color(0x8fbc9a),
    tintIntensity: 0.05,
    vignette: 0.35,
    saturation: 0.85,
    contrast: 1.1,
    noise: 0.02,
    scanlines: 0.03,
  },
  submerged_garage: {
    fogColor: new THREE.Color(0x0a2a3a),
    fogNear: 12,
    fogFar: 45,
    ambientColor: new THREE.Color(0x3a6a7a),
    ambientIntensity: 0.25,
    tintColor: new THREE.Color(0x2a5a6a),
    tintIntensity: 0.12,
    vignette: 0.4,
    saturation: 0.7,
    contrast: 1.2,
    noise: 0.03,
    scanlines: 0.02,
  },
  server_cathedral: {
    fogColor: new THREE.Color(0x1a0a2a),
    fogNear: 10,
    fogFar: 60,
    ambientColor: new THREE.Color(0x8a6a3a),
    ambientIntensity: 0.15,
    tintColor: new THREE.Color(0xda9a3a),
    tintIntensity: 0.1,
    vignette: 0.45,
    saturation: 0.9,
    contrast: 1.3,
    noise: 0.05,
    scanlines: 0.08,
  },
  atrium_mall: {
    fogColor: new THREE.Color(0x5a4a3a),
    fogNear: 20,
    fogFar: 70,
    ambientColor: new THREE.Color(0xcaaa7a),
    ambientIntensity: 0.5,
    tintColor: new THREE.Color(0xcaaa7a),
    tintIntensity: 0.06,
    vignette: 0.25,
    saturation: 0.95,
    contrast: 1.05,
    noise: 0.01,
    scanlines: 0.01,
  },
  stairwell_infinite: {
    fogColor: new THREE.Color(0x1a0a0a),
    fogNear: 8,
    fogFar: 35,
    ambientColor: new THREE.Color(0x5a3a2a),
    ambientIntensity: 0.1,
    tintColor: new THREE.Color(0xaa4a3a),
    tintIntensity: 0.15,
    vignette: 0.5,
    saturation: 0.6,
    contrast: 1.4,
    noise: 0.06,
    scanlines: 0.05,
  },
  pool_complex: {
    fogColor: new THREE.Color(0x2a4a5a),
    fogNear: 15,
    fogFar: 55,
    ambientColor: new THREE.Color(0x7aaa9a),
    ambientIntensity: 0.35,
    tintColor: new THREE.Color(0x9acaca),
    tintIntensity: 0.08,
    vignette: 0.3,
    saturation: 0.8,
    contrast: 1.1,
    noise: 0.02,
    scanlines: 0.03,
  },
};

const ANOMALY_EFFECTS: Record<string, (state: AtmosphereState, severity: number) => void> = {
  echoing_halls: (s, sev) => {
    s.noise = Math.max(s.noise, sev * 0.1);
    s.vignette = Math.min(1, s.vignette + sev * 0.15);
    s.saturation = Math.max(0, s.saturation - sev * 0.2);
  },
  flicker: (s, sev) => {
    s.noise = Math.max(s.noise, sev * 0.15);
    s.scanlines = Math.max(s.scanlines, sev * 0.3);
    s.vignette = Math.min(1, s.vignette + sev * 0.1);
  },
  thermal_inversion: (s, sev) => {
    s.tintColor.lerp(new THREE.Color(0xff4400), sev * 0.4);
    s.tintIntensity = Math.min(1, s.tintIntensity + sev * 0.3);
    s.saturation = Math.max(0, s.saturation - sev * 0.15);
    s.vignette = Math.min(1, s.vignette + sev * 0.2);
  },
  static: (s, sev) => {
    s.noise = Math.max(s.noise, sev * 0.5);
    s.scanlines = Math.max(s.scanlines, sev * 0.5);
    s.saturation = Math.max(0, s.saturation - sev * 0.3);
    s.contrast = Math.min(2, s.contrast + sev * 0.3);
  },
  gravity_well: (s, sev) => {
    s.vignette = Math.min(1, s.vignette + sev * 0.3);
    s.tintColor.lerp(new THREE.Color(0x4400ff), sev * 0.3);
    s.tintIntensity = Math.min(1, s.tintIntensity + sev * 0.2);
  },
  temporal_loop: (s, sev) => {
    s.noise = Math.max(s.noise, sev * 0.08);
    s.saturation = Math.max(0, s.saturation - sev * 0.25);
    s.vignette = Math.min(1, s.vignette + sev * 0.1);
    s.scanlines = Math.max(s.scanlines, sev * 0.15);
  },
  mimic: (s, sev) => {
    s.tintColor.lerp(new THREE.Color(0x00ff44), sev * 0.2);
    s.tintIntensity = Math.min(1, s.tintIntensity + sev * 0.15);
    s.noise = Math.max(s.noise, sev * 0.1);
  },
  hallucination: (s, sev) => {
    s.noise = Math.max(s.noise, sev * 0.2);
    s.saturation = Math.max(0, s.saturation - sev * 0.35);
    s.vignette = Math.min(1, s.vignette + sev * 0.25);
    s.scanlines = Math.max(s.scanlines, sev * 0.1);
  },
  corrosion: (s, sev) => {
    s.tintColor.lerp(new THREE.Color(0x442200), sev * 0.4);
    s.tintIntensity = Math.min(1, s.tintIntensity + sev * 0.25);
    s.saturation = Math.max(0, s.saturation - sev * 0.2);
    s.vignette = Math.min(1, s.vignette + sev * 0.3);
  },
  silence: (s, sev) => {
    s.saturation = Math.max(0, s.saturation - sev * 0.4);
    s.contrast = Math.min(2, s.contrast + sev * 0.4);
    s.vignette = Math.min(1, s.vignette + sev * 0.35);
  },
};

export class AtmosphereSystem extends EventEmitter {
  private engine: Engine;
  private currentState: AtmosphereState;
  private targetState: AtmosphereState;
  private transitionSpeed: number = 2;
  private overlay: HTMLDivElement;
  private noiseEl: HTMLDivElement;
  private tintEl: HTMLDivElement;
  private vignetteEl: HTMLDivElement;
  private scanlineEl: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private noiseCanvas: HTMLCanvasElement | null = null;
  private anomalyStack: { type: string; severity: number }[] = [];
  private baseState: AtmosphereState;

  constructor(engine: Engine) {
    super();
    this.engine = engine;

    this.currentState = this.cloneState(DEFAULT_STATE);
    this.targetState = this.cloneState(DEFAULT_STATE);
    this.baseState = this.cloneState(DEFAULT_STATE);

    this.overlay = document.createElement('div');
    this.overlay.id = 'threshold-atmosphere';
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9998;
      overflow: hidden;
    `;

    this.noiseEl = document.createElement('div');
    this.noiseEl.id = 'atmo-noise';
    this.noiseEl.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0; mix-blend-mode: overlay;
      background-repeat: repeat; background-size: 128px 128px;
    `;
    this.overlay.appendChild(this.noiseEl);

    this.tintEl = document.createElement('div');
    this.tintEl.id = 'atmo-tint';
    this.tintEl.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0; mix-blend-mode: overlay;
      transition: opacity 1.5s ease;
    `;
    this.overlay.appendChild(this.tintEl);

    this.vignetteEl = document.createElement('div');
    this.vignetteEl.id = 'atmo-vignette';
    this.vignetteEl.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0; transition: opacity 1s ease;
    `;
    this.overlay.appendChild(this.vignetteEl);

    this.scanlineEl = document.createElement('div');
    this.scanlineEl.id = 'atmo-scanlines';
    this.scanlineEl.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0; mix-blend-mode: overlay;
      transition: opacity 0.5s ease;
    `;
    this.overlay.appendChild(this.scanlineEl);

    this.flashEl = document.createElement('div');
    this.flashEl.id = 'atmo-flash';
    this.flashEl.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0; pointer-events: none;
      transition: opacity 0.05s ease;
    `;
    this.overlay.appendChild(this.flashEl);

    document.body.appendChild(this.overlay);

    this.generateNoiseTexture();
  }

  private cloneState(state: AtmosphereState): AtmosphereState {
    return {
      fogColor: state.fogColor.clone(),
      fogNear: state.fogNear,
      fogFar: state.fogFar,
      ambientColor: state.ambientColor.clone(),
      ambientIntensity: state.ambientIntensity,
      tintColor: state.tintColor.clone(),
      tintIntensity: state.tintIntensity,
      vignette: state.vignette,
      saturation: state.saturation,
      contrast: state.contrast,
      noise: state.noise,
      scanlines: state.scanlines,
    };
  }

  private generateNoiseTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(128, 128);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    this.noiseCanvas = canvas;
    this.noiseEl.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }

  setBiomeAtmosphere(biomeType: BiomeType): void {
    const preset = BIOME_ATMOSPHERES[biomeType];
    if (!preset) return;

    const def = BIOME_DEFINITIONS[biomeType];
    if (def) {
      const { colorPalette, ambientLight } = def;
      this.targetState.fogColor.set(colorPalette.fog);
      this.targetState.ambientColor.set(ambientLight.color);
      this.targetState.ambientIntensity = ambientLight.intensity;
    }

    if (preset.fogColor) this.targetState.fogColor.copy(preset.fogColor);
    if (preset.fogNear !== undefined) this.targetState.fogNear = preset.fogNear;
    if (preset.fogFar !== undefined) this.targetState.fogFar = preset.fogFar;
    if (preset.ambientColor) this.targetState.ambientColor.copy(preset.ambientColor);
    if (preset.ambientIntensity !== undefined) this.targetState.ambientIntensity = preset.ambientIntensity;
    if (preset.tintColor) this.targetState.tintColor.copy(preset.tintColor);
    if (preset.tintIntensity !== undefined) this.targetState.tintIntensity = preset.tintIntensity;
    if (preset.vignette !== undefined) this.targetState.vignette = preset.vignette;
    if (preset.saturation !== undefined) this.targetState.saturation = preset.saturation;
    if (preset.contrast !== undefined) this.targetState.contrast = preset.contrast;
    if (preset.noise !== undefined) this.targetState.noise = preset.noise;
    if (preset.scanlines !== undefined) this.targetState.scanlines = preset.scanlines;

    this.baseState = this.cloneState(this.targetState);
    this.applyAnomalyStack();

    this.emit('atmosphere_changed', { biome: biomeType });
  }

  setAnomalyEffect(anomalyType: AnomalyType, active: boolean, severity: number): void {
    if (active) {
      this.anomalyStack.push({ type: anomalyType, severity });
    } else {
      this.anomalyStack = this.anomalyStack.filter(a => a.type !== anomalyType);
    }
    this.applyAnomalyStack();
  }

  private applyAnomalyStack(): void {
    this.targetState = this.cloneState(this.baseState);
    for (const anomaly of this.anomalyStack) {
      const fn = ANOMALY_EFFECTS[anomaly.type];
      if (fn) {
        fn(this.targetState, anomaly.severity);
      }
    }
  }

  flashScreen(color: string, duration: number): void {
    this.flashEl.style.backgroundColor = color;
    this.flashEl.style.opacity = '0.8';
    this.flashEl.style.transition = `opacity ${duration * 0.5}s ease`;

    setTimeout(() => {
      this.flashEl.style.opacity = '0';
    }, duration * 500);

    setTimeout(() => {
      this.flashEl.style.transition = 'none';
    }, duration * 1000 + 100);
  }

  setVignette(intensity: number): void {
    this.targetState.vignette = Math.max(0, Math.min(1, intensity));
  }

  setNoise(intensity: number): void {
    this.targetState.noise = Math.max(0, Math.min(1, intensity));
  }

  setColorTint(color: THREE.Color, intensity: number): void {
    this.targetState.tintColor.copy(color);
    this.targetState.tintIntensity = Math.max(0, Math.min(1, intensity));
  }

  setScanlines(intensity: number): void {
    this.targetState.scanlines = Math.max(0, Math.min(1, intensity));
  }

  update(dt: number): void {
    const speed = this.transitionSpeed;
    const lerpFactor = 1 - Math.exp(-speed * dt);

    const cs = this.currentState;
    const ts = this.targetState;

    if (this.engine.sceneManager.scene.fog instanceof THREE.Fog) {
      const fog = this.engine.sceneManager.scene.fog as THREE.Fog;
      fog.color.lerp(ts.fogColor, lerpFactor);
      fog.near += (ts.fogNear - fog.near) * lerpFactor;
      fog.far += (ts.fogFar - fog.far) * lerpFactor;
    }

    cs.fogColor.lerp(ts.fogColor, lerpFactor);
    cs.fogNear += (ts.fogNear - cs.fogNear) * lerpFactor;
    cs.fogFar += (ts.fogFar - cs.fogFar) * lerpFactor;

    cs.ambientColor.lerp(ts.ambientColor, lerpFactor);
    cs.ambientIntensity += (ts.ambientIntensity - cs.ambientIntensity) * lerpFactor;

    cs.tintColor.lerp(ts.tintColor, lerpFactor);
    cs.tintIntensity += (ts.tintIntensity - cs.tintIntensity) * lerpFactor;

    cs.vignette += (ts.vignette - cs.vignette) * lerpFactor;
    cs.saturation += (ts.saturation - cs.saturation) * lerpFactor;
    cs.contrast += (ts.contrast - cs.contrast) * lerpFactor;
    cs.noise += (ts.noise - cs.noise) * lerpFactor;
    cs.scanlines += (ts.scanlines - cs.scanlines) * lerpFactor;

    this.applyEffects();
  }

  private applyEffects(): void {
    const s = this.currentState;

    const vignetteOn = this.engine.settings.get<boolean>('accessibility.vignette', true);
    if (vignetteOn) {
      const v = s.vignette;
      this.vignetteEl.style.opacity = Math.min(1, v * 2).toString();
      this.vignetteEl.style.boxShadow = `inset 0 0 ${80 + v * 120}px rgba(0,0,0,${0.3 + v * 0.5})`;
      this.vignetteEl.style.background = `radial-gradient(ellipse at center, transparent ${60 - v * 40}%, rgba(0,0,0,${v * 0.6}))`;
    } else {
      this.vignetteEl.style.opacity = '0';
    }

    this.noiseEl.style.opacity = Math.min(s.noise, 0.6).toString();

    if (s.noise > 0.01) {
      this.animateNoise();
    }

    this.tintEl.style.opacity = s.tintIntensity.toString();
    this.tintEl.style.backgroundColor = `rgb(${s.tintColor.r * 255},${s.tintColor.g * 255},${s.tintColor.b * 255})`;

    this.scanlineEl.style.opacity = Math.min(s.scanlines * 0.5, 0.3).toString();
    if (s.scanlines > 0.01) {
      const spacing = Math.max(1, 4 - s.scanlines * 3);
      this.scanlineEl.style.backgroundImage = `repeating-linear-gradient(0deg, transparent, transparent ${spacing}px, rgba(0,0,0,0.15) ${spacing}px, rgba(0,0,0,0.15) ${spacing + 1}px)`;
    }

    const el = this.overlay;
    const sat = s.saturation;
    const con = s.contrast;
    el.style.backdropFilter = `saturate(${sat}) contrast(${con})`;
    (el.style as any).webkitBackdropFilter = `saturate(${sat}) contrast(${con})`;
  }

  private noiseFrame = 0;
  private animateNoise(): void {
    if (!this.noiseCanvas) return;
    const ctx = this.noiseCanvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.createImageData(128, 128);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    this.noiseEl.style.backgroundImage = `url(${this.noiseCanvas.toDataURL()})`;
    this.noiseFrame++;
  }

  getOverlay(): HTMLDivElement {
    return this.overlay;
  }

  getCurrentState(): Readonly<AtmosphereState> {
    return this.currentState;
  }

  setTransitionSpeed(speed: number): void {
    this.transitionSpeed = Math.max(0.1, speed);
  }

  dispose(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.noiseCanvas) {
      this.noiseCanvas.width = 0;
      this.noiseCanvas.height = 0;
      this.noiseCanvas = null;
    }
    this.removeAllListeners();
  }
}
