# Rust simulation

EcoSim runs ecology in a Rust ECS compiled to WebAssembly. Vue, rendering, goals,
research, and player-facing state remain TypeScript. Each `SimulationEngine`
owns its own WebAssembly instance; creating another world does not reseed an
existing world.

## Setup and commands

Use Node.js 22.12 or newer and the stable Rust toolchain. Install Rust from
https://rustup.rs, then install the WebAssembly target:

```sh
rustup target add wasm32-unknown-unknown
npm ci
npm run dev
```

`npm run dev`, `npm run build`, and the JavaScript test commands compile the Rust
crate automatically. Cargo downloads the dependencies pinned in
`rust/ecosim-core/Cargo.lock` on the first build. No `wasm-pack` or `wasm-bindgen`
CLI is required. The generated module is
`src/simulation/wasm/generated/ecosim_core.wasm`; Cargo output and this binary
are ignored by Git. Vite emits the module as a versioned production asset.

| Command | Purpose |
| --- | --- |
| `npm run build:rust` | Compile the release WebAssembly module |
| `npm run test:rust` | Run native Rust tests |
| `npm test` | Build WebAssembly and run Vitest against the actual module |
| `npm run test:all` | Run native Rust and JavaScript tests |
| `npm run check:rust` | Check Rust formatting and Clippy |
| `npm run typecheck` | Check application TypeScript |
| `npm run lint` | Check application ESLint rules |
| `npm run build` | Build Rust and the production web application |

After editing Rust while Vite or Vitest watch mode is running, run
`npm run build:rust` and reload the page or rerun the tests. TypeScript and Vue
changes retain the normal Vite hot reload behavior.

## Runtime boundary

`rust/ecosim-core` owns ecological state, seeded random generation, stable entity
IDs, simulation time, scheduled commands, and ecological systems. The small raw
WebAssembly ABI exchanges JSON requests and responses through linear memory.
`src/simulation/rust/SimulationRuntime.ts` loads the compiled module once and
creates an independent instance for each engine. Startup awaits
`initializeSimulationRuntime()` before constructing an engine. Node tests pass
the compiled module bytes to that same initializer.

`src/simulation/SimulationEngine.ts` adapts the ECS snapshots to existing
`WorldChunk` objects, the event journal, and the UI. Existing chunk edits used
by scenarios and development tools are synchronized before a tick. The engine
does not also run the old TypeScript ecology systems. Those individual system
classes remain available for their existing isolated tests and utilities.

## Deterministic ticks and replay

The same simulation version, initial seed, configuration, and ordered commands
produce the same ecological state. ECS work follows a fixed system order and
stable entity ordering. All chunks advance on each tick; legacy
`updateBudgetMs` and `chunksPerTick` options no longer select which chunks evolve.
Wall-clock profiling values are not part of deterministic state.

The main game's tick represents one simulation day. Smaller fixed steps, such
as half a day, are supported by the engine configuration. The `FixedStepLoop`
converts animation frames to whole ticks. Playback speed changes the interval
between ticks; it does not change the ecological step size. Catch-up is bounded
per frame, and pausing or hiding the tab clears accumulated elapsed time.
Long stalls therefore do not simulate all the time spent away. Manual stepping
advances one tick while paused.

Commands may specify a future `tick`; commands with the same tick preserve their
submission order. Replaying an experiment means using the same seed and config
and submitting the same ordered interventions at the same ticks. The save state
includes pending commands. `getDeterministicStateHash()` provides a compact
diagnostic comparison of the ecological state and future-affecting genetics and
RNG metadata, not a cryptographic integrity check.
Replay compatibility is scoped to the current simulation implementation;
changes to ecological rules can change future outcomes.

## Saves

Current saves have `schemaVersion: 2` and `backend: "rust-ecs"`. They include the
complete Rust state, RNG and entity allocator state, simulation clock, pending
commands, TypeScript genetics selections, event journal, research state, and
intervention metadata. Save data survives `JSON.stringify` / `JSON.parse`;
Map-backed data is encoded explicitly. Import pauses the world before resuming
from the saved state. The UI wraps this engine save in an `ecosim-game-v2`
envelope that also restores resource points, goals, scenario, tutorial, playback
options, and a pending year-end choice.

Unversioned legacy saves are converted from their saved chunks, seed, and tick
into a new Rust world. They preserve the saved ecosystem but cannot reproduce
the old TypeScript engine's future: its ecological rules and random consumption
differ. Unknown explicit schema versions are rejected rather than interpreted
as legacy data. Export an imported legacy world to save it in the new format.

## Gameplay

Planting introduces species, irrigation relieves moisture stress, and cleansing
reduces pollution. These interventions are applied by Rust and become part of
the next ecological step. The game UI enforces costs and cooldowns, making the
timing and placement of interventions meaningful. Seasonal seed selection and
existing goals connect ecosystem development to player decisions.

Native Rust tests cover ecological rules; browser-adapter tests in
`src/tests/rust_simulation_runtime.spec.ts` exercise independent worlds, ordered
commands, save continuation, reset, legacy import, interventions, and exact
seasonal timing against the compiled WebAssembly module. The fixed-step loop
has separate scheduler tests.

The ECS uses separate ordered stores for habitat, biome, climate, position,
organism, growth, and reproduction components. Each tick runs commands,
climate, hydrology, environmental effects, growth and mortality, reproduction,
germination, diffusion, and ecosystem metrics in that order. Seeded regional
weather, inherited genes, mutation, and environmental fitness affect outcomes.
Default limits of 64 organisms and 128 natural seed-bank entries per chunk keep
growth bounded while preserving reproduction and seasonal recovery.
