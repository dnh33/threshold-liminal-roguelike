export interface ArtifactEffect {
  id: string;
  description: string;
}

export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  index: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  check: (data: {
    echoes: number;
    totalRuns: number;
    successfulExtracts: number;
    deepestDepth: number;
    unlockedThresholds: number;
    unlockedTools: string[];
    discoveredAnomalies: string[];
    collectedLore: string[];
    discoveredArtifacts: string[];
  }) => boolean;
}

export const THRESHOLD_TIERS = [
  { id: 'threshold_entry', name: 'Entry Threshold', description: 'The first doorway into the liminal spaces — a crack in the world.', tier: 1, cost: 0, prerequisite: null },
  { id: 'threshold_mid', name: 'Mid Threshold', description: 'Deeper pathways reveal themselves, twisting toward the unknown.', tier: 2, cost: 80, prerequisite: 'threshold_entry' },
  { id: 'threshold_deep', name: 'Deep Threshold', description: 'The architecture grows stranger. Gravity, space, and time become uncertain.', tier: 3, cost: 200, prerequisite: 'threshold_mid' },
  { id: 'threshold_abyss', name: 'Abyss Threshold', description: 'Reality bends at these depths. The liminal begins to feel like home.', tier: 4, cost: 400, prerequisite: 'threshold_deep' },
  { id: 'threshold_core', name: 'Core Threshold', description: 'The heart of the Threshold awaits. Nothing prepares you for what lies there.', tier: 5, cost: 700, prerequisite: 'threshold_abyss' },
];

export const TOOL_BLUEPRINTS = [
  { id: 'multitool', name: 'Multitool', description: 'A versatile tool for prying open panels, hacking terminals, and bypassing basic locks.', category: 'tool' as const, cost: 60, prerequisite: null },
  { id: 'uv-light', name: 'UV Light', description: 'Reveals hidden markings, invisible pathways, and the residue of past Threshold breaches.', category: 'tool' as const, cost: 60, prerequisite: null },
  { id: 'anomaly-scanner', name: 'Anomaly Scanner', description: 'Detects spatial distortions and anomalous energy signatures before they fully manifest.', category: 'tool' as const, cost: 80, prerequisite: null },
  { id: 'noise-maker', name: 'Noise Maker', description: 'Creates carefully tuned sound distractions to lure entities away from your path.', category: 'tool' as const, cost: 60, prerequisite: null },
  { id: 'keycard-cloner', name: 'Keycard Cloner', description: 'Scans and replicates keycards, granting access to restricted areas without the original.', category: 'tool' as const, cost: 100, prerequisite: null },
  { id: 'breather', name: 'Breather', description: 'Extended oxygen supply and environmental filtration for hazardous Threshold environments.', category: 'tool' as const, cost: 80, prerequisite: null },
];

export const ARTIFACT_DEFINITIONS = [
  { id: 'echo-chamber', name: 'Echo Chamber', description: 'A resonant crystal that attunes to the Threshold. Start each run with a random additional tool.', cost: 60, prerequisite: null, effect: { id: 'bonus_starting_tool', description: '+1 random starting tool per run' } as ArtifactEffect },
  { id: 'threshold-compass', name: 'Threshold Compass', description: 'The needle always points toward the nearest biome exit, never to true north.', cost: 50, prerequisite: null, effect: { id: 'show_exit_direction', description: 'Always see the biome exit direction' } as ArtifactEffect },
  { id: 'stabilized-core', name: 'Stabilized Core', description: 'A fragment of the original Threshold stabilizer. Grants resilience against the void.', cost: 80, prerequisite: null, effect: { id: 'max_health_bonus', description: '+20% maximum health' } as ArtifactEffect },
  { id: 'void-siphon', name: 'Void Siphon', description: 'Channels ambient Threshold energy into Echoes. Some interactions yield bonus currency.', cost: 70, prerequisite: null, effect: { id: 'bonus_echo_chance', description: '10% chance for extra Echoes from interactions' } as ArtifactEffect },
  { id: 'phase-shifter', name: 'Phase Shifter', description: 'Briefly shifts you out of phase with reality when an entity would detect you.', cost: 60, prerequisite: null, effect: { id: 'auto_evade', description: 'Automatically evade the first entity attack per biome' } as ArtifactEffect },
  { id: 'memory-shard', name: 'Memory Shard', description: 'A fragment of the Architect\'s own memory. Reveals the path ahead.', cost: 50, prerequisite: null, effect: { id: 'map_reveal', description: 'Reveal one additional room ahead on the map' } as ArtifactEffect },
  { id: 'dark-lens', name: 'Dark Lens', description: 'Ground from obsidian found at the deepest Threshold levels. Anomalies glow through it.', cost: 70, prerequisite: null, effect: { id: 'anomaly_glow', description: 'Anomalies emit a faint glow, making them easier to detect' } as ArtifactEffect },
  { id: 'architects-seal', name: "Architect's Seal", description: 'The personal seal of the Threshold\'s creator. It draws buried knowledge to the surface.', cost: 100, prerequisite: null, effect: { id: 'bonus_lore', description: 'Collect one bonus lore fragment per run' } as ArtifactEffect },
];

