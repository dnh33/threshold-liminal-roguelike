type SettingsData = Record<string, any>;

const DEFAULT_SETTINGS: SettingsData = {
  'graphics.antialias': true,
  'graphics.shadows': true,
  'graphics.postprocessing': true,
  'graphics.fov': 75,
  'graphics.quality': 'high',
  'audio.master': 1.0,
  'audio.sfx': 1.0,
  'audio.music': 0.7,
  'audio.ambient': 0.8,
  'controls.mouseSensitivity': 1.0,
  'controls.invertY': false,
  'controls.headBob': true,
  'accessibility.vignette': true,
  'accessibility.subtitles': true,
  'accessibility.highContrast': false,
  'accessibility.colorblindMode': 'none',
};

export class Settings {
  private data: SettingsData = { ...DEFAULT_SETTINGS };
  private storageKey = 'threshold-settings';

  async load(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.data = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.data = { ...DEFAULT_SETTINGS };
    }
  }

  async save(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch {}
  }

  get<T>(key: string, defaultValue?: T): T {
    return (key in this.data ? this.data[key] : defaultValue) as T;
  }

  set<T>(key: string, value: T): void {
    this.data[key] = value;
    this.save();
  }

  reset(): void {
    this.data = { ...DEFAULT_SETTINGS };
    this.save();
  }
}