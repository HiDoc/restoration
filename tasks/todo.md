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
- [x] (C0.) Compact genetics (7 trait objects repeating static fields plus mutation history, per plant and seed) when
      A6 reworks genetics for two-parent crossing; that is most of the 7.4 MB.
- [ ] Hold the engine in `shallowRef` and re-render the map from an explicit world-version signal. The deep
      proxy is currently what triggers hex re-renders, so this needs its own change.
- [x] Research observation every 10 ticks pulls a snapshot; move it into the KnowledgeStore work (A4). Done:
      the store reads plants with `readChunks` once per displayed tick.

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
- [x] (Done with the starting meadow, then B2 sites.) A new game still opens on Red Fescue alone; the slice's starting meadow (established Fescue, Clover, Bluebell,
      Hawthorn) should be the default start. Belongs with the slice scenario.
- [x] (Removed in A6.) Legacy predetermined hybrids (Purifier Moss etc.) still name invented parents; the Modify intervention uses
      them. Remove with A6.
- [x] (C0.) The Recent Events list misses births during a time-lapse (it diffs species per refresh, not per tick);
      rebuild it from journal events with the knowledge store (A4).

### A2. Fauna that emerges
Today `pollinatorDensity` is a formula (diversity, canopy, light, pollution) and birds are three fake kinds
(swift/robin/owl from canopy and vitality). Replace both with animals that respond to what grows.

- [x] **A2.1 Fauna definitions.** `src/simulation/faunaDefinitions.ts` builds them from the catalogue; sent with the
      plant definitions. Birds forage 1 hex (2 if over 150 g); capacity per forage unit 0.6 for pollinators, 0.35
      for birds; bird pollution tolerance defaults to 0.5 (not in the bird table).
- [x] **A2.2 Populations (Rust).** `components.fauna` plus `fauna_system`: capacity from own forage + half the
      average within range, logistic growth, immigration, colonisation from beyond the map, unseen overwintering,
      larval-host requirement. Events `fauna_arrived`, `fauna_left`, `first_sighting`. Projection adds `fauna` and
      derives `pollinatorDensity`/`birds`/`birdsActivity` from real animals (fake swift/robin/owl removed).
- [x] **A2.3 Interactions.** Each bloom records how well it was pollinated while flowering (`pollinated`), which
      sets seed set when it fruits, so spring bee visits fill autumn Hawthorn berries. Fruit-eating birds raise the
      chance seed leaves the patch. `interaction_observed` once per hex, pair and season.
- [x] **A2.4 Vegetative spread.** `clonal_method` column (Red Fescue and Bracken rhizomes, White Clover stolons,
      Bluebell bulbs); `clonal_system` adds unchanged clones beside established plants, crowded like seedlings.
- [x] **A2.5 Tests.** Rust: bees only come to flowers they feed on (and replay exactly), butterflies settle only
      with their larval host, spring visits raise the autumn seed crop, runners spread a seedless plant.
      TS: `fauna_definitions.spec.ts`; the balance test also requires Bumblebee, Common Blue and Blackbird within two
      years (plants after two years: ~37% grass, 33% clover, 16% hawthorn, 15% bluebell). Dispersal test now uses
      a clover patch across three seeds (grass alone seeds too rarely once rhizomes fill a chunk).
- [x] **A2.6 Digest.** First sightings, pairs seen together, arrivals; at most 8 lines with "…and N more".

Follow-ups found in A2:
- [x] (A4: the digest reports only pairs new to the player.) Every "seen together" pair repeats each season; show only pairs new to the player once the knowledge store
      exists (A4).
- [ ] Pollinators reach all 36 hexes within a season of the centre flowering; revisit spread rates when the map
      has distinct habitats.
- [x] (A3; B3 wetland needs standing water.) Hex textures switch to wetland above 0.75 moisture, so most of the map turns to water every spring (A3).
- [x] (Done.) Default game start: make the slice meadow the new-game world (today a new game has grass only, so only
      finches come).

### A3. Consequence first, numbers last
- [x] **Hex description.** `src/game/hexDescription.ts` `describeHex()` (5 unit tests) replaces three copies of a
      moisture-based classifier. Habitat comes from what grows: blighted (pollution), bare, woodland/scrub (≥3 woody
      plants and ≥25% of the patch), dry grassland, meadow. It drives the tile (scrub uses the grassland tile with
      scattered trees), the info card title ("Bluebell meadow", "Common Hawthorn scrub") and a phrase
      ("Red Fescue and White Clover in flower. Seen here: Buff-tailed Bumblebee"). No wetland until the engine has
      standing water or the catalogue wetland plants; wet spring soil no longer turns the map to water.
      `src/game/speciesInfo.ts` gives names and kinds for plants and animals (the digest uses it too).
