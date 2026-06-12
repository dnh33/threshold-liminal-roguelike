import * as THREE from 'three';
import { type BiomeDefinition } from './BiomeTypes';

export class StairwellBiome {
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
    cctx.fillStyle = '#3a2a2a';
    cctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) {
      const g = Math.floor(40 + Math.random() * 40);
      cctx.fillStyle = `rgb(${g + 10},${g},${g})`;
      cctx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    const concreteTex = new THREE.CanvasTexture(concreteCanvas);
    concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
    concreteTex.repeat.set(6, 6);

    this.materials.floor = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.95,
      metalness: 0,
    });

    this.materials.wall = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.9,
      metalness: 0,
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0x2a1a1a,
      roughness: 0.95,
      metalness: 0,
    });

    this.materials.step = new THREE.MeshStandardMaterial({
      color: 0x4a3a3a,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.materials.landing = new THREE.MeshStandardMaterial({
      color: 0x4a3a3a,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.materials.handrail = new THREE.MeshStandardMaterial({
      color: 0x6a5a5a,
      roughness: 0.5,
      metalness: 0.6,
    });

    this.materials.handrailPost = new THREE.MeshStandardMaterial({
      color: 0x5a4a4a,
      roughness: 0.5,
      metalness: 0.5,
    });

    this.materials.door = new THREE.MeshStandardMaterial({
      color: 0x5a3a2a,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.materials.exitSign = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff2222,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.1,
    });

    this.materials.stepRiser = new THREE.MeshStandardMaterial({
      color: 0x3a2a2a,
      roughness: 0.9,
      metalness: 0,
    });
  }

  private rng(i: number): number {
    const v = Math.sin(this.baseSeed + i * 537.58) * 43758.5453;
    return v - Math.floor(v);
  }

  build(): THREE.Group {
    this.buildShaft();
    this.buildStaircases();
    this.buildHandrails();
    this.buildExitSigns();
    this.buildLandingLights();
    return this.group;
  }

  private buildShaft(): void {
    const shaftRadius = 5.5;
    const shaftHeight = 10;
    const segments = 24;

    const shaftMat = this.materials.wall;

    const wallGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, segments, 1, true);
    const shaft = new THREE.Mesh(wallGeo, shaftMat);
    shaft.position.y = shaftHeight / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    this.group.add(shaft);

    const topCeiling = new THREE.Mesh(
      new THREE.CircleGeometry(shaftRadius, segments),
      this.materials.ceiling
    );
    topCeiling.position.y = shaftHeight;
    topCeiling.rotation.x = -Math.PI / 2;
    this.group.add(topCeiling);

    const bottomFloor = new THREE.Mesh(
      new THREE.CircleGeometry(shaftRadius, segments),
      this.materials.floor
    );
    bottomFloor.rotation.x = -Math.PI / 2;
    bottomFloor.receiveShadow = true;
    this.group.add(bottomFloor);

    for (let level = 0; level < 4; level++) {
      const ly = level * 2.4;
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a2a,
        roughness: 0.85,
        metalness: 0.05,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(shaftRadius - 0.05, 0.08, 4, segments),
        ringMat
      );
      ring.position.y = ly;
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    }
  }

  private buildStaircases(): void {
    const levels = 4;
    for (let level = 0; level < levels; level++) {
      this.buildLevel(level);
    }
  }

  private buildLevel(level: number): void {
    const baseY = level * 2.4;
    const innerRadius = 1.0;
    const outerRadius = 5.0;
    const stepsPerLevel = 12;
    const stepRise = 2.4 / stepsPerLevel;
    const anglePerStep = (Math.PI * 1.5) / stepsPerLevel;
    const stepWidth = outerRadius - innerRadius;

    for (let s = 0; s < stepsPerLevel; s++) {
      const startAngle = level % 2 === 0
        ? s * anglePerStep
        : Math.PI + s * anglePerStep;
      const stepY = baseY + s * stepRise;

      const midAngle = startAngle + anglePerStep / 2;
      const midRadius = innerRadius + stepWidth / 2;

      const sx = Math.cos(midAngle) * midRadius;
      const sz = Math.sin(midAngle) * midRadius;

      const treadDepth = stepRise * 0.6;

      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth * 0.9, 0.04, treadDepth),
        this.materials.step
      );
      step.position.set(sx, stepY, sz);
      step.lookAt(0, stepY, 0);
      step.rotateY(Math.PI / 2);
      this.group.add(step);

      const riser = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth * 0.9, stepRise * 0.7, 0.02),
        this.materials.stepRiser
      );
      const riserAngle = midAngle + Math.PI / 2;
      const riserX = Math.cos(riserAngle) * (midRadius) + sx;
      const riserZ = Math.sin(riserAngle) * (midRadius) + sz;
      riser.position.set(riserX, stepY - stepRise * 0.35, riserZ);
      riser.lookAt(sx, stepY - stepRise * 0.35, sz);
      this.group.add(riser);
    }
  }

  private buildHandrails(): void {
    const levels = 4;
    const innerRadius = 1.0;
    const outerRadius = 5.0;
    const railHeight = 0.9;

    for (let level = 0; level < levels; level++) {
      const baseY = level * 2.4;

      for (let side = 0; side < 2; side++) {
        const radius = side === 0 ? innerRadius + 0.2 : outerRadius - 0.2;
        const pathPoints: THREE.Vector3[] = [];
        const stepsPerLevel = 12;
        const anglePerStep = (Math.PI * 1.5) / stepsPerLevel;
        const stepRise = 2.4 / stepsPerLevel;

        for (let s = 0; s <= stepsPerLevel; s++) {
          const startAngle = level % 2 === 0
            ? s * anglePerStep
            : Math.PI + s * anglePerStep;
          const stepY = baseY + s * stepRise;
          const px = Math.cos(startAngle) * radius;
          const pz = Math.sin(startAngle) * radius;
          pathPoints.push(new THREE.Vector3(px, stepY + railHeight, pz));
        }

        for (let i = 0; i < pathPoints.length - 1; i++) {
          const a = pathPoints[i];
          const b = pathPoints[i + 1];
          const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
          const len = a.distanceTo(b);

          const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, len, 4),
            this.materials.handrail
          );
          rail.position.copy(mid);
          rail.lookAt(b);
          rail.rotateX(Math.PI / 2);
          this.group.add(rail);
        }

        for (let i = 0; i <= pathPoints.length; i += 2) {
          const pt = pathPoints[Math.min(i, pathPoints.length - 1)];
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, railHeight, 4),
            this.materials.handrailPost
          );
          post.position.set(pt.x, pt.y - railHeight / 2, pt.z);
          this.group.add(post);
        }
      }
    }
  }

  private buildExitSigns(): void {
    const positions = [
      { angle: 0, y: 2.0 },
      { angle: Math.PI / 2, y: 4.4 },
      { angle: Math.PI, y: 6.8 },
      { angle: Math.PI * 1.5, y: 9.2 },
    ];

    for (const p of positions) {
      const signGroup = new THREE.Group();

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.04),
        this.materials.exitSign
      );
      sign.position.set(0, 0, 0);
      signGroup.add(sign);

      const signLight = new THREE.PointLight(0xff2222, 0.15, 2);
      signLight.position.set(0, 0, -0.1);
      signGroup.add(signLight);

      const signX = Math.cos(p.angle) * 4.8;
      const signZ = Math.sin(p.angle) * 4.8;
      signGroup.position.set(signX, p.y, signZ);
      signGroup.lookAt(0, p.y, 0);
      this.group.add(signGroup);
    }
  }

  private buildLandingLights(): void {
    const levels = 4;
    for (let level = 0; level < levels; level++) {
      const y = level * 2.4 + 0.5;

      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + this.rng(level * 100 + i) * 0.2;
        const radius = 4.5;

        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshStandardMaterial({
            color: 0xffaa66,
            emissive: 0xff8844,
            emissiveIntensity: 0.3,
          })
        );
        light.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        this.group.add(light);

        const ptLight = new THREE.PointLight(0xff8844, 0.08, 4);
        ptLight.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        this.group.add(ptLight);
      }
    }
  }
}
