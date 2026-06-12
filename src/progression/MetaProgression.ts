import { EventEmitter } from '../utils/EventEmitter';
import type { RunStats } from '../systems/RunDirector';
import {
  THRESHOLD_TIERS,
  TOOL_BLUEPRINTS,
  ARTIFACT_DEFINITIONS,
  ACHIEVEMENT_DEFINITIONS,
  ANOMALY_TYPES_TO_DISCOVER,
  LORE_FRAGMENTS,
  MAX_EQUIPPED_ARTIFACTS,
  ECHOES_PER_EXTRACT_BASE,
  ECHOES_PER_BIOME_BONUS,
  ECHOES_PER_LORE_BONUS,
  ECHOES_PER_ANOMALY_BONUS,
  ECHOES_DEATH_PENALTY,
} from './UnlockDefinitions';

export interface ProgressionData {
  echoes: number;
  totalRuns: number;
  successfulExtracts: number;
  deepestDepth: number;
  unlockedThresholds: number;
  unlockedTools: string[];
  discoveredAnomalies: string[];
  collectedLore: string[];
  discoveredArtifacts: string[];
  equippedArtifacts: string[];
  completedAchievements: string[];
  totalBiomesCleared: number;
  totalAnomaliesEncountered: number;
  totalEntitiesEvaded: number;
}

export const ThresholdKey = {
  ENTRY: 'threshold_entry',
  MID: 'threshold_mid',
  DEEP: 'threshold_deep',
  ABYSS: 'threshold_abyss',
  CORE: 'threshold_core',
} as const;

export type ThresholdKey = (typeof ThresholdKey)[keyof typeof ThresholdKey];

export interface UnlockDefinition {
  id: string;
  name: string;
  description: string;
  category: 'tool' | 'threshold' | 'artifact' | 'lore' | 'achievement';
  cost: number;
  prerequisite: string | null;
  toolBlueprint?: string;
  thresholdTier?: number;
}

const DEFAULT_DATA: ProgressionData = {
  echoes: 0,
  totalRuns: 0,
  successfulExtracts: 0,
  deepestDepth: 0,
  unlockedThresholds: 1,
  unlockedTools: [],
  discoveredAnomalies: [],
  collectedLore: [],
  discoveredArtifacts: [],
  equippedArtifacts: [],
  completedAchievements: [],
  totalBiomesCleared: 0,
  totalAnomaliesEncountered: 0,
  totalEntitiesEvaded: 0,
};

export class MetaProgression extends EventEmitter {
  private data: ProgressionData;
  private storageKey = 'threshold-progression';

  constructor() {
    super();
    this.data = { ...DEFAULT_DATA };
  }

