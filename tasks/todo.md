# EcoSim: from ecological dashboard to cozy discovery game

Goal: the player tends a living terrarium whose rules they learn over time. Rust stays the source of truth.
Vue shows consequences first and numbers last. A Codex connects the two by recording what the player has
actually witnessed.

Core loop: **Explore → Discover → Collect → Plant → Observe → Hybridize → Restore → (new areas/species)**

---

## 0. Current state (audited 2026-09-23)

| Design need | What exists | Gap |
|---|---|---|
| Rich plant traits | SQLite `vegetal_species`: 12 real plants with flowering season, pollination type, nitrogen fixation, allelopathy, drought/cold/pollution tolerance, fruit season | Runtime ignores it. `SpeciesRegistry.ts` hard-codes 8 species (`healing_fern`, `ancient_sentinel`, …) and Rust `SpeciesDefinition` carries ~15 fields |
| Birds | SQLite `bird_species`: 12 birds with diet, migration, breeding season, dispersal/pollination effectiveness | Rust fakes birds as 3 fixed densities per hex (`swift`/`robin`/`owl` from canopy × vitality) in `systems.rs` `ecosystem_system` |
| Pollinators | A `pollinatorDensity` scalar per hex, diffused | No species, no requirements (nectar, host plants, larvae) |
| Interactions | SQLite `species_interactions`: pollination + seed-dispersal pairs with strengths | Not loaded; nothing observes or records them |
| Genetics | Rust `inherit_genetics`: 7 traits, single-parent mutation drift, generation counter | No two-parent crossing, no pedigree, no individual identity |
| Hybridization | TS `HybridizationSystem` (767 lines) attached to `VegetationSystem` | `VegetationSystem` is no longer imported. In Rust, "hybrids" are temporary effect residues (`hybridId`, `duration`, `strength`), not new species |
| Discovery | `ResearchSystem` + field guide + discovery modal; traits unlock at 10/25/50/100 observations | Discovery tracks plants only, and "observation" is a counter, not an event the player sees |
| Selection | Year-end "Top performing specimens" seed selection | Only once a year; the population's trait shift is never shown |
| Time | 1 tick = 1 day, 90-day seasons; ×speed and step-one-day | No "advance a week/season then pause and summarize" |
| Collapse | Pause + "All species collapsed" + Restart/Load | Framed as failure; no cause attribution |
| Economy | Resource points for interventions, time-limited scenarios with point rewards | Pressure mechanics that work against cozy |
| Dead code | TS `VegetationSystem`, `WeatherSystem`, `HydrologySystem`, `CanopySystem`, `PollinatorSystem`, `InteractionsSystem` | Not imported by the engine; kept alive only by tests |
| Test harness | 94 failing tests | Test env lacks `localStorage` and loads WASM through a non-`file:` URL (`src/tests/setupSimulationRuntime.ts`) |

## 1. Architecture rules for the redesign

1. **Truth vs knowledge.** Rust owns what *is* (organisms, fauna, genetics, interactions happening). A new TS
   `KnowledgeStore` owns what the *player has witnessed*. The UI renders knowledge, never raw truth, except in
   an explicit "Inspect" panel. `???` in the Codex is simply the absence of a knowledge record.
2. **Rust emits typed ecological events**; TS reduces them into knowledge and narrative. Proposed event kinds:
   `FirstSighting`, `InteractionObserved`, `Flowering`, `SeedsRipe`, `HybridGerminated`, `ArrivedInHex`,
   `LeftHex`, `EcosystemShift`, `RareEvent`. Events carry ids and causes only; wording lives in TS.
3. **All new randomness goes through the Rust seeded RNG.** Knowledge and inventory are saved in the same
   snapshot as `rustState`, so saves replay deterministically.
4. **One species catalogue.** Generate a JSON catalogue from the SQLite seed data at build time; both
   the Rust definitions and the TS Codex read it. No second hand-written list.
5. **Delete, don't wrap.** Remove the dead TS systems once their useful logic has been ported to Rust.

## 2. Decisions (settled 2026-09-23: all three recommendations accepted)

- [x] **D1 Species names.** Real European species from SQLite (Red Fescue, Hawthorn, Blackbird), the current
      invented ones (Healing Fern, Ancient Sentinel), or the whimsical names in the brief (Moon Clover,
      Cloudwing Butterfly)?
      *Recommendation:* real species for wild organisms (this keeps the "scientific accuracy" pillar), with
      generated evocative names for player-bred hybrids only ("Silver Thyme").
