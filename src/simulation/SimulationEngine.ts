/**
 * Main simulation engine orchestrating all systems
 */

import { RNGManager } from './SeededRNG';
import { EventJournal, EventType } from '@/simulation/EventJournal';
import { WorldChunk, BiomeState, PhenologyStage, SpeciesInstance } from './WorldChunk';
import { SpeciesRegistry, BiomeType } from './SpeciesRegistry';
import { InteractionsSystem } from './InteractionsSystem';

export interface SimulationConfig {
  worldWidth: number;      // Number of chunks horizontally
  worldHeight: number;     // Number of chunks vertically
  chunkSize: number;       // Size of each chunk in game units
  tickRate: number;        // Ticks per second
  masterSeed: number;      // Seed for deterministic simulation
  maxActiveChunks: number; // Performance limit
  seasonLengthTicks?: number; // Ticks per season (quarter year)
  // Time scale: minutes of simulated time per engine tick (default 1440 = 1 day)
  timePerTickMinutes?: number;
}

export interface PlayerIntervention {
  chunkId: string;
  x: number;
  y: number;
  type: 'plant' | 'hybridize' | 'irrigate' | 'cleanse' | 'ritual';
  data: any;
  playerId?: string;
}

export class SimulationEngine {
  private config: SimulationConfig;
  private rngManager: RNGManager;
  private eventJournal: EventJournal;
  // Optional species data adapter (DB-backed). Typed as any to avoid bundling DB deps in browser.
  private speciesAdapter?: any;
  // Interactions system (optional, available when DB adapter is set)
  private interactionsSystem?: InteractionsSystem;
  
  // World state
  private chunks: Map<string, WorldChunk> = new Map();
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

  // Performance monitoring
  private updateTimes: number[] = [];
  private maxUpdateTimeHistory = 60; // Keep 1 second of history at 60fps

  constructor(config: SimulationConfig) {
    this.config = config;
    this.targetDeltaTime = 1000 / config.tickRate; // ms per tick
    // Default: 1 season = 90 days (quarter year)
    if (!this.config.seasonLengthTicks) this.config.seasonLengthTicks = 90;
    // Time per tick (minutes); default 1 day
    this.timePerTickMinutes = this.config.timePerTickMinutes ?? 1440;
    
    // Initialize core systems
    this.rngManager = RNGManager.initialize(config.masterSeed);
    this.eventJournal = new EventJournal();
    
    // Initialize world chunks
    this.initializeWorld();
    
    this.eventJournal.recordEvent(EventType.SIM_START, {
      config: this.config,
      timestamp: Date.now()
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
        (chunk as any).__getChunk = (cx: number, cy: number) => this.getChunk(cx, cy);
      }
    }

    // If a DB-backed species adapter has been set already, seed initial species
    if (this.speciesAdapter) {
      this.seedInitialSpeciesFromAdapter();
    }

    // Ensure a baseline of common grass presence across the world
    this.ensureCommonGrassBaseline();
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

    // Import species into the simulation registry while preserving existing hybrids
    try {
      const registry = SpeciesRegistry.getInstance();
      const exported = registry.exportData();
      const dbSpecies = (typeof adapter.getAllVegetalSpecies === 'function')
        ? adapter.getAllVegetalSpecies()
        : [];
      registry.importData({ species: dbSpecies, hybrids: exported.hybrids });
    } catch (e) {
      console.warn('Failed to import species from adapter:', e);
    }

    // Initialize interactions system from adapter
    try {
      this.interactionsSystem = await InteractionsSystem.create(adapter);
    } catch (e) {
      console.warn('Failed to initialize interactions system:', e);
    }

    // Seed initial species in the world using the adapter
    this.seedInitialSpeciesFromAdapter();
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
    const registry = SpeciesRegistry.getInstance();
    const grass = registry.getSpecies('common_grass');
    if (!grass) return;
    const rng = this.rngManager.getRNG('baseline_grass');

    this.chunks.forEach((chunk) => {
      // Count existing common grass
      let existing = 0;
      chunk.species.forEach((inst) => { if (inst.speciesId === 'common_grass') existing++; });
      const toAdd = Math.max(0, 3 - existing);
      for (let i = 0; i < toAdd; i++) {
        const inst: SpeciesInstance = {
          id: `grass_${chunk.x}_${chunk.y}_${Date.now()}_${i}`,
          speciesId: 'common_grass',
          x: rng.nextFloat(0.05, 0.95),
          y: rng.nextFloat(0.05, 0.95),
          biomass: Math.max(0.05, grass.maxBiomass * rng.nextFloat(0.05, 0.15)),
          age: Math.floor(rng.nextFloat(0, grass.lifespanTicks * 0.1)),
          phenologyStage: PhenologyStage.VEGETATIVE,
          health: rng.nextFloat(0.7, 0.95),
          reproductiveOutput: 0,
          reproductiveUrge: 0,
          lastReproductionAttempt: 0,
        };
        chunk.addSpecies(inst);
      }
    });
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
    this.chunks.clear();
    this.activeChunks.clear();
    this.eventJournal.clear();
    this.updateTimes = [];
    
    // Reinitialize
    this.initializeWorld();
    this.eventJournal.recordEvent(EventType.SIM_RESET, {
      config: this.config,
      timestamp: Date.now()
    });
  }

