/**
 * World chunk system with biome state vectors and deterministic updates
 */

import { SeededRNG } from './SeededRNG';
import { EventType } from './EventJournal';

/**
 * Biome state vector - core properties of each chunk
 */
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
 * Cause of death for species mortality tracking
 */
export enum CauseOfDeath {
  NATURAL_AGING = 'natural_aging',
  STARVATION = 'starvation',
  DISEASE = 'disease',
  ENVIRONMENTAL_STRESS = 'environmental_stress',
  DROUGHT = 'drought',
  COLD_DAMAGE = 'cold_damage',
  HEAT_STRESS = 'heat_stress',
  POLLUTION = 'pollution',
  COMPETITION = 'competition',
  PREDATION = 'predation',
  ACCIDENT = 'accident',
  UNKNOWN = 'unknown'
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
  genetics?: import('./GeneticSystem').GeneticProfile; // Genetic traits and mutations
  causeOfDeath?: CauseOfDeath; // How this individual died (set when removed)
  deathTick?: number;  // When this individual died
}

export enum PhenologyStage {
  SEED = 'seed',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  DORMANT = 'dormant'
}

/**
 * Hybrid data for special modified organisms
 */
export interface HybridInstance {
  id: string;
  hybridId: string;
  x: number;
  y: number;
  parentA: string;     // Species ID
  parentB: string;     // Species ID  
  catalyst?: string;   // Catalyst used in creation
  effectRadius: number; // Area of influence
  strength: number;    // Effect magnitude
  duration: number;    // Remaining lifespan
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
}

/**
 * Individual world chunk
 */
export class WorldChunk {
  public readonly id: string;
  public readonly x: number;
  public readonly y: number;
  
  // Core state
  public biomeState: BiomeState;
  public climateState: ClimateState;
  public lastUpdateTick: number = 0;
  
  // Entities (sparse storage)
  public species: Map<string, SpeciesInstance> = new Map();
  public hybrids: Map<string, HybridInstance> = new Map();
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
   * Update chunk for one simulation tick
   */
  update(currentTick: number, deltaTime: number): void {
    if (currentTick <= this.lastUpdateTick) {
      return; // Already updated this tick
    }

    // Update climate conditions
    this.updateClimate(currentTick);
    
    // Update species instances
    this.updateSpecies(deltaTime);
    
    // Update hybrids
    this.updateHybrids(deltaTime);
    
    // Update ritual residues
    this.updateRitualResidues(deltaTime);
    
    // Update biome state based on entities
    this.updateBiomeState(deltaTime);
    
    this.lastUpdateTick = currentTick;
  }

  /**
   * Update climate conditions with stochastic elements
   */
  private updateClimate(currentTick: number): void {
    // 1 tick = 1 day. Model seasonal cycles across a 360-day year (4 seasons x 90 days).
    const yearLength = 360
    const simDays = (this as any).simTimeDays ?? currentTick
    const t = (simDays % yearLength) / yearLength // [0..1)

    // Seasonal temperature: mean 15°C, amplitude 10°C
    const seasonalTemp = 15 + 10 * Math.sin(t * Math.PI * 2)
    const noiseTemp = this.rng.nextGaussian(0, 1.0)
    this.climateState.temperature = Math.max(-15, Math.min(45, seasonalTemp + noiseTemp))

    // Seasonal light: base between 0.4..1.0 peaking in summer
    const seasonalLight = 0.7 + 0.3 * Math.sin(t * Math.PI * 2)
    const noiseLight = this.rng.nextGaussian(0, 0.05)
    this.climateState.light = Math.max(0.2, Math.min(1, seasonalLight + noiseLight))

    // Daily wind noise
    this.climateState.wind = Math.max(0, Math.min(1, (this.climateState.wind) + this.rng.nextGaussian(0, 0.05)))

    // Rain probability based on moisture and temperature (warmer + wetter => more rain)
    const baseRainChance = this.biomeState.moisture * 0.3 + (this.climateState.temperature > 10 ? 0.1 : 0.0)
    this.climateState.rainLikelihood = Math.max(0, Math.min(1, baseRainChance + this.rng.nextGaussian(0, 0.1)))
  }

