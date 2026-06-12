import { EventEmitter } from '../utils/EventEmitter';

export interface RunEndStats {
  time: number;
  biomesCleared: number;
  anomaliesEncountered: number;
  entitiesEvaded: number;
  toolsFound: number;
  loreFragmentsCollected: number;
  depth: number;
}

export interface ArtifactEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const STYLES = `
#threshold-run-end {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9000;
  background: rgba(5, 5, 10, 0.88);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #c8c8d0;
  user-select: none;
}
#threshold-run-end.hidden { display: none; }

.threshold-run-end-panel {
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(200, 200, 220, 0.1);
  padding: 2.5em 3.5em;
  min-width: 480px;
  max-width: 560px;
  animation: run-end-enter 0.4s ease-out;
}
@keyframes run-end-enter {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.threshold-run-end-result {
  font-size: 1.8rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 0.15em;
  font-weight: 300;
}
.threshold-run-end-result.extracted { color: #6aca8a; text-shadow: 0 0 30px rgba(106, 202, 138, 0.2); }
.threshold-run-end-result.deceased { color: #ca4a4a; text-shadow: 0 0 30px rgba(202, 74, 74, 0.2); }
.threshold-run-end-result.descended { color: #8a6aca; text-shadow: 0 0 30px rgba(138, 106, 202, 0.2); }

.threshold-run-end-subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #5a5a6a;
  text-align: center;
  margin-bottom: 2em;
}

.threshold-run-end-divider {
  height: 1px;
  background: rgba(200, 200, 220, 0.08);
  margin: 0.8em 0;
}

.threshold-run-end-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5em 1.5em;
  margin-bottom: 1.5em;
}
.threshold-run-end-stat {
  display: flex;
  justify-content: space-between;
  padding: 0.3em 0;
  border-bottom: 1px solid rgba(200, 200, 220, 0.04);
}
.threshold-run-end-stat-label {
  font-size: 0.75rem;
  color: #6a6a7a;
  letter-spacing: 0.05em;
}
.threshold-run-end-stat-value {
  font-size: 0.8rem;
  color: #c8c8d0;
  font-variant-numeric: tabular-nums;
}

.threshold-run-end-artifacts {
  margin-bottom: 1.5em;
}
.threshold-run-end-artifacts-title {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #5a5a6a;
  margin-bottom: 0.5em;
}
.threshold-run-end-artifact {
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.3em 0;
  font-size: 0.8rem;
}
.threshold-run-end-artifact-icon {
  font-size: 1rem;
  color: #8a8a9a;
}
.threshold-run-end-artifact-name {
  color: #a0a0b0;
}
.threshold-run-end-no-artifacts {
  font-size: 0.75rem;
  color: #4a4a5a;
  font-style: italic;
  text-align: center;
  padding: 0.5em 0;
}

.threshold-run-end-buttons {
  display: flex;
  justify-content: center;
  gap: 0.8em;
  margin-top: 0.5em;
}
.threshold-run-end-btn {
  background: rgba(200, 200, 220, 0.05);
  border: 1px solid rgba(200, 200, 220, 0.12);
  color: #a0a0b0;
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  padding: 0.6em 1.5em;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}
.threshold-run-end-btn:hover {
  color: #f0f0f8;
  border-color: rgba(200, 200, 255, 0.3);
  background: rgba(200, 200, 255, 0.04);
}
.threshold-run-end-btn:active {
  transform: scale(0.97);
}
`;

export class RunEndScreen extends EventEmitter {
  private container: HTMLDivElement;
  private resultEl: HTMLElement;
  private statsContainer: HTMLElement;
  private artifactsContainer: HTMLElement;

