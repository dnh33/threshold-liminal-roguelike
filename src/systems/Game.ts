import type { Engine } from '../core/Engine';
import { EventEmitter } from '../utils/EventEmitter';
import { RunDirector } from './RunDirector';
import { PlayerController } from '../player/PlayerController';
import { BiomeManager } from './BiomeManager';
import { AudioManager } from '../audio/AudioManager';
import { UIManager } from '../ui/UIManager';
import { MetaProgression } from '../progression/MetaProgression';
import { AnomalySystem } from './AnomalySystem';
import { EntityManager } from '../entities/EntityManager';
import { InteractionSystem } from '../player/InteractionSystem';
import { ToolSystem } from '../tools/ToolSystem';
import { AtmosphereSystem } from '../audio/AtmosphereSystem';
import type { BiomeType } from '../biomes/BiomeTypes';
import { TransitionType } from './BiomeManager';
import type { HUDData } from '../ui/HUD';

export const GameState = {
  MENU: 'menu',
  LOADING: 'loading',
  RUNNING: 'running',
  PAUSED: 'paused',
  RUN_END: 'run_end',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export class Game extends EventEmitter {
  private engine: Engine;
  private state: GameState = GameState.MENU;
  private playerController!: PlayerController;
  private runDirector!: RunDirector;
  private biomeManager!: BiomeManager;
  private anomalySystem!: AnomalySystem;
  private audioManager!: AudioManager;
  private uiManager!: UIManager;
  private metaProgression!: MetaProgression;
  private entityManager!: EntityManager;
  private interactionSystem!: InteractionSystem;
  private toolSystem!: ToolSystem;
  private atmosphereSystem!: AtmosphereSystem;
  private gameTime = 0;
  private initialized = false;

  constructor(engine: Engine) {
    super();
    this.engine = engine;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.state = GameState.LOADING;
    this.emit('state_changed', { state: this.state });

    this.metaProgression = new MetaProgression();
    await this.metaProgression.load();

    this.runDirector = new RunDirector();
    this.biomeManager = new BiomeManager(this.engine);
    this.anomalySystem = new AnomalySystem(Date.now());
    this.audioManager = new AudioManager(this.engine.settings);
    this.uiManager = new UIManager(this.engine);
    this.playerController = new PlayerController(this.engine, this.engine.input);

    this.atmosphereSystem = new AtmosphereSystem(this.engine);
    this.entityManager = new EntityManager(this.engine.sceneManager.scene, this.engine);
    this.interactionSystem = new InteractionSystem(this.playerController, this.engine.sceneManager.scene);
    this.toolSystem = new ToolSystem();

    this.engine.sceneManager.activeCamera = this.playerController.camera;

    this.setupEventListeners();

    this.initialized = true;
    this.state = GameState.MENU;
    this.emit('state_changed', { state: this.state });
    this.emit('initialized');
  }

  private setupEventListeners(): void {
    this.playerController.on('death', () => {
      this.endRun('death');
    });

    this.playerController.on('biome_exit_found', () => {
      this.handleBiomeTransition();
    });

    this.playerController.on('footstep', (data: any) => {
      this.audioManager.playFootstep(data.surface, data.strength);
    });

    this.playerController.on('damage-taken', (data: any) => {
      this.atmosphereSystem.flashScreen('red', 0.2);
      this.audioManager.playDamage();
    });

    this.runDirector.on('biome_changed', (data) => {
      this.anomalySystem.update(0);
      this.handleAnomalyRoll(data.to as BiomeType);
    });

    this.engine.input.on('keydown', (key: string) => {
      if (key === 'escape') {
        if (this.state === GameState.RUNNING) this.pause();
        else if (this.state === GameState.PAUSED) this.resume();
      }
    });

    this.entityManager.on('entity-attack', (data: any) => {
      this.playerController.takeDamage(data.damage || 10);
    });

    this.entityManager.on('entity-detected-player', (data: any) => {
      this.playerController.setDetectionLevel(data.detectionLevel);
    });

    this.toolSystem.on('tool-used', (data: any) => {
      this.audioManager.playToolUse(data.toolId || data.item?.definition?.id);
    });

    this.interactionSystem.on('tool-pickup', (data: any) => {
      this.toolSystem.addItem(data.tool || data.data);
      this.audioManager.playItemPickup();
      this.uiManager.showNotification(`Picked up: ${(data.tool || data.data).name}`, 'success');
    });

    this.uiManager.on('start_run', () => {
      this.startRun();
    });
  }

  async startRun(): Promise<void> {
    if (this.state === GameState.RUNNING) return;

    this.state = GameState.LOADING;
    this.emit('state_changed', { state: this.state });

    this.gameTime = 0;
    const config = this.runDirector.generateRunConfig();
    this.runDirector.startRun(config);
    this.anomalySystem.setSeed(config.seed);

    const firstBiome = this.runDirector.getCurrentBiome();
    if (firstBiome) {
      await this.biomeManager.transitionTo(firstBiome, TransitionType.FADE);
    }

    this.atmosphereSystem.setBiomeAtmosphere(firstBiome!);
    this.audioManager.startRun();
    this.uiManager.showGameUI();

    this.state = GameState.RUNNING;
    this.emit('state_changed', { state: this.state });
    this.emit('run_started', { config });
  }

  private handleBiomeTransition(): void {
    if (this.runDirector.isLastBiome()) {
      this.endRun('descend');
      return;
    }

    const nextBiome = this.runDirector.getNextBiome();
    if (!nextBiome) return;

    const prevBiome = this.runDirector.getCurrentBiome();
    this.runDirector.advanceBiome();

    this.biomeManager.transitionTo(nextBiome, TransitionType.FADE).then(() => {
      this.audioManager.onBiomeChanged(nextBiome, prevBiome!);
      this.atmosphereSystem.setBiomeAtmosphere(nextBiome);
      this.emit('biome_entered', { biome: nextBiome });
    });
  }

  private handleAnomalyRoll(biomeType: BiomeType): void {
    const definition = this.biomeManager.getDefinition(biomeType);
    const depth = this.runDirector.getStats().depth;
    const anomaly = this.anomalySystem.rollForAnomaly(biomeType, definition.anomalyProbability, depth);
    if (anomaly) {
      this.runDirector.recordAnomalyEncountered();
      this.audioManager.onAnomalyStarted(anomaly.type);
      this.atmosphereSystem.setAnomalyEffect(anomaly.type, true, anomaly.severity);
      const anomalyName = anomaly.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      this.uiManager.showAnomalyNotification(`ANOMALY DETECTED: ${anomalyName}`);
      this.emit('anomaly_encountered', { anomaly });
    }
  }

  async endRun(result: 'extract' | 'death' | 'descend'): Promise<void> {
    if (this.state === GameState.RUN_END) return;

    this.state = GameState.RUN_END;
    this.emit('state_changed', { state: this.state });

    const stats = this.runDirector.endRun();
    const modifiers = this.runDirector.getConfig()?.modifiers ?? [];

    await this.metaProgression.processRunResult({
      ...stats,
      result: result,
      depth: this.runDirector.getStats().depth,
    });

    this.audioManager.endRun(result);
    this.playerController.setEnabled(false);
    this.uiManager.showRunEndScreen(result, stats);
    this.entityManager.clearAll();

    this.emit('run_ended', { result, stats, modifiers });
  }

  update(deltaTime: number): void {
    if (this.state !== GameState.RUNNING) return;

    this.gameTime += deltaTime;

    this.runDirector.update(deltaTime);
    this.biomeManager.update(deltaTime);
    this.anomalySystem.update(deltaTime);
    this.playerController.update(deltaTime);
    this.audioManager.update(deltaTime);
    this.entityManager.update(deltaTime, this.playerController.position, []);
    this.toolSystem.update(deltaTime, this.engine.input);
    this.atmosphereSystem.update(deltaTime);

    const health = this.playerController.getHealth();
    const maxHealth = this.playerController.getMaxHealth();
    const rawHotbar = this.toolSystem.getHotbarItems();
    const activeSlot = this.toolSystem.getActiveSlot();
    const biomeName = this.biomeManager.getCurrentDefinition()?.name || 'Unknown';
    const depth = this.runDirector.getStats().depth;
    const detection = this.playerController.getDetectionLevel();

    const hotbar = rawHotbar.map(item =>
      item ? { id: item.definition.id, name: item.definition.name, icon: item.definition.icon, uses: item.currentUses } : null
    );

    this.uiManager.updateHUD({
      health,
      maxHealth,
      sanity: 100,
      maxSanity: 100,
      hotbar,
      activeSlot,
      detection,
      biomeName,
      depth,
      time: this.gameTime,
      hasAnomaly: false,
      anomalyWarnings: [],
      interactionPrompt: this.interactionSystem.isHovering()
        ? (this.interactionSystem.getHoveredObject()?.userData as any)?.label || 'Interact'
        : null,
    });
  }

  pause(): void {
    if (this.state !== GameState.RUNNING) return;
    this.state = GameState.PAUSED;
    this.engine.time.timeScale = 0;
    this.audioManager.pause();
    this.playerController.setEnabled(false);
    this.uiManager.showPauseMenu();
    this.emit('state_changed', { state: this.state });
  }

  resume(): void {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.RUNNING;
    this.engine.time.timeScale = 1;
    this.audioManager.resume();
    this.playerController.setEnabled(true);
    this.uiManager.hidePauseMenu();
    this.emit('state_changed', { state: this.state });
  }

  getState(): GameState {
    return this.state;
  }

  getPlayerController(): PlayerController {
    return this.playerController;
  }

  getRunDirector(): RunDirector {
    return this.runDirector;
  }

  getBiomeManager(): BiomeManager {
    return this.biomeManager;
  }

  getAnomalySystem(): AnomalySystem {
    return this.anomalySystem;
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  getUIManager(): UIManager {
    return this.uiManager;
  }

  getMetaProgression(): MetaProgression {
    return this.metaProgression;
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  getInteractionSystem(): InteractionSystem {
    return this.interactionSystem;
  }

  getToolSystem(): ToolSystem {
    return this.toolSystem;
  }

  getAtmosphereSystem(): AtmosphereSystem {
    return this.atmosphereSystem;
  }

  getGameTime(): number {
    return this.gameTime;
  }

  dispose(): void {
    this.state = GameState.MENU;

    if (this.playerController) this.playerController.dispose();
    if (this.runDirector) this.runDirector.dispose();
    if (this.biomeManager) this.biomeManager.dispose();
    if (this.anomalySystem) this.anomalySystem.dispose();
    if (this.audioManager) this.audioManager.dispose();
    if (this.uiManager) this.uiManager.dispose();
    if (this.metaProgression) this.metaProgression.dispose();
    if (this.entityManager) this.entityManager.dispose();
    if (this.interactionSystem) this.interactionSystem.dispose();
    if (this.toolSystem) this.toolSystem.dispose();
    if (this.atmosphereSystem) this.atmosphereSystem.dispose();

    this.removeAllListeners();
    this.initialized = false;
  }
}
