import { EventEmitter } from '../utils/EventEmitter';

export interface HUDData {
  health: number;
  maxHealth: number;
  sanity: number;
  maxSanity: number;
  hotbar: ({ id: string; name: string; icon: string; uses: number } | null)[];
  activeSlot: number;
  detection: number;
  biomeName: string;
  depth: number;
  time: number;
  hasAnomaly: boolean;
  anomalyWarnings: string[];
  interactionPrompt: string | null;
}

const STYLES = `
#threshold-hud {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 5000;
  pointer-events: none;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #c8c8d0;
}
#threshold-hud.hidden { display: none; }

/* Crosshair */
.threshold-crosshair {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 24px; height: 24px;
}
.threshold-crosshair::before,
.threshold-crosshair::after {
  content: '';
  position: absolute;
  background: rgba(200, 200, 220, 0.6);
}
.threshold-crosshair::before {
  top: 50%; left: 0; right: 0;
  height: 1px;
  transform: translateY(-50%);
}
.threshold-crosshair::after {
  left: 50%; top: 0; bottom: 0;
  width: 1px;
  transform: translateX(-50%);
}
.threshold-crosshair-dot {
  position: absolute;
  top: 50%; left: 50%;
  width: 2px; height: 2px;
  transform: translate(-50%, -50%);
  background: rgba(200, 200, 220, 0.3);
  border-radius: 50%;
}

/* Health & Sanity */
.threshold-stats-left {
  position: absolute;
  left: 1.5em;
  bottom: 8em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  align-items: flex-start;
}

.threshold-stat-bar {
  width: 1.4em;
  height: 12em;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(200, 200, 220, 0.1);
  position: relative;
  border-radius: 2px;
  overflow: hidden;
}
.threshold-stat-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transition: height 0.3s ease, background 0.3s ease;
  border-radius: 1px;
}
.threshold-stat-fill.health { background: linear-gradient(to top, #5a2a2a, #c84a4a); }
.threshold-stat-fill.sanity { background: linear-gradient(to top, #2a2a5a, #6a6aca); }

.threshold-stat-label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6a6a7a;
  text-align: center;
  width: 100%;
  margin-top: 0.3em;
}

.threshold-stat-value {
  font-size: 0.75rem;
  text-align: center;
  width: 100%;
  color: #a0a0b0;
  font-variant-numeric: tabular-nums;
}

/* Hotbar */
.threshold-hotbar {
  position: absolute;
  bottom: 2em;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.3em;
  z-index: 1;
}
.threshold-hotbar-slot {
  width: 3.4em;
  height: 3.4em;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(200, 200, 220, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  pointer-events: auto;
  cursor: pointer;
  position: relative;
}
.threshold-hotbar-slot.active {
  border-color: rgba(200, 200, 255, 0.4);
  background: rgba(200, 200, 255, 0.06);
  box-shadow: 0 0 12px rgba(200, 200, 255, 0.1);
}
.threshold-hotbar-slot.empty {
  opacity: 0.3;
}
.threshold-hotbar-key {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 0.6rem;
  color: #5a5a6a;
  letter-spacing: 0;
}
.threshold-hotbar-icon {
  font-size: 1.1rem;
  margin-bottom: 0.1em;
}
.threshold-hotbar-name {
  font-size: 0.55rem;
  color: #8a8a9a;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 0.2em;
}
.threshold-hotbar-uses {
  font-size: 0.55rem;
  color: #6a6a7a;
}

/* Detection meter */
.threshold-detection {
  position: absolute;
  right: 1.5em;
  bottom: 8em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3em;
}
.threshold-detection-bar {
  width: 1em;
  height: 10em;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(200, 200, 220, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.threshold-detection-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, #3a6a3a, #8aca3a, #caca3a, #ca6a3a, #ca3a3a);
  transition: height 0.3s ease;
  border-radius: 1px;
}
.threshold-detection-icon {
  font-size: 0.8rem;
  color: #6a6a7a;
}

/* Biome info */
.threshold-biome-info {
  position: absolute;
  top: 1.5em;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  transition: opacity 0.5s ease;
}
.threshold-biome-name {
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  color: #a0a0b0;
  font-weight: 400;
}
.threshold-biome-depth {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: #5a5a6a;
  margin-top: 0.2em;
}

/* Anomaly warning */
.threshold-anomaly-warning {
  position: absolute;
  top: 4em;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.threshold-anomaly-warning.visible {
  opacity: 1;
}
.threshold-anomaly-warning-text {
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ca4a4a;
  text-shadow: 0 0 20px rgba(202, 74, 74, 0.4);
  animation: anomaly-pulse 1.5s ease-in-out infinite;
}
@keyframes anomaly-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* Interaction prompt */
.threshold-interaction-prompt {
  position: absolute;
  bottom: 6.5em;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.threshold-interaction-prompt.visible {
  opacity: 1;
}
.threshold-interaction-prompt-text {
  font-size: 0.8rem;
  color: #a0a0b0;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.4em 1em;
  border: 1px solid rgba(200, 200, 220, 0.1);
  border-radius: 3px;
}
.threshold-interaction-prompt-key {
  display: inline-block;
  background: rgba(200, 200, 220, 0.08);
  border: 1px solid rgba(200, 200, 220, 0.15);
  padding: 0.1em 0.4em;
  margin: 0 0.2em;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: 600;
}

/* Minimap */
.threshold-minimap {
  position: absolute;
  top: 5em;
  right: 1em;
  width: 120px;
  height: 120px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(200, 200, 220, 0.1);
  border-radius: 2px;
  overflow: hidden;
}
.threshold-minimap-label {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.5rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #4a4a5a;
}
.threshold-minimap-player {
  position: absolute;
  top: 50%; left: 50%;
  width: 4px; height: 4px;
  background: #8acaca;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(138, 202, 202, 0.5);
}

/* Notifications */
.threshold-notifications {
  position: absolute;
  top: 5em;
  right: 10em;
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  min-width: 200px;
}
.threshold-notification {
  font-size: 0.75rem;
  padding: 0.4em 0.8em;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.6);
  border-left: 2px solid #6a6a7a;
  animation: notification-slide 0.3s ease-out;
  transition: opacity 0.3s ease;
}
.threshold-notification.info { border-left-color: #4a7aca; }
.threshold-notification.warning { border-left-color: #caca4a; }
.threshold-notification.danger { border-left-color: #ca4a4a; }
.threshold-notification.success { border-left-color: #4aca4a; }
@keyframes notification-slide {
  0% { opacity: 0; transform: translateX(20px); }
  100% { opacity: 1; transform: translateX(0); }
}
`;

