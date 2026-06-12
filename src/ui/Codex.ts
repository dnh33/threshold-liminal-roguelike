import { EventEmitter } from '../utils/EventEmitter';

export interface CodexEntry {
  id: string;
  name: string;
  description: string;
  flavor: string;
  discovered: boolean;
  icon: string;
}

export type CodexTab = 'entities' | 'anomalies' | 'tools' | 'lore';

const TAB_LABELS: Record<CodexTab, string> = {
  entities: 'Entities',
  anomalies: 'Anomalies',
  tools: 'Tools',
  lore: 'Lore',
};

const DEFAULT_ENTRIES: Record<CodexTab, CodexEntry[]> = {
  entities: [
    { id: 'entity_patrol', name: 'Patrol', description: 'A wandering entity that follows predictable routes.', flavor: 'It walks the same halls it walked in life. Repetition is all that remains.', discovered: false, icon: '\u25B3' },
    { id: 'entity_ambusher', name: 'Ambusher', description: 'Lies dormant until prey passes, then strikes.', flavor: 'Stillness is not safety. Some things are patient.', discovered: false, icon: '\u25BD' },
    { id: 'entity_sound_hunter', name: 'Sound Hunter', description: 'Attracted to noise. Move quietly or run.', flavor: 'The void listens. Every footstep is an invitation.', discovered: false, icon: '\u25C7' },
    { id: 'entity_stalker', name: 'Stalker', description: 'Follows from a distance, never engaging until cornered.', flavor: 'You feel its gaze before you see it. By then, it is already too late.', discovered: false, icon: '\u25C8' },
    { id: 'entity_mimic', name: 'Mimic', description: 'Copies the appearance of familiar objects.', flavor: 'Trust nothing. The threshold wears many masks.', discovered: false, icon: '\u25A6' },
    { id: 'entity_sentry', name: 'Sentry', description: 'Stationary guard entity with a wide detection arc.', flavor: 'It does not sleep. It does not tire. It simply waits.', discovered: false, icon: '\u25A3' },
  ],
  anomalies: [
    { id: 'anomaly_echoing_halls', name: 'Echoing Halls', description: 'Sounds repeat and distort. Spatial awareness is compromised.', flavor: 'The walls remember every sound ever made within them.', discovered: false, icon: '\u2248' },
    { id: 'anomaly_flicker', name: 'Flicker', description: 'Lights pulse erratically. Visibility is intermittent.', flavor: 'Between moments of light, things move that should not.', discovered: false, icon: '\u26A1' },
    { id: 'anomaly_thermal_inversion', name: 'Thermal Inversion', description: 'Temperature gradients invert. Hot becomes cold.', flavor: 'The threshold breathes. Its breath is neither warm nor cold.', discovered: false, icon: '\u2603' },
    { id: 'anomaly_static', name: 'Static', description: 'Visual noise fills the air like television snow.', flavor: 'Reality is a signal. Sometimes it degrades.', discovered: false, icon: '\u2744' },
    { id: 'anomaly_gravity_well', name: 'Gravity Well', description: 'Localized gravity distortions alter movement.', flavor: 'The threshold has its own physics. They do not obey our laws.', discovered: false, icon: '\u2299' },
    { id: 'anomaly_temporal_loop', name: 'Temporal Loop', description: 'Time loops within a bounded area.', flavor: 'Some corridors are longer on the inside. Some are longer in time.', discovered: false, icon: '\u21BB' },
    { id: 'anomaly_mimic', name: 'Mimic Anomaly', description: 'False copies of items appear, some dangerous.', flavor: 'The threshold learns. It replicates. It hungers.', discovered: false, icon: '\u25A7' },
    { id: 'anomaly_hallucination', name: 'Hallucination', description: 'The mind perceives threats that are not real... and misses those that are.', flavor: 'The first thing the threshold breaks is not your body.', discovered: false, icon: '\u2316' },
    { id: 'anomaly_corrosion', name: 'Corrosion', description: 'Surfaces become unstable and damaging to touch.', flavor: 'Reality decays. The threshold is the rot.', discovered: false, icon: '\u223F' },
    { id: 'anomaly_silence', name: 'Silence', description: 'All sound is absorbed. Entities rely on sight.', flavor: 'The absence of sound is not peace. It is predation.', discovered: false, icon: '\u2205' },
  ],
  tools: [
    { id: 'tool_flashlight', name: 'Flashlight', description: 'Portable light source. Essential in dark biomes.', flavor: 'A beam of certainty in uncertain dark.', discovered: false, icon: '\u2600' },
    { id: 'tool_radio', name: 'Radio', description: 'Detects nearby anomalies via interference.', flavor: 'The static warns of what the eyes cannot see.', discovered: false, icon: '\u2316' },
    { id: 'tool_camera', name: 'Camera', description: 'Documents the threshold. Some entities fear being seen.', flavor: 'To capture an image is to hold a piece of the threshold still.', discovered: false, icon: '\u25A1' },
    { id: 'tool_flare', name: 'Flare', description: 'Temporary bright light. Repels certain entities.', flavor: 'Light is a language the threshold understands as threat.', discovered: false, icon: '\u2728' },
    { id: 'tool_laminar_key', name: 'Laminar Key', description: 'Opens threshold-locked doors and shortcuts.', flavor: 'A key that fits doors that do not exist on any blueprint.', discovered: false, icon: '\u26BF' },
    { id: 'tool_noise_maker', name: 'Noise Maker', description: 'Attracts entities away from your position.', flavor: 'Sometimes the best way through is to let something else be followed.', discovered: false, icon: '\u266B' },
  ],
  lore: [
    { id: 'lore_origin', name: 'Origin of the Threshold', description: 'The threshold appeared first in abandoned places. Now it spreads.', flavor: 'No one agrees on when it began. Everyone agrees it is growing.', discovered: false, icon: '\u229E' },
    { id: 'lore_first_explorers', name: 'First Explorers', description: 'Those who first mapped the threshold. Most did not return.', flavor: 'Their notes are fragmented, contradictory, and invaluable.', discovered: false, icon: '\u270D' },
    { id: 'lore_the_deep', name: 'The Deep', description: 'Lower depths are older, stranger, less forgiving.', flavor: 'The threshold has layers. The deeper you go, the less it wants to let you leave.', discovered: false, icon: '\u2B07' },
    { id: 'lore_entity_nature', name: 'Nature of Entities', description: 'Entities may be echoes of the lost, or something older.', flavor: 'Are they the victims of the threshold, or are they the threshold itself?', discovered: false, icon: '\u2753' },
    { id: 'lore_extraction', name: 'Extraction Theory', description: 'Exiting requires finding weaknesses in the threshold\'s structure.', flavor: 'The threshold is not a prison. It is a labyrinth. There is a difference.', discovered: false, icon: '\u2B06' },
  ],
};

