/**
 * Main simulation engine orchestrating all systems
 */

import catalogue from '../database/catalogue.json';
import { buildFungusDefinitions } from './fungusDefinitions';
import { buildFaunaDefinitions } from './faunaDefinitions';
import { RNGManager } from './SeededRNG';
import { EventJournal, EventType } from '@/simulation/EventJournal';
import { WorldChunk, PhenologyStage, SpeciesInstance } from './WorldChunk';
import { SpeciesRegistry, BiomeType } from './SpeciesRegistry';
import { markRaw } from 'vue';
import { RustSimulationRuntime, encodeSimulationState, decodeSimulationState, type RuntimeResponse, type RuntimeSnapshot } from './rust/SimulationRuntime';
import { InterventionManager, type InterventionType } from './InterventionManager';
import type { Tag } from '@/game/journal';
import type { Baseline } from '@/game/traits';
import type { Cross } from '@/game/notebook';

// Animals come from the same catalogue as the plants.
const FAUNA = buildFaunaDefinitions(catalogue);
const FUNGI = buildFungusDefinitions(catalogue as any);

export interface SimulationConfig {
  worldWidth: number;      // Number of chunks horizontally
  worldHeight: number;     // Number of chunks vertically
  chunkSize: number;       // Size of each chunk in game units
  tickRate: number;        // Ticks per second
  masterSeed: number;      // Seed for deterministic simulation
  maxActiveChunks: number; // Observation/viewport selection limit; all chunks evolve
  seasonLengthTicks?: number; // Ticks per season (quarter year)
  // Time scale: minutes of simulated time per engine tick (default 1440 = 1 day)
  timePerTickMinutes?: number;
  /** The restoration site this world is; the engine records it on the seed plants set. */
  site?: string;
  // Legacy diagnostics settings. They never skip ecological updates in Rust.
  updateBudgetMs?: number;
  chunksPerTick?: number;
}

export interface PlayerIntervention {
  chunkId: string;
  x: number;
  y: number;
  type: InterventionType;
  data: any;
  playerId?: string;
  /** Omit to apply now; future ticks are replayable scheduled commands. */
  tick?: number;
}

export class SimulationEngine {
  private config: SimulationConfig;
  private rngManager: RNGManager;
  private eventJournal: EventJournal;
  // Optional species data adapter (DB-backed). Typed as any to avoid bundling DB deps in browser.
  private speciesAdapter?: any;
  // Interactions system (optional, available when DB adapter is set)
  private runtime: RustSimulationRuntime;
  private runtimeSnapshot?: RuntimeSnapshot;
  // Rust owns the world; `projection` mirrors it as WorldChunks. Refreshing the mirror is a full-world JSON
  // copy, so it happens lazily on read, except while callers hold mutable chunks (see grantMutableAccess).
  private projection: Map<string, WorldChunk> = new Map();
  private projectionStale = false;
  private projectionEdited = false;
  private mutableAccess = false;
  private projectionSignature = '';
  private runtimeMinutes = 1440;
  private timer: ReturnType<typeof setTimeout> | undefined;

  // Genetics management

  // Intervention management (for player actions with costs/cooldowns)
  public interventionManager?: InterventionManager;

  // Seeding controls for center area
  private readonly centerSeedAreaRadius: number = 1; // 3x3 chunks
  private readonly centerSeedsPerChunk: number = 3;
  
  // World state
  private activeChunks: Set<string> = new Set();
  
  // Timing
  private currentTick: number = 0;
  // lastUpdateTime is not used with setTimeout scheduling
  private isRunning: boolean = false;
  private targetDeltaTime: number;
  // Day length tracking moved to simTimeDays/dayFraction; keep no per-tick day length
  private readonly seasons = ['spring','summer','autumn','winter'] as const;
  // Simulated time accumulator in days
  private simTimeDays: number = 0;
  private timePerTickMinutes: number = 1440;
  private yearLengthDays: number;
  private tickCallbacks: Array<(tick: number) => void> = [];

  // Performance monitoring
  private updateTimes: number[] = [];
  private maxUpdateTimeHistory = 60; // Keep 1 second of history at 60fps
  // Rolling offset so different chunks are updated first each tick when chunk capping is enabled

  // Adaptive scheduling
  private estimatedChunkMs = 0.1; // EWMA estimate of per-chunk update time (ms)
  private lastUpdatedChunks = 0;  // How many chunks were updated last tick
  private scheduledLimit = 0;     // Planned chunks for current tick

  /** The projection as of the latest Rust tick. */
  private get chunks(): Map<string, WorldChunk> {
    this.refreshProjection();
    return this.projection;
  }

  private refreshProjection(): void {
    if (this.projectionStale) this.applyRuntimeResponse(this.runtime.request({ op: 'snapshot' }));
  }

  private chunkAt(x: number, y: number): WorldChunk | null {
    return this.chunks.get(`chunk_${x}_${y}`) ?? null;
  }

  /**
   * Callers of the mutable accessors may edit chunks in place (the legacy editing API). From then on the engine
   * refreshes the projection every tick and diffs it for edits, a full-world copy per tick. Read-only callers
   * use readChunk/readChunks, which keep ticks cheap.
   */
  private grantMutableAccess(): void {
    if (this.mutableAccess) return;
    this.mutableAccess = true;
    this.projectionSignature = this.signature();
  }

