import { EventEmitter } from '../utils/EventEmitter';

export class InputManager extends EventEmitter {
  public keys: Set<string> = new Set();
  public keysJustPressed: Set<string> = new Set();
  public mousePosition = { x: 0, y: 0 };
  public mouseDelta = { x: 0, y: 0 };
  public mouseButtons: boolean[] = [false, false, false];
  public isPointerLocked = false;
  public scrollDelta = 0;

  private previousKeys: Set<string> = new Set();

  constructor(private target: HTMLElement) {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.isPointerLocked && e.key === 'Escape') return;
      this.keys.add(e.key.toLowerCase());
      this.emit('keydown', e.key.toLowerCase());
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.emit('keyup', e.key.toLowerCase());
    });

    this.target.addEventListener('mousemove', (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
      if (this.isPointerLocked) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });

    this.target.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;
      this.emit('mousedown', e.button);
    });

    this.target.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
      this.emit('mouseup', e.button);
    });

    this.target.addEventListener('wheel', (e) => {
      this.scrollDelta = e.deltaY;
      this.emit('scroll', e.deltaY);
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.target;
      if (!this.isPointerLocked) {
        this.keys.clear();
        this.emit('pointerlocklost');
      }
    });
  }

  requestPointerLock(): void {
    this.target.requestPointerLock();
  }

  exitPointerLock(): void {
    if (this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  update(): void {
    this.keysJustPressed.clear();
    for (const key of this.keys) {
      if (!this.previousKeys.has(key)) {
        this.keysJustPressed.add(key);
      }
    }
    this.previousKeys = new Set(this.keys);
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.scrollDelta = 0;
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  dispose(): void {
    this.removeAllListeners();
    this.keys.clear();
    this.keysJustPressed.clear();
  }
}