  /**
   * Update all species in chunk
   */
  private updateSpecies(deltaTime: number): void {
    const toRemove: string[] = [];
    
    this.species.forEach((instance, id) => {
      instance.age += 1;
      
      // Growth based on conditions
      const growthRate = this.calculateGrowthRate();
      instance.biomass += growthRate * deltaTime;
      instance.biomass = Math.max(0, Math.min(10, instance.biomass)); // Cap biomass
      
      // Health decay and recovery
      const healthChange = this.calculateHealthChange(instance);
      instance.health += healthChange * deltaTime;
      instance.health = Math.max(0, Math.min(1, instance.health));
      
      // Death check
      if (instance.health <= 0 || instance.age > 10000) {
        // Best-effort cause for internal model
        const cause = (instance.age > 10000)
          ? CauseOfDeath.NATURAL_AGING
          : CauseOfDeath.ENVIRONMENTAL_STRESS
        ;(instance as any).causeOfDeath = cause
        // Emit event if engine provided a hook
        try {
          const emit = (this as any).__emitEvent as ((t: EventType, d: any) => void) | undefined
          emit?.(EventType.SPECIES_DIE, {
            speciesId: instance.speciesId,
            cause,
            age: instance.age,
            biomass: instance.biomass,
            health: instance.health,
          })
        } catch {}
        toRemove.push(id);
        return;
      }
      
      // Phenology progression
      this.updatePhenology(instance);
      
      // Reproductive output
      if (instance.phenologyStage === PhenologyStage.FRUITING) {
        instance.reproductiveOutput += this.calculateReproduction(instance) * deltaTime;
      }
    });
    
    // Remove dead species
    toRemove.forEach(id => this.species.delete(id));
  }

  /**
   * Calculate growth rate based on environmental conditions
   */
  private calculateGrowthRate(): number {
    // Base growth modified by environmental factors
    let rate = 0.1; // Base growth per tick
    
    // Light requirements
    if (this.climateState.light < 0.3) rate *= 0.5;
    else if (this.climateState.light > 0.7) rate *= 1.2;
    
    // Moisture requirements
    if (this.biomeState.moisture < 0.2) rate *= 0.3;
    else if (this.biomeState.moisture > 0.6) rate *= 1.1;
    
    // Soil quality
    rate *= (0.5 + this.biomeState.soil * 0.5);
    
    // Competition (crowding)
    const density = this.species.size / 100; // Assume 100 max per chunk
    rate *= Math.max(0.1, 1 - density);
    
    // Pollution effects
    rate *= (1 - this.biomeState.pollution * 0.8);
    
    return Math.max(0, rate);
  }

  /**
   * Calculate health change based on stress factors
   */
  private calculateHealthChange(instance: SpeciesInstance): number {
    let change = 0.01; // Base health recovery
    
    // Temperature stress
    const tempStress = Math.abs(this.climateState.temperature - 20) / 30;
    change -= tempStress * 0.05;
    
    // Pollution damage
    change -= this.biomeState.pollution * 0.03;
    
    // Age-related decline
    const ageStress = Math.max(0, instance.age - 5000) / 5000;
    change -= ageStress * 0.02;
    
    return change;
  }

  /**
   * Update phenology stage
   */
  private updatePhenology(instance: SpeciesInstance): void {
    // Simple phenology based on age and conditions
    const stageProgress = instance.age % 1000; // 1000 tick cycle
    
    if (stageProgress < 200) {
      instance.phenologyStage = PhenologyStage.VEGETATIVE;
    } else if (stageProgress < 400 && this.climateState.temperature > 10) {
      instance.phenologyStage = PhenologyStage.FLOWERING;
    } else if (stageProgress < 600) {
      instance.phenologyStage = PhenologyStage.FRUITING;
    } else {
      instance.phenologyStage = PhenologyStage.DORMANT;
    }
  }

  /**
   * Calculate reproductive output
   */
  private calculateReproduction(instance: SpeciesInstance): number {
    let output = instance.biomass * 0.1; // Base reproduction rate
    
    // Environmental modifiers
    output *= (0.5 + this.biomeState.vitality * 0.5);
    output *= (0.5 + this.climateState.light * 0.5);
    
    return Math.max(0, output);
  }

  /**
   * Update hybrid instances
   */
  private updateHybrids(deltaTime: number): void {
    const toRemove: string[] = [];
    
    this.hybrids.forEach((hybrid, id) => {
      hybrid.duration -= deltaTime;
      
      if (hybrid.duration <= 0) {
        toRemove.push(id);
        return;
      }
      
      // Apply hybrid effects to local biome
      this.applyHybridEffects(hybrid, deltaTime);
    });
    
    toRemove.forEach(id => this.hybrids.delete(id));
  }

  /**
   * Apply hybrid effects to biome state
   */
  private applyHybridEffects(hybrid: HybridInstance, deltaTime: number): void {
    const effectStrength = hybrid.strength * deltaTime * 0.01;
    
    // Different hybrids have different effects
    // This would be data-driven in a real implementation
    switch (hybrid.hybridId) {
      case 'cleaner_moss':
        this.biomeState.pollution = Math.max(0, this.biomeState.pollution - effectStrength);
        break;
      case 'fertility_flower':
        this.biomeState.soil = Math.min(1, this.biomeState.soil + effectStrength);
        break;
      case 'shade_tree':
        this.biomeState.canopy = Math.min(1, this.biomeState.canopy + effectStrength * 0.5);
        break;
    }
  }

  /**
   * Update ritual residues
   */
  private updateRitualResidues(deltaTime: number): void {
    const toRemove: string[] = [];
    
    this.ritualResidues.forEach((residue, id) => {
      residue.duration -= deltaTime;
      
      if (residue.duration <= 0) {
        toRemove.push(id);
        return;
      }
      
      // Apply ritual effects
      this.applyRitualEffects(residue, deltaTime);
    });
    
    toRemove.forEach(id => this.ritualResidues.delete(id));
  }