- [x] **D2 Economy.** Keep resource points and time-limited scenarios?
      *Recommendation:* replace points with a seed inventory, turn scenarios into untimed "restoration sites",
      and drop the countdowns.
- [x] **D3 Slicing.** Build breadth phase by phase, or build one thin vertical slice of the whole loop first?
      *Recommendation:* vertical slice first (Milestone A). It proves the loop is fun before investing in
      breadth.

---

## Milestone A: vertical slice (one meadow, one season cycle)

Scope: 4 plants, 1 butterfly, 1 bee, 1 bird, 1 possible hybrid. A player should be able to plant, advance
time, see butterflies arrive, discover an interaction, collect seeds in autumn, cross two plants and name the
resulting hybrid. All of it on one map.

### A0. Foundations
- [x] Fix the test harness: in-memory `localStorage` and a root-relative WASM path in
      `src/tests/setupSimulationRuntime.ts`. Also fixed the drift the harness had been hiding: five files built the
      engine with a config shape that never existed; the tutorial test spun forever on a nonexistent API
      (`trigger.type`); the store tests called `engine.step()` and planted a species that doesn't exist.
      Baseline went from 120 failed / 204 passed to **56 failed / 267 passed**, with 0 harness-caused failures.
- [x] The two 1000-run balance analyses are opt-in (`*.balance.ts`, `npm run test:balance`).
- [x] Tutorial store is synchronous (no `setTimeout` pacing), tracks `currentStepIndex`, exposes `tutorialActive`.
- [x] `npm run build:catalogue` → `src/database/catalogue.json` (12 plants, 12 birds, 4 pollinators, 30 interactions),
      built by `src/database/buildCatalogue.ts`. `catalogue.spec.ts` fails if the JSON is stale or links an
      unknown species. Plants carry `ecology` (flowering/fruiting seasons incl. ranges, nitrogen fixation,
      allelopathy); nectar, fruit and larval-host links stay in `interactions`. Adapter lifespan now in days.
- [x] `pollinator_species` table (Buff-tailed Bumblebee, Red Mason Bee, Common Blue, Marmalade Hoverfly) and
      `pollinator` / `larval_host` interaction types. Removed bird "pollination" rows that were wrong
      (goldfinches eat seeds) and made the wood pigeon an acorn predator; White Clover flowers late spring–summer.
- [ ] ~~Extend Rust `SpeciesDefinition` now~~ → moved into A1/A2, where the fields are first used.
- [x] Deleted the dead TS systems (Vegetation, Weather, Hydrology, Canopy, Pollinator, Interactions, Birds,
      BirdMapping, EngineWithDatabase), 23 unreachable old-layout components, `ComponentShowcase.vue`,
      `SqliteSimDB.ts`, `core/types.ts`, `utils/dropdown.ts` and the 13 tests that only tested them
      (8,867 lines). Rewrote the mixed tests (`simulation.e2e`, `cross_chunk_dispersal`,
      `engine_year_end_selection`, `vegetation_master_genome_germination`, `balance_analysis`) against the
      engine; the dispersal test was checked to fail when no seed crosses. Vegetative spread is lost for now and
      is ported to Rust in A2 (git history has the TS version).
- [x] `research_ui` tests: mount with the test's own Pinia, bind `wrapper`, find buttons by label, drop the
      deleted `ResearchPanel` tests. 15/15.

#### Remaining failures (23 of 263), by cause
| Cause | Tests | Action |
|---|---|---|
| Points/cooldown flows, `remainingCooldown` API drift | 8 | Rewrite with the seed economy in A5 |
| Research observation counts (4 vs 1, 20 vs 5) | 5 | Superseded by the KnowledgeStore in A4 |
| Year-end modal copy ("Average Vitality", "Select Best Specimen", "Excellent"), spy/count (2) | 5 | Update with the year-end redesign |
| Gameplay goal counts (2), diffusion threshold, intervention on chunk, death cause event | 5 | Triage next |

