import { Engine } from './core/Engine';
import { Game } from './systems/Game';
import { AssetLoader } from './utils/AssetLoader';
import { Settings } from './utils/Settings';

async function bootstrap() {
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

  engine.start(() => game.update(engine.deltaTime));

  window.addEventListener('beforeunload', () => {
    engine.dispose();
    game.dispose();
  });
}

bootstrap().catch(console.error);