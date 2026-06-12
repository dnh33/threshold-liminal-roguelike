# THRESHOLD — A Liminal Space Roguelike

A biome-diverse first-person roguelike set in distinct liminal spaces. Descend through an infinite office complex, a flooded parking garage, a sterile server farm, an abandoned mall, an endless stairwell, and an empty pool complex. Not Backrooms. **Thresholds.**

Built with **three.js + TypeScript + Vite**.

## Core Pillars

- **Biome Diversity**: 6 distinct liminal space archetypes, each with unique mechanics, threats, and visual identity
- **Transitional Mechanics**: Moving *between* spaces is gameplay — elevators, stairwells, maintenance tunnels
- **Environmental Storytelling**: The spaces *are* the narrative — environmental details tell the story
- **Run Variety**: Procedural layout + handcrafted set pieces + dynamic anomaly system
- **Meta-Progression**: Unlock tools, knowledge, and keys to reach deeper thresholds

## Tech Stack

- **Engine**: [Three.js](https://threejs.org/) (r170+)
- **Language**: TypeScript
- **Build**: Vite 6
- **Audio**: Web Audio API (procedural synthesis)
- **Physics**: Custom (raycast-based character controller)
- **UI**: DOM-based (HTML/CSS overlay)

## Project Structure

```
src/
├── core/           # Engine, Renderer, SceneManager, InputManager, Time
├── systems/        # Game, RunDirector, BiomeManager, AnomalySystem
├── player/         # PlayerController, InteractionSystem
├── entities/       # BaseEntity, EntityManager, EntityBehaviors
├── biomes/         # 6 biome implementations + types
├── generation/     # Procedural layout generation, prop placement
├── tools/          # ToolSystem, ToolEffects
├── progression/    # MetaProgression, UnlockDefinitions
├── ui/             # HUD, MainMenu, PauseMenu, RunEndScreen, Codex, UIManager
├── audio/          # AudioManager, AtmosphereSystem
└── utils/          # EventEmitter, Settings, AssetLoader
```

## Development

```bash
npm install
npm run dev    # Start dev server on port 3000
npm run build  # Production build to dist/
```

## Biomes

| Biome | Archetype | Threat |
|-------|-----------|--------|
| The Cubicle Sea | Infinite office | Middle Managers (patrol) |
| The Submerged Garage | Flooded parking | The Drowned (sound-hunters) |
| The Server Cathedral | Server farm | Archivists (sentries) |
| The Atrium Mall | Abandoned mall | Shoppers (ambushers) |
| The Stairwell Infinite | Stairwell | Stairwalkers (stalkers) |
| The Pool Complex | Indoor pool | Reflections (mimics) |

## Controls

- **WASD** — Movement
- **Mouse** — Look
- **Shift** — Sprint
- **Ctrl** — Crouch
- **Space** — Jump
- **E** — Interact
- **1-6** — Hotbar slots
- **Esc** — Pause / Release cursor

## License

MIT
