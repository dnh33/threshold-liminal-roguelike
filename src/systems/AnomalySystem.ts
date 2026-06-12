import { EventEmitter } from '../utils/EventEmitter';
import { BiomeType } from '../biomes/BiomeTypes';

export const AnomalyType = {
  ECHOING_HALLS: 'echoing_halls',
  FLICKER: 'flicker',
  THERMAL_INVERSION: 'thermal_inversion',
  STATIC: 'static',
  GRAVITY_WELL: 'gravity_well',
  TEMPORAL_LOOP: 'temporal_loop',
  MIMIC: 'mimic',
  HALLUCINATION: 'hallucination',
  CORROSION: 'corrosion',
  SILENCE: 'silence',
} as const;

export type AnomalyType = (typeof AnomalyType)[keyof typeof AnomalyType];

export interface AnomalyEffect {
  type: string;
  magnitude: number;
  params: Record<string, any>;
}

export interface AnomalyInstance {
  type: AnomalyType;
  severity: number;
  duration: number;
  affectedBiomes: BiomeType[];
  effects: AnomalyEffect[];
}

interface AnomalyTemplate {
  type: AnomalyType;
  name: string;
  description: string;
  baseSeverity: number;
  baseDuration: number;
  permanent: boolean;
  biomeAffinity: BiomeType[];
  generateEffects: (severity: number) => AnomalyEffect[];
}

