import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';
import { Renderer } from './Renderer';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private _activeCamera: THREE.PerspectiveCamera;
  private fogController: THREE.Fog;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  constructor(private renderer: Renderer, private assetLoader: AssetLoader) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this._activeCamera = this.camera;

    this.fogController = new THREE.Fog(0x000000, 30, 80);
    this.scene.fog = this.fogController;

    this.setupLights();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);
  }

  get activeCamera(): THREE.PerspectiveCamera {
    return this._activeCamera;
  }

  set activeCamera(camera: THREE.PerspectiveCamera) {
    this._activeCamera = camera;
  }

  onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(deltaTime: number): void {
    this._activeCamera.updateMatrixWorld();
  }

  setFog(near: number, far: number, color: THREE.ColorRepresentation = 0x000000): void {
    this.scene.fog = new THREE.Fog(color, near, far);
  }

  setAmbientLight(color: THREE.ColorRepresentation, intensity: number): void {
    this.ambientLight.color.set(color);
    this.ambientLight.intensity = intensity;
  }

  dispose(): void {
    this.scene.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}