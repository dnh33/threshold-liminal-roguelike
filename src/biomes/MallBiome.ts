import * as THREE from 'three';
import { type BiomeDefinition } from './BiomeTypes';

export class MallBiome {
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
    tctx.fillStyle = '#8a7a6a';
    tctx.fillRect(0, 0, 64, 64);
    tctx.fillStyle = '#7a6a5a';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) {
          tctx.fillRect(i * 16, j * 16, 16, 16);
        }
      }
    }
    tctx.strokeStyle = '#6a5a4a';
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
    tileTex.repeat.set(8, 8);

    this.materials.floor = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.3,
      metalness: 0.4,
    });

    this.materials.wall = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0xcaaa7a,
      roughness: 0.8,
      metalness: 0,
    });

    this.materials.storefront = new THREE.MeshStandardMaterial({
      color: 0x6a5a4a,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.materials.glass = new THREE.MeshStandardMaterial({
      color: 0x88bbcc,
      transparent: true,
      opacity: 0.2,
      roughness: 0.05,
      metalness: 0.5,
      side: THREE.DoubleSide,
    });

    this.materials.escalator = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      roughness: 0.5,
      metalness: 0.7,
    });

    this.materials.escalatorStep = new THREE.MeshStandardMaterial({
      color: 0x6a6a6a,
      roughness: 0.4,
      metalness: 0.6,
    });

    this.materials.table = new THREE.MeshStandardMaterial({
      color: 0x8a7a6a,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.materials.chair = new THREE.MeshStandardMaterial({
      color: 0x9a8a7a,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.materials.planter = new THREE.MeshStandardMaterial({
      color: 0x7a6a4a,
      roughness: 0.8,
      metalness: 0,
    });

    this.materials.foliage = new THREE.MeshStandardMaterial({
      color: 0x3a7a3a,
      roughness: 0.9,
      metalness: 0,
    });

    this.materials.skylight = new THREE.MeshStandardMaterial({
      color: 0xffeecc,
      emissive: 0xffeecc,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    this.materials.banister = new THREE.MeshStandardMaterial({
      color: 0x6a5a3a,
      roughness: 0.3,
      metalness: 0.6,
    });
  }

  private rng(i: number): number {
    const v = Math.sin(this.baseSeed + i * 537.58) * 43758.5453;
    return v - Math.floor(v);
  }

  build(): THREE.Group {
    this.buildStructure();
    this.buildUpperFloor();
    this.buildStorefronts();
    this.buildEscalators();
    this.buildFoodCourt();
    this.buildPlanters();
    this.buildSkylight();
    this.buildBanisters();
    this.buildLights();
    return this.group;
  }

  private buildStructure(): void {
    const size = 44;
    const height = 5.0;

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
  }

  private buildUpperFloor(): void {
    const floorSize = 18;
    const height = 3.0;

    const upperFloorMat = new THREE.MeshStandardMaterial({
      color: 0x7a6a5a,
      roughness: 0.4,
      metalness: 0.3,
    });

    const positions = [
      { x: -10, z: -10, sx: floorSize, sz: floorSize },
      { x: 10, z: -10, sx: floorSize, sz: floorSize },
      { x: -10, z: 10, sx: floorSize, sz: floorSize },
      { x: 10, z: 10, sx: floorSize, sz: floorSize },
    ];

    for (const p of positions) {
      const upperFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(p.sx, p.sz),
        upperFloorMat
      );
      upperFloor.position.set(p.x, height, p.z);
      upperFloor.rotation.x = -Math.PI / 2;
      upperFloor.receiveShadow = true;
      this.group.add(upperFloor);
    }

    const upperCeilingMat = new THREE.MeshStandardMaterial({
      color: 0xbaaa8a,
      roughness: 0.8,
      metalness: 0,
    });
    for (const p of positions) {
      const upperCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(p.sx, p.sz),
        upperCeilingMat
      );
      upperCeiling.position.set(p.x, 4.8, p.z);
      upperCeiling.rotation.x = Math.PI / 2;
      this.group.add(upperCeiling);
    }

    const innerWallMat = new THREE.MeshStandardMaterial({
      color: 0x6a5a4a,
      roughness: 0.7,
      metalness: 0.1,
    });

    for (const p of positions) {
      const edges = [
        { dx: -p.sx / 2, dz: -p.sz / 2, len: p.sz, axis: 'z' },
        { dx: p.sx / 2, dz: -p.sz / 2, len: p.sz, axis: 'z' },
        { dx: -p.sx / 2, dz: -p.sz / 2, len: p.sx, axis: 'x' },
        { dx: -p.sx / 2, dz: p.sz / 2, len: p.sx, axis: 'x' },
      ];
      for (const e of edges) {
        if ((p.x < 0 && e.dz < 0) || (p.z < 0 && e.dx < 0)) {
          const isX = e.axis === 'x';
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(isX ? e.len : 0.15, 1.5, isX ? 0.15 : e.len),
            innerWallMat
          );
          wall.position.set(p.x + e.dx, height + 0.75, p.z + e.dz);
          this.group.add(wall);
        }
      }
    }
  }

  private buildStorefronts(): void {
    const storeData = [
      { x: -19, z: -8, rot: 0, w: 3.5, d: 0.5 },
      { x: -19, z: 0, rot: 0, w: 3.5, d: 0.5 },
      { x: -19, z: 8, rot: 0, w: 3.5, d: 0.5 },
      { x: 19, z: -8, rot: 0, w: 3.5, d: 0.5 },
      { x: 19, z: 0, rot: 0, w: 3.5, d: 0.5 },
      { x: 19, z: 8, rot: 0, w: 3.5, d: 0.5 },
      { x: -8, z: -19, rot: Math.PI / 2, w: 3.5, d: 0.5 },
      { x: 0, z: -19, rot: Math.PI / 2, w: 3.5, d: 0.5 },
      { x: 8, z: -19, rot: Math.PI / 2, w: 3.5, d: 0.5 },
      { x: -8, z: 19, rot: Math.PI / 2, w: 3.5, d: 0.5 },
      { x: 0, z: 19, rot: Math.PI / 2, w: 3.5, d: 0.5 },
      { x: 8, z: 19, rot: Math.PI / 2, w: 3.5, d: 0.5 },
    ];

    for (let i = 0; i < storeData.length; i++) {
      if (this.rng(i) > 0.85) continue;
      const s = storeData[i];
      this.buildStorefront(s.x, s.z, s.rot, i);
    }
  }

  private buildStorefront(x: number, z: number, rot: number, index: number): void {
    const storeGroup = new THREE.Group();

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.8, 0.1),
      this.materials.storefront
    );
    frame.position.set(0, 1.4, 0);
    storeGroup.add(frame);

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x88bbcc,
      transparent: true,
      opacity: 0.15 + this.rng(index * 100) * 0.15,
      roughness: 0.05,
      metalness: 0.5,
      side: THREE.DoubleSide,
    });

    const window = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.0),
      windowMat
    );
    window.position.set(0, 1.4, 0.06);
    storeGroup.add(window);

    const signHues = [0xaa5533, 0x3355aa, 0x55aa33, 0xaa33aa, 0x33aaaa];
    const signColor = signHues[Math.floor(this.rng(index + 500) * signHues.length)];
    const signMat = new THREE.MeshStandardMaterial({
      color: signColor,
      emissive: signColor,
      emissiveIntensity: 0.15,
      roughness: 0.5,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.3, 0.05),
      signMat
    );
    sign.position.set(0, 2.7, 0.06);
    storeGroup.add(sign);

    storeGroup.position.set(x, 0, z);
    storeGroup.rotation.y = rot;
    this.group.add(storeGroup);
  }

  private buildEscalators(): void {
    const escalatorPositions = [
      { x: -4, z: -6, rot: 0, dir: 1 },
      { x: -4, z: 6, rot: Math.PI, dir: -1 },
    ];

    for (const ep of escalatorPositions) {
      this.buildEscalator(ep.x, ep.z, ep.rot);
    }
  }

  private buildEscalator(x: number, z: number, rotation: number): void {
    const escGroup = new THREE.Group();

    const sideMat = this.materials.escalator;

    const stepCount = 14;
    const stepRun = 0.3;

    for (let i = 0; i < stepCount; i++) {
      const t = i / (stepCount - 1);
      const stepX = t * 3.0;
      const stepY = t * 2.4;

      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.05, stepRun),
        this.materials.escalatorStep
      );
      step.position.set(stepX, stepY + 0.1, 0);
      escGroup.add(step);
    }

    const side1 = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.5, 0.06),
      sideMat
    );
    side1.position.set(1.5, 1.25, 0.56);
    escGroup.add(side1);

    const side2 = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.5, 0.06),
      sideMat
    );
    side2.position.set(1.5, 1.25, -0.56);
    escGroup.add(side2);

    const landing = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      this.materials.escalatorStep
    );
    landing.rotation.x = -Math.PI / 2;
    landing.position.set(-0.5, 0.02, 0);
    escGroup.add(landing);

    const topLanding = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      this.materials.escalatorStep
    );
    topLanding.rotation.x = -Math.PI / 2;
    topLanding.position.set(3.5, 2.42, 0);
    escGroup.add(topLanding);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88bbcc,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.5,
      side: THREE.DoubleSide,
    });

    for (let side of [-1, 1]) {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 1.0),
        glassMat
      );
      glass.position.set(1.5, 1.8, side * 0.56);
      escGroup.add(glass);
    }

    escGroup.position.set(x, 0, z);
    escGroup.rotation.y = rotation;
    this.group.add(escGroup);
  }

  private buildFoodCourt(): void {
    const tablePositions = [
      { x: 14, z: -14 },
      { x: 14, z: -10 },
      { x: 14, z: -6 },
      { x: 16.5, z: -14 },
      { x: 16.5, z: -10 },
      { x: 16.5, z: -6 },
    ];

    for (const tp of tablePositions) {
      this.buildTableSet(tp.x, tp.z);
    }
  }

  private buildTableSet(x: number, z: number): void {
    const tableGroup = new THREE.Group();

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12),
      this.materials.table
    );
    table.position.set(0, 0.75, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    tableGroup.add(table);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6),
      this.materials.table
    );
    pole.position.set(0, 0.36, 0);
    tableGroup.add(pole);

    const seatPositions = [
      { x: -0.6, z: 0, rot: 0 },
      { x: 0.6, z: 0, rot: 0 },
      { x: 0, z: -0.6, rot: 0 },
      { x: 0, z: 0.6, rot: 0 },
    ];
    for (const sp of seatPositions) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.3),
        this.materials.chair
      );
      seat.position.set(sp.x, 0.45, sp.z);
      tableGroup.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.25, 0.02),
        this.materials.chair
      );
      back.position.set(sp.x, 0.6, sp.z + Math.sign(sp.z || 0.01) * 0.16);
      tableGroup.add(back);
    }

    tableGroup.position.set(x, 0, z);
    this.group.add(tableGroup);
  }

  private buildPlanters(): void {
    const planterPositions = [
      { x: -14, z: 0 },
      { x: 0, z: -14 },
      { x: 14, z: 0 },
      { x: 0, z: 14 },
      { x: -8, z: -8 },
      { x: 8, z: 8 },
    ];

    for (let i = 0; i < planterPositions.length; i++) {
      const pp = planterPositions[i];
      const scale = 0.8 + this.rng(i * 100) * 0.6;

      const planter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4 * scale, 0.5 * scale, 0.6 * scale, 8),
        this.materials.planter
      );
      planter.position.set(pp.x, 0.3 * scale, pp.z);
      planter.castShadow = true;
      this.group.add(planter);

      const foliageCount = 3 + Math.floor(this.rng(i * 200) * 3);
      for (let f = 0; f < foliageCount; f++) {
        const angle = (f / foliageCount) * Math.PI * 2 + this.rng(i * 300 + f) * 0.5;
        const dist = this.rng(i * 400 + f) * 0.25 * scale;
        const foliageScale = 0.3 + this.rng(i * 500 + f) * 0.3;

        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 * foliageScale * scale, 6, 6),
          this.materials.foliage
        );
        leaf.position.set(
          pp.x + Math.cos(angle) * dist,
          0.5 * scale + 0.2 * foliageScale,
          pp.z + Math.sin(angle) * dist
        );
        this.group.add(leaf);
      }
    }
  }

  private buildSkylight(): void {
    const skylight = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      this.materials.skylight
    );
    skylight.position.set(0, 4.9, 0);
    skylight.rotation.x = Math.PI / 2;
    this.group.add(skylight);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xbaaa8a,
      roughness: 0.5,
      metalness: 0.3,
    });
    for (let i = -1; i <= 1; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.04, 0.08),
        frameMat
      );
      bar.position.set(0, 4.92, i * 2.5);
      this.group.add(bar);

      const bar2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 8),
        frameMat
      );
      bar2.position.set(i * 2.5, 4.92, 0);
      this.group.add(bar2);
    }

    const skylightLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    skylightLight.position.set(0, 6, 0);
    this.group.add(skylightLight);
  }

  private buildBanisters(): void {
    const segments = [
      { x: 0, z: -10, len: 18, angle: 0 },
      { x: 0, z: 10, len: 18, angle: 0 },
      { x: -10, z: 0, len: 18, angle: Math.PI / 2 },
      { x: 10, z: 0, len: 18, angle: Math.PI / 2 },
    ];

    for (const seg of segments) {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, seg.len, 6),
        this.materials.banister
      );
      rail.position.set(seg.x, 3.15, seg.z);
      rail.rotation.z = Math.PI / 2;
      this.group.add(rail);

      const rail2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, seg.len, 6),
        this.materials.banister
      );
      rail2.position.set(seg.x, 3.0, seg.z);
      rail2.rotation.z = Math.PI / 2;
      this.group.add(rail2);

      const postCount = 7;
      const postSpacing = seg.len / postCount;
      for (let p = 0; p <= postCount; p++) {
        const postX = seg.angle === 0 ? (-seg.len / 2 + p * postSpacing) : 0;
        const postZ = seg.angle === 0 ? 0 : (-seg.len / 2 + p * postSpacing);
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6),
          this.materials.banister
        );
        post.position.set(seg.x + postX, 3.0, seg.z + postZ);
        this.group.add(post);
      }
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
        color: 0xffdd99,
        emissive: 0xffdd99,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0,
        side: THREE.DoubleSide,
      });

      const pendant = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        lightMat
      );
      pendant.position.set(p.x, 4.4, p.z);
      this.group.add(pendant);

      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4),
        this.materials.banister
      );
      chain.position.set(p.x, 4.7, p.z);
      this.group.add(chain);

      const ptLight = new THREE.PointLight(0xffdd99, 0.35, 8);
      ptLight.position.set(p.x, 4.0, p.z);
      this.group.add(ptLight);
    }
  }
}