const ANOMALY_TEMPLATES: AnomalyTemplate[] = [
  {
    type: AnomalyType.ECHOING_HALLS,
    name: 'Echoing Halls',
    description: 'Corridors loop back on themselves, spatial geometry distorts',
    baseSeverity: 0.4,
    baseDuration: 90,
    permanent: false,
    biomeAffinity: [BiomeType.CUBICLE_SEA, BiomeType.ATRIUM_MALL, BiomeType.SERVER_CATHEDRAL],
    generateEffects: (severity) => [
      { type: 'spatial_loop', magnitude: severity, params: { loopRadius: 20 - severity * 15, reconnectChance: severity * 0.5 } },
      { type: 'corridor_warp', magnitude: severity, params: { warpIntensity: severity * 2, maxSegments: Math.floor(severity * 8) + 3 } },
    ],
  },
  {
    type: AnomalyType.FLICKER,
    name: 'Flicker',
    description: 'Power failures plunge sections into darkness, lights strobe unpredictably',
    baseSeverity: 0.3,
    baseDuration: 60,
    permanent: false,
    biomeAffinity: [BiomeType.CUBICLE_SEA, BiomeType.SUBMERGED_GARAGE, BiomeType.SERVER_CATHEDRAL],
    generateEffects: (severity) => [
      { type: 'light_flicker', magnitude: severity, params: { intervalMin: 0.1, intervalMax: 3 - severity * 2, darkDuration: severity * 2 } },
      { type: 'power_failure', magnitude: severity, params: { failureChance: severity * 0.3, failureRadius: severity * 15 } },
    ],
  },
  {
    type: AnomalyType.THERMAL_INVERSION,
    name: 'Thermal Inversion',
    description: 'Extreme heat and cold pockets create hazardous zones, thick fog rolls in',
    baseSeverity: 0.4,
    baseDuration: 75,
    permanent: false,
    biomeAffinity: [BiomeType.SUBMERGED_GARAGE, BiomeType.SERVER_CATHEDRAL, BiomeType.STAIRWELL_INFINITE],
    generateEffects: (severity) => [
      { type: 'temperature_hazard', magnitude: severity, params: { heatDamage: severity * 5, coldDamage: severity * 5, zoneCount: Math.floor(severity * 6) + 2 } },
      { type: 'dense_fog', magnitude: severity, params: { fogDensity: severity * 0.8, visibilityReduction: severity * 0.6 } },
    ],
  },
  {
    type: AnomalyType.STATIC,
    name: 'Static',
    description: 'Visual noise corrupts perception, glitch effects distort reality',
    baseSeverity: 0.3,
    baseDuration: 60,
    permanent: false,
    biomeAffinity: [BiomeType.SERVER_CATHEDRAL, BiomeType.POOL_COMPLEX, BiomeType.ATRIUM_MALL],
    generateEffects: (severity) => [
      { type: 'visual_noise', magnitude: severity, params: { noiseIntensity: severity, glitchFrequency: severity * 3 } },
      { type: 'screen_distortion', magnitude: severity, params: { distortionAmount: severity * 0.4, scanlineIntensity: severity * 0.6 } },
    ],
  },
  {
    type: AnomalyType.GRAVITY_WELL,
    name: 'Gravity Well',
    description: 'Localized gravity anomalies alter movement and physics',
    baseSeverity: 0.5,
    baseDuration: 45,
    permanent: false,
    biomeAffinity: [BiomeType.STAIRWELL_INFINITE, BiomeType.POOL_COMPLEX, BiomeType.SUBMERGED_GARAGE],
    generateEffects: (severity) => [
      { type: 'gravity_shift', magnitude: severity, params: { gravityMin: -severity * 0.5, gravityMax: severity * 0.8, zoneCount: Math.floor(severity * 4) + 1 } },
      { type: 'movement_impede', magnitude: severity, params: { slowFactor: severity * 0.4, jumpModifier: severity * 0.6 } },
    ],
  },
  {
    type: AnomalyType.TEMPORAL_LOOP,
    name: 'Temporal Loop',
    description: 'Rooms and sequences repeat, creating deja vu and disorientation',
    baseSeverity: 0.5,
    baseDuration: 30,
    permanent: false,
    biomeAffinity: [BiomeType.ATRIUM_MALL, BiomeType.STAIRWELL_INFINITE, BiomeType.CUBICLE_SEA],
    generateEffects: (severity) => [
      { type: 'room_repeat', magnitude: severity, params: { repeatCount: Math.floor(severity * 4) + 1, loopDuration: 30 - severity * 15 } },
      { type: 'memory_distortion', magnitude: severity, params: { confusionIntensity: severity * 0.5, minimapJitter: severity * 0.7 } },
    ],
  },
  {
    type: AnomalyType.MIMIC,
    name: 'Mimic',
    description: 'Everyday objects are not what they seem',
    baseSeverity: 0.4,
    baseDuration: 90,
    permanent: true,
    biomeAffinity: [BiomeType.CUBICLE_SEA, BiomeType.ATRIUM_MALL, BiomeType.POOL_COMPLEX],
    generateEffects: (severity) => [
      { type: 'object_mimicry', magnitude: severity, params: { mimicCount: Math.floor(severity * 5) + 2, triggerDistance: 5 - severity * 3 } },
      { type: 'furniture_threat', magnitude: severity, params: { threatChance: severity * 0.4, mimicTypes: ['chair', 'desk', 'cabinet', 'plant'] } },
    ],
  },
  {
    type: AnomalyType.HALLUCINATION,
    name: 'Hallucination',
    description: 'False walls conceal and deceive, sounds have no source',
    baseSeverity: 0.4,
    baseDuration: 60,
    permanent: false,
    biomeAffinity: [BiomeType.STAIRWELL_INFINITE, BiomeType.POOL_COMPLEX, BiomeType.SUBMERGED_GARAGE],
    generateEffects: (severity) => [
      { type: 'false_wall', magnitude: severity, params: { wallCount: Math.floor(severity * 6) + 1, revealDistance: 3 - severity * 2 } },
      { type: 'audio_misdirection', magnitude: severity, params: { falseSourceCount: Math.floor(severity * 4) + 2, audioConfusion: severity * 0.5 } },
    ],
  },
  {
    type: AnomalyType.CORROSION,
    name: 'Corrosion',
    description: 'Decay accelerates, structural damage creates hazard floors',
    baseSeverity: 0.5,
    baseDuration: 75,
    permanent: true,
    biomeAffinity: [BiomeType.SUBMERGED_GARAGE, BiomeType.POOL_COMPLEX, BiomeType.STAIRWELL_INFINITE],
    generateEffects: (severity) => [
      { type: 'floor_hazard', magnitude: severity, params: { hazardTileCount: Math.floor(severity * 10) + 3, damagePerSecond: severity * 8 } },
      { type: 'structural_decay', magnitude: severity, params: { decayRate: severity * 0.3, collapseChance: severity * 0.1, debrisCount: Math.floor(severity * 5) } },
    ],
  },
  {
    type: AnomalyType.SILENCE,
    name: 'Silence',
    description: 'Sound dampening field empowers entities and disorients the player',
    baseSeverity: 0.5,
    baseDuration: 45,
    permanent: false,
    biomeAffinity: [BiomeType.SERVER_CATHEDRAL, BiomeType.STAIRWELL_INFINITE, BiomeType.CUBICLE_SEA],
    generateEffects: (severity) => [
      { type: 'audio_dampen', magnitude: severity, params: { dampenFactor: severity * 0.9, playerHearingReduction: severity * 0.7 } },
      { type: 'entity_empower', magnitude: severity, params: { speedBoost: severity * 0.4, detectionRangeBoost: severity * 0.5, aggroMultiplier: 1 + severity } },
    ],
  },
];

