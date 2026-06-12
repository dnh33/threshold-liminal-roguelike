import * as THREE from 'three';
import { type BiomeDefinition } from './BiomeTypes';

export class ServerBiome {
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

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 64;
    tileCanvas.height = 64;
    const tctx = tileCanvas.getContext('2d')!;
    tctx.fillStyle = '#3a3a4a';
    tctx.fillRect(0, 0, 64, 64);
    tctx.strokeStyle = '#2a2a3a';
    tctx.lineWidth = 1;
    tctx.strokeRect(0, 0, 64, 64);
    tctx.fillStyle = '#2a2a3a';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        tctx.strokeRect(i * 16, j * 16, 16, 16);
      }
    }
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(6, 6);

    this.materials.floor = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.6,
      metalness: 0.3,
    });

    this.materials.wall = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.7,
      metalness: 0.2,
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.8,
      metalness: 0.2,
    });

    this.materials.rackBody = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.4,
      metalness: 0.7,
    });

    this.materials.rackFace = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.3,
      metalness: 0.8,
    });

    this.materials.ledGreen = new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 1.0,
    });

    this.materials.ledBlue = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.8,
    });

    this.materials.ledAmber = new THREE.MeshStandardMaterial({
      color: 0xffaa22,
      emissive: 0xffaa22,
      emissiveIntensity: 0.6,
    });

    this.materials.cable = new THREE.MeshStandardMaterial({
      color: 0x222233,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.materials.cableTray = new THREE.MeshStandardMaterial({
      color: 0x444455,
      roughness: 0.5,
      metalness: 0.6,
    });

    this.materials.vent = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.7,
      metalness: 0.3,
    });

    this.materials.glowStrip = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.6,
    });
  }

  private rng(i: number): number {
    const v = Math.sin(this.baseSeed + i * 537.58) * 43758.5453;
    return v - Math.floor(v);
  }

  build(): THREE.Group {
    this.buildStructure();
    this.buildFloorGrid();
    this.buildServerRacks();
    this.buildCableTrays();
    this.buildCoolingVents();
    this.buildLights();
    this.buildControlConsole();
    return this.group;
  }

  private buildStructure(): void {
    const size = 40;
    const height = 4.5;

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
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w.sx, height + 0.5, w.sz), this.materials.wall);
      wall.position.set(w.x, (height + 0.5) / 2, w.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    }
  }

  private buildFloorGrid(): void {
    const size = 40;
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.6,
      metalness: 0.3,
    });

    for (let i = -5; i <= 5; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(size, 0.01, 0.04), lineMat);
      line.position.set(0, 0.06, i * 3.5);
      this.group.add(line);

      const line2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, size), lineMat);
      line2.position.set(i * 3.5, 0.06, 0);
      this.group.add(line2);
    }

    const raisedFloorMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.5,
      metalness: 0.3,
    });
    for (let r = -5; r < 5; r++) {
      for (let c = -5; c < 5; c++) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.05, 0.7),
          raisedFloorMat
        );
        tile.position.set(c * 0.75, 0.1, r * 0.75);
        this.group.add(tile);
      }
    }
  }

  private buildServerRacks(): void {
    const rows = 4;
    const racksPerRow = 5;
    const spacingX = 3.5;
    const spacingZ = 4.5;
    const startX = -((racksPerRow - 1) * spacingX) / 2;
    const startZ = -((rows - 1) * spacingZ) / 2;

    for (let r = 0; r < rows; r++) {
      const rowOffset = (this.rng(r + 100) - 0.5) * 0.5;
      for (let c = 0; c < racksPerRow; c++) {
        const x = startX + c * spacingX + rowOffset;
        const z = startZ + r * spacingZ + (this.rng(c + 200) - 0.5) * 0.3;
        this.buildSingleRack(x, z, r * racksPerRow + c);
      }
    }
  }

  private buildSingleRack(x: number, z: number, index: number): void {
    const rackGroup = new THREE.Group();
    const rw = 0.6;
    const rd = 0.9;
    const rh = 2.2;

    const body = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), this.materials.rackBody);
    body.position.y = rh / 2 + 0.1;
    body.castShadow = true;
    body.receiveShadow = true;
    rackGroup.add(body);

    const slots = 6;
    const slotHeight = rh / slots;
    for (let s = 0; s < slots; s++) {
      const sy = slotHeight / 2 + s * slotHeight + 0.1;

      const face = new THREE.Mesh(
        new THREE.BoxGeometry(rw * 0.85, slotHeight * 0.7, 0.02),
        this.materials.rackFace
      );
      face.position.set(0, sy, rd / 2 + 0.01);
      rackGroup.add(face);

      const ledCount = 3 + Math.floor(this.rng(index * 100 + s) * 5);
      for (let l = 0; l < ledCount; l++) {
        const lx = (this.rng(index * 1000 + s * 100 + l) - 0.5) * rw * 0.6;
        const lyOffset = this.rng(index * 2000 + s * 200 + l) * slotHeight * 0.4;
        const ledType = this.rng(index * 3000 + s * 300 + l);

        let ledMat: THREE.MeshStandardMaterial;
        if (ledType < 0.5) ledMat = this.materials.ledGreen;
        else if (ledType < 0.8) ledMat = this.materials.ledBlue;
        else ledMat = this.materials.ledAmber;

        const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), ledMat);
        led.position.set(lx, sy + lyOffset, rd / 2 + 0.03);
        rackGroup.add(led);
      }
    }

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(rw * 0.9, 0.03, rd * 1.05),
      this.materials.rackFace
    );
    bezel.position.set(0, 0.08, 0);
    rackGroup.add(bezel);

    rackGroup.position.set(x, 0, z);
    this.group.add(rackGroup);
  }

  private buildCableTrays(): void {
    const trayMat = this.materials.cableTray;
    const cableMat = this.materials.cable;

    const trayPositions = [
      { x: 0, z: -10, sx: 20 },
      { x: 0, z: 0, sx: 20 },
      { x: 0, z: 10, sx: 20 },
    ];

    for (const tp of trayPositions) {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(tp.sx, 0.05, 0.3),
        trayMat
      );
      tray.position.set(tp.x, 4.2, tp.z);
      this.group.add(tray);

      const side1 = new THREE.Mesh(
        new THREE.BoxGeometry(tp.sx, 0.08, 0.02),
        trayMat
      );
      side1.position.set(tp.x, 4.27, tp.z - 0.16);
      this.group.add(side1);

      const side2 = new THREE.Mesh(
        new THREE.BoxGeometry(tp.sx, 0.08, 0.02),
        trayMat
      );
      side2.position.set(tp.x, 4.27, tp.z + 0.16);
      this.group.add(side2);
    }

    for (let i = 0; i < 20; i++) {
      const startX = (this.rng(i * 100) - 0.5) * 16;
      const startZ = (this.rng(i * 100 + 1) - 0.5) * 16;
      const endX = (this.rng(i * 100 + 2) - 0.5) * 16;
      const endZ = (this.rng(i * 100 + 3) - 0.5) * 16;

      const midX = (startX + endX) / 2;
      const midZ = (startZ + endZ) / 2;

      const cableLen = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, cableLen, 4),
        cableMat
      );
      cable.position.set(midX, 4.0 + this.rng(i * 200) * 0.3, midZ);
      cable.rotation.z = Math.atan2(endZ - startZ, endX - startX) - Math.PI / 2;
      this.group.add(cable);
    }

    for (let i = 0; i < 8; i++) {
      const dropX = (this.rng(i * 300 + 50) - 0.5) * 18;
      const dropZ = (this.rng(i * 300 + 51) - 0.5) * 18;
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.5 + this.rng(i * 400) * 1.5, 4),
        cableMat
      );
      drop.position.set(dropX, 3.5 - this.rng(i * 500) * 0.5, dropZ);
      this.group.add(drop);
    }
  }

  private buildCoolingVents(): void {
    const ventMat = this.materials.vent;
    const positions = [
      [-8, -8],
      [8, -8],
      [-8, 8],
      [8, 8],
      [0, 0],
    ];

    for (const p of positions) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.05, 0.4),
        ventMat
      );
      vent.position.set(p[0], 0.12, p[1]);
      this.group.add(vent);

      for (let s = -0.35; s <= 0.35; s += 0.15) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.02, 0.02),
          ventMat
        );
        slat.position.set(p[0] + s * 1.5, 0.14, p[1]);
        this.group.add(slat);
      }
    }
  }

  private buildLights(): void {
    const rowPositions = [-9, -4.5, 0, 4.5, 9];
    for (let r = 0; r < rowPositions.length; r++) {
      for (let c = 0; c < 5; c++) {
        const x = -9 + c * 4.5;
        const z = rowPositions[r];

        const light = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.2),
          new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            emissive: 0x4488ff,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0,
            side: THREE.DoubleSide,
          })
        );
        light.position.set(x, 4.3, z);
        light.rotation.x = Math.PI / 2;
        this.group.add(light);

        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.03, 0.25),
          this.materials.ceiling
        );
        strip.position.set(x, 4.28, z);
        this.group.add(strip);

        const ptLight = new THREE.PointLight(0x4488ff, 0.25, 7);
        ptLight.position.set(x, 4.0, z);
        this.group.add(ptLight);
      }
    }

    const bigLight = new THREE.PointLight(0x6688ff, 0.5, 15);
    bigLight.position.set(0, 4.0, 0);
    this.group.add(bigLight);
  }

  private buildControlConsole(): void {
    const consoleGroup = new THREE.Group();

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.1, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.6 })
    );
    desk.position.set(0, 0.75, 0);
    desk.castShadow = true;
    consoleGroup.add(desk);

    const screensMat = new THREE.MeshStandardMaterial({
      color: 0x000011,
      emissive: 0x2244aa,
      emissiveIntensity: 0.3,
    });
    for (let i = -1; i <= 1; i++) {
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.02),
        screensMat
      );
      screen.position.set(i * 0.5, 1.0, -0.4);
      consoleGroup.add(screen);
    }

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.05, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.5, metalness: 0.4 })
    );
    base.position.set(0, 0.03, 0);
    consoleGroup.add(base);

    consoleGroup.position.set(-12, 0, -10);
    consoleGroup.rotation.y = Math.PI / 4;
    this.group.add(consoleGroup);
  }
}