const STYLES = `
#threshold-codex {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 7000;
  background: rgba(5, 5, 10, 0.88);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #c8c8d0;
  user-select: none;
}
#threshold-codex.hidden { display: none; }

.threshold-codex-panel {
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(200, 200, 220, 0.1);
  width: 640px;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  animation: codex-enter 0.3s ease-out;
}
@keyframes codex-enter {
  0% { opacity: 0; transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
}

.threshold-codex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1em 1.5em;
  border-bottom: 1px solid rgba(200, 200, 220, 0.08);
}
.threshold-codex-title {
  font-size: 1rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #a0a0b0;
  font-weight: 300;
}
.threshold-codex-close {
  background: none;
  border: 1px solid rgba(200, 200, 220, 0.1);
  color: #6a6a7a;
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.3em 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.1em;
}
.threshold-codex-close:hover {
  color: #f0f0f8;
  border-color: rgba(200, 200, 255, 0.3);
}

.threshold-codex-tabs {
  display: flex;
  border-bottom: 1px solid rgba(200, 200, 220, 0.06);
  padding: 0 1em;
}
.threshold-codex-tab {
  background: none;
  border: none;
  color: #5a5a6a;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 0.7em 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
  margin-bottom: -1px;
}
.threshold-codex-tab:hover {
  color: #8a8a9a;
}
.threshold-codex-tab.active {
  color: #c8c8d0;
  border-bottom-color: rgba(200, 200, 220, 0.3);
}

.threshold-codex-content {
  flex: 1;
  overflow-y: auto;
  padding: 1em 1.5em;
  min-height: 200px;
}
.threshold-codex-content::-webkit-scrollbar {
  width: 4px;
}
.threshold-codex-content::-webkit-scrollbar-track {
  background: transparent;
}
.threshold-codex-content::-webkit-scrollbar-thumb {
  background: rgba(200, 200, 220, 0.1);
  border-radius: 2px;
}

.threshold-codex-entry {
  display: flex;
  gap: 0.8em;
  padding: 0.7em 0;
  border-bottom: 1px solid rgba(200, 200, 220, 0.04);
  transition: background 0.2s ease;
  cursor: pointer;
  border-radius: 2px;
  padding: 0.7em 0.5em;
}
.threshold-codex-entry:hover {
  background: rgba(200, 200, 255, 0.03);
}
.threshold-codex-entry.undiscovered {
  opacity: 0.35;
}
.threshold-codex-entry-icon {
  font-size: 1.1rem;
  width: 1.5em;
  text-align: center;
  color: #6a6a7a;
  flex-shrink: 0;
  margin-top: 0.1em;
}
.threshold-codex-entry.undiscovered .threshold-codex-entry-icon {
  color: #3a3a4a;
}
.threshold-codex-entry-info {
  flex: 1;
}
.threshold-codex-entry-name {
  font-size: 0.85rem;
  color: #a0a0b0;
  margin-bottom: 0.15em;
}
.threshold-codex-entry.undiscovered .threshold-codex-entry-name::after {
  content: ' (???)';
  color: #4a4a5a;
  font-style: italic;
}
.threshold-codex-entry-flavor {
  font-size: 0.7rem;
  color: #4a4a5a;
  font-style: italic;
  line-height: 1.4;
}
.threshold-codex-entry-desc {
  font-size: 0.75rem;
  color: #6a6a7a;
  line-height: 1.4;
}

.threshold-codex-detail {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 10, 15, 0.98);
  display: flex;
  flex-direction: column;
  padding: 1.5em;
  animation: detail-enter 0.2s ease-out;
}
@keyframes detail-enter {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
.threshold-codex-detail.hidden { display: none; }

.threshold-codex-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}
.threshold-codex-detail-title {
  font-size: 1.1rem;
  letter-spacing: 0.15em;
  color: #c8c8d0;
}
.threshold-codex-detail-back {
  background: none;
  border: 1px solid rgba(200, 200, 220, 0.1);
  color: #6a6a7a;
  font-family: inherit;
  font-size: 0.75rem;
  padding: 0.3em 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
}
.threshold-codex-detail-back:hover {
  color: #f0f0f8;
  border-color: rgba(200, 200, 255, 0.3);
}
.threshold-codex-detail-body {
  flex: 1;
  overflow-y: auto;
}
.threshold-codex-detail-description {
  font-size: 0.85rem;
  color: #8a8a9a;
  line-height: 1.6;
  margin-bottom: 1em;
}
.threshold-codex-detail-flavor {
  font-size: 0.8rem;
  color: #5a5a6a;
  font-style: italic;
  line-height: 1.5;
  padding-left: 1em;
  border-left: 1px solid rgba(200, 200, 220, 0.08);
}
`;