  /**
   * Apply ritual effects to biome state
   */
  private applyRitualEffects(residue: RitualResidue, deltaTime: number): void {
    const effectMultiplier = residue.strength * deltaTime * 0.01;
    
    Object.entries(residue.effects).forEach(([property, change]) => {
      if (property in this.biomeState) {
        const currentValue = (this.biomeState as any)[property];
        const newValue = Math.max(0, Math.min(1, currentValue + change * effectMultiplier));
        (this.biomeState as any)[property] = newValue;
      }
    });
  }

  /**
   * Update biome state based on entities and conditions
   */
  private updateBiomeState(deltaTime: number): void {
    // Vitality calculation based on species and environmental health
    const speciesContribution = Math.min(1, this.species.size / 50) * 0.5;
    const environmentalHealth = (this.biomeState.soil + (1 - this.biomeState.pollution)) / 2;
    this.biomeState.vitality = (speciesContribution + environmentalHealth) / 2;
    
    // Diversity calculation
    const speciesCount = this.species.size;
    this.biomeState.diversity = Math.min(1, speciesCount / 20);
    
    // Moisture evaporation and diffusion
    const evaporationRate = this.climateState.temperature / 40 * this.climateState.wind;
    this.biomeState.moisture -= evaporationRate * deltaTime * 0.01;
    
    // Rain increases moisture
    if (this.rng.next() < this.climateState.rainLikelihood * deltaTime) {
      this.biomeState.moisture += this.rng.nextFloat(0.1, 0.3);
    }
    
    // Clamp moisture
    this.biomeState.moisture = Math.max(0, Math.min(1, this.biomeState.moisture));
    
    // Canopy calculation from tree biomass
    let totalTreeBiomass = 0;
    this.species.forEach(instance => {
      // Assume larger biomass = trees (simplified)
      if (instance.biomass > 3) {
        totalTreeBiomass += instance.biomass;
      }
    });
    this.biomeState.canopy = Math.min(1, totalTreeBiomass / 100);
    
    // Succession progression
    const stabilityFactor = this.biomeState.vitality * this.biomeState.diversity;
    this.biomeState.succession += stabilityFactor * deltaTime * 0.001;
    this.biomeState.succession = Math.max(0, Math.min(1, this.biomeState.succession));
    
    // Invasion pressure decreases with diversity and succession
    const invasionResistance = this.biomeState.diversity * this.biomeState.succession;
    this.biomeState.invasion -= invasionResistance * deltaTime * 0.01;
    this.biomeState.invasion = Math.max(0, Math.min(1, this.biomeState.invasion));
  }

  /**
   * Add species instance to chunk
   */
  addSpecies(species: SpeciesInstance): void {
    this.species.set(species.id, species);
  }

  /**
   * Add hybrid instance to chunk
   */
  addHybrid(hybrid: HybridInstance): void {
    this.hybrids.set(hybrid.id, hybrid);
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
      id: this.id,
      x: this.x,
      y: this.y,
      biomeState: { ...this.biomeState },
      climateState: { ...this.climateState },
      lastUpdateTick: this.lastUpdateTick,
      species: Array.from(this.species.entries()),
      hybrids: Array.from(this.hybrids.entries()),
      ritualResidues: Array.from(this.ritualResidues.entries()),
      seedBank: this.seedBank,
      rngSeed: this.rngSeed,
      rngState: this.rng.getState()
    };
  }

  /**
   * Load chunk state
   */
  importState(state: any): void {
    this.biomeState = state.biomeState;
    this.climateState = state.climateState;
    this.lastUpdateTick = state.lastUpdateTick;
    
    this.species.clear();
    state.species.forEach(([id, instance]: [string, SpeciesInstance]) => {
      this.species.set(id, instance);
    });
    
    this.hybrids.clear();
    state.hybrids.forEach(([id, hybrid]: [string, HybridInstance]) => {
      this.hybrids.set(id, hybrid);
    });
    
    this.ritualResidues.clear();
    state.ritualResidues.forEach(([id, residue]: [string, RitualResidue]) => {
      this.ritualResidues.set(id, residue);
    });
    this.seedBank = state.seedBank || [];
    
    this.rngSeed = state.rngSeed;
    this.rng.setState(state.rngState);
  }

  /**
   * Generate hash for validation
   */
  getStateHash(): number {
    // Simple hash of key state values
    const values = [
      this.biomeState.vitality,
      this.biomeState.soil, 
      this.biomeState.moisture,
      this.species.size,
      this.hybrids.size,
      this.ritualResidues.size,
      this.lastUpdateTick
    ];
    
    let hash = 0;
    values.forEach(val => {
      hash = ((hash << 5) - hash + (val * 1000 | 0)) | 0;
    });
    return hash;
  }
}