### A0.5. Engine speed (approved: fix before A1)
Measured on a 3×3 world after population saturates (576 organisms, 1,152 seeds): **~33 ms/tick**. The game's
6×6 world is ~4× that (~130 ms/tick), slower than the default 100 ms tick, and a 90-tick "Season" advance would
freeze for ~12 s. Rust's ecology plus serialization is ~6 ms; the rest is the full-world JSON round trip:

| Phase per tick | ms | Why |
|---|---|---|
| `syncRuntime` signature | ~10 | `JSON.stringify` of every chunk, only to detect edits made through the projection |
| Request encode/decode | ~8 | 2.7 MB snapshot back to JS every tick |
| `applyRuntimeResponse` | ~10 | Rebuild every chunk projection every tick |

- [x] **Lazy projection:** Rust `step { snapshot: false }` returns only tick, time and events
      (`StepResponse`, Rust test `step_without_snapshot_reports_time_and_events_only`). The engine keeps its
      WorldChunk mirror in `projection` and refreshes it on first read after a step.
- [x] **No per-tick signature:** edits are detected only for callers that took mutable chunks
      (`getChunk`/`getAllChunks`/`getChunksInArea`/`getChunksMap`), which switches the engine to its edit-safe
      mode for good (held references stay current). Engine-internal edits set `projectionEdited`. Unedited
      projections are never sent back, so a stale mirror can't roll Rust back.
- [x] New read-only API `readChunk`/`readChunks`; the view, `ChunkHex`, `GoalsSystem` and
      `SimulationChunkView` use it, so the game never enters edit-safe mode.
- [x] Goals/scenario/tutorial evaluation moved from `engine.onTick` to `evaluateProgress()` in the view's
      displayed tick; per tick it read statistics and pulled a full snapshot.
- [ ] ~~Batch ticks~~: not needed. A light step costs ~0.2–1.5 ms, so `advance(n)` stays a loop and year-end
      handling stays per tick.

**Results**
| Measure | Before | After |
|---|---|---|
| Bare tick, 3×3 saturated | ~33 ms | ~0.5 ms |
| Season (90 ticks), 6×6 saturated, bare engine | ~12 s (est.) | ~135 ms |
| Season in the app (research observation every 10 ticks) | — | ~780 ms ✓ (target < 1 s) |
| Full test suite | 286 s, 13 timeouts | 22 s, 0 timeouts |
| Tick that reads the world, 6×6 saturated | ~130 ms | 45–55 ms ✗ (target 16 ms) |

A read still costs Rust serializing a 7.4 MB snapshot (~17 ms) plus JSON parsing (~27 ms), and in the browser
the view holds the engine in a deep Vue `ref`, so every engine/chunk access goes through reactive proxies (a
refresh is ~66 ms there). Follow-ups:
- [ ] Compact genetics (7 trait objects repeating static fields plus mutation history, per plant and seed) when
      A6 reworks genetics for two-parent crossing; that is most of the 7.4 MB.
- [ ] Hold the engine in `shallowRef` and re-render the map from an explicit world-version signal. The deep
      proxy is currently what triggers hex re-renders, so this needs its own change.
- [ ] Research observation every 10 ticks pulls a snapshot; move it into the KnowledgeStore work (A4).

### A1. Time as the main control
Trial (2026-09-23): with the 12 catalogue plants loaded as-is on a 6×6 world for two years, Red Fescue takes
over (2,055 plants, hitting the chunk cap), moss and clover reproduce weakly, and no shrub or tree ever sets
seed; Bluebell and Scots Pine die out in year one. The adapter maps real values literally (e.g. oak flowers at
30% of max biomass 15 with growth 0.08), which takes decades of game days. A player sees 5–10 game years.

- [x] **A1.0 Catalogue species in the game.** `SpeciesRegistry` loads the 12 catalogue plants (170 lines of invented
      species removed); scenarios and `research-schema.sql` use real ids (Healing Fern → Lady Fern, Shadow Moss →
      Cushion Moss, Crimson Oak → English Oak; Drought Survival starts with grass, Hawthorn and Scots Pine).
      Balance layer in the adapter: maturity from the real `reproduction_age`, woody plants on a 5× clock
      (lifespan, maturity and growth), 60 seeds by default, 20 days of seed dormancy; Red Fescue tuned to 40 seeds
      (it spreads mostly by tillers). Rust scales seed output by `seedProduction` (120 = old rate) and damps
      germination by crowding from the same species. `applyScenarioConditions({ establishedSpecies })` starts
      adult plants. Fixed along the way: biomes came from a cold-hardiness heuristic (oak and beech were
      "boreal"); they now come from `biome_associations`, whose loader was overwriting temperate forest with
      forest-edge species.
      `catalogue_balance.spec.ts`: after 2 years Red Fescue ~40%, White Clover ~30%, Hawthorn ~16%, Bluebell ~14%,
      all setting seed; same shares across four seeds.