  async load(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ProgressionData>;
        this.data = { ...DEFAULT_DATA, ...parsed };
        if (typeof this.data.unlockedThresholds !== 'number' || this.data.unlockedThresholds < 1) {
          this.data.unlockedThresholds = 1;
        }
        this.data.equippedArtifacts = (this.data.equippedArtifacts ?? []).filter(
          id => ARTIFACT_DEFINITIONS.some(a => a.id === id)
        ).slice(0, MAX_EQUIPPED_ARTIFACTS);
        this.data.unlockedTools = this.data.unlockedTools ?? [];
        this.data.discoveredAnomalies = this.data.discoveredAnomalies ?? [];
        this.data.collectedLore = this.data.collectedLore ?? [];
        this.data.discoveredArtifacts = this.data.discoveredArtifacts ?? [];
        this.data.completedAchievements = this.data.completedAchievements ?? [];
      }
    } catch {
      this.data = { ...DEFAULT_DATA };
    }
  }

  async save(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save progression:', e);
    }
  }

  addEchoes(amount: number): void {
    this.data.echoes += amount;
    this.emit('echoes_changed', { echoes: this.data.echoes, delta: amount });
    this.save();
  }

  spendEchoes(amount: number): boolean {
    if (this.data.echoes < amount) return false;
    this.data.echoes -= amount;
    this.emit('echoes_changed', { echoes: this.data.echoes, delta: -amount });
    this.save();
    return true;
  }

  unlockTool(toolId: string): boolean {
    if (this.data.unlockedTools.includes(toolId)) return false;
    const blueprint = TOOL_BLUEPRINTS.find(t => t.id === toolId);
    if (!blueprint) return false;
    if (blueprint.prerequisite && !this.data.unlockedTools.includes(blueprint.prerequisite)) return false;
    if (blueprint.cost > 0 && !this.spendEchoes(blueprint.cost)) return false;
    this.data.unlockedTools.push(toolId);
    this.emit('tool_unlocked', { toolId });
    this.save();
    this.checkAchievements();
    return true;
  }

  hasTool(toolId: string): boolean {
    return this.data.unlockedTools.includes(toolId);
  }

  discoverAnomaly(anomalyType: string): void {
    if (!ANOMALY_TYPES_TO_DISCOVER.includes(anomalyType)) return;
    if (this.data.discoveredAnomalies.includes(anomalyType)) return;
    this.data.discoveredAnomalies.push(anomalyType);
    this.emit('anomaly_discovered', { anomalyType, count: this.data.discoveredAnomalies.length });
    this.save();
    this.checkAchievements();
  }

  isAnomalyDiscovered(anomalyType: string): boolean {
    return this.data.discoveredAnomalies.includes(anomalyType);
  }

  collectLore(loreId: string): void {
    if (this.data.collectedLore.includes(loreId)) return;
    if (!LORE_FRAGMENTS.some(l => l.id === loreId)) return;
    this.data.collectedLore.push(loreId);
    this.emit('lore_collected', { loreId, count: this.data.collectedLore.length });
    this.save();
    this.checkAchievements();
  }

  hasLore(loreId: string): boolean {
    return this.data.collectedLore.includes(loreId);
  }

  discoverArtifact(artifactId: string): boolean {
    if (this.data.discoveredArtifacts.includes(artifactId)) return false;
    if (!ARTIFACT_DEFINITIONS.some(a => a.id === artifactId)) return false;
    this.data.discoveredArtifacts.push(artifactId);
    this.emit('artifact_discovered', { artifactId, count: this.data.discoveredArtifacts.length });
    this.save();
    this.checkAchievements();
    return true;
  }

  equipArtifact(artifactId: string): boolean {
    if (!this.data.discoveredArtifacts.includes(artifactId)) return false;
    if (this.data.equippedArtifacts.includes(artifactId)) return true;
    if (this.data.equippedArtifacts.length >= MAX_EQUIPPED_ARTIFACTS) return false;
    this.data.equippedArtifacts.push(artifactId);
    this.emit('artifact_equipped', { artifactId, equipped: [...this.data.equippedArtifacts] });
    this.save();
    return true;
  }

  unequipArtifact(artifactId: string): void {
    this.data.equippedArtifacts = this.data.equippedArtifacts.filter(id => id !== artifactId);
    this.emit('artifact_unequipped', { artifactId, equipped: [...this.data.equippedArtifacts] });
    this.save();
  }

  getUnlockables(category: 'tool' | 'threshold' | 'artifact' | 'lore' | 'achievement'): UnlockDefinition[] {
    switch (category) {
      case 'threshold':
        return THRESHOLD_TIERS.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: 'threshold' as const,
          cost: t.cost,
          prerequisite: t.prerequisite,
          thresholdTier: t.tier,
        }));
      case 'tool':
        return TOOL_BLUEPRINTS.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: 'tool' as const,
          cost: t.cost,
          prerequisite: t.prerequisite,
          toolBlueprint: t.id,
        }));
      case 'artifact':
        return ARTIFACT_DEFINITIONS.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          category: 'artifact' as const,
          cost: a.cost,
          prerequisite: a.prerequisite,
        }));
      case 'lore':
        return LORE_FRAGMENTS.map(l => ({
          id: l.id,
          name: l.title,
          description: l.text.substring(0, 60) + '...',
          category: 'lore' as const,
          cost: 0,
          prerequisite: null,
        }));
      case 'achievement':
        return ACHIEVEMENT_DEFINITIONS.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          category: 'achievement' as const,
          cost: 0,
          prerequisite: null,
        }));
    }
  }

  recordRun(result: 'extract' | 'death' | 'descend', stats: {
    time: number;
    biomesCleared: number;
    anomaliesEncountered: number;
    entitiesEvaded: number;
    toolsFound: number;
    loreFound: number;
    depth: number;
  }): void {
    this.data.totalRuns++;
    this.data.totalBiomesCleared += stats.biomesCleared;
    this.data.totalAnomaliesEncountered += stats.anomaliesEncountered;
    this.data.totalEntitiesEvaded += stats.entitiesEvaded;

    if (stats.depth > this.data.deepestDepth) {
      this.data.deepestDepth = stats.depth;
    }

    if (result === 'extract') {
      this.data.successfulExtracts++;
      const echoes = ECHOES_PER_EXTRACT_BASE +
        stats.biomesCleared * ECHOES_PER_BIOME_BONUS +
        stats.loreFound * ECHOES_PER_LORE_BONUS +
        stats.anomaliesEncountered * ECHOES_PER_ANOMALY_BONUS;
      this.addEchoes(echoes);
    } else if (result === 'descend') {
      const echoes = Math.floor(ECHOES_PER_EXTRACT_BASE * 0.5) +
        stats.biomesCleared * ECHOES_PER_BIOME_BONUS +
        stats.loreFound * ECHOES_PER_LORE_BONUS;
      this.addEchoes(echoes);
    } else if (result === 'death') {
      const echoes = Math.floor(ECHOES_PER_EXTRACT_BASE * ECHOES_DEATH_PENALTY);
      this.addEchoes(echoes);
    }

    this.emit('run_recorded', { result, stats, data: this.getData() });
    this.save();
    this.checkAchievements();
  }

  processRunResult(stats: RunStats & { result?: 'extract' | 'death' | 'descend' }): void {
    this.recordRun(stats.result ?? 'descend', {
      time: stats.time,
      biomesCleared: stats.biomesCleared,
      anomaliesEncountered: stats.anomaliesEncountered,
      entitiesEvaded: stats.entitiesEvaded,
      toolsFound: stats.toolsFound,
      loreFound: stats.loreFragmentsCollected,
      depth: stats.depth,
    });
  }

  private checkAchievements(): void {
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      if (this.data.completedAchievements.includes(achievement.id)) continue;
      if (achievement.check({
        echoes: this.data.echoes,
        totalRuns: this.data.totalRuns,
        successfulExtracts: this.data.successfulExtracts,
        deepestDepth: this.data.deepestDepth,
        unlockedThresholds: this.data.unlockedThresholds,
        unlockedTools: [...this.data.unlockedTools],
        discoveredAnomalies: [...this.data.discoveredAnomalies],
        collectedLore: [...this.data.collectedLore],
        discoveredArtifacts: [...this.data.discoveredArtifacts],
      })) {
        this.data.completedAchievements.push(achievement.id);
        this.emit('achievement_unlocked', { achievementId: achievement.id, name: achievement.name });
        this.save();
      }
    }
  }

  upgradeThreshold(): boolean {
    const currentLevel = this.data.unlockedThresholds;
    const nextTier = THRESHOLD_TIERS.find(t => t.tier === currentLevel + 1);
    if (!nextTier) return false;
    if (!this.spendEchoes(nextTier.cost)) return false;
    this.data.unlockedThresholds = currentLevel + 1;
    this.emit('threshold_upgraded', { tier: currentLevel + 1, thresholdId: nextTier.id });
    this.save();
    this.checkAchievements();
    return true;
  }

  getMaxDepth(): number {
    return this.data.unlockedThresholds * 8;
  }

  getThresholdLevel(): number {
    return this.data.unlockedThresholds;
  }

  getAvailableTools(): string[] {
    return [...this.data.unlockedTools];
  }

  reset(): void {
    this.data = { ...DEFAULT_DATA };
    this.emit('progression_reset');
    this.save();
  }

  getData(): ProgressionData {
    return { ...this.data };
  }

  dispose(): void {
    this.removeAllListeners();
  }
}
