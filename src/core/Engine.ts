import { EventEmitter } from '../utils/EventEmitter';
import { Settings } from '../utils/Settings';
import { AssetLoader } from '../utils/AssetLoader';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { SceneManager } from './SceneManager';
import { Time } from './Time';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  settings: Settings;
  assetLoader: AssetLoader;
}

export class Engine extends EventEmitter {
  public readonly canvas: HTMLCanvasElement;
  public readonly settings: Settings;
  public readonly assetLoader: AssetLoader;
  public readonly renderer: Renderer;
  public readonly sceneManager: SceneManager;
  public readonly input: InputManager;
  public readonly time: Time;

  private _running = false;
  private _animationFrameId: number | null = null;
  private _lastTime = 0;
  public deltaTime = 0;
  public elapsedTime = 0;

  constructor(config: EngineConfig) {
    super();
    this.canvas = config.canvas;
    this.settings = config.settings;
    this.assetLoader = config.assetLoader;

    this.time = new Time();
    this.input = new InputManager(this.canvas);
    this.renderer = new Renderer(this.canvas, this.settings);
    this.sceneManager = new SceneManager(this.renderer, this.assetLoader);

    this.setupResizeHandler();
  }

  private setupResizeHandler(): void {
    const resize = () => {
      this.renderer.resize(window.innerWidth, window.innerHeight);
      this.sceneManager.onResize(window.innerWidth, window.innerHeight);
      this.emit('resize', { width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', resize);
    this.on('dispose', () => window.removeEventListener('resize', resize));
    resize();
  }

  public start(updateCallback: (deltaTime: number) => void): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this.gameLoop(updateCallback);
  }

  private gameLoop(updateCallback: (deltaTime: number) => void): void {
    if (!this._running) return;

    const currentTime = performance.now();
    this.deltaTime = Math.min((currentTime - this._lastTime) / 1000, 1 / 30);
    this.elapsedTime += this.deltaTime;
    this._lastTime = currentTime;

    this.time.update(this.deltaTime, this.elapsedTime);
    this.input.update();

    updateCallback(this.deltaTime);

    this.sceneManager.update(this.deltaTime);
    this.renderer.render(this.sceneManager.scene, this.sceneManager.activeCamera);

    this._animationFrameId = requestAnimationFrame(() => this.gameLoop(updateCallback));
  }

  public stop(): void {
    this._running = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.input.dispose();
    this.renderer.dispose();
    this.sceneManager.dispose();
    this.emit('dispose');
    this.removeAllListeners();
  }

  public get running(): boolean {
    return this._running;
  }
}