- [x] **Animals on the map.** Up to 6 sprites per hex, placed stably from a hash: bees and hoverflies loop,
      butterflies drift and flap (inline SVG; the kit has no butterfly), birds hop; still under reduced motion.
      Rust: a hex with no food of its own gets only a tenth of nearby food, so animals live where they feed instead
      of over bare ground.
- [x] **Measurements lens.** Replaces the Overlays panel, off by default. Off: the info card lists plants (with
      what they are doing) and animals; World Overview shows plant species, plants, bird and pollinator species,
      and bars without values. On: vitality/moisture/pollution/temperature readings, bar values and the six map
      overlays; switching off clears the overlay.

Follow-ups found in A3:
- [ ] Sprites are small at the 6×6 map scale; birds are rarely visible. Consider larger bird sprites or a flock
      marker.
- [ ] A kit-style butterfly (and hoverfly) illustration would replace the SVG stand-in and the reused bee icon.

### A4. Knowledge store and Codex
The research system counts per-organism "observations" every 10 ticks and unlocks traits at thresholds; the
player never sees an observation happen. The knowledge store replaces it with what the player witnesses.

- [x] **A4.1 Knowledge model.** `src/game/knowledge.ts`: plain JSON (saved with the game). `see(plantIds)` for plants
      on the map; `learn(events)` for `first_sighting`, `flowering_started`/`seeds_ripe` (the seasons a plant was
      seen flowering/fruiting), clonal `species_spawn` (spreads without seed), `interaction_observed`. Returns
      discoveries for toasts. Codex entries compare knowledge with catalogue truth: each fact slot is known or `?`.
- [x] **A4.2 Store.** Pinia `knowledgeStore`, fed from new journal events on each displayed tick; saved/loaded with
      snapshots. The digest keeps only pairs new to the player.
- [x] **A4.3 Codex.** Replaces the field guide and the Species dock tab: Plants / Pollinators / Birds /
      Interactions with known/total, entries with `?` slots and partners, and a graph of known links (plain SVG).
      Toast on each new species or interaction.
- [x] **A4.4 Retire the research system.** Research goals read a knowledge summary (species known, entries
      complete, interactions witnessed; "500 observations" becomes "witness 5 interactions"). Delete
      `ResearchSystem`, `researchStore`, `FieldGuidePanel`, `SpeciesDiscoveryModal`, the engine's periodic
      observation and their tests.

Done (2026-09-23). Full suite: 198 passed, 18 failed, all failures known before A4 (points economy → A5,
year-end copy, diffusion/death-cause singles). In the browser: toasts on discovery, digest lists only new pairs,
Codex tabs with `?` slots and the link graph.
Follow-ups found in A4:
- [ ] The graph is two columns of names; with many links it needs grouping or a force layout.
- [x] (C0: they open the Codex on the right tab.) Toasts do not link to the Codex entry they announce.

### A5. Collect and plant
Seeds are the only currency. Points, daily income and intervention costs go; cooldowns stay on the
environmental interventions (irrigate, cleanse, ritual, hybridize) so they cannot be spammed.

- [x] **A5.1 Rust inventory.** `World.inventory: Vec<Seed>`, saved with the world. Command `collect` on a hex
      takes one seed from each fruiting plant there whose seed has ripened (reserve ≥ 0.1, about ten days for a
      grass), up to 3 per species; the seed inherits the plant's genetics and the plant's reserve resets, so a
      harvest costs the wild seed rain and repeat visits wait for seed to ripen again. Nothing ripe → error.
      `plant` takes the oldest seed of that species and the plant inherits its genetics; no seed → error.
      `sync` accepts `addSeeds: {speciesId: count}` for the starter packet and rewards. The snapshot projects
      `inventory: {speciesId: count}`. Event `seeds_collected`.
- [x] **A5.2 Economy.** Deleted `GameplayEconomy`, points in `interventionStore`, costs in
      `InterventionManager`, `startingPoints`/`rewardPoints` in scenarios. New games start with 3 Goat Willow
      and 3 Silver Birch. A completed goal sends 3 seeds of the first catalogue plant neither on the map nor in
      the pouch.
