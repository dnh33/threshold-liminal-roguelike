import * as THREE from 'three';
import { type RoomNode, RoomType } from './RoomLayoutGenerator';

export interface PropDefinition {
  mesh: THREE.Mesh | THREE.Group;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
}

export class PropPlacer {
  private seed: number;
  private rng: () => number;
  private materials: Record<string, THREE.MeshStandardMaterial> = {};

  constructor(seed: number) {
    this.seed = seed;
    this.rng = this.mulberry32(seed);
  }

  populate(rooms: RoomNode[], biomeType: string): PropDefinition[] {
    this.rng = this.mulberry32(this.seed);
    this.createMaterialsForBiome(biomeType);

    const allProps: PropDefinition[] = [];
    for (const room of rooms) {
      const roomProps = this.generatePropsForRoom(room, biomeType);
      allProps.push(...roomProps);
    }
    return allProps;
  }

  private generatePropsForRoom(room: RoomNode, biomeType: string): PropDefinition[] {
    this.rng = this.mulberry32(room.seed);
    this.createMaterialsForBiome(biomeType);

    if (room.type === RoomType.CORRIDOR) {
      return this.generateCorridorProps(room);
    }

    if (room.isLandmark) {
      const props = this.generateLandmarkProps(room, biomeType);
      if (props.length > 0) return props;
    }

    switch (biomeType) {
      case 'cubicle_sea': return this.generateOfficeProps(room);
      case 'submerged_garage': return this.generateGarageProps(room);
      case 'server_cathedral': return this.generateServerProps(room);
      case 'atrium_mall': return this.generateMallProps(room);
      case 'stairwell_infinite': return this.generateStairwellProps(room);
      case 'pool_complex': return this.generatePoolProps(room);
      default: return [];
    }
  }

  private generateLandmarkProps(room: RoomNode, biomeType: string): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 1;
    const hd = room.size.y / 2 - 1;