export class AnomalySystem extends EventEmitter {
  private activeAnomalies: AnomalyInstance[] = [];
  private rng: () => number;
  private maxSimultaneousAnomalies = 3;

  constructor(seed: number = Date.now()) {
    super();
    this.rng = this.createRng(seed);
  }

  private createRng(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = s + 0x6d2b79f5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  getAnomalyTemplates(): AnomalyTemplate[] {
    return ANOMALY_TEMPLATES;
  }

  rollForAnomaly(biomeType: BiomeType, probability: number, depth: number): AnomalyInstance | null {
    if (this.activeAnomalies.length >= this.maxSimultaneousAnomalies) return null;
    const adjustedProbability = probability + depth * 0.03;
    if (this.rng() > adjustedProbability) return null;
    return this.generateAnomaly(biomeType, depth);
  }

  private generateAnomaly(biomeType: BiomeType, depth: number): AnomalyInstance {
    const candidates = ANOMALY_TEMPLATES.filter(t => t.biomeAffinity.includes(biomeType));
    if (candidates.length === 0) {
      const fallback = ANOMALY_TEMPLATES[Math.floor(this.rng() * ANOMALY_TEMPLATES.length)];
      return this.instantiateAnomaly(fallback, biomeType, depth);
    }
    const template = candidates[Math.floor(this.rng() * candidates.length)];
    return this.instantiateAnomaly(template, biomeType, depth);
  }

  private instantiateAnomaly(template: AnomalyTemplate, biomeType: BiomeType, depth: number): AnomalyInstance {
    const severityScale = 1 + depth * 0.1;
    const severity = Math.min(template.baseSeverity * severityScale + this.rng() * 0.2, 1);
    const duration = template.permanent ? -1 : template.baseDuration * (0.8 + this.rng() * 0.4);
    const instance: AnomalyInstance = {
      type: template.type,
      severity,
      duration,
      affectedBiomes: [biomeType],
      effects: template.generateEffects(severity),
    };
    this.activeAnomalies.push(instance);
    this.emit('anomaly_started', instance);
    return instance;
  }

  update(deltaTime: number): void {
    const toRemove: AnomalyInstance[] = [];
    for (const anomaly of this.activeAnomalies) {
      if (anomaly.duration < 0) continue;
      anomaly.duration -= deltaTime;
      if (anomaly.duration <= 0) {
        toRemove.push(anomaly);
      }
    }
    for (const anomaly of toRemove) {
      this.removeAnomaly(anomaly);
    }
  }

  removeAnomaly(anomaly: AnomalyInstance): void {
    const idx = this.activeAnomalies.indexOf(anomaly);
    if (idx !== -1) {
      this.activeAnomalies.splice(idx, 1);
      this.emit('anomaly_ended', anomaly);
    }
  }

  clearAnomalies(): void {
    for (const anomaly of [...this.activeAnomalies]) {
      this.removeAnomaly(anomaly);
    }
  }

  getActiveAnomalies(): AnomalyInstance[] {
    return [...this.activeAnomalies];
  }

  getActiveAnomaliesForBiome(biomeType: BiomeType): AnomalyInstance[] {
    return this.activeAnomalies.filter(a => a.affectedBiomes.includes(biomeType));
  }

  hasActiveAnomaly(type: AnomalyType): boolean {
    return this.activeAnomalies.some(a => a.type === type);
  }

  getAnomalySeverity(type: AnomalyType): number {
    const anomaly = this.activeAnomalies.find(a => a.type === type);
    return anomaly ? anomaly.severity : 0;
  }

  getEffectsByType(effectType: string): AnomalyEffect[] {
    const effects: AnomalyEffect[] = [];
    for (const anomaly of this.activeAnomalies) {
      for (const effect of anomaly.effects) {
        if (effect.type === effectType) {
          effects.push(effect);
        }
      }
    }
    return effects;
  }

  setSeed(seed: number): void {
    this.rng = this.createRng(seed);
    this.clearAnomalies();
  }

  setMaxSimultaneousAnomalies(max: number): void {
    this.maxSimultaneousAnomalies = max;
  }

  dispose(): void {
    this.clearAnomalies();
    this.removeAllListeners();
  }
}
