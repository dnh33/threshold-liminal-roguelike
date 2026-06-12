import { EventEmitter } from '../utils/EventEmitter';
import { Settings } from '../utils/Settings';

export class SettingsScreen extends EventEmitter {
  private container: HTMLDivElement;
  private settings: Settings;
  private isVisible = false;

  constructor(parent: HTMLElement, settings: Settings) {
    super();
    this.settings = settings;
    this.container = document.createElement('div');
    this.container.id = 'settings-screen';
    this.container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,10,15,0.95);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:100;color:#fff;font-family:system-ui,sans-serif;';
    this.buildUI();
    parent.appendChild(this.container);
  }

  private buildUI(): void {
    const title = document.createElement('h2');
    title.textContent = 'SETTINGS';
    title.style.cssText = 'font-size:2rem;letter-spacing:0.2em;font-weight:300;margin-bottom:2rem;color:#ffffffaa;';
    this.container.appendChild(title);

    const groups: { label: string; items: { key: string; label: string; min?: number; max?: number; step?: number; type?: string }[] }[] = [
      {
        label: 'Audio',
        items: [
          { key: 'audio.master', label: 'Master Volume', min: 0, max: 1, step: 0.1 },
          { key: 'audio.sfx', label: 'SFX Volume', min: 0, max: 1, step: 0.1 },
          { key: 'audio.music', label: 'Music Volume', min: 0, max: 1, step: 0.1 },
          { key: 'audio.ambient', label: 'Ambient Volume', min: 0, max: 1, step: 0.1 },
        ],
      },
      {
        label: 'Graphics',
        items: [
          { key: 'graphics.fov', label: 'Field of View', min: 70, max: 110, step: 1 },
        ],
      },
      {
        label: 'Controls',
        items: [
          { key: 'controls.mouseSensitivity', label: 'Mouse Sensitivity', min: 0.1, max: 2, step: 0.1 },
        ],
      },
      {
        label: 'Accessibility',
        items: [
          { key: 'accessibility.vignette', label: 'Vignette Effect', type: 'checkbox' },
          { key: 'accessibility.subtitles', label: 'Subtitles', type: 'checkbox' },
          { key: 'accessibility.highContrast', label: 'High Contrast', type: 'checkbox' },
        ],
      },
    ];

    for (const group of groups) {
      const groupEl = document.createElement('div');
      groupEl.style.cssText = 'margin-bottom:1.5rem;width:400px;max-width:90vw;';
      const groupLabel = document.createElement('h3');
      groupLabel.textContent = group.label;
      groupLabel.style.cssText = 'font-size:1rem;color:#ffffff88;margin-bottom:0.5rem;letter-spacing:0.1em;';
      groupEl.appendChild(groupLabel);

      for (const item of group.items) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;';
        const label = document.createElement('span');
        label.textContent = item.label;
        label.style.cssText = 'font-size:0.85rem;color:#ffffffcc;';
        row.appendChild(label);

        if (item.type === 'checkbox') {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = this.settings.get(item.key, false);
          checkbox.style.cssText = 'width:18px;height:18px;accent-color:#ffffff88;cursor:pointer;';
          checkbox.addEventListener('change', () => {
            this.settings.set(item.key, checkbox.checked);
            this.emit('setting_changed', { key: item.key, value: checkbox.checked });
          });
          row.appendChild(checkbox);
        } else {
          const valueSpan = document.createElement('span');
          valueSpan.style.cssText = 'font-size:0.8rem;color:#ffffff88;min-width:3rem;text-align:right;';
          const currentVal = this.settings.get(item.key, item.min ?? 0);
          valueSpan.textContent = typeof currentVal === 'number' ? currentVal.toFixed((item.step ?? 1) >= 1 ? 0 : 1) : String(currentVal);

          const slider = document.createElement('input');
          slider.type = 'range';
          slider.min = String(item.min ?? 0);
          slider.max = String(item.max ?? 1);
          slider.step = String(item.step ?? 0.1);
          slider.value = String(currentVal);
          slider.style.cssText = 'width:150px;accent-color:#ffffff88;cursor:pointer;';
          slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            this.settings.set(item.key, val);
            valueSpan.textContent = val.toFixed((item.step ?? 1) >= 1 ? 0 : 1);
            this.emit('setting_changed', { key: item.key, value: val });
          });
          row.appendChild(slider);
          row.appendChild(valueSpan);
        }
        groupEl.appendChild(row);
      }
      this.container.appendChild(groupEl);
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Back';
    closeBtn.style.cssText = 'margin-top:2rem;padding:0.8rem 2rem;background:none;border:1px solid #ffffff44;color:#ffffffcc;border-radius:4px;cursor:pointer;font-size:1rem;transition:all 0.2s;';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.borderColor = '#ffffff88'; closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.borderColor = '#ffffff44'; closeBtn.style.color = '#ffffffcc'; });
    closeBtn.addEventListener('click', () => this.hide());
    this.container.appendChild(closeBtn);
  }

  show(): void { this.isVisible = true; this.container.style.display = 'flex'; }
  hide(): void { this.isVisible = false; this.container.style.display = 'none'; }
  dispose(): void { this.container.remove(); this.removeAllListeners(); }
}
