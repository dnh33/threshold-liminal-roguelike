import * as THREE from 'three';
import { type BiomeDefinition } from './BiomeTypes';

export class PoolBiome {
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
    tctx.fillStyle = '#5a8a9a';
    tctx.fillRect(0, 0, 64, 64);
    tctx.fillStyle = '#4a7a8a';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) {
          tctx.fillRect(i * 16, j * 16, 16, 16);
        }
      }
    }
    tctx.strokeStyle = '#3a6a7a';
    tctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      tctx.beginPath();
      tctx.moveTo(i * 16, 0);
      tctx.lineTo(i * 16, 64);
      tctx.stroke();
      tctx.beginPath();
      tctx.moveTo(0, i * 16);
      tctx.lineTo(64, i * 16);
      tctx.stroke();
    }
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(10, 10);

    this.materials.floor = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.2,
      metalness: 0.5,
    });

    this.materials.wall = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.6,
      metalness: 0.1,
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0x3a6a7a,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.materials.poolWall = new THREE.MeshStandardMaterial({
      color: 0x3a7a8a,
      roughness: 0.3,
      metalness: 0.2,
    });

    this.materials.poolFloor = new THREE.MeshStandardMaterial({
      color: 0x2a5a6a,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.materials.water = new THREE.MeshStandardMaterial({
      color: 0x4aaa9a,
      transparent: true,
      opacity: 0.45,
      roughness: 0.05,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });

    this.materials.deepWater = new THREE.MeshStandardMaterial({
      color: 0x2a8a8a,
      transparent: true,
      opacity: 0.6,
      roughness: 0.05,
      metalness: 0.8,
    });

    this.materials.laneDivider = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0,
    });

    this.materials.laneBuoy = new THREE.MeshStandardMaterial({
      color: 0xcc4444,
      roughness: 0.6,
      metalness: 0,
    });

    this.materials.divingBoard = new THREE.MeshStandardMaterial({
      color: 0x6a7a7a,
      roughness: 0.4,
      metalness: 0.3,
    });

    this.materials.bleacher = new THREE.MeshStandardMaterial({
      color: 0x5a7a7a,
      roughness: 0.6,
      metalness: 0.1,
    });

    this.materials.bleacherSeat = new THREE.MeshStandardMaterial({
      color: 0x6a8a8a,
      roughness: 0.6,
      metalness: 0.1,
    });

    this.materials.lifeguard = new THREE.MeshStandardMaterial({
      color: 0x4a6a6a,
      roughness: 0.5,
      metalness: 0.2,
    });
  }

  private rng(i: number): number {
    const v = Math.sin(this.baseSeed + i * 537.58) * 43758.5453;
    return v - Math.floor(v);
  }

  build(): THREE.Group {
    this.buildStructure();
    this.buildPools();
    this.buildLaneDividers();
    this.buildDivingBoards();
    this.buildBleachers();
    this.buildLifeguardChairs();
    this.buildLights();
    return this.group;
  }

  private buildStructure(): void {
    const size = 44;
    const height = 4.0;

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

    for (let i = -6; i <= 6; i++) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.25, size),
        this.materials.ceiling
      );
      beam.position.set(i * 3.5, height - 0.125, 0);
      this.group.add(beam);
    }
  }

  private buildPools(): void {
    const poolData = [
      { x: -8, z: -8, w: 4.0, d: 8.0 },
      { x: 8, z: -8, w: 4.0, d: 8.0 },
      { x: -8, z: 8, w: 4.0, d: 8.0 },
      { x: 8, z: 8, w: 4.0, d: 8.0 },
    ];

    for (let i = 0; i < poolData.length; i++) {
      const pd = poolData[i];
      this.buildSinglePool(pd.x, pd.z, pd.w, pd.d, i);
    }
  }

  private buildSinglePool(x: number, z: number, w: number, d: number, index: number): void {
    const poolGroup = new THREE.Group();
    const depth = 1.2;

    const poolFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.4, d - 0.4),
      this.materials.poolFloor
    );
    poolFloor.rotation.x = -Math.PI / 2;
    poolFloor.position.y = -depth + 0.05;
    poolGroup.add(poolFloor);

    const poolWalls: { sx: number; sz: number; px: number; pz: number }[] = [
      { sx: w, sz: 0.2, px: 0, pz: -d / 2 },
      { sx: w, sz: 0.2, px: 0, pz: d / 2 },
      { sx: 0.2, sz: d, px: -w / 2, pz: 0 },
      { sx: 0.2, sz: d, px: w / 2, pz: 0 },
    ];
    for (const pw of poolWalls) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(pw.sx, depth, pw.sz),
        this.materials.poolWall
      );
      wall.position.set(pw.px, -depth / 2, pw.pz);
      poolGroup.add(wall);
    }

    const waterLevel = -depth + 0.1;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.6, d - 0.6),
      this.materials.water
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = waterLevel;
    poolGroup.add(water);

    const deepWaterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 1.0, d - 1.0),
      this.materials.deepWater
    );
    deepWaterMesh.rotation.x = -Math.PI / 2;
    deepWaterMesh.position.y = waterLevel - 0.02;
    poolGroup.add(deepWaterMesh);

    const poolWater = new THREE.PointLight(0x4aaa9a, 0.2 + this.rng(index * 100) * 0.2, 5);
    poolWater.position.set(0, -depth + 0.5, 0);
    poolGroup.add(poolWater);

    const coping = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.3, 0.06, d + 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x6a8a9a,
        roughness: 0.4,
        metalness: 0.2,
      })
    );
    coping.position.set(0, 0.03, 0);
    poolGroup.add(coping);

    const laneRopes = d * 0.7;
    for (let l = 0; l < 3; l++) {
      const ropeX = -w / 3 + l * (w / 3);
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, laneRopes, 4),
        this.materials.laneDivider
      );
      rope.position.set(ropeX, 0.05, 0);
      rope.rotation.x = Math.PI / 2;
      poolGroup.add(rope);

      for (let b = 0; b < 5; b++) {
        const buoy = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 6),
          b % 2 === 0 ? this.materials.laneDivider : this.materials.laneBuoy
        );
        buoy.position.set(ropeX, 0.05, -laneRopes / 2 + b * (laneRopes / 4));
        poolGroup.add(buoy);
      }
    }

    const laneRope2 = d * 0.7;
    for (let l = 0; l < 3; l++) {
      const ropeX = -w / 3 + l * (w / 3);
      for (let b = 0; b < 5; b++) {
        const buoy = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 6),
          b % 2 === 0 ? this.materials.laneDivider : this.materials.laneBuoy
        );
        buoy.position.set(ropeX, 0.05, -laneRope2 / 2 + b * (laneRope2 / 4));
        poolGroup.add(buoy);
      }
    }

    poolGroup.position.set(x, 0, z);
    this.group.add(poolGroup);
  }

  private buildLaneDividers(): void {
    const poolCenters = [
      { x: -8, z: -8 },
      { x: 8, z: -8 },
      { x: -8, z: 8 },
      { x: 8, z: 8 },
    ];

    for (let pi = 0; pi < poolCenters.length; pi++) {
      const pc = poolCenters[pi];
      for (let l = 0; l < 5; l++) {
        const xOff = -1.5 + l * 0.75;
        const rope = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 7, 4),
          this.materials.laneDivider
        );
        rope.position.set(pc.x + xOff, 0.05, pc.z);
        rope.rotation.x = Math.PI / 2;
        this.group.add(rope);

        for (let b = 0; b < 6; b++) {
          const buoy = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 6, 6),
            b % 2 === 0 ? this.materials.laneDivider : this.materials.laneBuoy
          );
          buoy.position.set(pc.x + xOff, 0.05, pc.z - 3 + b * 1.2);
          this.group.add(buoy);
        }
      }
    }
  }

  private buildDivingBoards(): void {
    const boardPositions = [
      { x: -8, z: -12.5 },
      { x: 8, z: -12.5 },
    ];

    for (const bp of boardPositions) {
      const boardGroup = new THREE.Group();

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.6),
        this.materials.lifeguard
      );
      base.position.set(0, 0.25, 0);
      boardGroup.add(base);

      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.06, 0.6),
        this.materials.divingBoard
      );
      platform.position.set(0, 0.55, 0);
      boardGroup.add(platform);

      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.04, 3.0),
        this.materials.divingBoard
      );
      board.position.set(0, 0.6, 1.5);
      board.rotation.x = -0.08;
      board.castShadow = true;
      boardGroup.add(board);

      const fulcrum = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.1, 0.08),
        this.materials.lifeguard
      );
      fulcrum.position.set(0, 0.6, 0.8);
      boardGroup.add(fulcrum);

      boardGroup.position.set(bp.x, 0, bp.z);
      this.group.add(boardGroup);
    }
  }

  private buildBleachers(): void {
    const bleacherPositions = [
      { x: -14, z: 0, rot: 0 },
      { x: 14, z: 0, rot: Math.PI },
      { x: 0, z: -14, rot: Math.PI / 2 },
    ];

    for (const bp of bleacherPositions) {
      this.buildBleacherSection(bp.x, bp.z, bp.rot);
    }
  }

  private buildBleacherSection(x: number, z: number, rotation: number): void {
    const section = new THREE.Group();
    const rows = 5;
    const rowHeight = 0.3;
    const rowDepth = 0.5;
    const width = 3.5;

    for (let r = 0; r < rows; r++) {
      const ry = r * rowHeight;

      const step = new THREE.Mesh(
        new THREE.BoxGeometry(width, rowHeight * 0.8, rowDepth),
        this.materials.bleacher
      );
      step.position.set(0, ry + rowHeight * 0.4, r * rowDepth * 0.7);
      section.add(step);

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(width - 0.3, 0.05, rowDepth * 0.35),
        this.materials.bleacherSeat
      );
      seat.position.set(0, ry + rowHeight + 0.03, r * rowDepth * 0.7 + rowDepth * 0.2);
      section.add(seat);
    }

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x4a6a6a,
      roughness: 0.7,
      metalness: 0.1,
    });
    for (let side of [-1, 1]) {
      const sideWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, rows * rowHeight + 0.1, rows * rowDepth * 0.7 + 0.2),
        sideMat
      );
      sideWall.position.set(side * (width / 2 + 0.04), (rows * rowHeight) / 2, (rows - 1) * rowDepth * 0.35);
      section.add(sideWall);
    }

    section.position.set(x, 0, z);
    section.rotation.y = rotation;
    this.group.add(section);
  }

  private buildLifeguardChairs(): void {
    const positions = [
      { x: -14, z: -14 },
      { x: 14, z: -14 },
      { x: -14, z: 14 },
      { x: 14, z: 14 },
    ];

    for (const p of positions) {
      const chairGroup = new THREE.Group();

      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6);
      const polePositions = [
        [-0.25, -0.25],
        [0.25, -0.25],
        [-0.25, 0.25],
        [0.25, 0.25],
      ];
      for (const pp of polePositions) {
        const pole = new THREE.Mesh(poleGeo, this.materials.lifeguard);
        pole.position.set(pp[0], 1.0, pp[1]);
        chairGroup.add(pole);
      }

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.04, 0.6),
        this.materials.lifeguard
      );
      seat.position.set(0, 1.9, 0);
      chairGroup.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.25, 0.02),
        this.materials.lifeguard
      );
      back.position.set(0, 2.05, -0.3);
      chairGroup.add(back);

      const canopyMat = new THREE.MeshStandardMaterial({
        color: 0xcaaa7a,
        roughness: 0.7,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      const canopy = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        canopyMat
      );
      canopy.position.set(0, 2.4, 0);
      canopy.rotation.x = 0.1;
      chairGroup.add(canopy);

      for (let rung = 0; rung < 4; rung++) {
        const rungMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.02, 0.02),
          this.materials.lifeguard
        );
        rungMesh.position.set(0, 0.2 + rung * 0.4, -0.25);
        chairGroup.add(rungMesh);
      }

      chairGroup.position.set(p.x, 0, p.z);
      this.group.add(chairGroup);
    }
  }

  private buildLights(): void {
    const positions = [
      { x: -6, z: -6 },
      { x: 0, z: -6 },
      { x: 6, z: -6 },
      { x: -6, z: 0 },
      { x: 0, z: 0 },
      { x: 6, z: 0 },
      { x: -6, z: 6 },
      { x: 0, z: 6 },
      { x: 6, z: 6 },
    ];

    for (const p of positions) {
      const lightMat = new THREE.MeshStandardMaterial({
        color: 0xccffff,
        emissive: 0x88cccc,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });

      const lightPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.3),
        lightMat
      );
      lightPanel.position.set(p.x, 3.8, p.z);
      lightPanel.rotation.x = Math.PI / 2;
      this.group.add(lightPanel);

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.05, 0.4),
        this.materials.ceiling
      );
      housing.position.set(p.x, 3.78, p.z);
      this.group.add(housing);

      const ptLight = new THREE.PointLight(0x88cccc, 0.3, 8);
      ptLight.position.set(p.x, 3.5, p.z);
      this.group.add(ptLight);
    }

    const underLight = new THREE.PointLight(0x4aaa9a, 0.15, 12);
    underLight.position.set(0, -0.5, 0);
    this.group.add(underLight);
  }
}