  private signature(): string {
    return encodeSimulationState(Array.from(this.chunks.values(), chunk => chunk.exportState()));
  }

  constructor(config: SimulationConfig) {
    this.config = { ...config };
    this.validateConfig(this.config);
    this.runtime = markRaw(new RustSimulationRuntime());
    this.targetDeltaTime = 1000 / config.tickRate; // ms per tick
    // Default: 1 season = 90 days (quarter year)
    if (!this.config.seasonLengthTicks) this.config.seasonLengthTicks = 90;
    // Time per tick (minutes); default 1 day
    this.timePerTickMinutes = this.config.timePerTickMinutes ?? 1440;
    this.yearLengthDays = (this.config.seasonLengthTicks ?? 90) * 4;
    
    // Initialize core systems
    this.rngManager = RNGManager.create(config.masterSeed);
    this.eventJournal = new EventJournal(() => this.currentTick);

    // Initialize world chunks
    this.initializeWorld();
    this.initializeRuntime();
    
    this.eventJournal.recordEvent(EventType.SIM_START, {
      config: this.config,
      timestamp: this.currentTick
    });
  }

  /**
   * Initialize world chunks
   */
  private initializeWorld(): void {
    const worldRNG = this.rngManager.getRNG('world_generation');
    
    for (let x = 0; x < this.config.worldWidth; x++) {
      for (let y = 0; y < this.config.worldHeight; y++) {
        const chunkSeed = worldRNG.nextInt(0, 0xFFFFFFFF);
        const chunk = new WorldChunk(x, y, chunkSeed);
        
        // Initialize with some variety in biome states
        this.initializeChunkBiome(chunk, worldRNG);
        
        this.chunks.set(chunk.id, chunk);
        // Provide neighbor access hook for seeding between chunks
        (chunk as any).__getChunk = (cx: number, cy: number) => this.chunkAt(cx, cy);
        // Provide event emission hook for systems operating on chunks
        (chunk as any).__emitEvent = (type: EventType, data: any) => {
          this.eventJournal.recordEvent(type, data, chunk.id)
        }
      }
    }

    // If a DB-backed species adapter has been set already, seed initial species
    if (this.speciesAdapter) {
      this.seedInitialSpeciesFromAdapter();
    }

    // Ensure a baseline of common grass presence across the world
    this.ensureCommonGrassBaseline();

    // Place initial seeds in 3x3 area centered at world start
    this.seedCenterArea('common_grass', { clearExistingSpeciesSeeds: true, maturityTicks: 2, viability: 0.95, seedsPerChunk: this.centerSeedsPerChunk });
  }