  /**
   * Schedule next update using fixed timestep
   */
  private scheduleNextUpdate(): void {
    if (!this.isRunning) return;
    
    setTimeout(() => {
      this.update();
      this.scheduleNextUpdate();
    }, this.targetDeltaTime);
  }

  /**
   * Main simulation update loop
   */
  update(): void {
    const updateStart = Date.now();
    const deltaDays = this.timePerTickMinutes / 1440; // Convert minutes to days
    
    // Advance tick
    this.currentTick++;
    this.simTimeDays += deltaDays;
    this.eventJournal.setCurrentTick(this.currentTick);
    
    // Update active chunks only (for performance)
    this.updateActiveChunks(deltaDays);
    
    // Diffusion between neighboring chunks
    this.updateChunkDiffusion();
    
    // Record performance metrics
    const updateTime = Date.now() - updateStart;
    this.updateTimes.push(updateTime);
    if (this.updateTimes.length > this.maxUpdateTimeHistory) {
      this.updateTimes.shift();
    }
    
    // Log performance warnings
    if (updateTime > this.targetDeltaTime * 1.5) {
      console.warn(`Simulation update took ${updateTime}ms, target: ${this.targetDeltaTime}ms`);
    }
  }

  /**
   * Update only active chunks for performance
   */
  private updateActiveChunks(deltaTime: number): void {
    // If no chunks are active, activate center chunks
    if (this.activeChunks.size === 0) {
      this.activateChunksAroundPoint(
        Math.floor(this.config.worldWidth / 2),
        Math.floor(this.config.worldHeight / 2),
        2
      );
    }
    
    this.activeChunks.forEach(chunkId => {
      const chunk = this.chunks.get(chunkId);
      if (chunk) {
        (chunk as any).simTimeDays = this.simTimeDays;
        chunk.update(this.currentTick, deltaTime);
        // Apply species relationships after per-chunk update
        if (this.interactionsSystem) {
          this.interactionsSystem.update(chunk);
        }
      }
    });
  }

  /**
   * Update diffusion between neighboring chunks
   */
  private updateChunkDiffusion(): void {
    const diffusionRate = 0.01; // How fast properties spread
    const toUpdate: Array<{ chunk: WorldChunk; property: keyof BiomeState; change: number }> = [];
    
    this.activeChunks.forEach(chunkId => {
      const chunk = this.chunks.get(chunkId);
      if (!chunk) return;
      
      const neighbors = this.getNeighboringChunks(chunk.x, chunk.y);
      
      neighbors.forEach(neighbor => {
        // Moisture diffusion
        const moistureDiff = neighbor.biomeState.moisture - chunk.biomeState.moisture;
        if (Math.abs(moistureDiff) > 0.1) {
          const change = moistureDiff * diffusionRate;
          toUpdate.push({ chunk, property: 'moisture', change });
        }
        
        // Pollution spread
        if (neighbor.biomeState.pollution > chunk.biomeState.pollution) {
          const change = (neighbor.biomeState.pollution - chunk.biomeState.pollution) * diffusionRate * 0.5;
          toUpdate.push({ chunk, property: 'pollution', change });
        }
        
        // Invasion pressure
        if (neighbor.biomeState.invasion > chunk.biomeState.invasion) {
          const change = (neighbor.biomeState.invasion - chunk.biomeState.invasion) * diffusionRate * 0.3;
          toUpdate.push({ chunk, property: 'invasion', change });
        }
      });
    });
    
    // Apply accumulated changes
    toUpdate.forEach(({ chunk, property, change }) => {
      const currentValue = chunk.biomeState[property];
      const newValue = Math.max(0, Math.min(1, currentValue + change));
      chunk.biomeState[property] = newValue;
    });
  }