  constructor(parent: HTMLElement) {
    super();

    if (!document.getElementById('threshold-run-end-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'threshold-run-end-styles';
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }

    this.container = document.createElement('div');
    this.container.id = 'threshold-run-end';
    this.container.classList.add('hidden');

    const panel = document.createElement('div');
    panel.className = 'threshold-run-end-panel';

    // Result
    this.resultEl = document.createElement('div');
    this.resultEl.className = 'threshold-run-end-result';
    panel.appendChild(this.resultEl);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'threshold-run-end-subtitle';
    subtitle.textContent = 'Run Complete';
    panel.appendChild(subtitle);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'threshold-run-end-divider';
    panel.appendChild(divider);

    // Stats
    this.statsContainer = document.createElement('div');
    this.statsContainer.className = 'threshold-run-end-stats';
    panel.appendChild(this.statsContainer);

    // Divider
    const divider2 = document.createElement('div');
    divider2.className = 'threshold-run-end-divider';
    panel.appendChild(divider2);

    // Artifacts
    this.artifactsContainer = document.createElement('div');
    this.artifactsContainer.className = 'threshold-run-end-artifacts';
    panel.appendChild(this.artifactsContainer);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'threshold-run-end-buttons';

    const btnNewRun = document.createElement('button');
    btnNewRun.className = 'threshold-run-end-btn';
    btnNewRun.textContent = 'New Run';
    btnNewRun.addEventListener('click', () => this.emit('new_run'));

    const btnCodex = document.createElement('button');
    btnCodex.className = 'threshold-run-end-btn';
    btnCodex.textContent = 'View Codex';
    btnCodex.addEventListener('click', () => this.emit('open_codex'));

    const btnMenu = document.createElement('button');
    btnMenu.className = 'threshold-run-end-btn';
    btnMenu.textContent = 'Return to Menu';
    btnMenu.addEventListener('click', () => this.emit('return_to_menu'));

    btnRow.appendChild(btnNewRun);
    btnRow.appendChild(btnCodex);
    btnRow.appendChild(btnMenu);
    panel.appendChild(btnRow);

    this.container.appendChild(panel);
    parent.appendChild(this.container);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  show(result: string, stats: RunEndStats, artifacts?: ArtifactEntry[]): void {
    this.container.classList.remove('hidden');

    // Result
    this.resultEl.textContent = result;
    this.resultEl.className = 'threshold-run-end-result';
    if (result === 'Extracted' || result === 'extract') {
      this.resultEl.classList.add('extracted');
      this.resultEl.textContent = 'Extracted';
    } else if (result === 'Deceased' || result === 'death') {
      this.resultEl.classList.add('deceased');
      this.resultEl.textContent = 'Deceased';
    } else {
      this.resultEl.classList.add('descended');
      this.resultEl.textContent = 'Descended';
    }

    // Stats
    this.statsContainer.innerHTML = '';
    const statEntries: [string, string][] = [
      ['Time', this.formatTime(stats.time)],
      ['Biomes Cleared', String(stats.biomesCleared)],
      ['Anomalies Encountered', String(stats.anomaliesEncountered)],
      ['Entities Evaded', String(stats.entitiesEvaded)],
      ['Tools Found', String(stats.toolsFound)],
      ['Lore Fragments', String(stats.loreFragmentsCollected)],
      ['Depth Reached', String(stats.depth)],
    ];

    for (const [label, value] of statEntries) {
      const row = document.createElement('div');
      row.className = 'threshold-run-end-stat';
      const labelEl = document.createElement('span');
      labelEl.className = 'threshold-run-end-stat-label';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.className = 'threshold-run-end-stat-value';
      valueEl.textContent = value;
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      this.statsContainer.appendChild(row);
    }

    // Artifacts
    this.artifactsContainer.innerHTML = '';
    const artTitle = document.createElement('div');
    artTitle.className = 'threshold-run-end-artifacts-title';
    artTitle.textContent = 'Artifacts Found';
    this.artifactsContainer.appendChild(artTitle);

    if (artifacts && artifacts.length > 0) {
      for (const art of artifacts) {
        const row = document.createElement('div');
        row.className = 'threshold-run-end-artifact';
        const icon = document.createElement('span');
        icon.className = 'threshold-run-end-artifact-icon';
        icon.textContent = art.icon;
        const name = document.createElement('span');
        name.className = 'threshold-run-end-artifact-name';
        name.textContent = art.name;
        row.appendChild(icon);
        row.appendChild(name);
        this.artifactsContainer.appendChild(row);
      }
    } else {
      const none = document.createElement('div');
      none.className = 'threshold-run-end-no-artifacts';
      none.textContent = 'No artifacts recovered';
      this.artifactsContainer.appendChild(none);
    }
  }

  hide(): void {
    this.container.classList.add('hidden');
  }

  dispose(): void {
    this.hide();
    this.container.remove();
    this.removeAllListeners();
  }
}
