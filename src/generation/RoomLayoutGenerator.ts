import * as THREE from 'three';

export const RoomType = {
  CORRIDOR: 'corridor',
  ROOM: 'room',
  LANDMARK: 'landmark',
  TRANSITION: 'transition',
  DEAD_END: 'dead_end',
} as const;

export type RoomType = (typeof RoomType)[keyof typeof RoomType];

export interface RoomNode {
  id: number;
  position: THREE.Vector2;
  size: THREE.Vector2;
  type: RoomType;
  connections: number[];
  isLandmark: boolean;
  seed: number;
}

export interface LayoutResult {
  rooms: RoomNode[];
  spawnPosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  landmarkPositions: THREE.Vector3[];
  width: number;
  depth: number;
}

interface BSPNode {
  x: number;
  z: number;
  width: number;
  depth: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: RoomNode;
}

export class RoomLayoutGenerator {
  private seed: number;
  private rng: () => number;
  private nextId = 0;

  constructor(seed: number, _biomeType: string) {
    this.seed = seed;
    this.rng = this.mulberry32(seed);
  }

  generate(targetRoomCount: number, landmarkCount: number): LayoutResult {
    this.nextId = 0;
    this.rng = this.mulberry32(this.seed);

    const rooms = this.generateMacroLayout(targetRoomCount, landmarkCount);
    this.connectRooms(rooms);
    this.assignRoomTypes(rooms, landmarkCount);

    if (!this.validateLayout(rooms)) {
      rooms.length = 0;
      rooms.push(...this.generateFallbackLayout(targetRoomCount));
    }

    const spawnRoom = rooms.find(r => !r.isLandmark && r.type === RoomType.ROOM) || rooms[0];
    const exitRoom = rooms.reduce((best, r) => {
      const d = spawnRoom.position.distanceTo(r.position);
      return d > best.dist ? { room: r, dist: d } : best;
    }, { room: spawnRoom, dist: 0 }).room;

    const maxX = Math.max(...rooms.map(r => Math.abs(r.position.x + r.size.x / 2)), 15);
    const maxZ = Math.max(...rooms.map(r => Math.abs(r.position.y + r.size.y / 2)), 15);

    return {
      rooms,
      spawnPosition: new THREE.Vector3(spawnRoom.position.x, 0, spawnRoom.position.y),
      exitPosition: new THREE.Vector3(exitRoom.position.x, 0, exitRoom.position.y),
      landmarkPositions: rooms.filter(r => r.isLandmark).map(r => new THREE.Vector3(r.position.x, 0, r.position.y)),
      width: maxX * 2 + 10,
      depth: maxZ * 2 + 10,
    };
  }

  private generateMacroLayout(targetRooms: number, landmarks: number): RoomNode[] {
    const areaPerRoom = 64;
    const landmarkBonus = landmarks * 40;
    const totalArea = Math.max(targetRooms * areaPerRoom + landmarkBonus, 400);
    const aspect = 1 + (this.rng() - 0.5) * 0.4;
    const boundsWidth = Math.max(Math.sqrt(totalArea * aspect), 24);
    const boundsDepth = Math.max(totalArea / boundsWidth, 24);

    const root: BSPNode = {
      x: -boundsWidth / 2,
      z: -boundsDepth / 2,
      width: boundsWidth,
      depth: boundsDepth,
    };

    const maxDepth = Math.max(3, Math.min(8, Math.ceil(Math.log2(targetRooms * 1.2))));
    const minSize = 4;

    this.splitNode(root, 0, maxDepth, minSize);
    this.createRoomsInLeaves(root, minSize);

    const rooms = this.collectRooms(root);

    for (const room of rooms) {
      const ratio = Math.max(room.size.x / room.size.y, room.size.y / room.size.x);
      if (ratio > 3.5) {
        room.type = RoomType.CORRIDOR;
      }
    }

    return rooms;
  }

  private splitNode(node: BSPNode, depth: number, maxDepth: number, minSize: number): void {
    const dim = Math.max(node.width, node.depth);
    const canSplit = dim >= minSize * 2.5 && depth < maxDepth;

    if (!canSplit) return;

    const splitX = node.width >= node.depth;
    const splitSize = splitX ? node.width : node.depth;
    const ratio = 0.35 + this.rng() * 0.3;
    const pos = splitSize * ratio;
    const minChild = minSize + 1;

    if (pos < minChild || splitSize - pos < minChild) return;

    if (splitX) {
      node.left = { x: node.x, z: node.z, width: pos, depth: node.depth };
      node.right = { x: node.x + pos, z: node.z, width: node.width - pos, depth: node.depth };
    } else {
      node.left = { x: node.x, z: node.z, width: node.width, depth: pos };
      node.right = { x: node.x, z: node.z + pos, width: node.width, depth: node.depth - pos };
    }

    this.splitNode(node.left, depth + 1, maxDepth, minSize);
    this.splitNode(node.right, depth + 1, maxDepth, minSize);
  }

  private createRoomsInLeaves(node: BSPNode, minSize: number): void {
    if (!node.left && !node.right) {
      const room = this.createRoomInNode(node, minSize);
      if (room) node.room = room;
      return;
    }
    if (node.left) this.createRoomsInLeaves(node.left, minSize);
    if (node.right) this.createRoomsInLeaves(node.right, minSize);
  }

