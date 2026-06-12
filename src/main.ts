import { Engine } from './core/Engine';
import { Game } from './systems/Game';
import { AssetLoader } from './utils/AssetLoader';
import { Settings } from './utils/Settings';

function getLoadingEl(): HTMLElement | null {
  return document.getElementById('loading-screen');
}

function hideLoading(): void {
  const el = getLoadingEl();
  if (el) el.style.display = 'none';
}

function showLoadingError(msg: string): void {
  const el = getLoadingEl();
  if (!el) return;
  el.innerHTML = `<h1 style="color:#ff4444">Failed to load</h1><p style="color:#ffffff88;margin-top:1rem;max-width:400px;text-align:center">${msg}</p>`;
}

async function bootstrap() {
  try {
    const settings = new Settings();
    await settings.load();

    const assetLoader = new AssetLoader();
    await assetLoader.preload();

    const engine = new Engine({
      canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
      settings,
      assetLoader,
    });

    const game = new Game(engine);
    await game.initialize();

    const resumeAudio = () => {
      const audioManager = game.getAudioManager();
      if (audioManager) {
        audioManager.onFirstInteraction();
      }
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
    };
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);

    hideLoading();
    engine.start(() => game.update(engine.deltaTime));

    window.addEventListener('beforeunload', () => {
      engine.dispose();
      game.dispose();
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showLoadingError(msg);
    console.error('Bootstrap failed:', err);
  }
}

bootstrap();