- [x] **A5.3 UI.** A hex card with fruiting plants shows "Collect seeds". The pouch lists seeds in hand with
      counts. With Plant armed, clicking a hex shows the habitat fit in words (moisture, ground light,
      pollution, soil, from the engine's stress terms) and "Plant here"; nothing is spent until it is pressed.
      Intervention results appear as toasts (the store's message was previously shown nowhere).
- [x] **A5.4 Tests.** Rust: collect/plant inventory rules. `seed_economy.spec.ts` replaces
      `intervention_store`, `intervention_flow` and `complete_gameplay` (points-based); planting tests add seeds.

Done (2026-09-23). Full suite: 171 passed, 7 failed, all known (year-end copy 5, diffusion, death cause). The
old `simulationengine` failure (planted a non-existent `oak`) is fixed. In the browser: plant with fit words,
goal rewards bring distinct species, collect from ripe fescue.
Follow-ups found in A5:
- [ ] Collecting seed a plant gave only on fruiting start is impossible for about ten days; the hex card could
      say "ripening" instead of offering Collect until then.
- [ ] Reward toasts can be pushed out by a burst of discovery toasts after a Season.
- [x] (Removed in A6.) The legacy `hybridize` intervention still creates effect residues; A6 replaces it.

### A6. Hybridization v1
Decided 2026-09-23: only plants of the same genus cross, as in nature, so the catalogue gains real partner
species; hand-pollinated plants set hybrid seed on the plant, collected with A5's Collect.

- [x] **A6.1 Partner species.** SQLite + catalogue: Spanish Bluebell (*Hyacinthoides hispanica*), Midland
      Hawthorn (*Crataegus laevigata*), Downy Birch (*Betula pubescens*), Sessile Oak (*Quercus petraea*), with
      their pollinator, disperser and feeding links. The starting meadow gains an established Spanish Bluebell
      patch, a garden escape as in Britain, so a cross is possible in the first spring.
- [x] **A6.2 Rust crossing.** `SpeciesDefinition.genus` (adapter: first word of the scientific name) and
      `hybridOf` (base parent species). Command `cross {receiver, donor}` on a hex: both species flowering
      there, same genus, different species; else an error naming why. The receiver's first unpollinated
      flowering plant takes `pollen` (donor species + genetics) and full pollination. Every seed that plant
      sets this bloom (dropped or collected) is hybrid: species `hybrid_<base parents sorted>` (a backcross
      stays in the same hybrid taxon), created on first use with each numeric trait the mean of the base
      parents and flowering/fruiting seasons their union; genetics per trait uniform between the two parents
      from the seeded RNG, then the usual mutation. Pollen clears when the next bloom starts. Snapshot projects
      hybrid definitions. Remove the legacy `hybridize` command and habitat `hybrids` effect residues.
- [x] **A6.3 TS.** The engine registers hybrid definitions from the snapshot (parent's fields, Rust's
      blended values). `src/game/hybrids.ts`: deterministic name from the id (descriptor + the parents' last
      name word, "Dusk Bluebell"), pedigree text, genus compatibility for instant UI feedback. The player can
      rename; names live in the knowledge store and are saved. The Codex lists known hybrids under Plants with
      pedigree and a rename field. Delete `HybridizationSystem`, `HybridizationTree`, registry hybrid recipes
      and `WorldChunk` hybrids; the Modify button and its dock tab go.
- [x] **A6.4 UI.** The hex card offers "Cross-pollinate" when two or more species flower there: pick pollen
      donor and receiver among them, with the compatibility reason before committing. Toast on success.
- [x] **A6.5 Tests.** Rust: cross rules, hybrid seed and definition, backcross id, determinism and save/load.
      TS: names, Codex pedigree, rename persistence, registration from snapshot.

Out of scope, kept as follow-ups: genetics compaction (A0.5 follow-up); spontaneous wild hybrids between
co-flowering congeners (Milestone B rare events).

Done (2026-09-24). Full suite: 7 known failures only (year-end copy 5, diffusion, death cause); Rust 21 tests.
In the browser, from a fresh game: cross Bluebell × Spanish Bluebell in spring, collect "Mist Bluebell" seed
about ten weeks later, plant it (fit words apply), Codex entry with formula and pedigree, rename.
Follow-ups found in A6:
- [x] (B0.) Fauna forage links are keyed by plant id, so bees ignore hybrid bluebells and they set little seed.
      Hybrids should inherit their parents' links in `buildFaunaDefinitions`/Rust.
- [ ] Hybrid facts in the Codex are the parents' (union of seasons); nothing yet shows that individuals vary.
      Belongs with the trait histograms in Milestone C.

**Milestone A acceptance:** from a fresh save, a player completes the full loop within about 30 minutes without
opening the Inspect lens. It's deterministic: the same seed and the same player commands give an identical
Codex. Rust has unit tests for fauna arrival, interaction events and crossing; TS has reducer tests for the
knowledge store.

---

## Milestone B: breadth and the restoration loop
Decided 2026-09-24: sites are separate maps with one shared Codex and seed pouch (hybrids bred in one site can
restore another); three sites (meadow, woodland, wetland); cause tracking comes first because site stages and
mysteries both explain themselves through it.

- [x] **B0 Carry-over.** Hybrids inherit their parents' fauna links (bees visit hybrid bluebells).
- [x] **B1 Causes and ecosystem shift.** Rust names each plant's limiting factor from the stress terms it
      already computes (drought, waterlogging, cold, heat, shade, pollution, crowding, no pollinator, age) and
      projects the worst per species per hex. Death events carry that factor as their cause. The hex card says
      why a plant struggles ("struggling: too dry"). The collapse pause becomes an "Ecosystem shift" dialog
      listing the causes the player witnessed, with Inspect (the worst-hit hex) and Continue; Restart goes.
      Done (2026-09-24): limit = the stress costing the most health per day while health falls, or `old_age`
      past lifespan; "no pollinator" is derived in the projection for a fruiting bloom nothing visited. Death
      causes now: drought, waterlogging, cold, heat, shade, pollution, crowding, old_age. Wording in
      `src/game/causes.ts`. Browser: meadow hawthorn/clover read "no pollinator visits" in autumn; a polluted
      map ends in "Pollution took 74 plants: Spanish Bluebell and Bluebell." and Continue resumes time.
      Follow-up: the legacy TS update loop in `WorldChunk` (`CauseOfDeath`, `updateSpecies`) is dead code.
- [x] **B2 Restoration sites.** Replaces scenarios (`ScenarioSystem`, `scenarioStore`, `ScenarioSelector`,
      `ScenarioProgress` and their tests go).
  - [x] B2.1 `src/game/sites.ts`: each site has a map (size, seed), starting conditions, established plants,
        targets and the site it unlocks. Stages are shared and untimed: degraded → pioneers (plants cover a
        share of hexes) → pollinators (kinds visiting) → birds (kinds present) → stable (every target held at
        four season changes in a row). Reached stages stay reached. `surveySite(chunks)` measures a map.
        Sites for B2: the meadow (today's start) and a clear-felled woodland (bracken, a few old oaks and
        birches; target includes woodland birds). Wetland arrives with B3.
  - [x] B2.2 Rust sync accepts a whole `inventory` (seeds with genetics) so the pouch can travel, and the
        engine sends every registry species including bred hybrids, which are the player's to take along.
  - [x] B2.3 `profileStore`: current site, per-site progress, unlocked sites and the Codex, kept in
        localStorage across sites. Saves are per site (SimDB rows carry `siteId`). Travelling saves the
        current site, carries the pouch, then loads the target's latest save or founds it fresh.
  - [x] B2.4 UI: the right-hand card becomes the site: name, stage ladder with the next target in words,
        goals below, and "Sites" opens a selector (locked, stage reached, Travel). Reaching stable says so and
        unlocks the next site.
  - [x] B2.5 Tests: stage evaluation (including the four-season hold), survey, pouch travel with a hybrid
        seed, per-site saves.
      Done (2026-09-24). Browser: meadow card with stage ladder and next target; Sites dialog (locked site
      names what opens it); travel founds Felled Wood with woodland tiles, carries the pouch plus its starter
      seeds; travel back resumes the meadow save with the carried pouch; a reload resumes the current site.
      Fixed while testing: arriving now saves the site, so a reload keeps the pouch carried in.
      Follow-ups: goals are still per world and generic; the site card image is the old scenario art; a
      profile reset ("new journey") has no button yet.
- [x] **B3 Wetland hydrology.**
  - [x] B3.1 Rust: `Habitat.elevation` (0 low … 1 high, default flat 0.5) and `Biome.standing_water` (pond
        depth). Water moves between neighbours by head (soil moisture + standing water + elevation × relief),
        limited by what the source holds, so slopes drain into hollows; a flat map behaves as today. Soil past
        saturation becomes standing water, which evaporates faster than soil and dries in a hot summer. Deep
        drainage scales with elevation (a hollow keeps its water).
  - [x] B3.2 Flooding: species gain `floodTolerance` (SQLite column, adapter, Rust); standing water stresses a
        plant by `standing × (1 − floodTolerance)` as waterlogging. Goat Willow, Downy Birch and Lady Fern get
        real values; true wetland flora comes with B4.
  - [x] B3.3 TS: sites choose terrain (flat, basin); the engine writes elevation into the chunks it founds.
        Hex description gains `wetland` (saturated or shallow water with plants: "… marsh") and `open_water`
        ("Pond"), with the water tile; the moisture overlay shows standing water.
  - [x] B3.4 The Wet Hollow site: a drained basin (low moisture at founding) that refills from rain, starting
        with a few willows and birches; unlocked by Felled Wood.
  - [x] B3.5 Tests: Rust (a basin collects water and forms a pond on its floor; a flat map matches today; a
        pond dries in a hot spell; flood-intolerant plants die of waterlogging, tolerant ones do not), TS
        (habitats, terrain, site).
      Done (2026-09-24). Added while testing: surface runoff (standing water drains by elevation, so level
      ground sheds a downpour and only hollows hold it; without it rain drowned the flat meadow), and the
      basin's floor hexes sit at height 0. Browser: Wet Hollow's floor turns to marsh after its first spring;
      grass, birch and willow there read "waterlogged". Also fixed: a projected plant `limit` no longer sticks
      in the plant's record on sync; `engine_diffusion` compares against a same-weather twin.
      Follow-ups: the moisture overlay does not distinguish ponds; wetland flora comes with B4.
- [x] **B4 Catalogue breadth.** All real species with trait values from their ecology. Congeners only where
      they hybridise in the wild (the crossing rule is by genus).
  - [x] Plants 16 → 41 (the list below is 25 new). Meadow: Common Knapweed, Bird's-foot Trefoil, Oxeye Daisy, Yellow Rattle, Meadow
        Buttercup, Common Sorrel, Yarrow, Cowslip. Woodland: Primrose (× Cowslip → false oxlip), Wood Anemone,
        Hazel, Holly, Honeysuckle, Common Dog-violet, Bramble. Wetland: Alder, Marsh Marigold, Yellow Flag,
        Purple Loosestrife, Meadowsweet, Ragged-Robin, Grey Willow (× Goat Willow), Cuckooflower, Alder
        Buckthorn. Edge: Common Nettle.
  - [x] Pollinators 4 → 15: Red-tailed Bumblebee, Common Carder Bee, Tawny Mining Bee, Meadow Brown,
        Orange-tip, Small Copper, Brimstone, Peacock, Silver-washed Fritillary, Six-spot Burnet, Drone Fly;
        each butterfly and moth with its real larval host.
  - [x] Birds 12 → 15: Siskin (alder and birch seed), Reed Bunting, Reed Warbler (a summer migrant).
  - [x] Fauna builder: a bird's diet decides what it takes (a granivore on a tree takes seed, not insects);
        long-distance migrants are present in spring and summer only.
  - [x] Sites use the new flora: wetland starts with Grey Willow, Meadowsweet and Marsh Marigold patches and
        Yellow Flag seed; woodland gets Hazel, Primrose and Wood Anemone.
  - [x] Tests: catalogue integrity (every butterfly has a host in the catalogue, every link names real
        species), balance of the starting meadow, counts in Codex tests.
      Done (2026-09-24): 41 plants, 15 birds, 15 pollinators, 131 interactions. Every site as founded holds
      its plants for two years, sets seed and draws animals (`catalogue_balance.spec` per site; the wetland
      draws Reed Warbler and Reed Bunting, Siskin once Alder is sown). Codex shows 41 / 15 / 15.
      Follow-ups: moth and butterfly sprites share the SVG stand-in; Alder, a N-fixer, does not yet enrich soil
      (no engine effect for nitrogen fixation).
- [x] **B5 Connectivity.**
  - [x] B5.1 Rust: hexes holding plants are habitat. Two habitat hexes are linked for an animal when they lie
        within its foraging range of each other. Animals spread only along links, and new ones arrive from
        beyond the map only into habitat linked to the border (within range of the edge). A patch cut off by
        bare ground waits for a corridor; a bumblebee (range 2) crosses a gap a Common Blue (range 1) cannot.
  - [x] B5.2 Landscape patches (plant-holding hexes, touching neighbours): when a hex newly holding plants
        joins two patches of at least two hexes each, emit `corridor_formed`. Patch labels are saved with the
        world so a load does not re-announce.
  - [x] B5.3 TS: digest line "A corridor now joins two patches of habitat" with Inspect.
  - [x] B5.4 Tests: an isolated patch gets bees but not a range-1 butterfly until a corridor reaches it; the
        corridor event; every site as founded still draws its animals (the balance spec).
      Done (2026-09-24). Effect on the sites as founded: the meadow still draws Common Blue within two years
      (cover spreads to the edge); in Wet Hollow the short-range, spring-only Tawny Mining Bee no longer
      arrives within two years until cover links the hollow to the edge.
      Follow-ups: the map does not yet show which hexes are cut off; a hint on the hex card ("no way in for
      butterflies") would make corridors discoverable.
- [x] **B6 Mysteries.** Each site has one anomaly with a cause the simulation really produces, checked by
      probing the sites before authoring (a pond that dries each summer and fritillaries on bramble were
      dropped: shade does not keep the pond, and fritillaries arrive too rarely to rely on).
  - [x] `src/game/mysteries.ts`: a mystery has a question, a clue, an explanation, and two predicates over
        the site's map and season: noticed (the symptom) and solved (the cause gone). Pure and testable.
        - Old Meadow: "Clover blooms everywhere, so why do no Common Blues come?" Isolation: the butterfly
          flies only a hex, and the meadow is an island until cover reaches the edge.
        - Felled Wood: "Why is the wood silent all summer?" No summer nectar: oak, birch, hazel and bracken
          feed no bees. Solved by two kinds of pollinator in a summer (bramble, honeysuckle).
        - Wet Hollow: "The willows flower in early spring, so why do their catkins set no seed?" Spring bees
          cannot reach the hollow; solved when a later crop is mostly pollinated.
  - [x] Knowledge records each mystery (noticed, solved) with the Codex in the profile; toasts on both.
  - [x] Codex "Mysteries" tab: the question, the clue while open, the explanation once solved.
  - [x] Tests: predicates on made-up maps; notice-then-solve in the knowledge reducer; the meadow's mystery
        appears in the first summer and resolves by the second year in a real run.
      Done (2026-09-24). Browser: the first summer in the Old Meadow brings "A mystery: Clover blooms all over
      the meadow…" and the Codex's Mysteries tab lists it with its clue.
      Follow-ups: all three causes are about pollinators and reach; a water or soil mystery needs a mechanic
      the player can change (e.g. a pond that can be deepened). The clue shows at once rather than after a
      season unsolved.
- [x] **B7 Rare events.** At most one per season, rolled from the world's seeded RNG at the season's start
      among the events whose conditions hold; each has a real effect in the engine.
  - [x] Rust `rare_events.rs`:
        - Superbloom (spring, after a wet winter): buried seed germinates three times as readily all spring.
        - Mast year (autumn, three or more trees fruiting): trees set three times the seed this autumn.
        - Butterfly migration (summer, warm): butterflies arrive where their nectar flowers, regardless of
          reach.
        - Temporary pond (spring or autumn): a downpour leaves standing water in the lowest hex.
        - Spontaneous hybrid (two congeners flowering in one hex with a pollinator present): the insects do
          what the player does by hand.
        - Ancient seed (a bare hex): a species absent from the map whose moisture needs the hex meets
          sprouts there.
        Timed effects are saved with the world. `trigger_rare_event` lets tests (and later tools) force one.
  - [x] TS: `src/game/rareEvents.ts` words each event; the digest shows it and a toast announces it.
  - [x] Tests: each event's effect and condition in Rust; at most one per season and deterministic over
        years; digest wording.
      Done (2026-09-24). A season brings an event with chance 0.25, chosen among those whose conditions hold.
      Browser: the Old Meadow's first summer brought "Honeysuckle sprouted from seed buried long ago." in the
      digest, a toast, and a new Codex entry. The balance cap on one species' share went from 0.5 to 0.6: rare
      events shift the RNG, and the wetland (a drained pasture) came out at 50.1% grass; the check is for
      monocultures.
      Follow-ups: the ancient seed can bring any absent species whose moisture needs the hex meets, including
      trees into a meadow; it could favour the site's own flora.

## Milestone C: depth

Decided 2026-09-24: selection happens through play (the yearly seed-selection pause and its master-genome
machinery go); activities are the ★ items from the activity list given that day, with the rest in the backlog
below. Two rules for every activity: it takes 10–60 s of real time with the simulation paused, and it
reveals knowledge the player then holds (estimates and words), not the engine's raw values.

### C0. Foundations
- [x] **Compact genetics** (the A0.5 follow-up): Rust genetics become `{traits: {id: value}, generation,
      parents}` instead of seven objects repeating static fields plus a mutation log. Keep the five traits the
      engine uses (drought tolerance, cold resistance, growth efficiency, reproductive vigour, nutrient
      efficiency) and drop the two it never reads. Old saves convert on load. Expected: the snapshot shrinks
      several-fold, and ticks that read the world get faster.
- [x] **Retire the year-end selection:** `YearEndSeedSelection`, the engine's master/pending genomes and
      selected seeds, the TS `GeneticSystem`, and their tests (`yearend_workflow`, `engine_year_end_*`,
      `vegetation_master_genome_germination`, `genetic_mutation_coverage`). Seasons no longer stop at day 360.
- [x] **Provenance:** a seed records its mother, father (if crossed) and the site it was collected on.
- [x] **Follow-up sweep:** the Recent Events list rebuilt from journal events (it misses births during a
      time-lapse); toasts link to their Codex entry.
      Done (2026-09-24). Found while measuring: since A0 every plant's traits reached Rust as `{}` (the TS
      genome kept traits in a `Map`, which JSON turns into an empty object), so all plants had ordinary traits
      and nothing heritable varied; only the mutation log grew. Now founders get slightly varied traits from
      the seeded RNG and seeds inherit real values. A plant's record is therefore larger than the old empty one
      (≈640 vs ≈440 bytes in the projection; a snapshot takes ~2 ms either way), so the planned size saving
      does not apply. Rare events can be switched off per world (`rareEvents`) so each mechanic's Rust test
      runs without them. Full suite: 184 passed, 0 failed.

### C1. Individuals: mark & revisit ★
- [x] Rust `tags`: a record per tagged plant, kept after it dies: label (#M17, the site's initial and a
      number), species, why it was tagged (planted / hybrid / chosen), optional name, seeds set, descendants
      that germinated, and its death (day, cause, age). Planting tags the plant; a cross-pollinated seed that
      germinates is tagged as a hybrid; command `tag {instanceId, name?}` tags any plant or names a tagged one.
      Event `tagged_died`.
- [x] **Journal** (dock tab and modal): each tagged plant with its label and name, species, where it grows,
      age, stage and health in words, parents (by label when tagged), seeds set, descendants; the dead below
      with their cause. Rename in place.
- [x] Hex card: "Tag" beside each plant kind tags its oldest untagged plant there.
- [x] Toast on a tagged plant's death ("#M17, your Sessile Oak, died of drought at 12 years"), opening the
      Journal.
- [x] Tests: Rust (planting tags; seeds and descendants counted; death recorded once; a crossed seedling is
      tagged; names), TS (journal wording).
- Done: 41 Rust and 187 TS tests pass. In the browser, a planted Goat Willow shows as "Planted by you"; tagging a
      Red Fescue from the hex card keeps the Plant tool armed; renaming works; statuses update as time passes.

### C2. Seed collecting ★ and choosing seed parents ★
- [x] Collect opens a panel of the ripe plants in the hex, each with its traits in words ("hardy in drought",
      "vigorous"), never the values. Built: a trait shows only when it is at least 0.1 from the ordinary 0.5;
      the rest read "ordinary for its kind". (Not built: words that depend on what the player has watched.)
- [x] The player picks which plants give seed (`collect {instanceIds}`, one seed per plant). A seed's
      viability is 0.35 + 0.6 × how ripe its plant was (0.41 barely ripe … 0.95 fully ripe; packet seed
      0.95); planting rolls it, and a dead seed is spent with "did not come up".
- [x] **Adaptation in the Codex:** each plant card at the current site has "How they have changed here":
      per trait, the spread now against the spread first recorded (a per-species baseline the engine takes at
      the first season start with 5+ plants), with the direction of any shift in words. (Changed from "a
      generation ago": generations run from months to decades, so "since first recorded" is what compares.)
      Probe: held at moisture 0.30, mean drought tolerance rose 0.51 → 0.59 in 8 years (0.25: 0.54 → 0.62),
      control flat at 0.505; kept as a Rust test.
- Done: 42 Rust and 191 TS tests pass. In the browser, the panel listed two ripe clovers ("hardy in drought",
  "slow-growing"); collecting the first gave one seed, which, taken while ripening, did not come up; the
  Codex showed the hawthorn's spread per trait.

### C3. Hybrid notebook ★
- [x] Before crossing, the player predicts each trait of the offspring (lower, between, higher than the
      parents). After the seed germinates and the plant is tagged, the notebook compares prediction and outcome.
      Built: Cross-pollinate opens a panel of the flowering plants in the hex (with their traits in words); the
      player picks the seed plant and the pollen plant (only compatible fathers are offered) and may predict any
      trait. `cross {mother, father, prediction}` keeps a notebook record with both parents' traits; the first
      5 seedlings of that pair are noted with theirs. The Journal's "Hybrid notebook" tab shows per trait the
      prediction, how the seedlings fell ("2 between, 1 higher") and whether most matched.
- [x] Also: plants of one species now cross (choosing seed parents within a species); their seedlings are
      tagged "From your cross". Insects' congener crosses (B7) are unchanged.
- Note: seedlings blend their parents with an occasional mutation, so "between" is usually right; the notebook
  teaches that, and mutation is what breaks out of the parents' range.
- Done: 43 Rust and 194 TS tests pass. In the browser, a Bluebell × Spanish Bluebell cross with two
  predictions appears in the notebook, waiting for its seed.

### C4. Measuring the land
- [x] **Soil & water samples ★:** the Measurements toggle and its overlays are gone (the Climate and Hydrology
      tabs keep theirs; the overview shows bars only). "Take a soil & water sample" on the hex card reads pH (with
      its class), moisture, nutrients, pollution and standing water, shown as that reading with its day, and
      "changed since sampling" once any moved by more than 0.15 (pH 0.3). Rust: `Biome.ph`, set per hex from the
      site (meadow 6.5, woodland 5.6, wetland 6.8, ±0.3 by hex); species' catalogue `pHRange` now stresses
      plants off it (0.3 per pH unit, limit `soil_ph`, "the wrong soil"). Existing worlds default to 6.5, inside
      every catalogue range.
- [x] **Water tracing ★:** "Trace the water" follows the strongest outflow hex by hex until the water stops,
      drawn on the map with a moving marker and told in words. Rust projects each hex's `outflow` (per day, to
      each neighbour) from the diffusion step.
- [x] **Seed germination tray ★:** each sample starts a tray of the hex's soil; every buried seed comes up in it
      as often as it is viable. After 14 days the card lists the species (no counts) and a toast says so.
- Done: 46 Rust and 198 TS tests pass. In the browser: a sample of (3, 3) read pH 6.8, neutral; its tray came
  up after two weeks with a toast; a trace from (1, 2) ran to (1, 1) on the map.

### C5. Watching
Decision (2026-09-30): watching reveals. Interactions are no longer learned passively ("Seen together" goes);
birds are no longer sighted on arrival (pollinators still are, on flowers). Unknown animals show as "an
unfamiliar bird / insect", heard ones as "(heard)"; digests name only animals the player knows.
- [x] **Follow a pollinator ★:** "Follow" beside a seen pollinator in the hex card pauses time; the insect
      flies (animated on the map) to a neighbouring hex where its food is on offer, then vanishes from view;
      clicking that hex within 6 s keeps up. Each landing kept up with records the feeding seen there as an
      interaction; keeping up for 4 hops also records its habitat ("Found in: dry grassland") in the Codex.
      Losing it ends the follow.
- [x] **Field photography ★:** "Photo" beside an animal or plant frames it against the hex's tile. An animal
      with its food on offer in the hex is usually caught feeding ("nectaring on White Clover"): that records the
      interaction; any photo of an animal is a sighting (the way birds are now seen). Photos go to a Journal
      "Photos" tab (newest 24 kept).
- [x] **Sound listening ★:** "Listen" on the hex card hears the birds and insects in the hex and its
      neighbours; unseen ones enter the Codex as "Heard, not yet seen" until a sighting.
- [x] **Phenology journal ★:** "Note in calendar" records, for this site and year, the first flower, first
      fruit and first arrival the player notices in the hex (the day they noted it); a Journal "Calendar" tab
      lists them per species and year.
- [x] Tests: knowledge (no passive interactions or bird sightings; heard; photo; notes), follow hops, digest.
- Done: 204 TS tests pass (Rust unchanged, 46). In the browser: listening near (3, 3) heard nothing (no animals
  yet in week 2); "Note in calendar" noted five first flowers; a photo of the Buff-tailed Bumblebee ("resting
  on a leaf") landed in the Photos tab; following it kept up for 4 hops, recorded three interactions and "Found
  in: meadow" in the Codex. Heard-not-seen is covered by tests only (no birds had arrived).

### C6. Common garden experiment ★
- [ ] Plant seed of one species from different sites (provenance, C0) side by side in one hex; the Journal
      compares the tagged plants over seasons, separating inherited differences from where they grew.

### C7. Fungi and fungal inspection ★
- [ ] New kingdom: real mycorrhizal and saprotrophic fungi (Fly Agaric with birch, Penny Bun with oak and
      beech, Chanterelle, Honey Fungus, Candlesnuff), their host links, and an engine effect (mycorrhizal
      partners improve nutrient uptake and drought tolerance; fruiting bodies in autumn). The catalogue's
      `mycorrhizal_association` flag is where this starts.
- [ ] Inspecting fruiting bodies in autumn discovers the fungus and its plant partners.

### C8. Workflow copy
- [ ] The guided workflow becomes Explore → Discover → Plant → Observe → Hybridize → Restore. Dock tabs become
      Overview · Codex · Seeds · Journal · Sites · Settings.

**Order:** C0 first. C1 → C2 → C3 → C6 build on individuals and provenance. C4 and C5 depend only on C0 and
can run alongside. C7 is the largest and last. Each step is probed in the simulation before its content is
written, as the mysteries were.

### Backlog: further activities
Quadrat survey, bird watching, track identification, flower observation, seed dispersal watching, rain
observation, canopy light survey, pollinator count, propagation, transplanting, pruning, deadwood placement,
pond shaping (would give Wet Hollow a water mystery the player can solve), stone arrangement, nest box, insect
hotel, compost observation, root inspection, pollen microscopy, seed sorting, reciprocal transplant, map
sketching, night survey (needs nocturnal species), seasonal comparison. Name a hybrid exists since A6.

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
| C0 foundations | Rust + TS | M | B |
| C1 individuals | Rust + Vue | M | C0 |
| C2 seed collecting + adaptation | Rust + Vue | M | C1 |
| C3 hybrid notebook | Vue | S | C2 |
| C4 measuring | Rust + Vue | M | C0 |
| C5 watching | Vue | M | C0 |
| C6 common garden | Vue | S | C1, C2 |
| C7 fungi | data + Rust + Vue | L | C0 |
| C8 workflow copy | Vue | S | – |

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
