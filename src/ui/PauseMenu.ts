import { EventEmitter } from '../utils/EventEmitter';

export interface PauseSettings {
  master: number;
  sfx: number;
  music: number;
  ambient: number;
  fov: number;
  quality: string;
  shadows: boolean;
  mouseSensitivity: number;
  invertY: boolean;
  vignette: boolean;
  subtitles: boolean;
  highContrast: boolean;
  colorblindMode: string;
}

const STYLES = `
#threshold-pause {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 8000;
  background: rgba(5, 5, 10, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #c8c8d0;
  user-select: none;
}
#threshold-pause.hidden { display: none; }

.threshold-pause-panel {
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(200, 200, 220, 0.1);
  padding: 2em 3em;
  min-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  animation: pause-enter 0.2s ease-out;
}
@keyframes pause-enter {
  0% { opacity: 0; transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
}

.threshold-pause-title {
  font-size: 1.2rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #a0a0b0;
  text-align: center;
  margin-bottom: 1.5em;
  font-weight: 300;
}

.threshold-pause-buttons {
  display: flex;
  justify-content: center;
  gap: 0.8em;
  margin-bottom: 1.5em;
}

.threshold-pause-btn {
  background: rgba(200, 200, 220, 0.05);
  border: 1px solid rgba(200, 200, 220, 0.12);
  color: #a0a0b0;
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  padding: 0.5em 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}
.threshold-pause-btn:hover {
  color: #f0f0f8;
  border-color: rgba(200, 200, 255, 0.3);
  background: rgba(200, 200, 255, 0.04);
}

/* Settings sections */
.threshold-settings-section {
  margin-top: 1em;
  padding-top: 1em;
  border-top: 1px solid rgba(200, 200, 220, 0.06);
}
.threshold-settings-section-title {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #5a5a6a;
  margin-bottom: 0.8em;
}

.threshold-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35em 0;
  gap: 1em;
}
.threshold-setting-label {
  font-size: 0.8rem;
  color: #8a8a9a;
  flex-shrink: 0;
}

.threshold-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 140px;
  height: 3px;
  background: rgba(200, 200, 220, 0.15);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.threshold-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #8a8a9a;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}
.threshold-slider::-webkit-slider-thumb:hover {
  background: #c8c8d0;
}
.threshold-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #8a8a9a;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}
.threshold-slider-value {
  font-size: 0.75rem;
  color: #6a6a7a;
  min-width: 2.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.threshold-select {
  background: rgba(200, 200, 220, 0.06);
  border: 1px solid rgba(200, 200, 220, 0.12);
  color: #a0a0b0;
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.3em 0.6em;
  cursor: pointer;
  outline: none;
  min-width: 100px;
}
.threshold-select:hover {
  border-color: rgba(200, 200, 255, 0.25);
}
.threshold-select option {
  background: #1a1a22;
  color: #c8c8d0;
}

.threshold-toggle {
  position: relative;
  width: 36px;
  height: 18px;
  background: rgba(200, 200, 220, 0.12);
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.threshold-toggle.active {
  background: rgba(138, 202, 202, 0.3);
}
.threshold-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #6a6a7a;
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}
.threshold-toggle.active::after {
  transform: translateX(18px);
  background: #8acaca;
}
`;

export class PauseMenu extends EventEmitter {
  private container: HTMLDivElement;
  private settings: PauseSettings;
  private sliders: Record<string, HTMLInputElement> = {};
  private toggles: Record<string, HTMLDivElement> = {};
  private selects: Record<string, HTMLSelectElement> = {};