export class Codex extends EventEmitter {
  private container: HTMLDivElement;
  private isVisible: boolean = false;
  private activeTab: CodexTab = 'entities';
  private entries: Record<CodexTab, CodexEntry[]>;
  private tabElements: Record<string, HTMLButtonElement> = {};
  private contentEl: HTMLElement;
  private detailEl: HTMLElement;

  constructor(parent: HTMLElement) {
    super();

    if (!document.getElementById('threshold-codex-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'threshold-codex-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    this.entries = this.cloneEntries(DEFAULT_ENTRIES);

    this.container = document.createElement('div');
    this.container.id = 'threshold-codex';
    this.container.classList.add('hidden');

    const panel = document.createElement('div');
    panel.className = 'threshold-codex-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'threshold-codex-header';

    const title = document.createElement('div');
    title.className = 'threshold-codex-title';
    title.textContent = 'Codex';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'threshold-codex-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.emit('close'));
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Tabs
    const tabsRow = document.createElement('div');
    tabsRow.className = 'threshold-codex-tabs';

    const tabIds: CodexTab[] = ['entities', 'anomalies', 'tools', 'lore'];
    for (const tabId of tabIds) {
      const tab = document.createElement('button');
      tab.className = `threshold-codex-tab${tabId === this.activeTab ? ' active' : ''}`;
      tab.textContent = TAB_LABELS[tabId];
      tab.dataset.tab = tabId;
      tab.addEventListener('click', () => this.switchTab(tabId));
      tabsRow.appendChild(tab);
      this.tabElements[tabId] = tab;
    }
    panel.appendChild(tabsRow);

    // Content area
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.flex = '1';

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'threshold-codex-content';
    wrapper.appendChild(this.contentEl);

    // Detail view
    this.detailEl = document.createElement('div');
    this.detailEl.className = 'threshold-codex-detail hidden';
    wrapper.appendChild(this.detailEl);

    panel.appendChild(wrapper);
    this.container.appendChild(panel);
    parent.appendChild(this.container);

    this.renderList();
  }

  private cloneEntries(source: Record<CodexTab, CodexEntry[]>): Record<CodexTab, CodexEntry[]> {
    return {
      entities: source.entities.map(e => ({ ...e })),
      anomalies: source.anomalies.map(e => ({ ...e })),
      tools: source.tools.map(e => ({ ...e })),
      lore: source.lore.map(e => ({ ...e })),
    };
  }

  private switchTab(tab: CodexTab): void {
    this.activeTab = tab;
    for (const [id, el] of Object.entries(this.tabElements)) {
      el.classList.toggle('active', id === tab);
    }
    this.detailEl.classList.add('hidden');
    this.renderList();
  }

  private renderList(): void {
    this.contentEl.innerHTML = '';
    this.detailEl.classList.add('hidden');

    for (const entry of this.entries[this.activeTab]) {
      const row = document.createElement('div');
      row.className = `threshold-codex-entry${!entry.discovered ? ' undiscovered' : ''}`;

      const icon = document.createElement('div');
      icon.className = 'threshold-codex-entry-icon';
      icon.textContent = entry.discovered ? entry.icon : '?';
      row.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'threshold-codex-entry-info';

      const name = document.createElement('div');
      name.className = 'threshold-codex-entry-name';
      name.textContent = entry.discovered ? entry.name : 'Unknown';
      info.appendChild(name);

      if (entry.discovered) {
        const flavor = document.createElement('div');
        flavor.className = 'threshold-codex-entry-flavor';
        flavor.textContent = entry.flavor.substring(0, 80) + (entry.flavor.length > 80 ? '...' : '');
        info.appendChild(flavor);
      }

      row.appendChild(info);

      row.addEventListener('click', () => {
        if (entry.discovered) {
          this.showDetail(entry);
        }
      });

      this.contentEl.appendChild(row);
    }
  }

  private showDetail(entry: CodexEntry): void {
    this.detailEl.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'threshold-codex-detail-header';

    const title = document.createElement('div');
    title.className = 'threshold-codex-detail-title';
    title.textContent = entry.name;
    header.appendChild(title);

    const backBtn = document.createElement('button');
    backBtn.className = 'threshold-codex-detail-back';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', () => {
      this.detailEl.classList.add('hidden');
    });
    header.appendChild(backBtn);

    this.detailEl.appendChild(header);

    const body = document.createElement('div');
    body.className = 'threshold-codex-detail-body';

    const desc = document.createElement('div');
    desc.className = 'threshold-codex-detail-description';
    desc.textContent = entry.description;
    body.appendChild(desc);

    const flavor = document.createElement('div');
    flavor.className = 'threshold-codex-detail-flavor';
    flavor.textContent = `"${entry.flavor}"`;
    body.appendChild(flavor);

    this.detailEl.appendChild(body);
    this.detailEl.classList.remove('hidden');
  }