export class HUD extends EventEmitter {
  private container: HTMLDivElement;
  private elements: Record<string, HTMLElement> = {};
  private notificationTimers: Map<string, number> = new Map();
  constructor(parent: HTMLElement) {
    super();

    if (!document.getElementById('threshold-hud-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'threshold-hud-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    this.container = document.createElement('div');
    this.container.id = 'threshold-hud';
    this.container.classList.add('hidden');

    this.buildCrosshair();
    this.buildStats();
    this.buildHotbar();
    this.buildDetection();
    this.buildBiomeInfo();
    this.buildAnomalyWarning();
    this.buildInteractionPrompt();
    this.buildMinimap();
    this.buildNotifications();

    parent.appendChild(this.container);
  }

  private buildCrosshair(): void {
    const crosshair = document.createElement('div');
    crosshair.className = 'threshold-crosshair';
    const dot = document.createElement('div');
    dot.className = 'threshold-crosshair-dot';
    crosshair.appendChild(dot);
    this.container.appendChild(crosshair);
    this.elements.crosshair = crosshair;
  }

  private buildStats(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'threshold-stats-left';

    // Health
    const healthBar = document.createElement('div');
    healthBar.className = 'threshold-stat-bar';
    const healthFill = document.createElement('div');
    healthFill.className = 'threshold-stat-fill health';
    healthFill.style.height = '100%';
    healthBar.appendChild(healthFill);
    wrapper.appendChild(healthBar);

    const healthVal = document.createElement('div');
    healthVal.className = 'threshold-stat-value';
    healthVal.textContent = '100';
    wrapper.appendChild(healthVal);

    const healthLabel = document.createElement('div');
    healthLabel.className = 'threshold-stat-label';
    healthLabel.textContent = 'HP';
    wrapper.appendChild(healthLabel);

    // Sanity
    const sanityBar = document.createElement('div');
    sanityBar.className = 'threshold-stat-bar';
    const sanityFill = document.createElement('div');
    sanityFill.className = 'threshold-stat-fill sanity';
    sanityFill.style.height = '100%';
    sanityBar.appendChild(sanityFill);
    wrapper.appendChild(sanityBar);

    const sanityVal = document.createElement('div');
    sanityVal.className = 'threshold-stat-value';
    sanityVal.textContent = '100';
    wrapper.appendChild(sanityVal);

    const sanityLabel = document.createElement('div');
    sanityLabel.className = 'threshold-stat-label';
    sanityLabel.textContent = 'SAN';
    wrapper.appendChild(sanityLabel);

    this.container.appendChild(wrapper);
    this.elements.healthFill = healthFill;
    this.elements.healthValue = healthVal;
    this.elements.sanityFill = sanityFill;
    this.elements.sanityValue = sanityVal;
  }

  private buildHotbar(): void {
    const hotbar = document.createElement('div');
    hotbar.className = 'threshold-hotbar';

    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'threshold-hotbar-slot empty';

      const keyLabel = document.createElement('div');
      keyLabel.className = 'threshold-hotbar-key';
      keyLabel.textContent = String(i + 1);
      slot.appendChild(keyLabel);

      const icon = document.createElement('div');
      icon.className = 'threshold-hotbar-icon';
      slot.appendChild(icon);

      const name = document.createElement('div');
      name.className = 'threshold-hotbar-name';
      slot.appendChild(name);

      const uses = document.createElement('div');
      uses.className = 'threshold-hotbar-uses';
      slot.appendChild(uses);

      this.container.appendChild(slot);
      this.elements[`hotbar-slot-${i}`] = slot;
      this.elements[`hotbar-icon-${i}`] = icon;
      this.elements[`hotbar-name-${i}`] = name;
      this.elements[`hotbar-uses-${i}`] = uses;
    }
  }

  private buildDetection(): void {
    const detection = document.createElement('div');
    detection.className = 'threshold-detection';

    const bar = document.createElement('div');
    bar.className = 'threshold-detection-bar';
    const fill = document.createElement('div');
    fill.className = 'threshold-detection-fill';
    fill.style.height = '0%';
    bar.appendChild(fill);
    detection.appendChild(bar);

    const icon = document.createElement('div');
    icon.className = 'threshold-detection-icon';
    icon.textContent = '\u25C9';
    detection.appendChild(icon);

    this.container.appendChild(detection);
    this.elements.detectionFill = fill;
  }

  private buildBiomeInfo(): void {
    const info = document.createElement('div');
    info.className = 'threshold-biome-info';

    const name = document.createElement('div');
    name.className = 'threshold-biome-name';
    info.appendChild(name);

    const depth = document.createElement('div');
    depth.className = 'threshold-biome-depth';
    info.appendChild(depth);

    this.container.appendChild(info);
    this.elements.biomeName = name;
    this.elements.biomeDepth = depth;
  }

  private buildAnomalyWarning(): void {
    const warning = document.createElement('div');
    warning.className = 'threshold-anomaly-warning';

    const text = document.createElement('div');
    text.className = 'threshold-anomaly-warning-text';
    warning.appendChild(text);

    this.container.appendChild(warning);
    this.elements.anomalyWarning = warning;
    this.elements.anomalyWarningText = text;
  }

  private buildInteractionPrompt(): void {
    const prompt = document.createElement('div');
    prompt.className = 'threshold-interaction-prompt';

    const text = document.createElement('div');
    text.className = 'threshold-interaction-prompt-text';
    prompt.appendChild(text);

    this.container.appendChild(prompt);
    this.elements.interactionPrompt = prompt;
    this.elements.interactionPromptText = text;
  }

  private buildMinimap(): void {
    const map = document.createElement('div');
    map.className = 'threshold-minimap';

    const player = document.createElement('div');
    player.className = 'threshold-minimap-player';
    map.appendChild(player);

    const label = document.createElement('div');
    label.className = 'threshold-minimap-label';
    label.textContent = 'MAP';
    map.appendChild(label);

    this.container.appendChild(map);
    this.elements.minimap = map;
  }

  private buildNotifications(): void {
    const area = document.createElement('div');
    area.className = 'threshold-notifications';
    this.container.appendChild(area);
    this.elements.notificationArea = area;
  }

  show(): void {
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.container.classList.add('hidden');
  }

  setData(data: HUDData): void {
    this.updateStats(data.health, data.maxHealth, data.sanity, data.maxSanity);
    this.updateHotbar(data.hotbar, data.activeSlot);
    this.setDetection(data.detection);
    this.elements.biomeName.textContent = data.biomeName;
    this.elements.biomeDepth.textContent = `DEPTH ${data.depth}`;
    this.setInteractionPrompt(data.interactionPrompt);

    if (data.hasAnomaly && data.anomalyWarnings.length > 0) {
      this.setAnomalyWarning(data.anomalyWarnings[data.anomalyWarnings.length - 1]);
    } else {
      this.setAnomalyWarning(null);
    }
  }

  setDetection(detection: number): void {
    const clamped = Math.max(0, Math.min(1, detection));
    if (this.elements.detectionFill) {
      this.elements.detectionFill.style.height = `${clamped * 100}%`;
    }
  }

  setAnomalyWarning(text: string | null): void {
    if (!this.elements.anomalyWarning) return;
    if (text) {
      this.elements.anomalyWarning.classList.add('visible');
      this.elements.anomalyWarningText.textContent = text;
    } else {
      this.elements.anomalyWarning.classList.remove('visible');
    }
  }

  setInteractionPrompt(text: string | null): void {
    if (!this.elements.interactionPrompt) return;
    if (text) {
      this.elements.interactionPrompt.classList.add('visible');
      this.elements.interactionPromptText.innerHTML = `[<span class="threshold-interaction-prompt-key">E</span>] ${text}`;
    } else {
      this.elements.interactionPrompt.classList.remove('visible');
    }
  }

  updateHotbar(hotbar: HUDData['hotbar'], activeSlot: number): void {
    for (let i = 0; i < 6; i++) {
      const slot = this.elements[`hotbar-slot-${i}`];
      const icon = this.elements[`hotbar-icon-${i}`];
      const name = this.elements[`hotbar-name-${i}`];
      const uses = this.elements[`hotbar-uses-${i}`];
      if (!slot || !icon || !name || !uses) continue;

      const item = hotbar[i];
      slot.classList.toggle('active', i === activeSlot);
      slot.classList.toggle('empty', !item);

      if (item) {
        icon.textContent = item.icon;
        name.textContent = item.name;
        uses.textContent = item.uses > 0 ? `${item.uses}` : '';
      } else {
        icon.textContent = '';
        name.textContent = '';
        uses.textContent = '';
      }
    }
  }

  updateStats(health: number, _maxHealth: number, sanity: number, _maxSanity: number): void {
    if (this.elements.healthFill) {
      this.elements.healthFill.style.height = `${Math.max(0, Math.min(100, health))}%`;
    }
    if (this.elements.healthValue) {
      this.elements.healthValue.textContent = `${Math.round(health)}`;
    }
    if (this.elements.sanityFill) {
      this.elements.sanityFill.style.height = `${Math.max(0, Math.min(100, sanity))}%`;
    }
    if (this.elements.sanityValue) {
      this.elements.sanityValue.textContent = `${Math.round(sanity)}`;
    }
  }

  showNotification(text: string, type: 'info' | 'warning' | 'danger' | 'success'): void {
    const area = this.elements.notificationArea;
    if (!area) return;

    const el = document.createElement('div');
    el.className = `threshold-notification ${type}`;
    el.textContent = text;
    area.appendChild(el);

    const timerId = window.setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        el.remove();
        this.notificationTimers.delete(text);
      }, 300);
    }, 4000);
    this.notificationTimers.set(text, timerId);
  }

  dispose(): void {
    for (const timerId of this.notificationTimers.values()) {
      clearTimeout(timerId);
    }
    this.notificationTimers.clear();
    this.hide();
    this.container.remove();
    this.removeAllListeners();
  }
}
