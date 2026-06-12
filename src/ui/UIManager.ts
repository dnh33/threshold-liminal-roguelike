import { EventEmitter } from '../utils/EventEmitter';
import type { Engine } from '../core/Engine';
import { HUD } from './HUD';
import type { HUDData } from './HUD';
import { MainMenu } from './MainMenu';
import { PauseMenu } from './PauseMenu';
import { RunEndScreen } from './RunEndScreen';
import type { RunEndStats, ArtifactEntry } from './RunEndScreen';
import { Codex } from './Codex';
import { SettingsScreen } from './SettingsScreen';

export const UIState = {
  MAIN_MENU: 'main_menu',
  HUD: 'hud',
  PAUSE: 'pause',
  CODEX: 'codex',
  RUN_END: 'run_end',
  SETTINGS: 'settings',
  LOADING: 'loading',
} as const;

export type UIState = (typeof UIState)[keyof typeof UIState];

const LOADING_STYLES = `
#threshold-loading {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 11000;
  background: #0a0a0f;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #c8c8d0;
  transition: opacity 0.5s ease;
}
#threshold-loading.hidden { opacity: 0; pointer-events: none; }
.threshold-loading-spinner {
  width: 2px; height: 40px;
  background: rgba(200, 200, 220, 0.2);
  animation: load-pulse 1s ease-in-out infinite;
}
@keyframes load-pulse {
  0%, 100% { opacity: 0.3; transform: scaleY(0.5); }
  50% { opacity: 1; transform: scaleY(1); }
}
.threshold-loading-text {
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #4a4a5a;
  margin-top: 1em;
  animation: load-fade 1.5s ease-in-out infinite;
}
@keyframes load-fade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
`;

export class UIManager extends EventEmitter {
  private state: UIState = UIState.MAIN_MENU;
  private hud: HUD;
  private mainMenu: MainMenu;
  private pauseMenu: PauseMenu;
  private runEndScreen: RunEndScreen;
  private codex: Codex;
  private settingsScreen!: SettingsScreen;
  private container: HTMLElement;
  private loadingEl: HTMLElement;

