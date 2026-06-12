# THRESHOLD — Phase 2 Integration Plan

**Objective:** Wire all orphaned subsystems into a playable game loop.
**Systems Orphaned:** 6 subsystems never instantiated in Game.ts
**Broken Event Flows:** 12+ event chains that emit but nobody listens
**Build Status:** Clean (TypeScript + Vite compile with zero errors)

---

## PHASE 1: PLAYABLE LOOP (Core Run Flow)

**Goal:** Player can launch the game, enter a biome, walk around, exit, and see results.

### 1.1 — Camera & World Initialization
- [ ] Set `engine.sceneManager.activeCamera = playerController.camera` in Game.ts
- [ ] Attach camera to player controller properly (already done in PlayerController constructor)
- [ ] Add player controller mesh/body to scene

### 1.2 — Wire BiomeManager to Use Real Biome Data
- [ ] In `BiomeManager.createBiomeScene()`: import and instantiate `OfficeBiome` (or appropriate biome class)
- [ ] Call `biome.build()` and add returned THREE.Group to the scene
- [ ] Apply `RoomLayoutGenerator` results to inform where biomes place their geometry
- [ ] Apply `PropPlacer` outputs to populate rooms with furniture/props
- [ ] Import all 6 biome classes and switch on BiomeType
- [ ] Fix `selectTransitionType()` to use seeded RNG instead of Math.random()

### 1.3 — Fix Transition Flow
- [ ] Add `biome_exit_found` emission in PlayerController (triggered when player reaches exit trigger zone)
- [ ] In Game.ts `handleBiomeTransition()`: pass transition type argument to `transitionTo()`
- [ ] Ensure transition animations play correctly (fade/elevator/stairwell)
- [ ] RunDirector advances biome sequence on exit

### 1.4 — Fix Run End Flow
- [ ] Fix **double-recording bug**: remove one of the two `processRunResult()` calls
- [ ] Fix `processRunResult` to use the actual result (extract/death/descend) instead of hardcoded `'descend'`
- [ ] Wire `RunDirector.endRun()` to call `Game.endRun()` with correct result
- [ ] Enable MetaProgression echo calculation and unlock checks
- [ ] Show RunEndScreen with actual stats

### 1.5 — Wire UI Data Flow
- [ ] Implement `UIManager.update()` to push live data to HUD
- [ ] Create data aggregation method in Game.ts that collects player state, run stats, and pushes to UIManager
- [ ] Wire biome name/depth display
- [ ] Remove loading screen on game initialization complete
- [ ] Wire MainMenu → startRun flow fully

**Deliverable:** Player can launch, walk through a procedurally-generated biome, find exit, complete run, see results screen.

---

## PHASE 2: ENTITY INTEGRATION

**Goal:** Entities spawn, patrol, detect the player, chase, and attack. Player takes damage.

### 2.1 — Create & Wire EntityManager
- [ ] Instantiate `EntityManager` in Game.ts (attach to active biome scene)
- [ ] On biome transition, call `EntityManager.spawnEntities()` with configs from RunDirector difficulty params
- [ ] Generate patrol paths from RoomLayoutGenerator room data
- [ ] Wire `EntityManager.update()` into Game.ts update loop

### 2.2 — Add Damage System
- [ ] Add `health`, `maxHealth`, `sanity`, `maxSanity` to PlayerController
- [ ] PlayerController methods: `takeDamage(amount)`, `heal(amount)`, `getHealth()`, `getSanity()`
- [ ] Wire `EntityManager.on('entity-attack')` → `playerController.takeDamage()`
- [ ] Emit `death` event when health reaches 0 → triggers `Game.endRun('death')`
- [ ] Wire `EntityManager.on('entity-detected-player')` → HUD detection meter
- [ ] Add natural sanity drain in liminal spaces, restore in transition zones

### 2.3 — Wire Anomaly Effects to Entities
- [ ] In `Game.handleAnomalyRoll()`: call `entityManager.applyAnomaly()` with anomaly data
- [ ] Anomaly effects on entities: SILENCE → buff entities, FLICKER → reduce sight range, etc.
- [ ] Wire `AnomalySystem.getActiveAnomaliesForBiome()` to biome scene

