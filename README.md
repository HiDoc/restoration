# EcoSim

EcoSim is an ecological sandbox written in Vue 3 and TypeScript. It combines a deterministic simulation core with a seasonal game UI so you can experiment with habitats, species genetics, and environmental interventions—all rendered on a close-packed hex grid.

## Highlights

- **Living Hex World** – Chunks render as textured hex tiles with hover/selection stats for vitality, moisture, pollution, temperature, diversity, and species counts.
- **Seasonal Command Deck** – Scenario dashboard, guided workflow sidebar, and themed controls keep climate, pollinators, and interventions within reach.
- **Deterministic Simulation** – Seeded RNG plus subsystems for weather, hydrology, canopy, pollinators, birds, and vegetation with genetics-aware reproduction.
- **Safe-Guarded Runs** – Automatic pause when biodiversity collapses, with quick restart or snapshot loading to continue experiments.
- **Database Backed** – SQLite dataset for vegetal species, birds, and interactions, surfaced via adapter utilities and tunable overrides.

## Getting Started

```bash
rustup target add wasm32-unknown-unknown # install the Rust WebAssembly target
npm ci               # install locked dependencies
npm run init-db      # build the species database
npm run dev          # compile Rust and start Vite (http://localhost:3000)
```

The simulation runs in Rust through WebAssembly. Use Node.js 22.12+ and stable
Rust; see [Rust simulation setup and architecture](SIMULATION_RUST.md) for
build commands, deterministic ticks, replay, and save migration details.

### Useful Commands

| Task                | Command                 |
|---------------------|-------------------------|
| Run unit tests      | `npm test`              |
| Watch tests         | `npm run test:watch`    |
| Type checking       | `npm run typecheck`     |
| ESLint              | `npm run lint`          |
| Production build    | `npm run build`         |

## Directory Map

```
src/
  components/        # Vue components (dashboard, hex grid, workflow, etc.)
  core/              # Game scaffolding (engine shell, camera, input)
  database/          # SQLite schema, adapters, seed data
  persistence/       # Save/load providers
  render/            # Sprite utilities
  simulation/        # Deterministic ecological engine & systems
  utils/             # Helpers, directives
  views/             # Routed screens (SimulationView, etc.)
docs/                # Architecture and feature documentation
public/terrain/      # Hex tile textures (grassland, forest, wetland, savanna, wasteland)
```

## UI Tour

- **Hex Board** – Each chunk sits on a textured hex; hover or select to reveal biome & climate stats, seed counts, and badges for birds/pollinators.
- **Scenario Dashboard** – Summaries for vitality, cleanliness, species totals, alerts, and recent events.
- **Guided Workflow Sidebar** – Observe → Hypothesize → Test steps with quick toggles for overlays, history scrubber, and interventions.
- **Control Panels** – Climate, pollinator, time, persistence, theme, and intervention controls themed with seasonal gradients.
- **Bottom Dock** – Quick navigation to overview, goals, species, climate, hydrology, interactions, events, and settings sections.

## Simulation Notes

- Center seeding now spawns a **3×3 cluster** of three `common_grass` per chunk (27 total) while trimming grass elsewhere for a clean start.
- Chunk baselines adapt to the current biome, with overlays reacting to active visualization mode (vitality, moisture, pollution, etc.).
- Extinction detection pauses automatically and offers restart or snapshot recovery.

## Documentation

The `/docs` folder contains deeper dives:

- `ARCHITECTURE_OVERVIEW.md` – Engine layout, hex rendering pipeline, UI tiers.
- `QUICK_START_GUIDE.md` – Bootstrapping, example code, and workflow tips.
- `SIMULATION_ENGINE.md` – System-level details, lifecycle, and API usage.
- `SIMULATION_GAME_DESIGN.md` – Experience & progression goals.
- `SPECIES_DATABASE.md` – SQLite schema, adapter usage, and override tables.

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run lint` and `npm run typecheck` before submitting a PR.
3. Document new behaviours/components and update docs if the workflow changes.

## License

This project is released under the MIT License. See `LICENSE` for details.