  constructor(_engine: Engine) {
    super();

    if (!document.getElementById('threshold-global-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'threshold-global-styles';
      styleEl.textContent = `
        body.threshold-ui-active { cursor: default; }
        body.threshold-ui-active canvas { cursor: inherit; }
      `;
      document.head.appendChild(styleEl);
    }

    this.container = document.createElement('div');
    this.container.id = 'ui-root';
    this.container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:3000;pointer-events:none';
    document.body.appendChild(this.container);

    // Loading screen
    this.loadingEl = this.createLoadingScreen();
    document.body.appendChild(this.loadingEl);

    // Sub-components
    this.mainMenu = new MainMenu(this.container);
    this.setupMainMenuEvents();

    this.hud = new HUD(this.container);
    this.setupHUDEvents();

    this.pauseMenu = new PauseMenu(this.container);
    this.setupPauseMenuEvents();

    this.runEndScreen = new RunEndScreen(this.container);
    this.setupRunEndEvents();

    this.codex = new Codex(this.container);
    this.setupCodexEvents();

    this.settingsScreen = new SettingsScreen(this.container, _engine.settings);
    this.settingsScreen.on('setting_changed', (data: any) => {
      this.emit('setting_changed', data);
    });

    // Default state
    this.setState(UIState.MAIN_MENU);
  }

  private createLoadingScreen(): HTMLElement {
    if (!document.getElementById('threshold-loading-styles')) {
      const s = document.createElement('style');
      s.id = 'threshold-loading-styles';
      s.textContent = LOADING_STYLES;
      document.head.appendChild(s);
    }

    const el = document.createElement('div');
    el.id = 'threshold-loading';
    el.innerHTML = '<div class="threshold-loading-spinner"></div><div class="threshold-loading-text">Loading</div>';
    return el;
  }

  private setupMainMenuEvents(): void {
    this.mainMenu.on('menu_select', (action: string) => {
      if (action === 'new_run') {
        this.emit('start_run');
      } else if (action === 'continue') {
        this.emit('continue_run');
      } else if (action === 'codex') {
        this.setState(UIState.CODEX);
      } else if (action === 'settings') {
        this.setState(UIState.SETTINGS);
      } else if (action === 'credits') {
        this.emit('show_credits');
      }
    });
  }

  private setupHUDEvents(): void {
    // HUD slot click events could be forwarded here
  }

  private setupPauseMenuEvents(): void {
    this.pauseMenu.on('resume', () => {
      this.emit('resume');
    });

    this.pauseMenu.on('open_codex', () => {
      this.setState(UIState.CODEX);
    });

    this.pauseMenu.on('quit_to_menu', () => {
      this.setState(UIState.MAIN_MENU);
      this.emit('quit_to_menu');
    });

    this.pauseMenu.on('setting_changed', (data: { key: string; value: unknown }) => {
      this.emit('setting_changed', data);
    });
  }

  private setupRunEndEvents(): void {
    this.runEndScreen.on('new_run', () => {
      this.emit('start_run');
    });

    this.runEndScreen.on('open_codex', () => {
      this.setState(UIState.CODEX);
    });

    this.runEndScreen.on('return_to_menu', () => {
      this.setState(UIState.MAIN_MENU);
      this.emit('return_to_menu');
    });
  }

  private setupCodexEvents(): void {
    this.codex.on('close', () => {
      if (this.state === UIState.CODEX) {
        if (this.previousState) {
          this.setState(this.previousState);
        } else {
          this.setState(UIState.HUD);
        }
      }
    });
  }

  private previousState: UIState | null = null;

  setState(state: UIState): void {
    const prev = this.state;
    this.previousState = prev;
    this.state = state;

    // Hide all
    this.mainMenu.hide();
    this.hud.hide();
    this.pauseMenu.hide();
    this.runEndScreen.hide();
    this.codex.hide();
    this.settingsScreen.hide();
    this.loadingEl.classList.add('hidden');

    // Show relevant
    switch (state) {
      case UIState.MAIN_MENU:
        this.mainMenu.show();
        break;
      case UIState.HUD:
        this.hud.show();
        break;
      case UIState.PAUSE:
        this.pauseMenu.show();
        break;
      case UIState.CODEX:
        this.codex.show();
        break;
      case UIState.RUN_END:
        this.runEndScreen.show('Extracted', {
          time: 0, biomesCleared: 0, anomaliesEncountered: 0,
          entitiesEvaded: 0, toolsFound: 0, loreFragmentsCollected: 0, depth: 1,
        });
        break;
      case UIState.SETTINGS:
        this.settingsScreen.show();
        break;
      case UIState.LOADING:
        this.loadingEl.classList.remove('hidden');
        break;
    }

    this.emit('state_changed', { from: prev, to: state });
  }

  update(_dt: number, _playerData?: Record<string, unknown>): void {
    // Pass update through to active components
    if (this.state === UIState.HUD) {
      // HUD is updated via setData, not per-frame DOM updates
    }
  }

  showGameUI(): void {
    this.setState(UIState.HUD);
  }

  showInteractionPrompt(text: string): void {
    this.hud.setInteractionPrompt(text);
  }

  hideInteractionPrompt(): void {
    this.hud.setInteractionPrompt(null);
  }

  showTooltip(text: string, duration: number): void {
    const tooltip = document.createElement('div');
    tooltip.textContent = text;
    tooltip.style.cssText = 'position:fixed;bottom:50%;left:50%;transform:translate(-50%,-50%);background:#000000cc;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:1000;pointer-events:none;font-family:system-ui,sans-serif;transition:opacity 0.3s;';
    document.body.appendChild(tooltip);
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => tooltip.remove(), 300);
    }, duration);
  }

  updateRunStats(_stats: Partial<RunEndStats>): void {
    // Update any stat displays
  }

  showNotification(text: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info'): void {
    this.hud.showNotification(text, type);
  }

  showAnomalyNotification(text: string): void {
    this.showNotification(text, 'warning');
  }

  showRunEndScreen(result: string, stats: RunEndStats, artifacts?: ArtifactEntry[]): void {
    this.runEndScreen.show(result, stats, artifacts);
    this.state = UIState.RUN_END;
  }

  showPauseMenu(): void {
    this.setState(UIState.PAUSE);
  }

  hidePauseMenu(): void {
    this.setState(UIState.HUD);
  }

  updateHUD(data: HUDData): void {
    this.hud.setData(data);
  }

  getHUD(): HUD {
    return this.hud;
  }

  getMainMenu(): MainMenu {
    return this.mainMenu;
  }

  getPauseMenu(): PauseMenu {
    return this.pauseMenu;
  }

  getCodex(): Codex {
    return this.codex;
  }

  isPaused(): boolean {
    return this.state === UIState.PAUSE;
  }

  getState(): UIState {
    return this.state;
  }

  dispose(): void {
    this.mainMenu.dispose();
    this.hud.dispose();
    this.pauseMenu.dispose();
    this.runEndScreen.dispose();
    this.codex.dispose();
    this.settingsScreen.dispose();
    this.loadingEl.remove();
    this.container.remove();
    this.removeAllListeners();
  }
}