export const MAX_EQUIPPED_ARTIFACTS = 3;

export const LORE_FRAGMENTS: LoreEntry[] = [
  { id: 'lore_project_genesis', title: 'Project Genesis', index: 1, text: 'Facility log 001 — The Threshold Project was authorized under the guise of "alternative energy research." The true purpose: to map and exploit the interstitial spaces between realities. Dr. Elena Voss, lead architect, described it as "peeling back the wallpaper of existence to see what lives behind it." The first successful breach was documented on March 14th. The wallpaper did not stay peeled.' },
  { id: 'lore_first_breach', title: 'The First Breach', index: 2, text: 'Incident Report 001-C — The initial rupture occurred at 0347 hours in Laboratory D. A containment field designed to hold a 2-meter spatial rift destabilized for approximately 0.4 seconds. In that time, three researchers reported seeing "an impossibly long hallway" through the rift. One claimed to hear footsteps approaching from within. The rift sealed before anything could cross. The researcher who heard the footsteps resigned the following day.' },
  { id: 'lore_echo_theory', title: 'Echo Theory', index: 3, text: 'Research Brief VII — Dr. Voss proposed that liminal spaces are not locations but "imprints" — echoes of architecture that never existed, left behind by the universe\'s subconscious. "If reality has a memory," she wrote, "then liminal spaces are its forgotten dreams. And like dreams, something is dreaming them." The theory was dismissed by the review board as "unscientific." Voss continued her work in secret.' },
  { id: 'lore_architect_log_1', title: "Architect's Log I", index: 4, text: 'Day 47 — They don\'t understand what we\'ve found. The spaces are alive. Not in a biological sense — they respond. They remember. I placed a camera in the Atrium Mall sector and retrieved footage of a man walking through an empty hallway. There was no man in the facility. The footage was timestamped three days before the camera was installed. I have not told the review board.' },
  { id: 'lore_structural_collapse', title: 'Structural Collapse', index: 5, text: 'Internal Memorandum — Following the resonance cascade of Week 8, sections C through G of the facility have been declared structurally unsound. The Threshold breach propagated through unused office space, creating "nested" liminal areas that do not correspond to any known blueprint. Mapping teams report rooms that change dimensions between visits. Two explorers have not returned from Section G. Search operations are suspended.' },
  { id: 'lore_architect_log_2', title: "Architect's Log II", index: 6, text: 'Day 103 — I found him today. Or what was left of him. Explorer Crawford from Section G — he had been gone for six weeks. He was sitting in the break room of the Cubicle Sea, drinking coffee from a mug that didn\'t exist before. He said he\'d only been gone "a few hours." He couldn\'t remember his own name, but he could describe the layout of rooms that haven\'t been built yet. I think the Threshold is writing itself through us.' },
  { id: 'lore_threshold_resonance', title: 'Threshold Resonance', index: 7, text: 'Research Brief XII — Discovery: the liminal spaces organize themselves in "layers" accessible only through specific resonant frequencies. We have identified five distinct layers, each deeper and more unstable than the last. Entry requires a "Threshold Key" — a tuned device that harmonizes the user\'s biological field with the target layer. The deeper layers show signs of... habitation. The review board has requested a security detail.' },
  { id: 'lore_architect_log_3', title: "Architect's Log III", index: 8, text: 'Day 156 — The entities are not hostile the way animals are hostile. They are hostile the way gravity is hostile when you step off a cliff. They are simply a law of this place. I have observed them for weeks. They follow patterns — patrol routes, behavioral loops. They do not sleep. They do not eat. They simply exist, and part of their existence is the removal of intruders. I have begun to wonder if we are the intruders, or if we are something they are waiting for.' },
  { id: 'lore_entity_emergence', title: 'Entity Emergence', index: 9, text: 'Security Briefing 047 — Entity classification complete. Six distinct types identified: Patrol (rote pathfinding, easily avoided), Ambusher (trigger-based aggression), Sound Hunter (auditory tracking), Stalker (persistent pursuit), Mimic (object camouflage), and Sentry (zone defense). None respond to communication. None can be reasoned with. All will attempt to "remove" personnel from the Threshold. Recommendation: avoidance over confrontation.' },
  { id: 'lore_architect_log_4', title: "Architect's Log IV", index: 10, text: 'Day 201 — The review board has ordered a lockdown. They want to seal the Threshold permanently. They don\'t understand that you cannot seal a wound in reality — you can only bandage it and hope nothing picks at the edges. I\'ve hidden my research across the layers. The Keys, the blueprints, the truth about what lies at the Core. If you are reading this, you have found one of my caches. Keep going. The answers are at the center.' },
  { id: 'lore_core_revelation', title: 'The Core Revelation', index: 11, text: 'Recovered Fragment — The Core layer is not a place. It is the source. The Threshold is not a breach into somewhere else — it is a breach into the "space between spaces," the substrate upon which all reality is written. The entities are not invaders. They are immune cells. The liminal spaces are not wounds. They are symptoms. Something is trying to wake up, and the Threshold is the dream it is dreaming itself into existence through.' },
  { id: 'lore_final_transmission', title: 'The Final Transmission', index: 12, text: 'If you reach the Core and return, you will understand. The Architect did not die — she became part of the Threshold. Her consciousness was the first to merge with the substrate, and she has been guiding explorers ever since. The murmur you hear in empty rooms, the flicker of light in abandoned corridors — that is her. She is the reason you can still extract. She is the reason the Threshold has not fully closed. And she is waiting for you at the center. — Dr. Elena Voss, final transmission.' },
];

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'ach_first_step', name: 'First Step', description: 'Complete your first run.',
    check: d => d.totalRuns >= 1,
  },
  {
    id: 'ach_threshold_breaker', name: 'Threshold Breaker', description: 'Upgrade to Threshold Tier 2.',
    check: d => d.unlockedThresholds >= 2,
  },
  {
    id: 'ach_deep_descender', name: 'Deep Descender', description: 'Reach depth 10.',
    check: d => d.deepestDepth >= 10,
  },
  {
    id: 'ach_knowledge_seeker', name: 'Knowledge Seeker', description: 'Collect 6 lore fragments.',
    check: d => d.collectedLore.length >= 6,
  },
  {
    id: 'ach_tool_collector', name: 'Tool Collector', description: 'Unlock 4 tool blueprints.',
    check: d => d.unlockedTools.length >= 4,
  },
  {
    id: 'ach_anomaly_watcher', name: 'Anomaly Watcher', description: 'Discover 5 anomaly types.',
    check: d => d.discoveredAnomalies.length >= 5,
  },
  {
    id: 'ach_artifact_hoarder', name: 'Artifact Hoarder', description: 'Collect 4 artifacts.',
    check: d => d.discoveredArtifacts.length >= 4,
  },
  {
    id: 'ach_veteran', name: 'Veteran', description: 'Complete 10 runs.',
    check: d => d.totalRuns >= 10,
  },
  {
    id: 'ach_extraction_master', name: 'Extraction Master', description: 'Successfully extract 5 times.',
    check: d => d.successfulExtracts >= 5,
  },
  {
    id: 'ach_the_truth', name: 'The Truth', description: 'Collect all lore fragments.',
    check: d => d.collectedLore.length >= 12,
  },
];