- [x] **A1.1 Phenology from the catalogue (Rust).** `ecology.floweringSeasons/fruitingSeasons/dormantSeasons` drive
      the stage; seeds only while fruiting; `maturityDays`; spring germination ×2; `flowering_started` and
      `seeds_ripe` events. New `dormant_season` column: Bluebell is a spring ephemeral (dormant summer–autumn,
      seed ripe end of spring). Dormant plants don't grow and take a quarter of environmental stress (winter too).
      Rust tests: `catalogue_phenology_flowers_and_seeds_only_in_listed_seasons`,
      `summer_dormancy_lets_spring_ephemerals_ride_out_drought`.
- [x] **A1.2 Time bar.** Play/Pause, Week (7 days), Season (to the first day of the next season). Week/Season run as
      a time-lapse (2 or 6 ticks per animation frame), stop at year end, then pause. `updateOnce` split into
      `engine.update()` + `refreshView()`.
- [x] **A1.3 Digest.** `src/game/digest.ts` `buildDigest()` (5 unit tests): season change, species lost, flowering and
      seed by hex count, notable spread/decline with the main cause, weather. Kit dialog after Week/Season with
      Inspect links that select the hex.

Follow-ups found in A1:
- [ ] A new game still opens on Red Fescue alone; the slice's starting meadow (established Fescue, Clover, Bluebell,
      Hawthorn) should be the default start. Belongs with the slice scenario.
- [ ] Legacy predetermined hybrids (Purifier Moss etc.) still name invented parents; the Modify intervention uses
      them. Remove with A6.
- [ ] The Recent Events list misses births during a time-lapse (it diffs species per refresh, not per tick);
      rebuild it from journal events with the knowledge store (A4).

### A2. Fauna that emerges
- [ ] Rust fauna system: per-hex populations per fauna species. Arrival probability rises with in-flower nectar
      plants, host plants, low pollution, temperature fit and neighbouring populations (the basis for later
      connectivity). Emit `ArrivedInHex` / `LeftHex` / `FirstSighting`.
- [ ] Rust interaction events: while a pollinator and a flowering plant share a hex, record visits (seeded
      probability × `interaction_strength`) and emit `InteractionObserved`. Pollination success feeds the
      existing reproduction factor (`systems.rs`, currently `0.3 + pollinator * 0.7`).
- [ ] Replace the fake `swift`/`robin`/`owl` birds with catalogue birds driven by fruit and seed availability.

### A3. Consequence first, numbers last
- [ ] Hex descriptor: a TS function maps biome state + flowering + fauna to a phrase ("A meadow in flower",
      "Dry, bare ground"). It replaces the stats-first tooltip header.
- [ ] Render fauna on hexes as small animated sprites (butterflies, bees, a bird), with counts proportional to
      population. Use kit-style art (extend `scripts/extract-ui-kit.sh` or add sprites).
- [ ] Move the overlays and numeric bars behind an "Inspect" / "Lens" toggle. The default view shows no numbers.

### A4. Knowledge store and Codex
- [ ] `KnowledgeStore` (Pinia, saved in snapshots): known species, known traits per species (revealed by
      observation), known interactions, hybrid pedigrees.
- [ ] Codex screen (replaces the Species dock tab and the field guide): Plants / Hybrids / Birds / Pollinators /
      Interactions with `known / total` counts (hybrids show `n / ???`). Entries show only known facts; unknown
      slots render as `?`.
- [ ] "New interaction discovered" toast on the first `InteractionObserved` for a pair.
- [ ] Interaction graph view built from known interactions only (plain SVG; no library needed at this size).

### A5. Collect and plant
- [ ] Seed inventory replaces resource points for planting. Clicking a hex with ripe plants (autumn) collects a
      limited number of seeds, and each seed keeps its parent's genetics.
