import { EventEmitter } from '../utils/EventEmitter';

const STYLES = `
#threshold-main-menu {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 10000;
  background: #0a0a0f;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #c8c8d0;
  overflow: hidden;
  user-select: none;
}
#threshold-main-menu.hidden { display: none; }

/* Particle background */
.threshold-menu-particles {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
}
.threshold-menu-particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(200, 200, 220, 0.4);
  border-radius: 50%;
  animation: float-particle linear infinite;
}
@keyframes float-particle {
  0% { transform: translateY(100vh) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-10vh) translateX(calc(var(--drift) * 100px)); opacity: 0; }
}

/* Title */
.threshold-menu-title {
  font-size: 4.5rem;
  font-weight: 300;
  letter-spacing: 0.35em;
  color: #f0f0f8;
  text-shadow: 0 0 40px rgba(200, 200, 255, 0.15), 0 0 80px rgba(200, 200, 255, 0.08);
  margin-bottom: 0.2em;
  z-index: 1;
  animation: title-fade-in 2s ease-out;
}
@keyframes title-fade-in {
  0% { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.threshold-menu-subtitle {
  font-size: 0.85rem;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  color: #6a6a7a;
  margin-bottom: 3em;
  z-index: 1;
  font-weight: 300;
  animation: subtitle-fade-in 2s ease-out 0.3s both;
}
@keyframes subtitle-fade-in {
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Menu items */
.threshold-menu-items {
  display: flex;
  flex-direction: column;
  gap: 0.6em;
  z-index: 1;
  animation: menu-items-fade-in 2s ease-out 0.6s both;
}
@keyframes menu-items-fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

.threshold-menu-btn {
  background: none;
  border: 1px solid rgba(200, 200, 220, 0.1);
  color: #a0a0b0;
  font-family: inherit;
  font-size: 1rem;
  letter-spacing: 0.15em;
  padding: 0.75em 2.5em;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  text-transform: uppercase;
  min-width: 260px;
  text-align: center;
}
.threshold-menu-btn:hover {
  color: #f0f0f8;
  border-color: rgba(200, 200, 255, 0.3);
  background: rgba(200, 200, 255, 0.04);
  text-shadow: 0 0 20px rgba(200, 200, 255, 0.2);
}
.threshold-menu-btn:active {
  transform: scale(0.98);
}
.threshold-menu-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  width: 0;
  height: 1px;
  background: rgba(200, 200, 255, 0.3);
  transition: width 0.3s ease, left 0.3s ease;
}
.threshold-menu-btn:hover::after {
  width: 60%;
  left: 20%;
}
.threshold-menu-btn.continue-hidden {
  display: none;
}

/* Decorative line */
.threshold-menu-divider {
  width: 1px;
  height: 2em;
  background: rgba(200, 200, 220, 0.1);
  z-index: 1;
  animation: divider-fade-in 2s ease-out 0.9s both;
}
@keyframes divider-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Version */
.threshold-menu-version {
  position: absolute;
  bottom: 1.5em;
  font-size: 0.75rem;
  color: #4a4a5a;
  letter-spacing: 0.1em;
  z-index: 1;
}
`;

export class MainMenu extends EventEmitter {
  private container: HTMLDivElement;
  private particles: HTMLDivElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();

  constructor(parent: HTMLElement) {
    super();

    if (!document.getElementById('threshold-menu-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'threshold-menu-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    this.container = document.createElement('div');
    this.container.id = 'threshold-main-menu';
    this.container.classList.add('hidden');

    // Particles
    this.particles = document.createElement('div');
    this.particles.className = 'threshold-menu-particles';
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'threshold-menu-particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${8 + Math.random() * 12}s`;
      p.style.animationDelay = `${Math.random() * 10}s`;
      p.style.setProperty('--drift', `${(Math.random() - 0.5) * 2}`);
      p.style.width = p.style.height = `${1 + Math.random() * 2}px`;
      this.particles.appendChild(p);
    }
    this.container.appendChild(this.particles);

    // Title
    const title = document.createElement('div');
    title.className = 'threshold-menu-title';
    title.textContent = 'THRESHOLD';
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'threshold-menu-subtitle';
    subtitle.textContent = 'A Liminal Space Roguelike';
    this.container.appendChild(subtitle);

    // Menu items
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'threshold-menu-items';

    const items = [
      { id: 'new_run', label: 'New Run' },
      { id: 'continue', label: 'Continue', extraClass: 'continue-hidden' },
      { id: 'codex', label: 'Codex' },
      { id: 'settings', label: 'Settings' },
      { id: 'credits', label: 'Credits' },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = `threshold-menu-btn${item.extraClass ? ' ' + item.extraClass : ''}`;
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        this.emit('menu_select', item.id);
      });
      itemsContainer.appendChild(btn);
      this.buttons.set(item.id, btn);
    }

    this.container.appendChild(itemsContainer);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'threshold-menu-divider';
    this.container.appendChild(divider);

    // Version
    const version = document.createElement('div');
    version.className = 'threshold-menu-version';
    version.textContent = 'v0.1.0';
    this.container.appendChild(version);

    parent.appendChild(this.container);
  }

  show(): void {
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.container.classList.add('hidden');
  }

  setContinueVisible(visible: boolean): void {
    const btn = this.buttons.get('continue');
    if (btn) {
      btn.classList.toggle('continue-hidden', !visible);
    }
  }

  dispose(): void {
    this.hide();
    this.container.remove();
    this.removeAllListeners();
  }
}