### 2.4 — Entity Counterplay Integration
- [ ] Wire tool effects to entity interactions (UV light → entities flee, NoiseMaker → distract)
- [ ] Wire `EntityManager.setUVActive()` from ToolEffects
- [ ] Wire `EntityManager.distractNearbyEntities()` from ToolEffects noise maker
- [ ] Wire entity stun from Multitool EMP

### 2.5 — Entity Stats & Behavior Tuning
- [ ] MiddleManager: speed 2.5 (patrol) / 3.5 (chase), sight 15m, attack dmg 10, attack cooldown 2s
- [ ] Drowned: speed 0 (idle) / 5 (chase), hearing 25m, attack dmg 15, attack cd 3s
- [ ] Archivist: sight 20m (360°), alarm call radius 30m, immune to noise, EMP stun 8s
- [ ] Shopper: speed 1.5 (watching) / 6 (chasing), attack dmg 8, flees from UV
- [ ] Stairwalker: teleports every 8s, instant kill if within 5m, only evade by vertical movement
- [ ] Reflection: deals 25 dmg on touch, resets player to previous position

**Deliverable:** Entities patrol, detect player, chase, and attack. Player has health/sanity and can die.

---

## PHASE 3: TOOL INTEGRATION

**Goal:** Findable tools in the environment, pickup, slot into hotbar, use with effects.

### 3.1 — Create & Wire InteractionSystem
- [ ] Instantiate `InteractionSystem` in Game.ts
- [ ] Wire player interaction key (E) through InputManager → InteractionSystem
- [ ] Mark props as interactable in PropPlacer output (add `userData.interactable = true` + metadata)
- [ ] Wire `InteractionSystem.on('tool-pickup')` → `ToolSystem.addItem()`
- [ ] Wire `InteractionSystem.on('hover-start')` → show interaction prompt in HUD
- [ ] Wire `InteractionSystem.on('hover-end')` → hide interaction prompt
- [ ] Wire `InteractionSystem.on('interact')` for door/keycard interactions

### 3.2 — Create & Wire ToolSystem
- [ ] Instantiate `ToolSystem` in Game.ts
- [ ] Wire `ToolSystem.update()` into Game.ts update loop (for hotbar key input)
- [ ] Wire `ToolSystem.on('tool-used')` → `ToolEffects.execute()` with scene/player context
- [ ] Wire `ToolSystem.on('tool-added')` → HUD hotbar update
- [ ] Wire `ToolSystem.on('tool-depleted')` → HUD notification + remove from hotbar
- [ ] Wire `ToolSystem.getHotbarItems()` → UIManager for HUD rendering

### 3.3 — Tool Placement in World
- [ ] Distribute tool pickup items in RoomLayoutGenerator rooms (1-3 tools per biome)
- [ ] Create tool pickup meshes (glowing, emissive, floating) using THREE primitives
- [ ] Place in dead-end rooms and landmark rooms for exploration reward

### 3.4 — Tool Effect Integration
- [ ] Pass proper `ToolContext` to `ToolEffects.execute()` with scene, player, engine references
- [ ] Wire Multitool → open locked doors, rewire panels (biome interactive objects)
- [ ] Wire UV Light → reveal hidden entities, shopper flee, reflection vulnerability
- [ ] Wire Anomaly Scanner → visual pulse showing anomaly source locations
- [ ] Wire NoiseMaker → create noise source position for EntityManager distraction
- [ ] Wire Keycard Cloner → bypass keycard doors
- [ ] Wire Breather → grant 15s hazard immunity, show visual overlay

**Deliverable:** Tools can be found, picked up, hotbar-selected, and used with visual/gameplay effects.

---

## PHASE 4: BALANCE PASS

**Goal:** Numbers feel right. Runs are 15-20 min. Economy is fair.

