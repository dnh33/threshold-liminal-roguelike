import * as THREE from 'three';
import { type BiomeDefinition } from './BiomeTypes';

export class GarageBiome {
  readonly group: THREE.Group;
  private materials: Record<string, THREE.MeshStandardMaterial> = {};
  private baseSeed: number;
  private biomeDefinition: BiomeDefinition;

  constructor(biomeDefinition: BiomeDefinition) {
    this.biomeDefinition = biomeDefinition;
    this.group = new THREE.Group();
    this.baseSeed = Math.random() * 100000;
    this.createMaterials();
  }

  private createMaterials(): void {
    const { secondary } = this.biomeDefinition.colorPalette;

    const concreteCanvas = document.createElement('canvas');
    concreteCanvas.width = 128;
    concreteCanvas.height = 128;
    const cctx = concreteCanvas.getContext('2d')!;
    cctx.fillStyle = '#2a4a5a';
    cctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 800; i++) {
      const g = Math.floor(40 + Math.random() * 40);
      cctx.fillStyle = `rgb(${g + 20},${g + 40},${g + 60})`;
      cctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    const concreteTex = new THREE.CanvasTexture(concreteCanvas);
    concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
    concreteTex.repeat.set(12, 12);

    this.materials.floor = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.95,
      metalness: 0.05,
    });

    this.materials.wall = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      roughness: 0.95,
      metalness: 0.05,
    });

    this.materials.pillar = new THREE.MeshStandardMaterial({
      color: 0x3a5a6a,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.materials.water = new THREE.MeshStandardMaterial({
      color: 0x1a4a5a,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    this.materials.carBody = new THREE.MeshStandardMaterial({
      color: 0x4a5a6a,
      roughness: 0.3,
      metalness: 0.6,
    });

    this.materials.carGlass = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.5,
    });

    this.materials.carLight = new THREE.MeshStandardMaterial({
      color: 0xaa5533,
      emissive: 0xaa5533,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.2,
    });

    this.materials.stripe = new THREE.MeshStandardMaterial({
      color: 0xaaaa55,
      roughness: 0.8,
      metalness: 0,
    });

    this.materials.railing = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      roughness: 0.6,
      metalness: 0.4,
    });

    this.materials.waterFloor = new THREE.MeshStandardMaterial({
      color: 0x0a2a3a,
      roughness: 0.95,
      metalness: 0.05,
    });
  }

  private rng(i: number): number {
    const v = Math.sin(this.baseSeed + i * 537.58) * 43758.5453;
    return v - Math.floor(v);
  }

  build(): THREE.Group {
    this.buildStructure();
    this.buildPillars();
    this.buildWater();
    this.buildCars();
    this.buildParkingStripes();
    this.buildRamp();
    this.buildLights();
    return this.group;
  }

  private buildStructure(): void {
    const size = 40;
    const height = 2.8;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallData = [
      { x: 0, z: -size / 2, sx: size, sz: 0.3 },
      { x: 0, z: size / 2, sx: size, sz: 0.3 },
      { x: -size / 2, z: 0, sx: 0.3, sz: size },
      { x: size / 2, z: 0, sx: 0.3, sz: size },
    ];
    for (const w of wallData) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w.sx, height, w.sz), this.materials.wall);
      wall.position.set(w.x, height / 2, w.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    }

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.materials.ceiling);
    ceiling.position.y = height;
    ceiling.rotation.x = Math.PI / 2;
    this.group.add(ceiling);

    const beamSpacing = 5;
    for (let i = -3; i <= 3; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, size), this.materials.wall);
      beam.position.set(i * beamSpacing, height - 0.15, 0);
      this.group.add(beam);
    }
  }

  private buildPillars(): void {
    const cols = 7;
    const rows = 7;
    const spacing = 5;
    const startX = -((cols - 1) * spacing) / 2;
    const startZ = -((rows - 1) * spacing) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 2.8, 0.5),
          this.materials.pillar
        );
        pillar.position.set(startX + c * spacing, 1.4, startZ + r * spacing);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.group.add(pillar);

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.08, 0.6),
          this.materials.pillar
        );
        base.position.set(startX + c * spacing, 0.04, startZ + r * spacing);
        this.group.add(base);
      }
    }
  }

  private buildWater(): void {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), this.materials.water);
    water.position.y = 0.05;
    water.rotation.x = -Math.PI / 2;
    this.group.add(water);
  }

  private buildCars(): void {
    const positions = [
      { x: -8, z: -6, rot: 0 },
      { x: -3, z: 4, rot: Math.PI / 2 },
      { x: 7, z: -8, rot: 0 },
      { x: 10, z: 5, rot: -Math.PI / 2 },
      { x: -12, z: 10, rot: Math.PI },
      { x: 5, z: -3, rot: Math.PI / 4 },
    ];

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (this.rng(i) > 0.7) continue;
      this.buildCar(p.x, p.z, p.rot, i);
    }
  }

  private buildCar(x: number, z: number, rotation: number, index: number): void {
    const carGroup = new THREE.Group();

    const bodyHues = [0x3a4a5a, 0x4a3a3a, 0x3a4a3a, 0x5a5a4a, 0x2a3a4a, 0x4a4a4a];
    const bodyColor = bodyHues[Math.floor(this.rng(index + 500) * bodyHues.length)];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.3,
      metalness: 0.6,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    carGroup.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.85), this.materials.carGlass);
    cabin.position.set(-0.15, 0.7, 0);
    carGroup.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wheelPositions = [
      [-0.55, 0.08, -0.5],
      [-0.55, 0.08, 0.5],
      [0.55, 0.08, -0.5],
      [0.55, 0.08, 0.5],
    ];
    for (const wp of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wp[0], wp[1], wp[2]);
      carGroup.add(wheel);
    }

    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      this.materials.carLight
    );
    headlight.position.set(-0.7, 0.35, -0.35);
    carGroup.add(headlight);

    const headlight2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      this.materials.carLight
    );
    headlight2.position.set(-0.7, 0.35, 0.35);
    carGroup.add(headlight2);

    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = rotation;
    this.group.add(carGroup);
  }

  private buildParkingStripes(): void {
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x888833,
      roughness: 0.8,
      metalness: 0,
    });

    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.2), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i * 3.0, 0.02, 0);
      this.group.add(stripe);
    }

    for (let i = -5; i <= 5; i += 2) {
      if (i === 0) continue;
      const spot = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 2.0), stripeMat);
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(i * 1.5, 0.02, 0);
      this.group.add(spot);
    }
  }

  private buildRamp(): void {
    const rampGeo = new THREE.BoxGeometry(3, 0.05, 5);
    const ramp = new THREE.Mesh(rampGeo, this.materials.floor);
    ramp.position.set(0, 0.1, 14);
    ramp.rotation.x = -0.15;
    this.group.add(ramp);

    const rampRailing = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.0, 5),
      this.materials.railing
    );
    rampRailing.position.set(-1.6, 0.7, 14);
    this.group.add(rampRailing);

    const rampRailing2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.0, 5),
      this.materials.railing
    );
    rampRailing2.position.set(1.6, 0.7, 14);
    this.group.add(rampRailing2);
  }

  private buildLights(): void {
    const spacing = 5;
    const count = 5;
    const start = -((count - 1) * spacing) / 2;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < count; c++) {
        const ptLight = new THREE.PointLight(0xff8844, 0.4, 10);
        ptLight.position.set(start + c * spacing, 2.5, -10 + r * spacing);
        this.group.add(ptLight);

        const housing = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshStandardMaterial({
            color: 0xff8844,
            emissive: 0xff6622,
            emissiveIntensity: 0.5,
          })
        );
        housing.position.set(start + c * spacing, 2.6, -10 + r * spacing);
        this.group.add(housing);
      }
    }

    for (let i = -3; i <= 3; i++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 36, 4),
        new THREE.MeshStandardMaterial({
          color: 0x666666,
          roughness: 0.7,
          metalness: 0.5,
        })
      );
      tube.position.set(i * 5, 2.5, 0);
      tube.rotation.x = Math.PI / 2;
      this.group.add(tube);
    }
  }
}
