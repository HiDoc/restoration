/**
 * A hex of the world as the browser sees it: the engine's projection, refreshed each tick. Rust owns the ecology.
 */

import { SeededRNG } from './SeededRNG';

/**
 * Biome state vector - core properties of each chunk
 */
/** A plant's heritable traits (each 0–1, 0.5 ordinary), its generation, and its parents and site of origin. */
export interface Genetics {
  traits: Record<string, number>;
  generation: number;
  mother?: string;
  father?: string;
  origin?: string;
}

export interface BiomeState {
  // Ecological properties
  vitality: number;      // [0-1] Overall ecosystem health
  soil: number;          // [0-1] Soil quality/fertility
  moisture: number;      // [0-1] Soil moisture content
  diversity: number;     // [0-1] Species diversity index
  canopy: number;        // [0-1] Tree cover/shade level
  pollution: number;     // [0-1] Contamination level
  invasion: number;      // [0-1] Invasive species pressure
  succession: number;    // [0-1] Ecological succession stage (0=pioneer, 1=climax)
  standingWater?: number; // [0-1] Water standing above saturated ground (pond depth)
  ph?: number; // Soil pH, set by the site's ground
}

/**
 * Climate snapshot for environmental conditions
 */
export interface ClimateState {
  temperature: number;   // Celsius
  light: number;        // [0-1] Light availability 
  wind: number;         // [0-1] Wind strength
  rainLikelihood: number; // [0-1] Probability of rain
}

/**
 * Species instance data
 */
export interface SpeciesInstance {
  id: string;
  speciesId: string;
  x: number;           // Position within chunk (0-1)
  y: number;           // Position within chunk (0-1)
  biomass: number;     // Current size/mass
  age: number;         // Ticks since spawn
  phenologyStage: PhenologyStage;
  health: number;      // [0-1] Current health
  reproductiveOutput: number; // Seeds/offspring produced this cycle
  reproductiveUrge: number;   // [0-1] Building drive to reproduce
  lastReproductionAttempt: number; // Tick when last attempted reproduction
  genetics?: Genetics; // Heritable traits and where the plant came from
}

export enum PhenologyStage {
  SEED = 'seed',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  DORMANT = 'dormant'
}

/**
 * Ritual residue effects
 */
export interface RitualResidue {
  id: string;
  ritualType: string;
  x: number;
  y: number;
  strength: number;
  duration: number;
  effects: Record<string, number>; // Biome state modifiers
}

export interface SeedRecord {
  speciesId: string;
  x: number; // 0..1 within chunk
  y: number; // 0..1 within chunk
  viability: number; // [0..1]
  maturityTicks: number; // ticks remaining before attempting germination
  genetics?: Genetics;
}

/**
 * Individual world chunk
 */
export class WorldChunk {
  private static readonly projectionFields = ['canopyState', 'hydrologyState', 'pollinatorFlow', 'pollinatorDensity', 'birds', 'birdsTotal', 'birdsActivity', 'fauna', 'canopyLayers', 'groundLight', 'isRaining', 'weatherType', 'outflow', 'sample', 'fungi', 'fruiting'] as const;
  public readonly id: string;
  public readonly x: number;
  public readonly y: number;
  
  // Core state
  public biomeState: BiomeState;
  public climateState: ClimateState;
  /** Height of the ground, 0 in a hollow to 1 on a rise; water runs downhill. */
  public elevation = 0.5;
  public lastUpdateTick: number = 0;
  
  // Entities (sparse storage)
  public species: Map<string, SpeciesInstance> = new Map();
  public ritualResidues: Map<string, RitualResidue> = new Map();
  public seedBank: SeedRecord[] = [];
  
  // Deterministic RNG
  private rng: SeededRNG;
  private rngSeed: number;

  constructor(x: number, y: number, initialSeed: number) {
    this.id = `chunk_${x}_${y}`;
    this.x = x;
    this.y = y;
    this.rngSeed = initialSeed;
    this.rng = new SeededRNG(initialSeed);
    
    // Initialize with default biome state
    this.biomeState = {
      vitality: 0.5,
      soil: 0.5,
      moisture: 0.3,
      diversity: 0.2,
      canopy: 0.1,
      pollution: 0.0,
      invasion: 0.1,
      succession: 0.2
    };
    
    // Initialize climate
    this.climateState = {
      temperature: 20, // Celsius
      light: 0.8,
      wind: 0.3,
      rainLikelihood: 0.2
    };
  }

  /**
   * Add species instance to chunk
   */
  addSpecies(species: SpeciesInstance): void {
    this.species.set(species.id, species);
  }

  /**
   * Add ritual residue to chunk
   */
  addRitualResidue(residue: RitualResidue): void {
    this.ritualResidues.set(residue.id, residue);
  }

  /** Add seed to seed bank */
  addSeed(seed: SeedRecord): void {
    this.seedBank.push(seed);
  }

  /**
   * Get chunk state for save/load
   */
  exportState(): any {
    return {
      ...Object.fromEntries(WorldChunk.projectionFields.filter(key => key in this).map(key => [key, (this as any)[key]])),
      id: this.id,
      x: this.x,
      y: this.y,
      biomeState: { ...this.biomeState },
      climateState: { ...this.climateState },
      lastUpdateTick: this.lastUpdateTick,
      species: Array.from(this.species.entries()),
      ritualResidues: Array.from(this.ritualResidues.entries()),
      seedBank: this.seedBank,
      elevation: this.elevation,
      rngSeed: this.rngSeed,
      rngState: this.rng.getState()
    };
  }

  /**
   * Load chunk state
   */
  importState(state: any): void {
    for (const key of WorldChunk.projectionFields) {
      if (key in state) (this as any)[key] = state[key];
      else delete (this as any)[key];
    }
    this.biomeState = state.biomeState;
    this.climateState = state.climateState;
    this.lastUpdateTick = state.lastUpdateTick;
    
    this.species.clear();
    state.species.forEach(([id, instance]: [string, SpeciesInstance]) => {
      this.species.set(id, instance);
    });
    
    this.ritualResidues.clear();
    state.ritualResidues.forEach(([id, residue]: [string, RitualResidue]) => {
      this.ritualResidues.set(id, residue);
    });
    this.seedBank = state.seedBank || [];
    this.elevation = state.elevation ?? 0.5;
    
    this.rngSeed = state.rngSeed;
    this.rng.setState(state.rngState);
  }
}