  discover(id: string): void {
    for (const tab of Object.keys(this.entries) as CodexTab[]) {
      for (const entry of this.entries[tab]) {
        if (entry.id === id && !entry.discovered) {
          entry.discovered = true;
          this.emit('entry_discovered', { id, tab });
          if (this.isVisible && tab === this.activeTab) {
            this.renderList();
          }
          return;
        }
      }
    }
  }

  isDiscovered(id: string): boolean {
    for (const tab of Object.keys(this.entries) as CodexTab[]) {
      for (const entry of this.entries[tab]) {
        if (entry.id === id) return entry.discovered;
      }
    }
    return false;
  }

  show(): void {
    this.isVisible = true;
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.isVisible = false;
    this.container.classList.add('hidden');
    this.detailEl.classList.add('hidden');
  }

  getDiscoveredCount(): number {
    let count = 0;
    for (const tab of Object.keys(this.entries) as CodexTab[]) {
      for (const entry of this.entries[tab]) {
        if (entry.discovered) count++;
      }
    }
    return count;
  }

  getTotalCount(): number {
    let count = 0;
    for (const tab of Object.keys(this.entries) as CodexTab[]) {
      count += this.entries[tab].length;
    }
    return count;
  }

  dispose(): void {
    this.hide();
    this.container.remove();
    this.removeAllListeners();
  }
}
