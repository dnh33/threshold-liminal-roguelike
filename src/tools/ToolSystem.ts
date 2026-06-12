import { EventEmitter } from '../utils/EventEmitter';
import type { InputManager } from '../core/InputManager';

const MAX_TOOLS = 4;
const MAX_KEYS = 2;
const MAX_CONSUMABLES = 3;
const HOTBAR_SLOTS = 6;

export const ToolCategory = {
  TOOL: 'tool',
  KEY: 'key',
  CONSUMABLE: 'consumable',
} as const;

export type ToolCategory = (typeof ToolCategory)[keyof typeof ToolCategory];

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  maxUses: number;
  cooldown: number;
  icon: string;
}

export interface ToolInstance {
  definition: ToolDefinition;
  currentUses: number;
  lastUsedTime: number;
  slot: number;
}

export interface ToolEventPayload {
  item: ToolInstance;
}

export interface InventoryFullPayload {
  category: ToolCategory;
  current: number;
  max: number;
  item: ToolDefinition;
}

export class ToolSystem extends EventEmitter {
  private _inventory: ToolInstance[] = [];
  private _activeSlot = 0;

  getInventory(): ToolInstance[] {
    return [...this._inventory];
  }

  getActiveSlot(): number {
    return this._activeSlot;
  }

  setActiveSlot(slot: number): void {
    if (slot >= 0 && slot < HOTBAR_SLOTS) {
      this._activeSlot = slot;
    }
  }

  getActiveTool(): ToolInstance | null {
    if (this._inventory.length <= this._activeSlot) return null;
    return this._inventory[this._activeSlot] ?? null;
  }

  addItem(definition: ToolDefinition): boolean {
    const existing = this._inventory.find(i => i.definition.id === definition.id);
    if (existing) {
      if (existing.definition.maxUses > 0) {
        const refill = Math.min(definition.maxUses, existing.currentUses + definition.maxUses);
        existing.currentUses = refill;
        this.emit('tool-refilled', { item: existing } satisfies ToolEventPayload);
        return true;
      }
      return false;
    }

    const catCount = this._countByCategory(definition.category);
    const max = definition.category === ToolCategory.TOOL ? MAX_TOOLS :
      definition.category === ToolCategory.KEY ? MAX_KEYS : MAX_CONSUMABLES;

    if (catCount >= max) {
      this.emit('inventory-full', {
        category: definition.category,
        current: catCount,
        max,
        item: definition,
      } satisfies InventoryFullPayload);
      return false;
    }

    const instance: ToolInstance = {
      definition,
      currentUses: definition.maxUses,
      lastUsedTime: 0,
      slot: this._inventory.length,
    };

    this._inventory.push(instance);
    this.emit('tool-added', { item: instance } satisfies ToolEventPayload);
    return true;
  }

  removeItem(id: string): boolean {
    const index = this._inventory.findIndex(i => i.definition.id === id);
    if (index === -1) return false;

    const removed = this._inventory.splice(index, 1)[0];
    this._reindexSlots();
    this.emit('tool-removed', { item: removed } satisfies ToolEventPayload);
    return true;
  }

  useItem(slot: number): boolean {
    if (slot < 0 || slot >= this._inventory.length) return false;

    const item = this._inventory[slot];
    if (!item) return false;

    const now = performance.now();
    const cooldownMs = item.definition.cooldown * 1000;
    if (now - item.lastUsedTime < cooldownMs) return false;

    item.lastUsedTime = now;

    if (item.definition.maxUses > 0) {
      item.currentUses--;
      this.emit('tool-used', { item } satisfies ToolEventPayload);

      if (item.currentUses <= 0) {
        this.emit('tool-depleted', { item } satisfies ToolEventPayload);
        this._inventory.splice(slot, 1);
        this._reindexSlots();
      }

      return true;
    }

    this.emit('tool-used', { item } satisfies ToolEventPayload);
    return true;
  }

  hasItem(id: string): boolean {
    return this._inventory.some(i => i.definition.id === id);
  }

  getItemCount(id: string): number {
    const item = this._inventory.find(i => i.definition.id === id);
    return item ? item.currentUses : 0;
  }

  getItemsByCategory(category: ToolCategory): ToolInstance[] {
    return this._inventory.filter(i => i.definition.category === category);
  }

  getHotbarItems(): (ToolInstance | null)[] {
    const items: (ToolInstance | null)[] = [];
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      items.push(this._inventory[i] ?? null);
    }
    return items;
  }

  getCapacity(category: ToolCategory): number {
    return category === ToolCategory.TOOL ? MAX_TOOLS :
      category === ToolCategory.KEY ? MAX_KEYS : MAX_CONSUMABLES;
  }

  getRemainingCapacity(category: ToolCategory): number {
    const count = this._countByCategory(category);
    const max = this.getCapacity(category);
    return max - count;
  }

  update(_dt: number, input?: InputManager): void {
    if (!this._inventory.length || !input) return;

    for (let i = 0; i < HOTBAR_SLOTS && i < this._inventory.length; i++) {
      const key = String(i + 1);
      if (input.isKeyJustPressed(key)) {
        this._activeSlot = i;
        this.useItem(i);
        break;
      }
    }
  }

  private _countByCategory(category: ToolCategory): number {
    return this._inventory.filter(i => i.definition.category === category).length;
  }

  private _reindexSlots(): void {
    for (let i = 0; i < this._inventory.length; i++) {
      this._inventory[i].slot = i;
    }
    if (this._activeSlot >= this._inventory.length) {
      this._activeSlot = Math.max(0, this._inventory.length - 1);
    }
  }

  clear(): void {
    this._inventory = [];
    this._activeSlot = 0;
  }

  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }
}