- [ ] Planting spends a seed and places it in the chosen hex. Show the habitat fit as words ("likes it here",
      "too dry") before the player commits.

### A6. Hybridization v1
- [ ] Rust `cross(receiver, donor)`: per trait, blend by dominance plus mutation from the seeded RNG. The
      offspring gets a deterministic id derived from its parents and the RNG state, and is stored as a new
      species definition flagged `hybrid`.
- [ ] Pollen transfer is a player action between two plants in flower (spring or summer). The result is only a
      seed; the traits stay hidden until it grows and is observed.
- [ ] Name generator for hybrids (a descriptor word plus the parent genus, e.g. "Silver Thyme"). The Codex
      entry shows the pedigree.

**Milestone A acceptance:** from a fresh save, a player completes the full loop within about 30 minutes without
opening the Inspect lens. It's deterministic: the same seed and the same player commands give an identical
Codex. Rust has unit tests for fauna arrival, interaction events and crossing; TS has reducer tests for the
knowledge store.

---

## Milestone B: breadth and the restoration loop

- [ ] **Catalogue breadth:** 30+ plants, 15 birds, 15 pollinators, interactions to match (the CLAUDE.md
      target is 50+ species).
- [ ] **Connectivity:** in Rust, a habitat graph over hexes. Fauna dispersal needs connected suitable hexes, so
      corridors become buildable and a corridor that joins two forests triggers crossings and a digest line.
- [ ] **Ecosystem shift replaces collapse:** Rust tracks the limiting factor per species (drought, pollinator
      loss, pollution, competition). The collapse pause shows an "Ecosystem shift" dialog with the discovered
      causes, and Inspect/Continue buttons; the Restart framing goes.
- [ ] **Mysteries:** a restoration site seeds anomalies ("flowers never set seed here"). Each has a hidden
      cause: no pollinator reaches the area, groundwater depletion, or nectar with no larval host. It is
      solved when the causal condition changes, and the Codex logs the explanation.
- [ ] **Rare positive events:** seeded table in Rust (superbloom, butterfly migration, mast year, firefly
      emergence, temporary pond, spontaneous hybrid, ancient seed germination), weighted by conditions. These
      appear in the digest.
- [ ] **Restoration sites:** scenarios become untimed sites (degraded → pioneer → pollinators → birds →
      stable). Finishing one unlocks the next biome.

## Milestone C: depth

- [ ] **Named individuals:** rare or hybrid organisms get an id (#A17), age, parents, seeds produced and
      descendants, all in Rust. Codex entries for notable individuals, with a note when one dies of old age.
- [ ] **Adaptation:** the year-end selection becomes "propagate survivors". Show trait distributions per
      population across generations (a small histogram in the Codex), so drought tolerance visibly shifts
      over 5–6 generations.
- [ ] **Mini activities** (10–60 s each): photograph a new species (fills its Codex illustration), soil sample
      (reveals a hidden hex property), water sample, follow a pollinator (reveals one interaction),
      choose seed parents.
- [ ] **Workflow copy:** the guided workflow becomes Explore → Discover → Plant → Observe → Hybridize →
      Restore. Dock tabs become Overview · Codex · Seeds · Hybrids · Journal · Settings.

---

## Order and sizing

| Step | Layer | Size | Depends on |
|---|---|---|---|
| A0 foundations | build, Rust, tests | M | – |
| A1 time + seasons | Rust + Vue | M | A0 |
| A2 fauna + interactions | Rust | L | A0 |
| A3 consequence-first UI | Vue | M | A2 |
| A4 knowledge + Codex | TS + Vue | L | A2 |
| A5 collect/plant | Rust + Vue | M | A1 |
| A6 hybridization | Rust + Vue | L | A4, A5 |
| B | all | XL | A |
| C | all | L | B |

A1 and A2 can run in parallel after A0; so can A3 and A5.

## Risks

- **Performance:** fauna populations per hex per species add work each tick. Budget for this in A2 with the
  existing `estimatedChunkMs` metric; keep fauna per hex, not per individual.
- **Save compatibility:** new Rust components change `rustState`. Version the snapshot and drop old saves;
  migration isn't worth it at this stage.
- **Balance:** emergent arrival can feel random. Mitigate with the digest's explanations ("Bees need flowers
  in bloom nearby") and deterministic seeds for tuning.

## Review

_To be filled in after Milestone A._