  constructor(parent: HTMLElement) {
    super();

    if (!document.getElementById('threshold-pause-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'threshold-pause-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    this.settings = this.getDefaultSettings();

    this.container = document.createElement('div');
    this.container.id = 'threshold-pause';
    this.container.classList.add('hidden');

    const panel = document.createElement('div');
    panel.className = 'threshold-pause-panel';

    // Title
    const title = document.createElement('div');
    title.className = 'threshold-pause-title';
    title.textContent = 'Paused';
    panel.appendChild(title);

    // Action buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'threshold-pause-buttons';

    const btnResume = this.createButton('Resume', () => this.emit('resume'));
    const btnCodex = this.createButton('Codex', () => this.emit('open_codex'));
    const btnQuit = this.createButton('Quit to Menu', () => this.emit('quit_to_menu'));
    btnRow.appendChild(btnResume);
    btnRow.appendChild(btnCodex);
    btnRow.appendChild(btnQuit);
    panel.appendChild(btnRow);

    // Audio section
    panel.appendChild(this.buildSection('Audio', [
      this.buildSlider('master', 'Master Volume', 0, 100, 1),
      this.buildSlider('sfx', 'SFX Volume', 0, 100, 1),
      this.buildSlider('music', 'Music Volume', 0, 100, 1),
      this.buildSlider('ambient', 'Ambient Volume', 0, 100, 1),
    ]));

    // Graphics section
    panel.appendChild(this.buildSection('Graphics', [
      this.buildSlider('fov', 'Field of View', 60, 120, 1),
      this.buildSelect('quality', 'Quality', ['low', 'medium', 'high', 'ultra']),
      this.buildToggle('shadows', 'Shadows'),
    ]));

    // Controls section
    panel.appendChild(this.buildSection('Controls', [
      this.buildSlider('mouseSensitivity', 'Sensitivity', 0.1, 5, 0.1),
      this.buildToggle('invertY', 'Invert Y-Axis'),
    ]));

    // Accessibility section
    panel.appendChild(this.buildSection('Accessibility', [
      this.buildToggle('vignette', 'Vignette Effect'),
      this.buildToggle('subtitles', 'Subtitles'),
      this.buildToggle('highContrast', 'High Contrast'),
      this.buildSelect('colorblindMode', 'Colorblind Mode', ['none', 'deuteranopia', 'protanopia', 'tritanopia']),
    ]));

    this.container.appendChild(panel);
    parent.appendChild(this.container);
  }

  private getDefaultSettings(): PauseSettings {
    return {
      master: 100, sfx: 100, music: 70, ambient: 80,
      fov: 75, quality: 'high', shadows: true,
      mouseSensitivity: 1, invertY: false,
      vignette: true, subtitles: true, highContrast: false, colorblindMode: 'none',
    };
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'threshold-pause-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private buildSection(title: string, rows: HTMLElement[]): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'threshold-settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'threshold-settings-section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    for (const row of rows) {
      section.appendChild(row);
    }

    return section;
  }

  private buildSlider(id: string, label: string, min: number, max: number, step: number): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'threshold-setting-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'threshold-setting-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'threshold-slider';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);

    const value = this.settings[id as keyof PauseSettings];
    input.value = String(typeof value === 'number' ? value : this.getDefaultValue(id));

    const valueEl = document.createElement('div');
    valueEl.className = 'threshold-slider-value';
    valueEl.textContent = input.value;

    input.addEventListener('input', () => {
      valueEl.textContent = input.value;
      const parsed = parseFloat(input.value);
      (this.settings as Record<string, any>)[id] = parsed;
      this.emit('setting_changed', { key: id, value: parsed });
    });

    row.appendChild(input);
    row.appendChild(valueEl);
    this.sliders[id] = input;
    return row;
  }

  private getDefaultValue(id: string): number {
    const defaults: Record<string, number> = {
      master: 100, sfx: 100, music: 70, ambient: 80,
      fov: 75, mouseSensitivity: 1,
    };
    return defaults[id] ?? 0;
  }

  private buildSelect(id: string, label: string, options: string[]): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'threshold-setting-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'threshold-setting-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'threshold-select';

    for (const opt of options) {
      const optEl = document.createElement('option');
      optEl.value = opt;
      optEl.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
      select.appendChild(optEl);
    }

    const currentVal = this.settings[id as keyof PauseSettings];
    if (typeof currentVal === 'string') {
      select.value = currentVal;
    }

    select.addEventListener('change', () => {
      const parsed = id === 'shadows' ? select.value === 'true' : select.value;
      (this.settings as Record<string, any>)[id] = parsed;
      this.emit('setting_changed', { key: id, value: parsed });
    });

    row.appendChild(select);
    this.selects[id] = select;
    return row;
  }

  private buildToggle(id: string, label: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'threshold-setting-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'threshold-setting-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const toggle = document.createElement('div');
    toggle.className = 'threshold-toggle';

    const currentVal = this.settings[id as keyof PauseSettings];
    if (currentVal === true || currentVal === 'true') {
      toggle.classList.add('active');
    }

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const val = toggle.classList.contains('active');
      (this.settings as Record<string, any>)[id] = val;
      this.emit('setting_changed', { key: id, value: val });
    });

    row.appendChild(toggle);
    this.toggles[id] = toggle;
    return row;
  }

  show(): void {
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.container.classList.add('hidden');
  }

  getSettings(): PauseSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<PauseSettings>): void {
    Object.assign(this.settings, partial);
  }

  dispose(): void {
    this.hide();
    this.container.remove();
    this.removeAllListeners();
  }
}