  /**
   * Initialize chunk with varied biome state
   */
  private initializeChunkBiome(chunk: WorldChunk, rng: any): void {
    // Add some initial variety to the world
    const biomeVariation = {
      vitality: rng.nextFloat(0.3, 0.7),
      soil: rng.nextFloat(0.4, 0.8),
      moisture: rng.nextFloat(0.2, 0.6),
      diversity: rng.nextFloat(0.1, 0.4),
      canopy: rng.nextFloat(0.0, 0.3),
      pollution: rng.nextFloat(0.0, 0.2),
      invasion: rng.nextFloat(0.0, 0.3),
      succession: rng.nextFloat(0.1, 0.4)
    };
    
    chunk.biomeState = biomeVariation;
    
    // Set climate based on position (simple gradient)
    const centerX = this.config.worldWidth / 2;
    const centerY = this.config.worldHeight / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(chunk.x - centerX, 2) + Math.pow(chunk.y - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Temperature gradient (cooler at edges)
    const baseTemp = 25 - (distanceFromCenter / maxDistance) * 15;
    chunk.climateState.temperature = baseTemp + rng.nextGaussian(0, 3);
    
    // Light varies with latitude (Y position)
    const latitudeFactor = Math.abs(chunk.y - centerY) / centerY;
    chunk.climateState.light = Math.max(0.2, 1.0 - latitudeFactor * 0.3);
  }

  /**
   * Integrate a DB-backed species adapter. This replaces the registry's species
   * with the adapter-provided set and seeds initial species into chunks based on biome.
   * Note: Adapter type intentionally loose to avoid pulling sqlite into browser bundles.
   */
  async setSpeciesAdapter(adapter: any): Promise<void> {
    this.speciesAdapter = adapter;

    try {
      const dbSpecies = (typeof adapter.getAllVegetalSpecies === 'function')
        ? adapter.getAllVegetalSpecies()
        : [];
      SpeciesRegistry.getInstance().importData({ species: dbSpecies });
    } catch (e) {
      console.warn('Failed to import species from adapter:', e);
    }

    // Seed initial species in the world using the adapter
    this.seedInitialSpeciesFromAdapter();
    this.syncRuntime(true);
  }

  /** Determine a coarse biome type for a chunk using its current climate/state. */
  private determineBiomeType(chunk: WorldChunk): BiomeType {
    const t = chunk.climateState.temperature;
    const m = chunk.biomeState.moisture;
    const c = chunk.biomeState.canopy;
    if (t <= 5) return BiomeType.BOREAL_FOREST;
    if (m < 0.25 && c < 0.2) return BiomeType.GRASSLAND;
    if (m > 0.75) return BiomeType.WETLAND;
    return BiomeType.TEMPERATE_FOREST;
  }

  /** Use the adapter to seed a few starting species per chunk according to biome. */
  private seedInitialSpeciesFromAdapter(): void {
    this.projectionEdited = true;
    if (!this.speciesAdapter) return;
    const rng = this.rngManager.getRNG('initial_seeding');
    const registry = SpeciesRegistry.getInstance();

    this.chunks.forEach((chunk) => {
      // Avoid double seeding
      if (chunk.species.size > 0) return;
      const biome = this.determineBiomeType(chunk);
      let ids: string[] = [];
      try {
        ids = this.speciesAdapter.getSpeciesForBiome(biome) || [];
      } catch {}
      if (ids.length === 0) return;

      // Seed 3-7 instances per chunk
      const count = Math.max(3, Math.min(7, Math.floor(rng.nextFloat(3, 8))));
      for (let i = 0; i < count; i++) {
        const speciesId = ids[Math.floor(rng.nextFloat(0, ids.length))];
        const def = registry.getSpecies(speciesId);
        if (!def) continue;
        const inst: SpeciesInstance = {
          id: `inst_${speciesId}_${chunk.x}_${chunk.y}_${i}`,
          speciesId,
          x: rng.nextFloat(0.05, 0.95),
          y: rng.nextFloat(0.05, 0.95),
          biomass: Math.min(0.5 * def.maxBiomass, Math.max(0.1, def.maxBiomass * rng.nextFloat(0.05, 0.15))),
          age: Math.floor(rng.nextFloat(0, def.lifespanTicks * 0.05)),
          phenologyStage: PhenologyStage.VEGETATIVE,
          health: rng.nextFloat(0.6, 0.95),
          reproductiveOutput: 0,
          reproductiveUrge: 0,
          lastReproductionAttempt: 0,
        };
        chunk.addSpecies(inst);
      }
    });
  }

  /** Ensure at least 3 Common Grass individuals in each chunk on init. */
  private ensureCommonGrassBaseline(): void {
    this.projectionEdited = true;
    const registry = SpeciesRegistry.getInstance();
    const grass = registry.getSpecies('common_grass');
    if (!grass) return;
    const rng = this.rngManager.getRNG('baseline_grass');

    const centerChunks = new Set(this.getCenterAreaChunks(this.centerSeedAreaRadius).map(ch => ch.id));

    this.chunks.forEach((chunk) => {
      const isCenterChunk = centerChunks.has(chunk.id);

      // Remove common grass outside the center area to keep the opening clean.
      if (!isCenterChunk) {
        const idsToRemove: string[] = [];
        chunk.species.forEach((inst, id) => {
          if (inst.speciesId === 'common_grass') idsToRemove.push(id);
        });
        idsToRemove.forEach(id => chunk.species.delete(id));
        return;
      }

      // For center chunks, keep exactly three individuals.
      const existingGrass = Array.from(chunk.species.values()).filter(inst => inst.speciesId === 'common_grass');

      if (existingGrass.length > 3) {
        const surplus = existingGrass.length - 3;
        const toCull = existingGrass
          .sort((a, b) => a.biomass - b.biomass)
          .slice(0, surplus);
        toCull.forEach(inst => chunk.species.delete(inst.id));
      } else if (existingGrass.length < 3) {
        const toAdd = 3 - existingGrass.length;
        for (let i = 0; i < toAdd; i++) {
          const inst: SpeciesInstance = {
            id: `grass_${chunk.x}_${chunk.y}_${existingGrass.length + i}`,
            speciesId: 'common_grass',
            x: rng.nextFloat(0.3, 0.7),
            y: rng.nextFloat(0.3, 0.7),
            biomass: Math.max(0.05, grass.maxBiomass * rng.nextFloat(0.08, 0.15)),
            // The world opens on an existing meadow, so its grass is already old enough to flower.
            age: (grass.maturityDays ?? 0) + Math.floor(rng.nextFloat(0, grass.lifespanTicks * 0.05)),
            phenologyStage: PhenologyStage.VEGETATIVE,
            health: rng.nextFloat(0.75, 0.95),
            reproductiveOutput: 0,
            reproductiveUrge: 0,
            lastReproductionAttempt: 0,
          };
          chunk.addSpecies(inst);
        }
      }
    });
  }

  /**
   * Get current simulation year
   */
  getCurrentYear(): number {
    const yearLen = this.yearLengthDays > 0 ? this.yearLengthDays : 365
    return Math.floor(this.simTimeDays / yearLen);
  }

  /**
   * Get progress through current year (0-1)
   */
  getYearProgress(): number {
    const yearLen = this.yearLengthDays > 0 ? this.yearLengthDays : 365
    return (this.simTimeDays % yearLen) / yearLen;
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.eventJournal.recordEvent(EventType.SIM_RESUME, { tick: this.currentTick });
    
    this.scheduleNextUpdate();
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.isRunning) return;
    this.isRunning = false;
    this.eventJournal.recordEvent(EventType.SIM_PAUSE, { tick: this.currentTick });
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    this.pause();
    this.currentTick = 0;
    this.simTimeDays = 0;
    this.projectionStale = false;
    this.projectionEdited = false;
    this.chunks.clear();
    this.activeChunks.clear();
    this.eventJournal.clear();
    this.updateTimes = [];
    this.lastUpdatedChunks = 0;
    this.scheduledLimit = 0;
    this.rngManager = RNGManager.create(this.config.masterSeed);
    // Keep store references alive while resetting their gameplay state.
    if (this.interventionManager) {
      const previous = this.interventionManager.exportState();
      this.interventionManager.importState({ ...previous, usageHistory: [], lastUsedTick: [] });
    }
    this.initializeWorld();
    this.initializeRuntime();
    this.eventJournal.recordEvent(EventType.SIM_START, { config: this.config, timestamp: 0 });
  }