### 4.1 — Movement Tuning
- Walk speed: 4.0 → 4.5 (slightly faster, more responsive)
- Sprint speed: 6.0 → 7.0 (sprint should feel fast but limited by stamina)
- Crouch speed: 1.5 → 2.0 (crouch shouldn't feel painfully slow)
- Jump force: 5.0 → 6.0 (slightly higher for traversing obstacles)
- Gravity: -9.81 → -12.0 (tighter jump arcs)
- Stamina system: sprint drains stamina (10s max), recovers when walking (3s to full)
- Head bob: reduce amplitude by 20% for comfort

### 4.2 — Entity Balance
| Entity | Health | Attack | Detection | Speed | Spawn Weight |
|--------|--------|--------|-----------|-------|-------------|
| MiddleManager | 30 | 10/2s | Visual 15m | 2.5/3.5 | Common |
| Drowned | 20 | 15/3s | Audio 25m | 0/5.0 | Common (water biomes) |
| Archivist | 50 | 5/alarm | 360° 20m | 0 | Uncommon |
| Shopper | 15 | 8/1.5s | Visual 12m | 1.5/6 | Common (mall) |
| Stairwalker | 40 | 50/8s | Instant 5m | Teleport | Rare |
| Reflection | 10 | 25/contact | Visual 8m | Player* | Uncommon (pool) |

- Entity count scales with depth: floor 1 = 3-4, floor 2 = 5-6, floor 3 = 7-8
- Max simultaneous entities: 12 (hard cap for performance)

### 4.3 — Anomaly Balance
- Anomaly roll chance per biome: 30% base + 10% per depth level (max 60%)
- Min biomes between anomalies: 1
- Anomaly duration: 60-120s (shorter at higher severity)
- Severity cap: 0.7 (never 100% debilitating)
- Effects: visual distortion 0.2-0.6, gameplay impact 0.1-0.4

### 4.4 — Economy Balance
- Extract reward: 40 base + 15/biome cleared + 5/lore + 8/anomaly encountered
- Descent reward: 50% of extract value (risk/reward)
- Death reward: 30% of extract value (consolation)
- Tool unlock costs: 60-100 echoes (total 440 echoes for all 6)
- Threshold unlock costs: 0 → 80 → 200 → 400 → 700 (total 1,380)
- Artifact costs: 50-100 echoes each (total 540)
- **Target:** Full unlocks in ~30 successful runs
- Average extract earnings: ~80 echoes/run

### 4.5 — Health & Difficulty Tuning
- Player HP: 100 base, +20% with Stabilized Core artifact
- Player sanity: 100 base, drains 2/min in biomes, 5/min with active anomaly
- Natural regen: 1 HP/10s when not recently damaged
- Sanity regen: 5/s in transition zones (rest stops)
- Start-of-run tools: player starts with flashlight, can unlock starting tools via blueprints
- Threshold key levels unlock deeper biomes: T1→depth 2, T2→depth 4, T3→depth 6, T4→depth 8, T5→depth 10

**Deliverable:** Balanced gameplay parameters that produce fair, fun runs.

---

## PHASE 5: POLISH PASS

**Goal:** Satisfying feedback loops, atmosphere, audio, accessibility.

### 5.1 — AtmosphereSystem Integration
- [ ] Instantiate `AtmosphereSystem` in Game.ts
- [ ] Wire `BiomeManager.on('biome-created')` → `AtmosphereSystem.setBiomeAtmosphere(biomeType)`
- [ ] Wire `AnomalySystem.on('anomaly-started')` → `AtmosphereSystem.setAnomalyEffect(anomalyType, true, severity)`
- [ ] Wire `AnomalySystem.on('anomaly-ended')` → `AtmosphereSystem.setAnomalyEffect(anomalyType, false, 0)`
- [ ] Wire `playerController.on('damage-taken')` → `AtmosphereSystem.flashScreen('red', 0.2)`
- [ ] Wire `playerController.on('death')` → `AtmosphereSystem.flashScreen('white', 0.5)`
- [ ] Add `AtmosphereSystem.update()` to Game.ts update loop

### 5.2 — Audio Wiring
- [ ] Wire first click/keydown → `AudioManager.resume()` (user gesture requirement)
- [ ] Wire `playerController.on('footstep')` → `AudioManager.playFootstep(surfaceType, strength)`
- [ ] Wire `BiomeManager.on('transition-start')` → `AudioManager.playTransition()`
- [ ] Wire `BiomeManager.on('biome-created')` → `AudioManager.playBiomeAmbient(biomeType)`
- [ ] Wire `BiomeManager.on('biome-created')` → `AudioManager.playMusicTrack(biomeType)`
- [ ] Wire `EntityManager.on('entity-detected-player')` → `AudioManager.playEntityDetected()`
- [ ] Wire `EntityManager.on('entity-attack')` → `AudioManager.playEntityAttack()`
- [ ] Wire `playerController.on('damage-taken')` → `AudioManager.playDamage()`
- [ ] Wire `playerController.on('death')` → play heartbeat (high intensity) + death sound
- [ ] Wire `InteractionSystem.on('hover-start')` → `AudioManager.playUIHover()`
- [ ] Wire `InteractionSystem.on('tool-pickup')` → `AudioManager.playItemPickup()`
- [ ] Wire `ToolSystem.on('tool-used')` → `AudioManager.playToolUse(toolId)`
- [ ] Wire anomaly start → `AudioManager.playAnomalyAlert()`
- [ ] HUD buttons → `AudioManager.playUIClick()`

### 5.3 — Animation & Visual Effects
- [ ] Entity idle animation: gentle sway/bob for all entities
- [ ] Entity chase animation: exaggerated movement, lurching
- [ ] Pickup items: floating + rotating + emissive glow
- [ ] Transition effects: elevator door close/open animation, stairwell spiral
- [ ] Anomaly visual indicators: screen edge glow, color shift, scanline distortion
- [ ] Damage feedback: screen flash + directional indicator
- [ ] Low health: screen desaturation, heartbeat overlay, vignette tighten
- [ ] Head bob refinement: smoother curves, less jarring at low FPS

### 5.4 — Accessibility
- [ ] High contrast mode: stronger outlines, greater color separation, text backgrounds
- [ ] Colorblind mode (3 types): protanopia, deuteranopia, tritanopia color adjustments
- [ ] Reduced motion: disable head bob, disable transition animations, simplify particle effects
- [ ] Vignette toggle (already in settings): disable vignette for motion sickness
- [ ] FOV slider: 70-110 range (already in settings)
- [ ] Subtitle system: all audio cues have visual text equivalent
- [ ] Remappable controls UI (settings screen)
- [ ] Auto-walk option for long corridors
- [ ] Pause anytime (already works via Esc)

### 5.5 — Loading & Performance
- [ ] Loading screen with progress stages (Engine → Systems → Biomes → Audio → Done)
- [ ] AssetLoader preload progress to loading screen percentage
- [ ] Chunk size optimization in Vite config (dynamic imports for biomes)
- [ ] LOD (level of detail) for distant objects in large rooms
- [ ] Object pooling for frequently spawned/destroyed items
- [ ] Reduce noise animation performance cost (cache noise texture, update every 3 frames)

**Deliverable:** Complete audio/visual feedback loop. All accessibility options functional. Loading experience polished.

---

## IMPLEMENTATION ORDER

```
Week 1: Phase 1 (Playable Loop) — Camera, BiomeManager wiring, transition fix, run flow, UI data
Week 2: Phase 2 (Entities) — EntityManager, damage system, anomaly-entity wiring, counterplay
Week 3: Phase 3 (Tools) — InteractionSystem, ToolSystem, pickup placement, effect wiring
Week 4: Phase 4 (Balance) — Tuning pass across all systems
Week 5: Phase 5 (Polish) — Atmosphere, audio, animation, accessibility
```

## CRITICAL PATH

The absolute minimum to get a playable build:

1. ✅ ~~Build passes~~ (done)
2. **Wire PlayerController camera to scene**
3. **Wire BiomeManager to use OfficeBiome.build()**
4. **Create basic run loop in Game.ts (Menu → Start → Play → Exit → Results)**
5. **Create EntityManager with basic MiddleManager spawning**
6. **Add damage/health system**
7. **Wire InteractionSystem + ToolSystem with one pickup and one tool**

Items 2-4 are the highest priority — without them, nothing is visible/playable.