  /**
   * Get neighboring chunks
   */
  private getNeighboringChunks(x: number, y: number): WorldChunk[] {
    const neighbors: WorldChunk[] = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    directions.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < this.config.worldWidth && ny >= 0 && ny < this.config.worldHeight) {
        const neighborId = `chunk_${nx}_${ny}`;
        const neighbor = this.chunks.get(neighborId);
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
    });
    
    return neighbors;
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
   */
  executeIntervention(intervention: PlayerIntervention): boolean {
    const chunk = this.chunks.get(intervention.chunkId);
    if (!chunk) {
      console.error(`Chunk ${intervention.chunkId} not found`);
      return false;
    }
    
    // Ensure chunk is active
    if (!this.activeChunks.has(intervention.chunkId)) {
      const [, x, y] = intervention.chunkId.split('_').map(Number);
      this.activateChunksAroundPoint(x, y, 1);
    }
    
    let success = false;
    
    switch (intervention.type) {
      case 'plant':
        success = this.executePlantIntervention(chunk, intervention);
        break;
      case 'irrigate':
        success = this.executeIrrigateIntervention(chunk, intervention);
        break;
      case 'cleanse':
        success = this.executeCleanseIntervention(chunk, intervention);
        break;
      // Add other intervention types as needed
    }
    
    if (success) {
      // Record in event journal
      const eventType = `player_${intervention.type}` as EventType;
      this.eventJournal.recordEvent(eventType, intervention, intervention.chunkId, intervention.playerId);
    }
    
    return success;
  }

  /**
   * Execute plant intervention
   */
  private executePlantIntervention(chunk: WorldChunk, intervention: PlayerIntervention): boolean {
    // Add species instance to chunk
    const speciesInstance = {
      id: `species_${Date.now()}_${Math.random()}`,
      speciesId: intervention.data.speciesId,
      x: intervention.x,
      y: intervention.y,
      biomass: 0.1,
      age: 0,
      phenologyStage: 'seed' as any,
      health: 1.0,
      reproductiveOutput: 0,
      reproductiveUrge: 0,
      lastReproductionAttempt: 0
    };
    
    chunk.addSpecies(speciesInstance);
    return true;
  }

  /**
   * Execute irrigate intervention
   */
  private executeIrrigateIntervention(chunk: WorldChunk, intervention: PlayerIntervention): boolean {
    const amount = intervention.data.amount || 0.2;
    chunk.biomeState.moisture = Math.min(1, chunk.biomeState.moisture + amount);
    return true;
  }

  /**
   * Execute cleanse intervention
   */
  private executeCleanseIntervention(chunk: WorldChunk, intervention: PlayerIntervention): boolean {
    const amount = intervention.data.amount || 0.3;
    chunk.biomeState.pollution = Math.max(0, chunk.biomeState.pollution - amount);
    return true;
  }

  /**
   * Get chunk by coordinates
   */
  getChunk(x: number, y: number): WorldChunk | null {
    const chunkId = `chunk_${x}_${y}`;
    return this.chunks.get(chunkId) || null;
  }

  /**
   * Get all chunks in an area
   */
  getChunksInArea(x1: number, y1: number, x2: number, y2: number): WorldChunk[] {
    const chunks: WorldChunk[] = [];
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.config.worldWidth - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.config.worldHeight - 1, Math.max(y1, y2));
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const chunk = this.getChunk(x, y);
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
    let totalHybrids = 0;
    let avgVitality = 0;
    let avgPollution = 0;
    
    this.chunks.forEach(chunk => {
      totalSpecies += chunk.species.size;
      totalHybrids += chunk.hybrids.size;
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
      totalHybrids,
      avgVitality,
      avgPollution,
      avgUpdateTime,
      targetUpdateTime: this.targetDeltaTime,
      eventJournalSize: this.eventJournal.getAllEvents().length,
      seasonName,
      seasonProgress,
      dayFraction,
      simDays: this.simTimeDays,
      timePerTickMinutes: this.timePerTickMinutes
    };
  }

  /**
   * Export simulation state
   */
  exportState() {
    return {
      config: this.config,
      currentTick: this.currentTick,
      chunks: Array.from(this.chunks.entries()).map(([id, chunk]) => [id, chunk.exportState()]),
      activeChunks: Array.from(this.activeChunks),
      rngState: this.rngManager.exportState(),
      eventJournal: this.eventJournal.exportToJSON()
    };
  }

  /**
   * Import simulation state
   */
  importState(state: any): void {
    this.pause();
    
    this.config = state.config;
    this.currentTick = state.currentTick;
    
    this.chunks.clear();
    state.chunks.forEach(([id, chunkState]: [string, any]) => {
      const chunk = new WorldChunk(chunkState.x, chunkState.y, chunkState.rngSeed);
      chunk.importState(chunkState);
      this.chunks.set(id, chunk);
    });
    
    this.activeChunks = new Set(state.activeChunks);
    this.rngManager.importState(state.rngState);
    this.eventJournal.importFromJSON(state.eventJournal);
  }

  // Public accessors for integration
  getCurrentTick(): number {
    return this.currentTick;
  }

  getConfig(): SimulationConfig {
    return this.config;
  }

  getAllChunks(): Map<string, WorldChunk> {
    return this.chunks;
  }

  getActiveChunkIds(): Set<string> {
    return this.activeChunks;
  }

  // Allow adjusting tick rate at runtime (affects fixed delta time)
  setTickRate(ticksPerSecond: number): void {
    if (ticksPerSecond <= 0) return;
    this.targetDeltaTime = 1000 / ticksPerSecond;
  }

  // Time-scale configuration
  setTimePerTickMinutes(minutes: number): void {
    if (minutes > 0) this.timePerTickMinutes = minutes;
  }

  getDaysPerTick(): number {
    return this.timePerTickMinutes / 1440;
  }
}
