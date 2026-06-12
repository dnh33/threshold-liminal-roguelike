import * as THREE from 'three';

interface AssetEntry {
  path: string;
  loaded: boolean;
  data?: any;
}

export class AssetLoader {
  private textures: Map<string, THREE.Texture> = new Map();
  private models: Map<string, any> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadingManager = new THREE.LoadingManager();

  private textureLoader: THREE.TextureLoader;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
  }

  async preload(): Promise<void> {
    this.loadingManager.onProgress = (url, loaded, total) => {
      console.log(`Loading: ${url} (${loaded}/${total})`);
    };
  }

  loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      if (this.textures.has(path)) {
        resolve(this.textures.get(path)!);
        return;
      }
      this.textureLoader.load(
        path,
        (texture) => {
          this.textures.set(path, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  generateTexture(width: number, height: number, fill: (x: number, y: number) => THREE.Color): THREE.DataTexture {
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = fill(x, y);
        const idx = (y * width + x) * 3;
        data[idx] = Math.floor(color.r * 255);
        data[idx + 1] = Math.floor(color.g * 255);
        data[idx + 2] = Math.floor(color.b * 255);
      }
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
    texture.needsUpdate = true;
    return texture;
  }

  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  dispose(): void {
    this.textures.forEach(t => t.dispose());
    this.textures.clear();
    this.models.clear();
    this.audioBuffers.clear();
  }
}