  /**
   * Schedule next update using fixed timestep
   */
  private scheduleNextUpdate(): void {
    if (!this.isRunning || this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.isRunning) return;
      this.update();
      this.scheduleNextUpdate();
    }, this.targetDeltaTime);
  }

  /**
   * Main simulation update loop
   */
  update(): void {
    const updateStart = performance.now();
    if (this.activeChunks.size === 0) this.activateAllChunks();
    // Legacy editor/scenario APIs may mutate projections between ticks. Import those
    // edits explicitly, without advancing RNG, before the authoritative ECS step.
    this.syncRuntime();
    this.applyRuntimeResponse(this.runtime.request({ op: 'step', ticks: 1, snapshot: this.mutableAccess }));
    // Chunk count is fixed by the world size; reading it must not pull a snapshot.
    this.lastUpdatedChunks = this.projection.size;
    this.scheduledLimit = this.projection.size;
    this.tickCallbacks.forEach(callback => callback(this.currentTick));
    const updateTime = performance.now() - updateStart;
    this.updateTimes.push(updateTime);
    this.estimatedChunkMs = updateTime / Math.max(1, this.projection.size);
    if (this.updateTimes.length > this.maxUpdateTimeHistory) this.updateTimes.shift();
  }

  /** Get chunks in a square radius around world center, clamped within bounds */
  private getCenterAreaChunks(radius: number = 1): WorldChunk[] {
    const cx = Math.floor(this.config.worldWidth / 2)
    const cy = Math.floor(this.config.worldHeight / 2)
    const chunks: WorldChunk[] = []
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let y = cy - radius; y <= cy + radius; y++) {
        if (x < 0 || x >= this.config.worldWidth || y < 0 || y >= this.config.worldHeight) continue
        const ch = this.chunkAt(x, y)
        if (ch) chunks.push(ch)
      }
    }
    return chunks
  }

  /** Adult plants of a species in the centre chunks: past maturity and above the flowering biomass. */
  private establishCenterPlants(speciesId: string, perChunk: number): void {
    const def = SpeciesRegistry.getInstance().getSpecies(speciesId);
    if (!def) return;
    this.projectionEdited = true;
    const rng = this.rngManager.getRNG('established_plants');
    for (const chunk of this.getCenterAreaChunks(this.centerSeedAreaRadius)) {
      for (let i = 0; i < perChunk; i++) {
        chunk.addSpecies({
          id: `${speciesId}_established_${chunk.x}_${chunk.y}_${i}`,
          speciesId,
          x: rng.nextFloat(0.2, 0.8),
          y: rng.nextFloat(0.2, 0.8),
          biomass: Math.min(def.maxBiomass, def.reproductionThreshold * rng.nextFloat(1.2, 2)),
          age: (def.maturityDays ?? 0) + rng.nextInt(0, 60),
          phenologyStage: PhenologyStage.VEGETATIVE,
          health: rng.nextFloat(0.8, 0.95),
          reproductiveOutput: 0,
          reproductiveUrge: 0,
          lastReproductionAttempt: 0,
        });
      }
    }
  }

  /** Seed center 3x3 area with seeds of a species */
  private seedCenterArea(
    speciesId: string,
    opts?: { clearExistingSpeciesSeeds?: boolean; seedsPerChunk?: number; maturityTicks?: number; viability?: number }
  ): void {
    this.projectionEdited = true
    const chunks = this.getCenterAreaChunks(this.centerSeedAreaRadius)
    const seedsPerChunk = Math.max(1, opts?.seedsPerChunk ?? 3)
    const maturity = Math.max(1, Math.floor(opts?.maturityTicks ?? 2))
    const viability = Math.min(1, Math.max(0.1, opts?.viability ?? 0.9))
    const rng = this.rngManager.getRNG('center_seeding')
    chunks.forEach((chunk) => {
      if (opts?.clearExistingSpeciesSeeds) {
        const bank = (chunk as any).seedBank || []
        ;(chunk as any).seedBank = bank.filter((s: any) => s.speciesId !== speciesId)
      }
      for (let i = 0; i < seedsPerChunk; i++) {
        chunk.addSeed({
          speciesId,
          x: rng.nextFloat(0.2, 0.8),
          y: rng.nextFloat(0.2, 0.8),
          viability,
          maturityTicks: maturity,
        })
      }
    })
  }

  /**
   * Activate chunks around a point for simulation
   */
  activateChunksAroundPoint(centerX: number, centerY: number, radius: number): void {
    const newActiveChunks = new Set<string>();
    
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        if (x >= 0 && x < this.config.worldWidth && y >= 0 && y < this.config.worldHeight) {
          const chunkId = `chunk_${x}_${y}`;
          newActiveChunks.add(chunkId);
        }
      }
    }
    
    // Respect max active chunks limit
    if (newActiveChunks.size > this.config.maxActiveChunks) {
      const chunksArray = Array.from(newActiveChunks);
      
      // Sort by distance from center, keeping closest
      chunksArray.sort((a, b) => {
        const [ax, ay] = a.split('_').slice(1).map(Number);
        const [bx, by] = b.split('_').slice(1).map(Number);
        const distA = Math.abs(ax - centerX) + Math.abs(ay - centerY);
        const distB = Math.abs(bx - centerX) + Math.abs(by - centerY);
        return distA - distB;
      });
      
      newActiveChunks.clear();
      chunksArray.slice(0, this.config.maxActiveChunks).forEach(id => {
        newActiveChunks.add(id);
      });
    }
    
    this.activeChunks = newActiveChunks;
  }

  /**
   * Execute player intervention
   * Now validates cost/cooldown via InterventionManager if available
   */
  executeIntervention(intervention: PlayerIntervention): boolean {
    if (!this.chunks.has(intervention.chunkId)) return false;
    if (this.interventionManager) {
      const validation = this.interventionManager.validateIntervention(intervention.type, this.currentTick);
      if (!validation.valid) return false;
    }
    if (intervention.type === 'plant' && !SpeciesRegistry.getInstance().getSpecies(intervention.data?.speciesId)) return false;
    try {
      this.syncRuntime();
      this.applyRuntimeResponse(this.runtime.request({ op: 'command', command: intervention }));
      this.activeChunks.add(intervention.chunkId);
      return true;
    } catch (error) {
      console.warn('Intervention rejected:', error);
      return false;
    }
  }

  /** Seeds in the player's pouch per species. Only commands and syncs change it, and both return a snapshot. */
  getInventory(): Readonly<Record<string, number>> {
    return this.runtimeSnapshot?.inventory ?? {};
  }

  /** Seeds in the pouch per species and the site each was set on ("" for packet seed). */
  getPouch(): Readonly<Record<string, Record<string, number>>> {
    return this.runtimeSnapshot?.pouch ?? {};
  }

  /** The whole pouch, seed by seed with its genetics, for carrying to another site. */
  exportPouch(): unknown[] {
    return (this.runtime.request({ op: 'export' }).state as { inventory?: unknown[] }).inventory ?? [];
  }

  /** Replace the pouch with seeds carried from another site. */
  importPouch(seeds: unknown[]): void {
    this.syncRuntime(true);
    this.runtime.request({ op: 'sync', inventory: seeds });
    this.applyRuntimeResponse(this.runtime.request({ op: 'snapshot' }));
  }

  /** Plants the player follows, by instance id, as of the latest tick. */
  getTags(): Readonly<Record<string, Tag>> {
    this.refreshProjection();
    return this.runtimeSnapshot?.tags ?? {};
  }

  /** The player's crosses, for the notebook. */
  getCrosses(): readonly Cross[] {
    this.refreshProjection();
    return this.runtimeSnapshot?.crosses ?? [];
  }

  /** Each species' trait spread when first recorded here. */
  getBaselines(): Readonly<Record<string, Baseline>> {
    this.refreshProjection();
    return this.runtimeSnapshot?.baselines ?? {};
  }

  /** Fresh seeds for the pouch: a starter packet or a reward. */
  addSeeds(counts: Record<string, number>): void {
    this.syncRuntime();
    this.runtime.request({ op: 'sync', addSeeds: counts });
    this.applyRuntimeResponse(this.runtime.request({ op: 'snapshot' }));
  }

  /**
   * Get chunk by coordinates
   */
  getChunk(x: number, y: number): WorldChunk | null {
    this.grantMutableAccess();
    return this.chunkAt(x, y);
  }

  /** Read-only chunk as of the latest tick. Unlike getChunk, it never makes ticks slower. */
  readChunk(x: number, y: number): Readonly<WorldChunk> | null {
    return this.chunkAt(x, y);
  }

  /** Read-only chunks as of the latest tick. Unlike getAllChunks, it never makes ticks slower. */
  readChunks(): ReadonlyMap<string, Readonly<WorldChunk>> {
    return this.chunks;
  }

  /**
   * Get all chunks in an area
   */
  getChunksInArea(x1: number, y1: number, x2: number, y2: number): WorldChunk[] {
    this.grantMutableAccess();
    const chunks: WorldChunk[] = [];
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.config.worldWidth - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.config.worldHeight - 1, Math.max(y1, y2));
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const chunk = this.chunkAt(x, y);
        if (chunk) chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Get simulation statistics
   */
  getStatistics() {
    const avgUpdateTime = this.updateTimes.length > 0
      ? this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length
      : 0;

    let totalSpecies = 0;
    const uniqueSpecies = new Set<string>();
    let avgVitality = 0;
    let avgPollution = 0;

    this.chunks.forEach(chunk => {
      totalSpecies += chunk.species.size;
      chunk.species.forEach(instance => uniqueSpecies.add(instance.speciesId));
      avgVitality += chunk.biomeState.vitality;
      avgPollution += chunk.biomeState.pollution;
    });

    const chunkCount = this.chunks.size;
    avgVitality /= chunkCount;
    avgPollution /= chunkCount;

    const seasonLenDays = this.config.seasonLengthTicks!
    const seasonIdx = Math.floor(((Math.floor(this.simTimeDays) % (seasonLenDays * 4)) / seasonLenDays))
    const seasonName = this.seasons[seasonIdx] as string
    const seasonProgress = (this.simTimeDays % seasonLenDays) / seasonLenDays
    const dayFraction = this.simTimeDays - Math.floor(this.simTimeDays)
    return {
      currentTick: this.currentTick,
      isRunning: this.isRunning,
      activeChunks: this.activeChunks.size,
      totalChunks: chunkCount,
      totalSpecies,
      uniqueSpecies: uniqueSpecies.size,
      avgVitality,
      avgPollution,
      avgUpdateTime,
      targetUpdateTime: this.targetDeltaTime,
      eventJournalSize: this.eventJournal.getAllEvents().length,
      seasonName,
      seasonProgress,
      dayFraction,
      simDays: this.simTimeDays,
      timePerTickMinutes: this.timePerTickMinutes,
      updateBudgetMs: this.config.updateBudgetMs ?? null,
      chunksPerTick: this.config.chunksPerTick ?? null,
      estimatedChunkMs: this.estimatedChunkMs,
      lastUpdatedChunks: this.lastUpdatedChunks,
      scheduledLimit: this.scheduledLimit
    };
  }

  /**
   * Apply scenario initial conditions
   */
  applyScenarioConditions(conditions: {
    biomeStates?: {
      temperature?: number;
      moisture?: number;
      light?: number;
      nutrients?: number;
      pollution?: number;
    };
    clearSpecies?: boolean;
    initialSpecies?: string[];
    /** Species that start as adult plants in the centre, as if the meadow had grown for years. */
    establishedSpecies?: string[];
    /** The lie of the land: each hex's height, 0 (hollow) to 1 (rise). */
    elevation?: (x: number, y: number) => number;
    /** Each hex's soil pH. */
    ph?: (x: number, y: number) => number;
  }): void {
    const { biomeStates, clearSpecies, initialSpecies, establishedSpecies, elevation, ph } = conditions;
    this.projectionEdited = true;
    if (elevation) this.chunks.forEach(chunk => { chunk.elevation = elevation(chunk.x, chunk.y); });
    if (ph) this.chunks.forEach(chunk => { chunk.biomeState.ph = ph(chunk.x, chunk.y); });

    // Apply biome states to all chunks
    if (biomeStates) {
      this.chunks.forEach(chunk => {
        if (biomeStates.temperature !== undefined) {
          chunk.climateState.temperature = biomeStates.temperature;
        }
        if (biomeStates.moisture !== undefined) {
          chunk.biomeState.moisture = biomeStates.moisture;
        }
        if (biomeStates.light !== undefined) {
          chunk.climateState.light = biomeStates.light;
        }
        if (biomeStates.nutrients !== undefined) {
          chunk.biomeState.soil = biomeStates.nutrients;
        }
        if (biomeStates.pollution !== undefined) {
          chunk.biomeState.pollution = biomeStates.pollution;
        }
      });
    }

    // Clear existing species if requested
    if (clearSpecies) {
      this.chunks.forEach(chunk => {
        chunk.species.clear();
        chunk.seedBank = [];
      });
    }

    establishedSpecies?.forEach(speciesId => this.establishCenterPlants(speciesId, 2));

    // Seed initial species if provided
    if (initialSpecies && initialSpecies.length > 0) {
      // Seed center area with initial species
      initialSpecies.forEach(speciesId => {
        this.seedCenterArea(speciesId, {
          clearExistingSpeciesSeeds: false,
          maturityTicks: 1,
          viability: 0.9,
          seedsPerChunk: 2
        });
      });
    }
  }

  /**
   * Public getters for external systems
   */
  getChunksMap(): Map<string, WorldChunk> {
    this.grantMutableAccess();
    return this.chunks;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Export simulation state
   */
  exportState(): any {
    this.syncRuntime();
    // Export a detached JSON-safe value.
    return JSON.parse(encodeSimulationState({
      schemaVersion: 2,
      backend: 'rust-ecs',
      config: this.config,
      currentTick: this.currentTick,
      simTimeDays: this.simTimeDays,
      timePerTickMinutes: this.timePerTickMinutes,
      chunks: Array.from(this.chunks.entries()).map(([id, chunk]) => [id, chunk.exportState()]),
      activeChunks: Array.from(this.activeChunks).sort(),
      rngState: this.rngManager.exportState(),
      eventJournal: this.eventJournal.exportToJSON(),
      interventionState: this.interventionManager?.exportState(),
      rustState: this.runtime.request({ op: 'export' }).state
    }));
  }

  /**
   * Import simulation state
   */
  importState(serialized: any): void {
    const state = decodeSimulationState(encodeSimulationState(serialized));
    if (state?.schemaVersion !== undefined && state.schemaVersion !== 2) throw new Error(`Unsupported simulation save version: ${state.schemaVersion}`);
    const legacy = state?.schemaVersion === undefined;
    if (!legacy && (state.backend !== 'rust-ecs' || !state.rustState)) throw new Error('Invalid Rust simulation save');
    this.validateConfig(state?.config);
    const config = { ...state.config, seasonLengthTicks: state.config.seasonLengthTicks ?? 90 };
    const minutes = state.timePerTickMinutes ?? config.timePerTickMinutes ?? 1440;
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('Invalid saved tick duration');
    const savedDays = state.simTimeDays ?? (state.currentTick ?? 0) * minutes / 1440;
    if (!Number.isFinite(savedDays) || savedDays < 0) throw new Error('Invalid saved simulation time');
    if (legacy) {
      for (const [, chunk] of state.chunks) {
        for (const instance of [...(chunk.species ?? []).map((entry: [string, any]) => entry[1]), ...(chunk.seedBank ?? [])]) {
          const profile = instance.genetics;
          if (profile && !(profile.traits instanceof Map)) {
            // Historical JSON saves serialized native Maps as empty objects.
            profile.traits = new Map(Array.isArray(profile.traits) ? profile.traits : Object.entries(profile.traits ?? {}));
          }
        }
      }
    }

    // Validate the entire Rust save in an isolated instance before touching this
    // engine. A rejected save must leave the current world playable.
    const runtime = markRaw(new RustSimulationRuntime());
    const response = legacy
      ? runtime.request({
        op: 'init', config, tick: state.currentTick ?? 0, simTimeDays: savedDays,
        chunks: state.chunks.map((entry: [string, unknown]) => entry[1]),
        speciesDefinitions: SpeciesRegistry.getInstance().getAllSpecies(), faunaDefinitions: FAUNA, fungusDefinitions: FUNGI
      })
      : runtime.request({ op: 'import', state: state.rustState });
    if (!response.snapshot) throw new Error('Save is missing its simulation snapshot');
    if (!legacy) {
      const coreConfig = state.rustState.config;
      for (const key of ['worldWidth', 'worldHeight', 'masterSeed', 'seasonLengthTicks']) {
        if (coreConfig[key] !== config[key]) throw new Error('Saved settings do not match the Rust simulation');
      }
      if (coreConfig.timePerTickMinutes !== minutes) throw new Error('Saved tick duration does not match the Rust simulation');
    }
    const rng = RNGManager.create(config.masterSeed);
    if (state.rngState) {
      rng.importState(state.rngState);
      if (rng.generateStateHash() !== state.rngState.stateHash) throw new Error('Invalid saved random generator state');
    }
    if (state.eventJournal) {
      const journal = JSON.parse(state.eventJournal);
      if (!Array.isArray(journal.events)) throw new Error('Invalid saved event journal');
    }
    const manager = new InterventionManager();
    if (state.interventionState) manager.importState(state.interventionState);
    if (state.activeChunks !== undefined && !Array.isArray(state.activeChunks)) throw new Error('Invalid saved active chunks');
    const activeChunks = new Set<string>(state.activeChunks ?? []);

    this.pause();
    this.runtime = runtime;
    this.config = config;
    this.timePerTickMinutes = minutes;
    this.yearLengthDays = config.seasonLengthTicks * 4;
    this.targetDeltaTime = 1000 / config.tickRate;
    this.rngManager = rng;
    this.activeChunks = activeChunks;
    this.applyRuntimeResponse(response);
    this.eventJournal.clear();
    if (state.eventJournal) this.eventJournal.importFromJSON(state.eventJournal);
    this.eventJournal.setCurrentTick(this.currentTick);
    if (state.interventionState) {
      this.interventionManager ??= new InterventionManager();
      this.interventionManager.importState(manager.exportState());
    }
    this.updateTimes = [];
  }

  // Public accessors for integration
  getConfig(): SimulationConfig {
    return this.config;
  }

  getAllChunks(): Map<string, WorldChunk> {
    this.grantMutableAccess();
    return this.chunks;
  }

  getActiveChunkIds(): Set<string> {
    return this.activeChunks;
  }

  // Activate all chunks in the world (used by EcoSim view)
  activateAllChunks(): void {
    this.activeChunks.clear()
    this.chunks.forEach((_chunk, id) => this.activeChunks.add(id))
  }

  // Emit a simulation event (exposed for systems/UI)
  emitEvent(type: EventType, data: any, chunkId?: string, playerId?: string): void {
    this.eventJournal.recordEvent(type, data, chunkId, playerId)
  }

  // Allow adjusting tick rate at runtime (affects fixed delta time)
  setTickRate(ticksPerSecond: number): void {
    if (!Number.isFinite(ticksPerSecond) || ticksPerSecond <= 0) return;
    this.config.tickRate = ticksPerSecond;
    this.targetDeltaTime = 1000 / ticksPerSecond;
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.scheduleNextUpdate();
    }
  }

  // Update budgets configuration at runtime
  setUpdateBudgetMs(ms?: number): void {
    this.config.updateBudgetMs = typeof ms === 'number' && ms > 0 ? ms : undefined
  }

  setChunksPerTick(n?: number): void {
    this.config.chunksPerTick = typeof n === 'number' && n > 0 ? Math.floor(n) : undefined
  }

  // Register per-tick callback
  onTick(callback: (tick: number) => void): void {
    this.tickCallbacks.push(callback)
  }

  // Time-scale configuration
  setTimePerTickMinutes(minutes: number): void {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error('Tick duration must be an integer from 1 to 1440 minutes; increase playback speed for faster simulation');
    this.timePerTickMinutes = minutes;
    this.config.timePerTickMinutes = minutes;
  }

  getDaysPerTick(): number {
    return this.timePerTickMinutes / 1440;
  }

  private validateConfig(config: SimulationConfig): void {
    if (!config || !Number.isInteger(config.worldWidth) || !Number.isInteger(config.worldHeight) || config.worldWidth < 1 || config.worldHeight < 1 || config.worldWidth * config.worldHeight > 65536) {
      throw new Error('Simulation world dimensions must be positive integers with at most 65536 chunks');
    }
    for (const value of [config.tickRate, config.chunkSize, config.timePerTickMinutes ?? 1440, config.seasonLengthTicks ?? 90]) {
      if (!Number.isFinite(value) || value <= 0) throw new Error('Simulation time and size settings must be finite and positive');
    }
    const minutes = config.timePerTickMinutes ?? 1440;
    if (!Number.isInteger(minutes) || minutes > 1440) throw new Error('Tick duration must be an integer from 1 to 1440 minutes');
    if (!Number.isInteger(config.seasonLengthTicks ?? 90) || (config.seasonLengthTicks ?? 90) > 100000) throw new Error('Season length must be an integer from 1 to 100000 days');
    if (!Number.isFinite(config.masterSeed)) throw new Error('Simulation seed must be finite');
  }

  private initializeRuntime(): void {
    this.projectionEdited = false; // init sends the whole projection
    this.applyRuntimeResponse(this.runtime.request({
      op: 'init',
      config: this.config,
      chunks: Array.from(this.chunks.values(), chunk => chunk.exportState()),
      speciesDefinitions: SpeciesRegistry.getInstance().getAllSpecies(), faunaDefinitions: FAUNA, fungusDefinitions: FUNGI
    }));
  }

  private syncRuntime(includeDefinitions = false): void {
    const signature = this.mutableAccess ? this.signature() : '';
    const edited = this.projectionEdited || signature !== this.projectionSignature;
    if (!includeDefinitions && !edited && this.runtimeMinutes === this.timePerTickMinutes) return;
    this.runtime.request({
      op: 'sync',
      config: { ...this.config, timePerTickMinutes: this.timePerTickMinutes },
      // Only an edited projection is sent: an unedited one may be stale and would roll Rust back.
      ...(edited ? { chunks: Array.from(this.chunks.values(), chunk => chunk.exportState()) } : {}),
      ...(includeDefinitions ? { speciesDefinitions: SpeciesRegistry.getInstance().getAllSpecies(), faunaDefinitions: FAUNA, fungusDefinitions: FUNGI } : {})
    });
    this.projectionSignature = signature;
    this.projectionEdited = false;
    this.runtimeMinutes = this.timePerTickMinutes;
  }

  private applyRuntimeResponse(response: RuntimeResponse): void {
    if (response.snapshot) {
      const snapshot = response.snapshot;
      this.runtimeSnapshot = snapshot;
      snapshot.hybrids?.forEach(hybrid => SpeciesRegistry.getInstance().addHybrid(hybrid));
      this.currentTick = snapshot.tick;
      this.simTimeDays = snapshot.simTimeDays;
      this.projectionStale = false;
      const seen = new Set<string>();
      for (const state of snapshot.chunks) {
        seen.add(state.id);
        let chunk = this.projection.get(state.id);
        if (!chunk) {
          chunk = new WorldChunk(state.x, state.y, state.rngSeed ?? 0);
          this.projection.set(state.id, chunk);
        }
        chunk.importState({ species: [], ritualResidues: [], seedBank: [], ...state });
        for (const key of ['canopyState', 'hydrologyState', 'pollinatorFlow', 'pollinatorDensity', 'birds', 'birdsTotal', 'birdsActivity', 'fauna', 'canopyLayers', 'groundLight']) {
          if (key in state) (chunk as any)[key] = state[key];
        }
        (chunk as any).simTimeDays = snapshot.simTimeDays;
        (chunk as any).__getChunk = (x: number, y: number) => this.chunkAt(x, y);
        (chunk as any).__emitEvent = (type: EventType, data: unknown) => this.emitEvent(type, data, chunk!.id);
      }
      for (const id of this.projection.keys()) if (!seen.has(id)) this.projection.delete(id);
      this.projectionSignature = this.mutableAccess ? this.signature() : '';
      this.runtimeMinutes = this.timePerTickMinutes;
    } else if (response.tick !== undefined) {
      this.currentTick = response.tick;
      this.simTimeDays = response.simTimeDays ?? this.simTimeDays;
      this.projectionStale = true;
    }
    this.eventJournal.setCurrentTick(this.currentTick);
    for (const event of response.events ?? []) {
      const action = event.data as Partial<PlayerIntervention> | undefined;
      const type = event.type === 'player_intervention' && action?.type ? `player_${action.type}` : event.type;
      this.eventJournal.recordEvent(type as EventType, event.data, event.chunkId, action?.playerId);
    }
  }

  getEventJournal(): EventJournal { return this.eventJournal; }

  getActiveWeatherEvents(): any[] {
    this.refreshProjection();
    return this.runtimeSnapshot?.weatherEvents ?? [];
  }


  /** Reproducibility fingerprint excludes UI pacing and diagnostic timing. */
  getDeterministicStateHash(): string {
    this.syncRuntime();
    const text = encodeSimulationState({
      rustState: this.runtime.request({ op: 'export' }).state,
      rngState: this.rngManager.exportState(),
    });
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  tick(): void { this.update(); }

  advance(ticks: number): void {
    if (!Number.isSafeInteger(ticks) || ticks < 0) throw new Error('Tick count must be a non-negative integer');
    for (let index = 0; index < ticks; index++) this.update();
  }

  activateChunk(id: string): void { if (this.chunks.has(id)) this.activeChunks.add(id); }

}
