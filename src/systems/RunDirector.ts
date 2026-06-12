import { EventEmitter } from '../utils/EventEmitter';
import { BiomeType } from '../biomes/BiomeTypes';

export interface RunConfig {
  seed: number;
  depth: number;
  biomeSequence: BiomeType[];
  thresholdKey: string | null;
  modifiers: string[];
}

export interface RunStats {
  time: number;
  biomesCleared: number;
  anomaliesEncountered: number;
  entitiesEvaded: number;
  toolsFound: number;
  loreFragmentsCollected: number;
  depth: number;
}

export interface DifficultyParams {
  entityCountMultiplier: number;
  anomalyFrequencyMultiplier: number;
  resourceScarcityMultiplier: number;
  entitySpeedMultiplier: number;
  entityDetectionRange: number;
  hazardDamageMultiplier: number;
  maxDepth: number;
}

const ALL_BIOMES: BiomeType[] = [
  BiomeType.CUBICLE_SEA,
  BiomeType.SUBMERGED_GARAGE,
  BiomeType.SERVER_CATHEDRAL,
  BiomeType.ATRIUM_MALL,
  BiomeType.STAIRWELL_INFINITE,
  BiomeType.POOL_COMPLEX,
];

const MIN_BIOMES_PER_RUN = 3;
const MAX_BIOMES_PER_RUN = 4;

export class RunDirector extends EventEmitter {
  private config: RunConfig | null = null;
  private stats: RunStats = this.createEmptyStats();
  private currentBiomeIndex = 0;
  private rng: () => number;
  private running = false;

  constructor() {
    super();
    this.rng = this.createRng(Date.now());
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

  private createEmptyStats(): RunStats {
    return {
      time: 0,
      biomesCleared: 0,
      anomaliesEncountered: 0,
      entitiesEvaded: 0,
      toolsFound: 0,
      loreFragmentsCollected: 0,
      depth: 1,
    };
  }

  generateRunConfig(seed?: number): RunConfig {
    const runSeed = seed ?? Date.now();
    this.rng = this.createRng(runSeed);

    const biomes = this.generateBiomeSequence();
    const modifiers = this.generateModifiers(biomes);

    return {
      seed: runSeed,
      depth: 1,
      biomeSequence: biomes,
      thresholdKey: null,
      modifiers,
    };
  }

  private generateBiomeSequence(): BiomeType[] {
    const available = [...ALL_BIOMES];
    const stairwellIndex = available.indexOf(BiomeType.STAIRWELL_INFINITE);
    if (stairwellIndex !== -1) {
      available.splice(stairwellIndex, 1);
    }

    const count = Math.floor(this.rng() * (MAX_BIOMES_PER_RUN - MIN_BIOMES_PER_RUN + 1)) + MIN_BIOMES_PER_RUN;

    const sequence: BiomeType[] = [];
    const shuffled = this.shuffleArray(available);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      sequence.push(shuffled[i]);
    }

    sequence.push(BiomeType.STAIRWELL_INFINITE);

    return sequence;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private generateModifiers(biomes: BiomeType[]): string[] {
    const modifiers: string[] = [];
    if (biomes.length >= 4) modifiers.push('extended_run');
    if (biomes.includes(BiomeType.STAIRWELL_INFINITE) && biomes.length <= 3) modifiers.push('rapid_descent');
    if (this.rng() > 0.7) modifiers.push('threshold_anomaly');
    if (this.rng() > 0.85) modifiers.push('darkness_afflicted');
    return modifiers;
  }

  startRun(config: RunConfig): void {
    this.config = config;
    this.stats = this.createEmptyStats();
    this.stats.depth = config.depth;
    this.currentBiomeIndex = 0;
    this.running = true;
    this.emit('run_started', { config, stats: this.stats });
  }

  getCurrentBiome(): BiomeType | null {
    if (!this.config) return null;
    if (this.currentBiomeIndex >= this.config.biomeSequence.length) return null;
    return this.config.biomeSequence[this.currentBiomeIndex];
  }

  getNextBiome(): BiomeType | null {
    if (!this.config) return null;
    const next = this.currentBiomeIndex + 1;
    if (next >= this.config.biomeSequence.length) return null;
    return this.config.biomeSequence[next];
  }

  advanceBiome(): void {
    if (!this.config) return;
    const prevBiome = this.getCurrentBiome();
    this.currentBiomeIndex++;
    this.stats.biomesCleared++;
    this.stats.depth = this.currentBiomeIndex + 1;

    if (this.currentBiomeIndex >= this.config.biomeSequence.length) {
      this.running = false;
      this.emit('run_completed', { stats: this.stats });
    } else {
      const nextBiome = this.getCurrentBiome();
      this.emit('biome_changed', { from: prevBiome, to: nextBiome, index: this.currentBiomeIndex });
      this.emit('stats_changed', { stats: this.stats });
    }
  }

  isLastBiome(): boolean {
    if (!this.config) return true;
    return this.currentBiomeIndex >= this.config.biomeSequence.length - 1;
  }

  getBiomeCount(): number {
    return this.config?.biomeSequence.length ?? 0;
  }

  getCompletedBiomes(): number {
    return this.currentBiomeIndex;
  }

  getDifficultyParams(depth?: number): DifficultyParams {
    const currentDepth = depth ?? this.stats.depth;
    return {
      entityCountMultiplier: 4 + (currentDepth - 1) * 2,
      anomalyFrequencyMultiplier: 1 + (currentDepth - 1) * 0.3,
      resourceScarcityMultiplier: Math.max(0.3, 1 - (currentDepth - 1) * 0.1),
      entitySpeedMultiplier: 1 + (currentDepth - 1) * 0.08,
      entityDetectionRange: 12 + (currentDepth - 1) * 2,
      hazardDamageMultiplier: 1 + (currentDepth - 1) * 0.15,
      maxDepth: this.config ? this.config.biomeSequence.length : 0,
    };
  }

  recordAnomalyEncountered(): void {
    this.stats.anomaliesEncountered++;
    this.emit('stats_changed', { stats: this.stats });
  }

  recordEntityEvaded(): void {
    this.stats.entitiesEvaded++;
    this.emit('stats_changed', { stats: this.stats });
  }

  recordToolFound(): void {
    this.stats.toolsFound++;
    this.emit('stats_changed', { stats: this.stats });
  }

  recordLoreFragment(): void {
    this.stats.loreFragmentsCollected++;
    this.emit('stats_changed', { stats: this.stats });
  }

  update(deltaTime: number): void {
    if (!this.running || !this.config) return;
    this.stats.time += deltaTime;
  }

  getStats(): RunStats {
    return { ...this.stats };
  }

  getConfig(): RunConfig | null {
    return this.config ? { ...this.config } : null;
  }

  isRunning(): boolean {
    return this.running;
  }

  endRun(): RunStats {
    this.running = false;
    const finalStats = this.getStats();
    this.emit('run_ended', { stats: finalStats });
    return finalStats;
  }

  reset(): void {
    this.config = null;
    this.stats = this.createEmptyStats();
    this.currentBiomeIndex = 0;
    this.running = false;
  }

  dispose(): void {
    this.reset();
    this.removeAllListeners();
  }
}
