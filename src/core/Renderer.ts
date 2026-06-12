import * as THREE from 'three';
import { Settings } from '../utils/Settings';

export class Renderer {
  public readonly instance: THREE.WebGLRenderer;

  constructor(private canvas: HTMLCanvasElement, settings: Settings) {
    this.instance = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.get('graphics.antialias', true),
      powerPreference: 'high-performance',
    });
    this.instance.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.0;
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
  }

  resize(width: number, height: number): void {
    this.instance.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.instance.render(scene, camera);
  }

  get domElement(): HTMLCanvasElement {
    return this.instance.domElement;
  }

  dispose(): void {
    this.instance.dispose();
  }
}