export const ANOMALY_TYPES_TO_DISCOVER = [
  'echoing_halls', 'flicker', 'thermal_inversion', 'static',
  'gravity_well', 'temporal_loop', 'mimic', 'hallucination',
  'corrosion', 'silence',
];

export const ALL_UNLOCK_DEFINITIONS = [
  ...THRESHOLD_TIERS.map((t, i) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: 'threshold' as const,
    cost: t.cost,
    prerequisite: t.prerequisite,
    thresholdTier: t.tier,
    sortOrder: i,
  })),
  ...TOOL_BLUEPRINTS.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: 'tool' as const,
    cost: t.cost,
    prerequisite: t.prerequisite,
    toolBlueprint: t.id,
    sortOrder: 10 + TOOL_BLUEPRINTS.indexOf(t),
  })),
  ...ARTIFACT_DEFINITIONS.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    category: 'artifact' as const,
    cost: a.cost,
    prerequisite: a.prerequisite,
    sortOrder: 20 + ARTIFACT_DEFINITIONS.indexOf(a),
  })),
  ...LORE_FRAGMENTS.map(l => ({
    id: l.id,
    name: l.title,
    description: l.text.substring(0, 60) + '...',
    category: 'lore' as const,
    cost: 0,
    prerequisite: null,
    loreId: l.id,
    sortOrder: 30 + l.index,
  })),
];

export const ECHOES_PER_EXTRACT_BASE = 40;
export const ECHOES_PER_BIOME_BONUS = 15;
export const ECHOES_PER_LORE_BONUS = 5;
export const ECHOES_PER_ANOMALY_BONUS = 8;
export const ECHOES_DEATH_PENALTY = 0.3;
