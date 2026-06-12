import * as THREE from 'three';
import { type BiomeDefinition } from './BiomeTypes';

export class OfficeBiome {
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

    this.materials.wall = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.85,
      metalness: 0.1,
    });

    const carpetCanvas = document.createElement('canvas');
    carpetCanvas.width = 128;
    carpetCanvas.height = 128;
    const cctx = carpetCanvas.getContext('2d')!;
    cctx.fillStyle = '#6b7b8d';
    cctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      if (i < 250) {
        cctx.fillStyle = '#5a6a7a';
      } else if (i < 450) {
        cctx.fillStyle = '#7a8a9a';
      } else {
        cctx.fillStyle = '#4a7a6a';
      }
      cctx.fillRect(x, y, 2, 2);
    }
    const carpetTex = new THREE.CanvasTexture(carpetCanvas);
    carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
    carpetTex.repeat.set(10, 10);
    this.materials.floor = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.95,
      metalness: 0,
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.9,
      metalness: 0,
    });

    this.materials.partition = new THREE.MeshStandardMaterial({
      color: 0x8f9faf,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.materials.desk = new THREE.MeshStandardMaterial({
      color: 0x6a7a8a,
      roughness: 0.6,
      metalness: 0.3,
    });

    this.materials.deskTop = new THREE.MeshStandardMaterial({
      color: 0x8a9aaa,
      roughness: 0.5,
      metalness: 0.2,
    });

    this.materials.light = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffee,
      emissiveIntensity: 0.6,
      roughness: 0.5,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    this.materials.glass = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });

    this.materials.monitor = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.3,
      metalness: 0.7,
    });

    this.materials.screen = new THREE.MeshStandardMaterial({
      color: 0x4488aa,
      emissive: 0x224466,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0,
    });
  }

  private rng(i: number): number {
    const v = Math.sin(this.baseSeed + i * 537.58) * 43758.5453;
    return v - Math.floor(v);
  }

  build(): THREE.Group {
    this.buildStructure();
    this.buildCubicles();
    this.buildMeetingRoom();
    this.buildBreakRoom();
    this.buildLights();
    this.buildCeiling();
    return this.group;
  }

  private buildStructure(): void {
    const size = 36;
    const height = 3.6;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallHeight = height;
    const wallData = [
      { x: 0, z: -size / 2, sx: size, sz: 0.2 },
      { x: 0, z: size / 2, sx: size, sz: 0.2 },
      { x: -size / 2, z: 0, sx: 0.2, sz: size },
      { x: size / 2, z: 0, sx: 0.2, sz: size },
    ];

    for (const w of wallData) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w.sx, wallHeight, w.sz), this.materials.wall);
      wall.position.set(w.x, wallHeight / 2, w.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    }
  }

  private buildCubicles(): void {
    const rows = 5;
    const cols = 6;
    const spacingX = 4.5;
    const spacingZ = 4.0;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -((rows - 1) * spacingZ) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.rng(r * cols + c) > 0.85) continue;

        const cx = startX + c * spacingX + (this.rng(r * cols + c + 100) - 0.5) * 0.3;
        const cz = startZ + r * spacingZ + (this.rng(r * cols + c + 200) - 0.5) * 0.3;
        const rot = Math.floor(this.rng(r * cols + c + 300) * 4) * (Math.PI / 2);

        this.buildSingleCubicle(cx, cz, rot);
      }
    }
  }

  private buildSingleCubicle(cx: number, cz: number, rotation: number): void {
    const cubicleGroup = new THREE.Group();
    const ph = 1.4;
    const pw = 1.8;
    const pd = 1.8;
    const pt = 0.05;

    const panelPositions = [
      { x: 0, z: -pd / 2 + pt / 2, sx: pw, sz: pt },
      { x: -pw / 2 + pt / 2, z: 0, sx: pt, sz: pd },
      { x: pw / 2 - pt / 2, z: 0, sx: pt, sz: pd },
    ];

    for (const pp of panelPositions) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(pp.sx, ph, pp.sz), this.materials.partition);
      panel.position.set(pp.x, ph / 2, pp.z);
      panel.castShadow = true;
      panel.receiveShadow = true;
      cubicleGroup.add(panel);
    }

    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), this.materials.deskTop);
    desk.position.set(0, 0.75, 0.3);
    desk.castShadow = true;
    desk.receiveShadow = true;
    cubicleGroup.add(desk);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6);
    const legMat = this.materials.desk;
    const legPositions = [
      [-0.6, 0.36, 0.25],
      [0.6, 0.36, 0.25],
      [-0.6, 0.36, -0.25],
      [0.6, 0.36, -0.25],
    ];
    for (const lp of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lp[0], lp[1], lp[2]);
      cubicleGroup.add(leg);
    }

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), this.materials.monitor);
    monitor.position.set(0, 1.05, -0.1);
    cubicleGroup.add(monitor);

    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.01), this.materials.screen);
    scr.position.set(0, 1.05, -0.075);
    cubicleGroup.add(scr);

    const chairBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), this.materials.desk);
    chairBase.position.set(0, 0.42, 0.7);
    cubicleGroup.add(chairBase);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.03), this.materials.desk);
    chairBack.position.set(0, 0.62, 0.92);
    cubicleGroup.add(chairBack);

    cubicleGroup.position.set(cx, 0, cz);
    cubicleGroup.rotation.y = rotation;
    this.group.add(cubicleGroup);
  }

  private buildMeetingRoom(): void {
    const mg = new THREE.Group();
    const mw = 4.0;
    const md = 3.5;
    const mh = 2.8;

    const floorMat = this.materials.floor;
    const mfloor = new THREE.Mesh(new THREE.PlaneGeometry(mw - 0.4, md - 0.4), floorMat);
    mfloor.rotation.x = -Math.PI / 2;
    mfloor.position.y = 0.01;
    mg.add(mfloor);

    for (let side = 0; side < 3; side++) {
      const angle = side * (Math.PI / 2);
      const wx = Math.sin(angle) * mw / 2;
      const wz = Math.cos(angle) * md / 2;
      const ws = side % 2 === 0 ? mw : md;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ws, mh, 0.08), this.materials.glass);
      wall.position.set(wx, mh / 2, wz);
      mg.add(wall);
    }

    for (let side = 0; side < 3; side++) {
      const angle = side * (Math.PI / 2);
      const wx = Math.sin(angle) * mw / 2;
      const wz = Math.cos(angle) * md / 2;
      const ws = side % 2 === 0 ? mw : md;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(ws, mh, 0.12), this.materials.wall);
      frame.position.set(wx, mh / 2, wz);
      mg.add(frame);
    }

    const table = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.2), this.materials.deskTop);
    table.position.set(0, 0.75, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    mg.add(table);

    const clGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6);
    for (let i = 0; i < 4; i++) {
      const cl = new THREE.Mesh(clGeo, this.materials.desk);
      cl.position.set((i % 2 === 0 ? -0.8 : 0.8), 0.36, (i < 2 ? -0.45 : 0.45));
      mg.add(cl);
    }

    const chairPositions = [
      [-1.4, 0, 0.6],
      [1.4, 0, 0.6],
      [-1.4, 0, -0.6],
      [1.4, 0, -0.6],
      [0, 0, 1.4],
    ];
    for (const cp of chairPositions) {
      const cs = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.35), this.materials.desk);
      cs.position.set(cp[0], 0.42, cp[1]);
      mg.add(cs);
      const cb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.03), this.materials.desk);
      cb.position.set(cp[0], 0.6, cp[1] + 0.2 * Math.sign(cp[1] || 0.01));
      mg.add(cb);
    }

    mg.position.set(-6, 0, 5);
    this.group.add(mg);
  }

  private buildBreakRoom(): void {
    const bg = new THREE.Group();

    const bfloor = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), this.materials.floor);
    bfloor.rotation.x = -Math.PI / 2;
    bfloor.position.y = 0.01;
    bg.add(bfloor);

    const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), this.materials.deskTop);
    table.position.set(0, 0.75, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    bg.add(table);

    const tlegGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6);
    for (let i = 0; i < 4; i++) {
      const tl = new THREE.Mesh(tlegGeo, this.materials.desk);
      tl.position.set((i % 2 === 0 ? -0.7 : 0.7), 0.36, (i < 2 ? -0.35 : 0.35));
      bg.add(tl);
    }

    const seatPositions = [
      [-1.2, 0.42, 0],
      [1.2, 0.42, 0],
      [0, 0.42, -0.8],
      [0, 0.42, 0.8],
    ];
    for (const sp of seatPositions) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), this.materials.desk);
      seat.position.set(sp[0], sp[1], sp[2]);
      bg.add(seat);
    }

    const vmBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.7), this.materials.desk);
    vmBody.position.set(1.4, 0.9, 0.8);
    vmBody.castShadow = true;
    bg.add(vmBody);

    const vmGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.05), this.materials.glass);
    vmGlass.position.set(1.4, 1.1, 1.12);
    bg.add(vmGlass);

    bg.position.set(9, 0, -8);
    this.group.add(bg);
  }

  private buildLights(): void {
    const spacing = 4;
    const count = 7;
    const start = -((count - 1) * spacing) / 2;

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < count; c++) {
        const light = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), this.materials.light);
        light.position.set(start + c * spacing, 3.4, -12 + r * spacing);
        light.rotation.x = Math.PI / 2;
        this.group.add(light);

        const housing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.4), this.materials.ceiling);
        housing.position.set(start + c * spacing, 3.38, -12 + r * spacing);
        this.group.add(housing);

        const ptLight = new THREE.PointLight(0xffffee, 0.3, 8);
        ptLight.position.set(start + c * spacing, 3.2, -12 + r * spacing);
        this.group.add(ptLight);
      }
    }
  }

  private buildCeiling(): void {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), this.materials.ceiling);
    ceiling.position.y = 3.5;
    ceiling.rotation.x = Math.PI / 2;
    this.group.add(ceiling);

    const gridLines = 12;
    for (let i = -gridLines / 2; i <= gridLines / 2; i++) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(36, 0.02, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 })
      );
      edge.position.set(0, 3.45, i * 3);
      this.group.add(edge);

      const edge2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.02, 36),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 })
      );
      edge2.position.set(i * 3, 3.45, 0);
      this.group.add(edge2);
    }
  }
}