  private createRoomInNode(node: BSPNode, minSize: number): RoomNode | null {
    const padH = 0.5 + this.rng() * 1.5;
    const padV = 0.5 + this.rng() * 1.5;
    let roomWidth = node.width - padH * 2;
    let roomDepth = node.depth - padV * 2;
    if (roomWidth < minSize || roomDepth < minSize) return null;

    const shrinkX = 0.7 + this.rng() * 0.3;
    const shrinkZ = 0.7 + this.rng() * 0.3;
    roomWidth = Math.max(roomWidth * shrinkX, minSize);
    roomDepth = Math.max(roomDepth * shrinkZ, minSize);
    if (roomWidth > node.width - 0.5 || roomDepth > node.depth - 0.5) return null;

    const maxOffX = Math.max(node.width - padH * 2 - roomWidth, 0);
    const maxOffZ = Math.max(node.depth - padV * 2 - roomDepth, 0);
    const offX = this.rng() * maxOffX;
    const offZ = this.rng() * maxOffZ;

    return {
      id: this.nextId++,
      position: new THREE.Vector2(node.x + padH + offX + roomWidth / 2, node.z + padV + offZ + roomDepth / 2),
      size: new THREE.Vector2(roomWidth, roomDepth),
      type: RoomType.ROOM,
      connections: [],
      isLandmark: false,
      seed: Math.floor(this.rng() * 100000),
    };
  }

  private collectRooms(node: BSPNode): RoomNode[] {
    if (node.room) return [node.room];
    const rooms: RoomNode[] = [];
    if (node.left) rooms.push(...this.collectRooms(node.left));
    if (node.right) rooms.push(...this.collectRooms(node.right));
    return rooms;
  }

  private connectRooms(rooms: RoomNode[]): void {
    if (rooms.length < 2) return;

    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const connected = new Set<number>([rooms[0].id]);
    const unconnected = new Set(rooms.filter(r => r.id !== rooms[0].id).map(r => r.id));

    while (unconnected.size > 0) {
      let bestDist = Infinity;
      let bestA = -1;
      let bestB = -1;

      for (const cId of connected) {
        const cRoom = roomMap.get(cId)!;
        for (const uId of unconnected) {
          const uRoom = roomMap.get(uId)!;
          const dist = cRoom.position.distanceTo(uRoom.position);
          if (dist < bestDist) {
            bestDist = dist;
            bestA = cId;
            bestB = uId;
          }
        }
      }

      if (bestA < 0 || bestB < 0) break;
      const roomA = roomMap.get(bestA)!;
      const roomB = roomMap.get(bestB)!;
      roomA.connections.push(bestB);
      roomB.connections.push(bestA);
      connected.add(bestB);
      unconnected.delete(bestB);
    }

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        if (a.connections.includes(b.id)) continue;
        const dist = a.position.distanceTo(b.position);
        const avgSize = (Math.min(a.size.x, a.size.y) + Math.min(b.size.x, b.size.y)) / 2;
        if (dist < avgSize * 3 && this.rng() < 0.2) {
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }
  }

  private assignRoomTypes(rooms: RoomNode[], landmarkCount: number): void {
    if (rooms.length === 0) return;

    const sortedByArea = [...rooms].sort((a, b) => (b.size.x * b.size.y) - (a.size.x * a.size.y));
    const lmCount = Math.min(landmarkCount, Math.max(1, Math.floor(rooms.length / 3)));

    for (let i = 0; i < lmCount && i < sortedByArea.length; i++) {
      const room = sortedByArea[i];
      if (room.type !== RoomType.CORRIDOR) {
        room.type = RoomType.LANDMARK;
        room.isLandmark = true;
      }
    }

    for (const room of rooms) {
      if (room.isLandmark || room.type === RoomType.CORRIDOR) continue;
      if (room.connections.length >= 3) {
        room.type = RoomType.TRANSITION;
      }
    }

    for (const room of rooms) {
      if (room.isLandmark || room.type === RoomType.CORRIDOR || room.type === RoomType.TRANSITION) continue;
      if (room.connections.length <= 1) {
        room.type = RoomType.DEAD_END;
      }
    }
  }

  private validateLayout(rooms: RoomNode[]): boolean {
    if (rooms.length < 2) return false;

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        if (this.roomsOverlap(rooms[i], rooms[j])) return false;
      }
    }

    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const visited = new Set<number>();
    const queue = [rooms[0].id];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const room = roomMap.get(id);
      if (!room) continue;
      for (const connId of room.connections) {
        if (!visited.has(connId)) queue.push(connId);
      }
    }

    return visited.size === rooms.length;
  }

  private roomsOverlap(a: RoomNode, b: RoomNode): boolean {
    const margin = 0.1;
    const overlapX = Math.abs(a.position.x - b.position.x) < (a.size.x + b.size.x) / 2 - margin;
    const overlapZ = Math.abs(a.position.y - b.position.y) < (a.size.y + b.size.y) / 2 - margin;
    return overlapX && overlapZ;
  }

  private generateFallbackLayout(count: number): RoomNode[] {
    const rooms: RoomNode[] = [];
    const spacing = 8;
    const perRow = Math.ceil(Math.sqrt(count));

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = col * spacing - (perRow - 1) * spacing / 2;
      const z = row * spacing - (perRow - 1) * spacing / 2;

      const room: RoomNode = {
        id: this.nextId++,
        position: new THREE.Vector2(x, z),
        size: new THREE.Vector2(5 + this.rng() * 3, 5 + this.rng() * 3),
        type: RoomType.ROOM,
        connections: [],
        isLandmark: false,
        seed: Math.floor(this.rng() * 100000),
      };
      rooms.push(room);
    }

    for (let i = 0; i < rooms.length - 1; i++) {
      rooms[i].connections.push(rooms[i + 1].id);
      rooms[i + 1].connections.push(rooms[i].id);
    }

    return rooms;
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