    switch (biomeType) {
      case 'cubicle_sea': {
        const table = this.buildMeetingTable();
        props.push({ mesh: table, position: new THREE.Vector3(cx, 0, cz), rotation: 0, scale: 1 });
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const dist = 1.5;
          const chair = this.buildChair();
          props.push({
            mesh: chair,
            position: new THREE.Vector3(cx + Math.cos(angle) * dist, 0, cz + Math.sin(angle) * dist),
            rotation: angle + Math.PI,
            scale: 1,
          });
        }
        break;
      }
      case 'atrium_mall': {
        const fountain = this.buildFountain();
        props.push({ mesh: fountain, position: new THREE.Vector3(cx, 0, cz), rotation: 0, scale: 1.5 });
        break;
      }
      case 'pool_complex': {
        const divingBoard = this.buildDivingBoard();
        const dbOffset = hd - 1;
        props.push({ mesh: divingBoard, position: new THREE.Vector3(cx, 0, cz + dbOffset), rotation: 0, scale: 1 });
        break;
      }
      default: {
        const pillar = this.buildPillar(3);
        props.push({ mesh: pillar, position: new THREE.Vector3(cx, 0, cz), rotation: 0, scale: 1 });
        break;
      }
    }

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.2;
      const dist = Math.min(hw, hd) * 0.7;
      const light = this.buildFloorLight();
      props.push({
        mesh: light,
        position: new THREE.Vector3(cx + Math.cos(angle) * dist, 0, cz + Math.sin(angle) * dist),
        rotation: angle,
        scale: 1,
      });
    }

    return props;
  }

  private generateOfficeProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 0.8;
    const hd = room.size.y / 2 - 0.8;
    const area = room.size.x * room.size.y;
    const cubicleCount = Math.min(Math.floor(area / 12), 8);

    for (let i = 0; i < cubicleCount; i++) {
      const px = cx - hw + this.rng() * hw * 2;
      const pz = cz - hd + this.rng() * hd * 2;
      const rot = Math.floor(this.rng() * 4) * (Math.PI / 2);
      const cubicle = this.buildCubicle();
      props.push({ mesh: cubicle, position: new THREE.Vector3(px, 0, pz), rotation: rot, scale: 1 });
    }

    if (this.rng() < 0.3 && area > 20) {
      const table = this.buildMeetingTable();
      props.push({
        mesh: table,
        position: new THREE.Vector3(cx + (this.rng() - 0.5) * hw * 0.5, 0, cz + (this.rng() - 0.5) * hd * 0.5),
        rotation: 0,
        scale: 0.8,
      });
    }

    if (this.rng() < 0.25) {
      const cabinet = this.buildFilingCabinet();
      const edge = Math.floor(this.rng() * 4);
      const ex = edge === 0 ? cx - hw + 0.5 : edge === 1 ? cx + hw - 0.5 : cx + (this.rng() - 0.5) * hw;
      const ez = edge === 2 ? cz - hd + 0.5 : edge === 3 ? cz + hd - 0.5 : cz + (this.rng() - 0.5) * hd;
      props.push({ mesh: cabinet, position: new THREE.Vector3(ex, 0, ez), rotation: Math.floor(this.rng() * 4) * (Math.PI / 2), scale: 1 });
    }

    if (this.rng() < 0.15) {
      const cooler = this.buildWaterCooler();
      props.push({
        mesh: cooler,
        position: new THREE.Vector3(cx + (this.rng() - 0.5) * hw, 0, cz + hd - 0.5),
        rotation: 0,
        scale: 1,
      });
    }

    return props;
  }

  private generateGarageProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 0.5;
    const hd = room.size.y / 2 - 0.5;
    const area = room.size.x * room.size.y;

    const pillarSpacing = 4;
    const pCols = Math.max(1, Math.floor(room.size.x / pillarSpacing));
    const pRows = Math.max(1, Math.floor(room.size.y / pillarSpacing));
    for (let r = 0; r < pRows; r++) {
      for (let c = 0; c < pCols; c++) {
        const px = cx - hw + (c + 0.5) * (hw * 2 / pCols);
        const pz = cz - hd + (r + 0.5) * (hd * 2 / pRows);
        const pillar = this.buildPillar(2.5);
        props.push({ mesh: pillar, position: new THREE.Vector3(px, 0, pz), rotation: 0, scale: 1 });
      }
    }

    const carCount = Math.min(Math.floor(area / 30), 4);
    for (let i = 0; i < carCount; i++) {
      const px = cx - hw + 1 + this.rng() * (hw * 2 - 2);
      const pz = cz - hd + 1 + this.rng() * (hd * 2 - 2);
      const car = this.buildCar();
      props.push({ mesh: car, position: new THREE.Vector3(px, 0, pz), rotation: Math.floor(this.rng() * 4) * (Math.PI / 2), scale: 1 });
    }

    if (this.rng() < 0.3) {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.4, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x888844, roughness: 0.8 })
      );
      props.push({ mesh: barrier, position: new THREE.Vector3(cx + (this.rng() - 0.5) * hw, 0, cz + hd - 0.5), rotation: 0, scale: 1 });
    }

    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x1a4a5a,
      transparent: true,
      opacity: 0.4,
      roughness: 0.05,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < Math.floor(area / 40); i++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3 + this.rng() * 0.5, 8), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      props.push({
        mesh: puddle,
        position: new THREE.Vector3(cx - hw + this.rng() * hw * 2, 0.02, cz - hd + this.rng() * hd * 2),
        rotation: this.rng() * Math.PI,
        scale: 1,
      });
    }

    return props;
  }

  private generateServerProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 1;
    const hd = room.size.y / 2 - 1;
    const area = room.size.x * room.size.y;

    const rackRows = Math.min(Math.floor(room.size.y / 3.5), 3);
    const racksPerRow = Math.min(Math.floor(room.size.x / 2.5), 4);
    const rowSpacing = hd * 2 / Math.max(rackRows + 1, 1);
    const rackSpacing = hw * 2 / Math.max(racksPerRow + 1, 1);

    for (let r = 0; r < rackRows; r++) {
      for (let c = 0; c < racksPerRow; c++) {
        const px = cx - hw + (c + 1) * rackSpacing;
        const pz = cz - hd + (r + 1) * rowSpacing;
        if (px < cx - hw || px > cx + hw || pz < cz - hd || pz > cz + hd) continue;
        const rack = this.buildServerRack();
        const facing = r % 2 === 0 ? 0 : Math.PI;
        props.push({ mesh: rack, position: new THREE.Vector3(px, 0, pz), rotation: facing, scale: 1 });
      }
    }

    if (area > 30) {
      const console = this.buildControlConsole();
      props.push({
        mesh: console,
        position: new THREE.Vector3(cx + hw - 1, 0, cz),
        rotation: Math.PI / 2,
        scale: 1,
      });
    }

    for (let i = 0; i < Math.min(rackRows * racksPerRow, 4); i++) {
      const cool = this.buildCoolingUnit();
      const px = cx + (this.rng() - 0.5) * hw * 1.5;
      const pz = cz + (this.rng() - 0.5) * hd * 1.5;
      props.push({ mesh: cool, position: new THREE.Vector3(px, 0, pz), rotation: 0, scale: 1 });
    }

    return props;
  }

  private generateMallProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 0.8;
    const hd = room.size.y / 2 - 0.8;
    const area = room.size.x * room.size.y;

    const benchCount = Math.floor(area / 35) + 1;
    for (let i = 0; i < benchCount; i++) {
      const edge = Math.floor(this.rng() * 4);
      let bx: number, bz: number;
      switch (edge) {
        case 0: bx = cx - hw + 0.5; bz = cz - hd + this.rng() * hd * 2; break;
        case 1: bx = cx + hw - 0.5; bz = cz - hd + this.rng() * hd * 2; break;
        case 2: bx = cx - hw + this.rng() * hw * 2; bz = cz - hd + 0.5; break;
        default: bx = cx - hw + this.rng() * hw * 2; bz = cz + hd - 0.5; break;
      }
      const bench = this.buildBench();
      props.push({ mesh: bench, position: new THREE.Vector3(bx, 0, bz), rotation: edge * (Math.PI / 2), scale: 1 });
    }

    if (this.rng() < 0.5) {
      const kiosk = this.buildKiosk();
      props.push({
        mesh: kiosk,
        position: new THREE.Vector3(cx + (this.rng() - 0.5) * hw * 0.6, 0, cz + (this.rng() - 0.5) * hd * 0.6),
        rotation: Math.floor(this.rng() * 4) * (Math.PI / 2),
        scale: 0.9 + this.rng() * 0.2,
      });
    }

    const plantCount = Math.floor(area / 50) + 1;
    for (let i = 0; i < plantCount; i++) {
      const plant = this.buildPottedPlant();
      const px = cx - hw + this.rng() * hw * 2;
      const pz = cz - hd + this.rng() * hd * 2;
      props.push({ mesh: plant, position: new THREE.Vector3(px, 0, pz), rotation: this.rng() * Math.PI * 2, scale: 0.8 + this.rng() * 0.4 });
    }

    if (this.rng() < 0.3) {
      const trash = this.buildTrashCan();
      props.push({
        mesh: trash,
        position: new THREE.Vector3(cx + hw - 0.5, 0, cz - hd + 0.5),
        rotation: 0,
        scale: 1,
      });
    }

    return props;
  }

  private generateStairwellProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 0.3;
    const hd = room.size.y / 2 - 0.3;

    for (let side = 0; side < 4; side++) {
      const angle = side * (Math.PI / 2);
      const sx = Math.sin(angle) * hw;
      const sz = Math.cos(angle) * hd;
      const length = side % 2 === 0 ? room.size.x : room.size.y;
      const rail = this.buildHandrail(length - 0.5);
      props.push({ mesh: rail, position: new THREE.Vector3(cx + sx, 0, cz + sz), rotation: angle, scale: 1 });
    }

    if (this.rng() < 0.4) {
      const sign = this.buildExitSign();
      props.push({
        mesh: sign,
        position: new THREE.Vector3(cx, 2.5, cz + hd - 0.2),
        rotation: 0,
        scale: 1,
      });
    }

    if (this.rng() < 0.35) {
      const ext = this.buildFireExtinguisher();
      const ex = cx + (this.rng() - 0.5) * hw * 0.5;
      const ez = cz + hd - 0.3;
      props.push({ mesh: ext, position: new THREE.Vector3(ex, 0, ez), rotation: 0, scale: 1 });
    }

    const lightStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(room.size.x * 0.6, 0.15),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffcc,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      })
    );
    props.push({
      mesh: lightStrip,
      position: new THREE.Vector3(cx, 3.0, cz),
      rotation: Math.PI / 2,
      scale: 1,
    });

    return props;
  }

  private generatePoolProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 0.5;
    const hd = room.size.y / 2 - 0.5;
    const area = room.size.x * room.size.y;

    if (room.size.x > room.size.y) {
      const laneCount = Math.min(Math.floor(room.size.x / 2.5), 4);
      for (let i = 0; i < laneCount; i++) {
        const lx = cx - hw + (i + 0.5) * (hw * 2 / laneCount);
        const divider = this.buildLaneDivider(room.size.y - 1);
        props.push({ mesh: divider, position: new THREE.Vector3(lx, 0, cz), rotation: 0, scale: 1 });
      }
    }

    const chairCount = Math.min(Math.floor(area / 25) + 1, 6);
    for (let i = 0; i < chairCount; i++) {
      const edge = Math.floor(this.rng() * 2);
      const ex = cx - hw + 0.3 + this.rng() * (hw * 2 - 0.6);
      const ez = edge === 0 ? cz - hd + 0.3 : cz + hd - 0.3;
      const chair = this.buildLoungeChair();
      props.push({
        mesh: chair,
        position: new THREE.Vector3(ex, 0, ez),
        rotation: edge === 0 ? Math.PI : 0,
        scale: 1,
      });
    }

    if (this.rng() < 0.3) {
      const stand = this.buildLifeguardStand();
      props.push({
        mesh: stand,
        position: new THREE.Vector3(cx + hw - 0.5, 0, cz + (this.rng() - 0.5) * hd),
        rotation: Math.PI / 2,
        scale: 1,
      });
    }

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3a8aaa,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(room.size.x - 1, room.size.y - 1), waterMat);
    water.rotation.x = -Math.PI / 2;
    props.push({
      mesh: water,
      position: new THREE.Vector3(cx, 0.05, cz),
      rotation: 0,
      scale: 1,
    });

    return props;
  }

  private generateCorridorProps(room: RoomNode): PropDefinition[] {
    const props: PropDefinition[] = [];
    const cx = room.position.x;
    const cz = room.position.y;
    const hw = room.size.x / 2 - 0.2;

    const lightCount = Math.max(1, Math.floor(Math.max(room.size.x, room.size.y) / 4));
    for (let i = 0; i < lightCount; i++) {
      const t = (i + 0.5) / lightCount;
      const lx = cx - hw + t * hw * 2;
      const light = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.15),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffcc,
          emissiveIntensity: 0.5,
          side: THREE.DoubleSide,
        })
      );
      props.push({ mesh: light, position: new THREE.Vector3(lx, 2.8, cz), rotation: Math.PI / 2, scale: 1 });
    }

    const ventMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.3 });
    for (let i = 0; i < lightCount; i++) {
      const t = (i + 0.5) / lightCount;
      const vx = cx - hw + t * hw * 2;
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), ventMat);
      props.push({ mesh: vent, position: new THREE.Vector3(vx, 2.9, cz), rotation: 0, scale: 1 });
    }

    if (this.rng() < 0.3) {
      const signGroup = new THREE.Group();
      const signMat = new THREE.MeshStandardMaterial({
        color: 0x22aa44,
        emissive: 0x22aa44,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), signMat);
      signGroup.add(sign);
      const signFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.35, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.5 })
      );
      signFrame.position.z = -0.01;
      signGroup.add(signFrame);
      props.push({
        mesh: signGroup,
        position: new THREE.Vector3(cx + hw - 0.1, 1.2, cz),
        rotation: Math.PI / 2,
        scale: 1,
      });
    }

    return props;
  }

  private buildCubicle(): THREE.Group {
    const group = new THREE.Group();
    const ph = 1.4;
    const pw = 1.6;
    const pd = 1.6;
    const pt = 0.04;

    const panelPositions = [
      { x: 0, z: -pd / 2 + pt / 2, sx: pw, sz: pt },
      { x: -pw / 2 + pt / 2, z: 0, sx: pt, sz: pd },
      { x: pw / 2 - pt / 2, z: 0, sx: pt, sz: pd },
    ];
    const partitionMat = this.getMat('partition');
    for (const pp of panelPositions) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(pp.sx, ph, pp.sz), partitionMat);
      panel.position.set(pp.x, ph / 2, pp.z);
      panel.castShadow = true;
      panel.receiveShadow = true;
      group.add(panel);
    }

    const deskTop = this.getMat('deskTop');
    const deskMat = this.getMat('desk');
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), deskTop);
    desk.position.set(0, 0.75, 0.3);
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);

    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6);
    const legPositions = [[-0.5, 0.36, 0.2], [0.5, 0.36, 0.2], [-0.5, 0.36, -0.2], [0.5, 0.36, -0.2]];
    for (const lp of legPositions) {
      const leg = new THREE.Mesh(legGeo, deskMat);
      leg.position.set(lp[0], lp[1], lp[2]);
      group.add(leg);
    }

    const monitorMat = this.getMat('monitor');
    const screenMat = this.getMat('screen');
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.04), monitorMat);
    monitor.position.set(0, 1.0, -0.05);
    group.add(monitor);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.01), screenMat);
    scr.position.set(0, 1.0, -0.03);
    group.add(scr);

    const chairBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), deskMat);
    chairBase.position.set(0, 0.4, 0.65);
    group.add(chairBase);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.025), deskMat);
    chairBack.position.set(0, 0.58, 0.83);
    group.add(chairBack);

    return group;
  }

  private buildChair(): THREE.Group {
    const group = new THREE.Group();
    const mat = this.getMat('desk');
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.35), mat);
    seat.position.y = 0.42;
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.025), mat);
    back.position.set(0, 0.6, -0.18);
    group.add(back);
    return group;
  }

  private buildMeetingTable(): THREE.Group {
    const group = new THREE.Group();
    const top = this.getMat('deskTop');
    const legMat = this.getMat('desk');
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.0), top);
    table.position.y = 0.75;
    table.castShadow = true;
    table.receiveShadow = true;
    group.add(table);
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6);
    const lps = [[-0.8, 0.36, -0.4], [0.8, 0.36, -0.4], [-0.8, 0.36, 0.4], [0.8, 0.36, 0.4]];
    for (const lp of lps) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lp[0], lp[1], lp[2]);
      group.add(leg);
    }
    return group;
  }

  private buildFilingCabinet(): THREE.Group {
    const group = new THREE.Group();
    const mat = this.getMat('desk');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.5), mat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    for (let i = 0; i < 3; i++) {
      const drawer = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.5, metalness: 0.4 })
      );
      drawer.position.set(0, 0.2 + i * 0.38, 0.26);
      group.add(drawer);
    }
    return group;
  }

  private buildWaterCooler(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.9, 12), bodyMat);
    body.position.y = 0.45;
    group.add(body);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.18, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3 })
    );
    cap.position.y = 0.9;
    group.add(cap);
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.17, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.2 })
    );
    bottle.position.y = 1.1;
    group.add(bottle);
    return group;
  }

  private buildPillar(height: number): THREE.Group {
    const group = new THREE.Group();
    const mat = this.getMat('pillar');
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, height, 0.5), mat);
    pillar.position.y = height / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), mat);
    base.position.y = 0.03;
    group.add(base);
    return group;
  }

  private buildCar(): THREE.Group {
    const group = new THREE.Group();
    const bodyHues = [0x3a4a5a, 0x4a3a3a, 0x3a4a3a, 0x5a5a4a, 0x2a3a4a];
    const bodyColor = bodyHues[Math.floor(this.rng() * bodyHues.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.85), bodyMat);
    body.position.y = 0.28;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.8), glassMat);
    cabin.position.set(-0.15, 0.63, 0);
    group.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wps = [[-0.5, 0.07, -0.48], [-0.5, 0.07, 0.48], [0.5, 0.07, -0.48], [0.5, 0.07, 0.48]];
    for (const wp of wps) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wp[0], wp[1], wp[2]);
      group.add(wheel);
    }

    return group;
  }

  private buildServerRack(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = this.getMat('rackBody');
    const faceMat = this.getMat('rackFace');
    const rw = 0.55;
    const rd = 0.85;
    const rh = 2.0;

    const body = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), bodyMat);
    body.position.y = rh / 2 + 0.05;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const slots = 5;
    const slotHeight = rh / slots;
    for (let s = 0; s < slots; s++) {
      const sy = slotHeight / 2 + s * slotHeight + 0.05;
      const face = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.85, slotHeight * 0.65, 0.015), faceMat);
      face.position.set(0, sy, rd / 2 + 0.005);
      group.add(face);

      const ledCount = 2 + Math.floor(this.rng() * 4);
      for (let l = 0; l < ledCount; l++) {
        const lx = (this.rng() - 0.5) * rw * 0.5;
        const ly = sy + (this.rng() - 0.5) * slotHeight * 0.3;
        const ledType = this.rng();
        let ledMat: THREE.MeshStandardMaterial;
        if (ledType < 0.5) ledMat = this.getMat('ledGreen');
        else if (ledType < 0.8) ledMat = this.getMat('ledBlue');
        else ledMat = this.getMat('ledAmber');
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), ledMat);
        led.position.set(lx, ly, rd / 2 + 0.02);
        group.add(led);
      }
    }

    return group;
  }

  private buildControlConsole(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3, metalness: 0.6 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.8), mat);
    desk.position.y = 0.75;
    desk.castShadow = true;
    group.add(desk);

    const screenMat = new THREE.MeshStandardMaterial({ color: 0x000011, emissive: 0x2244aa, emissiveIntensity: 0.25 });
    for (let i = -1; i <= 1; i++) {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.015), screenMat);
      screen.position.set(i * 0.45, 1.0, -0.35);
      group.add(screen);
    }

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.0), mat);
    base.position.y = 0.02;
    group.add(base);

    return group;
  }

  private buildCoolingUnit(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.5, metalness: 0.4 });
    const unit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), mat);
    unit.position.y = 0.75;
    unit.castShadow = true;
    group.add(unit);

    const fanMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6, metalness: 0.3 });
    for (let i = 0; i < 2; i++) {
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.03, 12),
        fanMat
      );
      fan.position.set(0, 0.4 + i * 0.6, 0.41);
      group.add(fan);
    }

    return group;
  }

  private buildBench(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.8 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), mat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);
    const legGeo = new THREE.BoxGeometry(0.04, 0.42, 0.04);
    const legPositions = [[-0.5, 0.21, -0.15], [0.5, 0.21, -0.15], [-0.5, 0.21, 0.15], [0.5, 0.21, 0.15]];
    for (const lp of legPositions) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lp[0], lp[1], lp[2]);
      group.add(leg);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.04), mat);
    back.position.set(0, 0.65, -0.22);
    group.add(back);
    return group;
  }

  private buildKiosk(): THREE.Group {
    const group = new THREE.Group();
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.6 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.6), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.7), counterMat);
    counter.position.y = 0.9;
    group.add(counter);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.2, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xcaaa7a, emissive: 0xcaaa7a, emissiveIntensity: 0.1 })
    );
    sign.position.set(0, 1.05, 0.31);
    group.add(sign);
    return group;
  }

  private buildPottedPlant(): THREE.Group {
    const group = new THREE.Group();
    const potMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8), potMat);
    pot.position.y = 0.125;
    group.add(pot);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + this.rng() * 0.08, 6, 6),
        foliageMat
      );
      sphere.position.set(Math.cos(angle) * 0.1, 0.3 + this.rng() * 0.1, Math.sin(angle) * 0.1);
      group.add(sphere);
    }
    return group;
  }

  private buildTrashCan(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.3 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.35, 10), mat);
    can.position.y = 0.175;
    group.add(can);
    return group;
  }

  private buildHandrail(length: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.4 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.04, 0.04), mat);
    rail.position.y = 0.9;
    group.add(rail);
    const postCount = Math.max(2, Math.floor(length / 1.5));
    for (let i = 0; i < postCount; i++) {
      const t = postCount > 1 ? i / (postCount - 1) : 0.5;
      const px = -length / 2 + t * length;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), mat);
      post.position.set(px, 0.45, 0);
      group.add(post);
    }
    return group;
  }

  private buildExitSign(): THREE.Group {
    const group = new THREE.Group();
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x22ff44,
      emissive: 0x22ff44,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.2), signMat);
    group.add(sign);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.5 })
    );
    frame.position.z = -0.01;
    group.add(frame);
    return group;
  }

  private buildFireExtinguisher(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.35, 8), bodyMat);
    body.position.y = 0.25;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.08, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 })
    );
    head.position.y = 0.45;
    group.add(head);
    return group;
  }

  private buildLaneDivider(length: number): THREE.Group {
    const group = new THREE.Group();
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, length, 4), ropeMat);
    rope.position.y = 0.1;
    rope.rotation.x = Math.PI / 2;
    group.add(rope);
    const floatMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.6 });
    const floatCount = Math.max(2, Math.floor(length / 2));
    for (let i = 0; i < floatCount; i++) {
      const t = floatCount > 1 ? i / (floatCount - 1) : 0.5;
      const fz = -length / 2 + t * length;
      const floater = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), floatMat);
      floater.position.set(0, 0.1, fz);
      group.add(floater);
    }
    return group;
  }

  private buildLoungeChair(): THREE.Group {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.5 });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.7 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.04), frameMat);
    frame.position.set(0, 0.2, 0.15);
    group.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.5), strapMat);
    seat.position.set(0, 0.25, 0);
    group.add(seat);
    const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6);
    const lps = [[-0.25, 0.1, 0.2], [0.25, 0.1, 0.2], [-0.25, 0.1, -0.2], [0.25, 0.1, -0.2]];
    for (const lp of lps) {
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.position.set(lp[0], lp[1], lp[2]);
      group.add(leg);
    }
    return group;
  }

  private buildLifeguardStand(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), mat);
    seat.position.y = 1.6;
    group.add(seat);
    const legGeo = new THREE.BoxGeometry(0.03, 1.5, 0.03);
    const legPositions = [[-0.18, 0.75, -0.18], [0.18, 0.75, -0.18], [-0.18, 0.75, 0.18], [0.18, 0.75, 0.18]];
    for (const lp of legPositions) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lp[0], lp[1], lp[2]);
      group.add(leg);
    }
    return group;
  }

  private buildDivingBoard(): THREE.Group {
    const group = new THREE.Group();
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.3 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 1.5), boardMat);
    board.position.set(0, 0.6, 0.5);
    board.castShadow = true;
    group.add(board);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), baseMat);
    base.position.set(0, 0.25, -0.3);
    group.add(base);
    return group;
  }

  private buildFountain(): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3a8aaa, transparent: true, opacity: 0.5, roughness: 0.1 });

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.3, 16), stoneMat);
    basin.position.y = 0.15;
    group.add(basin);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.02, 16), waterMat);
    inner.position.y = 0.28;
    group.add(inner);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), stoneMat);
    pillar.position.y = 0.5;
    group.add(pillar);

    const top = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), stoneMat);
    top.position.y = 0.85;
    group.add(top);

    return group;
  }

  private buildFloorLight(): THREE.Group {
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.4 });
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.5, 6), poleMat);
    pole.position.y = 0.75;
    group.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 8), poleMat);
    base.position.y = 0.02;
    group.add(base);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.15, 8), shadeMat);
    shade.position.y = 1.5;
    group.add(shade);
    return group;
  }

  private createMaterialsForBiome(biomeType: string): void {
    this.materials = {};

    const defaults = {
      desk: new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 0.6, metalness: 0.3 }),
      deskTop: new THREE.MeshStandardMaterial({ color: 0x8a9aaa, roughness: 0.5, metalness: 0.2 }),
      partition: new THREE.MeshStandardMaterial({ color: 0x8f9faf, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide }),
      monitor: new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.3, metalness: 0.7 }),
      screen: new THREE.MeshStandardMaterial({ color: 0x4488aa, emissive: 0x224466, emissiveIntensity: 0.4, roughness: 0.2 }),
    };

    switch (biomeType) {
      case 'cubicle_sea':
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x6b7b8d, roughness: 0.85, metalness: 0.1 }),
          rackBody: defaults.desk,
          rackFace: defaults.monitor,
          ledGreen: new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.0 }),
          ledBlue: new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.8 }),
          ledAmber: new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xffaa22, emissiveIntensity: 0.6 }),
        };
        break;
      case 'submerged_garage':
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.85, metalness: 0.1 }),
          rackBody: defaults.desk,
          rackFace: defaults.monitor,
          ledGreen: defaults.screen,
          ledBlue: defaults.screen,
          ledAmber: defaults.screen,
        };
        break;
      case 'server_cathedral':
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x4a3a5a, roughness: 0.7, metalness: 0.5 }),
          rackBody: new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.4, metalness: 0.7 }),
          rackFace: new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.3, metalness: 0.8 }),
          ledGreen: new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.0 }),
          ledBlue: new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.8 }),
          ledAmber: new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xffaa22, emissiveIntensity: 0.6 }),
        };
        break;
      case 'atrium_mall':
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.7, metalness: 0.2 }),
          rackBody: defaults.desk,
          rackFace: defaults.monitor,
          ledGreen: defaults.screen,
          ledBlue: defaults.screen,
          ledAmber: defaults.screen,
        };
        break;
      case 'stairwell_infinite':
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x4a3a3a, roughness: 0.8, metalness: 0.3 }),
          rackBody: defaults.desk,
          rackFace: defaults.monitor,
          ledGreen: defaults.screen,
          ledBlue: defaults.screen,
          ledAmber: defaults.screen,
        };
        break;
      case 'pool_complex':
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x5a8a9a, roughness: 0.6, metalness: 0.2 }),
          rackBody: defaults.desk,
          rackFace: defaults.monitor,
          ledGreen: defaults.screen,
          ledBlue: defaults.screen,
          ledAmber: defaults.screen,
        };
        break;
      default:
        this.materials = {
          ...defaults,
          pillar: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 }),
          rackBody: defaults.desk,
          rackFace: defaults.monitor,
          ledGreen: defaults.screen,
          ledBlue: defaults.screen,
          ledAmber: defaults.screen,
        };
    }
  }

  private getMat(name: string): THREE.MeshStandardMaterial {
    return this.materials[name] || new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
  }

  private mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, s | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
}
