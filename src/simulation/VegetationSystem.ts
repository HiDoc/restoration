/**
 * Vegetation system handling growth, phenology, and life cycles
 */

import { SeededRNG, RNGManager } from './SeededRNG';
import { WorldChunk, SpeciesInstance, PhenologyStage, CauseOfDeath } from './WorldChunk';
import { SpeciesRegistry, SpeciesDefinition } from './SpeciesRegistry';
import { GeneticSystem } from './GeneticSystem';
import { EventType } from './EventJournal';

export interface GrowthFactors {
  temperature: number;    // Temperature stress factor [0-1]
  light: number;         // Light availability factor [0-1]  
  moisture: number;      // Soil moisture factor [0-1]
  nutrients: number;     // Soil nutrient factor [0-1]
  competition: number;   // Competition stress factor [0-1]
  age: number;          // Age-related decline factor [0-1]
}

export interface ReproductionResult {
  seeds: number;         // Number of seeds produced
  pollenReach: number;   // How far pollen travels
  seedViability: number; // Seed survival probability
  dispersalKernel: { distance: number; probability: number }[];
}

export interface MortalityRecord {
  speciesId: string;
  tick: number;
  cause: CauseOfDeath;
  age: number;
  biomass: number;
  health: number;
  chunkX: number;
  chunkY: number;
  genetics?: any; // Copy of genetic profile for analysis
}

export interface SuccessionMetrics {
  pioneerDominance: number;    // [0-1] How much pioneers dominate
  earlyDominance: number;      // [0-1] Early succession species
  midDominance: number;        // [0-1] Mid succession species
  lateDominance: number;       // [0-1] Late succession species
  climaxDominance: number;     // [0-1] Climax species
  stabilityIndex: number;      // [0-1] How stable the community is
}

export class VegetationSystem {
  private rng: SeededRNG;
  private speciesRegistry: SpeciesRegistry;
  private geneticSystem: GeneticSystem;
  private _simulationEngine?: any; // Optional reference to get master genomes
  
  // Growth and mortality parameters
  private readonly COMPETITION_RADIUS = 1.0;
  private readonly MAX_BIOMASS_PER_CHUNK = 100;
  private readonly BASE_MORTALITY_RATE = 0.001;
  
  // Mortality tracking
  private mortalityHistory: MortalityRecord[] = [];
  private currentTick = 0;
  
  constructor(simulationEngine?: any) {
    this.rng = RNGManager.getInstance().getRNG('vegetation');
    this.speciesRegistry = SpeciesRegistry.getInstance();
    this.geneticSystem = new GeneticSystem(RNGManager.getInstance());
    this._simulationEngine = simulationEngine;
  }

  /**
   * Update vegetation in a chunk
   */
  update(chunk: WorldChunk, deltaTime: number): void {
    // Track current tick for mortality records
    this.currentTick++;
    
    // Reset per-tick seed stats on the chunk
    const stats = (chunk as any).seedStats || { totalLanded: 0, totalSurvived: 0, totalGerminated: 0, lastTickLanded: 0, lastTickSurvived: 0, lastTickGerminated: 0 }
    stats.lastTickLanded = 0
    stats.lastTickSurvived = 0
    stats.lastTickGerminated = 0
    ;(chunk as any).seedStats = stats
    const speciesArray = Array.from(chunk.species.values());
    
    // Update each species instance
    speciesArray.forEach(species => {
      this.updateSpeciesInstance(species, chunk, deltaTime);
    });
    
    // Process reproduction
    this.processReproduction(chunk, speciesArray, deltaTime);
    // Process asexual (vegetative) reproduction for eligible species
    this.processAsexualReproduction(chunk, speciesArray, deltaTime);
    
    // Process seed dispersal (to local and neighboring chunks)
    this.processSeedDispersal(chunk, speciesArray);
    
    // Process mortality
    this.processMortality(chunk, speciesArray, deltaTime);
    
    // Process seed bank maturation and recruitment
    this.processSeedBank(chunk, deltaTime);
    
    // Update succession metrics
    this.updateSuccessionMetrics(chunk, speciesArray);
  }

  /**
   * Asexual/vegetative reproduction mechanisms for species that support it.
   * Supports: rhizome, stolon/runner, sucker, plantlet, bulb/tuber/corm (as propagules), apomixis (clonal seeds).
   */
  private processAsexualReproduction(chunk: WorldChunk, species: SpeciesInstance[], deltaTime: number): void {
    const reg = this.speciesRegistry
    const rng = this.rng
    const MAX_LOCAL_DENSITY = 12 // cap same-species individuals in local area

    for (const inst of species) {
      const def = reg.getSpecies(inst.speciesId)
      if (!def || !def.asexual) continue

      // Environmental affinity: better on low canopy, good soil, moderate moisture
      const canopy = Math.max(0, 1 - chunk.biomeState.canopy) // prefer open
      const soil = 0.5 + chunk.biomeState.soil * 0.5
      const moistureMid = 1 - Math.abs((chunk.biomeState.moisture - 0.5) * 2) // peak at 0.5
      const vitality = 0.5 + chunk.biomeState.vitality * 0.5
      const env = Math.max(0, Math.min(1, 0.25*canopy + 0.25*soil + 0.25*moistureMid + 0.25*vitality))

      // Health gate and size gate (avoid seedling spreading)
      if (inst.health < 0.5) continue
      const sizeFactor = Math.min(1, inst.biomass / Math.max(0.1, (def.reproductionThreshold || 0.1)))

      // Local density check
      const sameLocal = this.getLocalCount(chunk, inst.x, inst.y, def.id, 0.2)
      if (sameLocal >= MAX_LOCAL_DENSITY) continue

      // Helper to add a clone individual
      const addCloneNearby = (minR: number, maxR: number, biomassScale = 0.2) => {
        const r = rng.nextFloat(Math.max(0.01, minR), Math.max(minR, Math.min(def.asexual!.maxDistance, maxR)))
        const a = rng.next() * Math.PI * 2
        const nx = inst.x + Math.cos(a) * r
        const ny = inst.y + Math.sin(a) * r
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
        const clone: SpeciesInstance = {
          id: `veg_${inst.speciesId}_${Date.now()}_${Math.floor(rng.next()*1e6)}`,
          speciesId: inst.speciesId,
          x: nx,
          y: ny,
          biomass: Math.min(0.08, Math.max(0.02, inst.biomass * biomassScale)),
          age: 0,
          phenologyStage: PhenologyStage.SEED,
          health: Math.min(1, inst.health * 0.9 + 0.1),
          reproductiveOutput: 0,
          reproductiveUrge: 0,
          lastReproductionAttempt: 0
        }
        chunk.addSpecies(clone)
      }

      // Attempt each mechanism present
      const mechanisms = new Set(def.asexual.methods)
      // Base chance scaled by environment (emphasize good conditions) and size
      const envEff = env * env
      const base = def.asexual.baseRate * envEff * sizeFactor * deltaTime

      // Rhizome (underground): short to medium range, prefers moderate moisture and soil
      if (mechanisms.has('rhizome') && rng.next() < base * 1.0) {
        addCloneNearby(0.03, 0.15, 0.25)
      }
      // Stolon/Runner (surface): longer reach, prefers low canopy (open light)
      if ((mechanisms.has('stolon') || mechanisms.has('runner')) && rng.next() < base * (1 + (1 - chunk.biomeState.canopy))) {
        addCloneNearby(0.08, 0.35, 0.2)
      }
      // Sucker (root sprouts): clustered near parent
      if (mechanisms.has('sucker') && rng.next() < base * 0.8) {
        addCloneNearby(0.02, 0.12, 0.25)
      }
      // Plantlet (leaf margins): drops very near parent when light is good
      if (mechanisms.has('plantlet') && chunk.climateState.light > 0.6 && rng.next() < base * 0.6) {
        addCloneNearby(0.02, 0.08, 0.2)
      }
      // Bulb/Tuber/Corm: create a vegetative propagule that germinates soon near parent
      if ((mechanisms.has('bulb') || mechanisms.has('tuber') || mechanisms.has('corm'))) {
        // Favor end-of-season/dormant times: cooler temps or lower light
        const isDormantSeason = (chunk.climateState.temperature < 12) || (chunk.climateState.light < 0.6)
        const seasonMult = isDormantSeason ? 1.3 : 0.7
        if (rng.next() < base * 0.8 * seasonMult) {
        const nx = Math.max(0, Math.min(1, inst.x + rng.nextFloat(-0.05, 0.05)))
        const ny = Math.max(0, Math.min(1, inst.y + rng.nextFloat(-0.05, 0.05)))
        const maturity = Math.floor(rng.nextFloat(5, 30))
        const viability = Math.min(1, 0.85 + rng.nextFloat(0, 0.15))
        ;(chunk as any).seedBank = (chunk as any).seedBank || []
        ;(chunk as any).seedBank.push({ speciesId: inst.speciesId, x: nx, y: ny, viability, maturityTicks: maturity })
        const st = (chunk as any).seedStats || { totalLanded: 0, totalSurvived: 0, totalGerminated: 0, lastTickLanded: 0, lastTickSurvived: 0, lastTickGerminated: 0 }
        st.totalLanded += 1; st.lastTickLanded += 1; (chunk as any).seedStats = st
        }
      }
      // Apomixis: clonal seeds (unfertilized) during fruiting
      if (mechanisms.has('apomixis') && inst.phenologyStage === PhenologyStage.FRUITING && rng.next() < base * 1.2) {
        const n = 1 + Math.floor(rng.nextFloat(0, 3))
        for (let i = 0; i < n; i++) {
          const nx = Math.max(0, Math.min(1, inst.x + rng.nextFloat(-0.1, 0.1)))
          const ny = Math.max(0, Math.min(1, inst.y + rng.nextFloat(-0.1, 0.1)))
          const maturity = Math.floor(rng.nextFloat(3, 20))
          const viability = Math.min(1, 0.9 + rng.nextFloat(0, 0.1))
          ;(chunk as any).seedBank = (chunk as any).seedBank || []
          ;(chunk as any).seedBank.push({ speciesId: inst.speciesId, x: nx, y: ny, viability, maturityTicks: maturity })
          const st = (chunk as any).seedStats || { totalLanded: 0, totalSurvived: 0, totalGerminated: 0, lastTickLanded: 0, lastTickSurvived: 0, lastTickGerminated: 0 }
          st.totalLanded += 1; st.lastTickLanded += 1; (chunk as any).seedStats = st
        }
      }
    }
  }

  private getLocalCount(chunk: WorldChunk, x: number, y: number, speciesId: string, radius: number): number {
    let count = 0
    chunk.species.forEach(s => {
      if (s.speciesId !== speciesId) return
      const dx = s.x - x
      const dy = s.y - y
      if (dx*dx + dy*dy <= radius*radius) count++
    })
    return count
  }

  /**
   * Update individual species instance
   */
  private updateSpeciesInstance(species: SpeciesInstance, chunk: WorldChunk, deltaTime: number): void {
    const speciesDef = this.speciesRegistry.getSpecies(species.speciesId);
    if (!speciesDef) return;

    // Initialize genetics if not present (for legacy species)
    if (!species.genetics) {
      species.genetics = this.geneticSystem.initializeGenetics(speciesDef);
    }

    // Calculate growth factors
    const growthFactors = this.calculateGrowthFactors(species, speciesDef, chunk);
    
    // Apply genetic effects
    const geneticEffects = this.geneticSystem.applyGeneticEffects(
      species,
      speciesDef,
      {
        temperature: chunk.climateState.temperature,
        moisture: chunk.biomeState.moisture,
        light: chunk.climateState.light,
        nutrients: chunk.biomeState.soil,
        competition: this.calculateCompetition(species, chunk)
      }
    );
    
    // Update phenology
    this.updatePhenology(species, speciesDef, chunk, deltaTime);
    
    // Calculate growth rate with genetic modifications
    const baseGrowthRate = speciesDef.growthRate * 0.01; // Convert to per-tick rate
    const environmentalModifier = this.calculateEnvironmentalModifier(growthFactors);
    const actualGrowthRate = baseGrowthRate * environmentalModifier * geneticEffects.growthModifier;
    
    // Apply growth
    if (species.biomass < speciesDef.maxBiomass) {
      const growthAmount = actualGrowthRate * deltaTime;
      species.biomass += growthAmount;
      species.biomass = Math.min(species.biomass, speciesDef.maxBiomass);
    }
    
    // Update health based on stress with genetic modifications
    const healthChange = this.calculateHealthChange(species, speciesDef, growthFactors, deltaTime);
    const modifiedHealthChange = healthChange * geneticEffects.healthModifier;
    species.health = Math.min(1, species.health + modifiedHealthChange); // Allow negative health for starvation detection
    
    // Calculate and update adaptation score
    this.geneticSystem.calculateAdaptationScore(species.genetics, {
      temperature: chunk.climateState.temperature,
      moisture: chunk.biomeState.moisture,
      light: chunk.climateState.light,
      nutrients: chunk.biomeState.soil,
      competitionLevel: this.calculateCompetition(species, chunk)
    });
    
    // Age the species
    species.age += 1;
  }

  /**
   * Calculate growth factors for a species
   */
  private calculateGrowthFactors(species: SpeciesInstance, speciesDef: SpeciesDefinition, chunk: WorldChunk): GrowthFactors {
    // Temperature factor
    const temp = chunk.climateState.temperature;
    const tempOptimal = (speciesDef.temperatureRange.min + speciesDef.temperatureRange.max) / 2;
    const tempTolerance = (speciesDef.temperatureRange.max - speciesDef.temperatureRange.min) / 2;
    const tempStress = Math.abs(temp - tempOptimal) / tempTolerance;
    const temperatureFactor = Math.max(0, 1 - tempStress);

    // Light factor
    const lightAvailable = chunk.climateState.light;
    const lightRequired = speciesDef.lightRequirement;
    const shadeToleranceMax = speciesDef.shadeToleranceMax;
    
    let lightFactor = 1;
    if (lightAvailable < lightRequired) {
      // Check shade tolerance
      const shadeLevel = 1 - lightAvailable;
      if (shadeLevel <= shadeToleranceMax) {
        lightFactor = lightAvailable / lightRequired;
      } else {
        lightFactor = Math.max(0, 1 - (shadeLevel - shadeToleranceMax));
      }
    }

    // Moisture factor
    const moisture = chunk.biomeState.moisture;
    const moistureOptimal = (speciesDef.moistureRange.min + speciesDef.moistureRange.max) / 2;
    const moistureTolerance = (speciesDef.moistureRange.max - speciesDef.moistureRange.min) / 2;
    const moistureStress = Math.abs(moisture - moistureOptimal) / Math.max(0.1, moistureTolerance);
    const moistureFactor = Math.max(0, 1 - moistureStress);

    // Nutrient factor (based on soil quality)
    const nutrientFactor = 0.5 + chunk.biomeState.soil * 0.5;

    // Competition factor
    const competitionFactor = this.calculateCompetition(species, chunk);

    // Age factor (senescence)
    const ageRatio = species.age / speciesDef.lifespanTicks;
    const ageFactor = ageRatio < 0.8 ? 1 : Math.max(0.1, 1 - (ageRatio - 0.8) / 0.2);

    return {
      temperature: temperatureFactor,
      light: lightFactor,
      moisture: moistureFactor,
      nutrients: nutrientFactor,
      competition: competitionFactor,
      age: ageFactor
    };
  }

  /**
   * Calculate competition stress
   */
  private calculateCompetition(species: SpeciesInstance, chunk: WorldChunk): number {
    let competitionStress = 0;
    let competitorCount = 0;

    // Check competition from other species in the chunk
    chunk.species.forEach(otherSpecies => {
      if (otherSpecies.id === species.id) return;
      
      const distance = Math.sqrt(
        Math.pow(species.x - otherSpecies.x, 2) + 
        Math.pow(species.y - otherSpecies.y, 2)
      );
      
      if (distance < this.COMPETITION_RADIUS) {
        // Competition intensity based on biomass and distance
        const competitionIntensity = otherSpecies.biomass / Math.max(0.1, distance);
        competitionStress += competitionIntensity;
        competitorCount++;
      }
    });

    // Total biomass density effect
    const totalBiomass = Array.from(chunk.species.values()).reduce((sum, s) => sum + s.biomass, 0);
    const densityStress = totalBiomass / this.MAX_BIOMASS_PER_CHUNK;

    // Combine competition factors
    const localCompetition = Math.min(1, competitionStress * 0.1);
    const densityCompetition = Math.min(1, densityStress);
    
    return Math.max(0, 1 - Math.max(localCompetition, densityCompetition));
  }

  /**
   * Calculate environmental growth modifier
   */
  private calculateEnvironmentalModifier(factors: GrowthFactors): number {
    // Use geometric mean to ensure all factors matter
    const factorValues = Object.values(factors);
    const product = factorValues.reduce((prod, val) => prod * val, 1);
    return Math.pow(product, 1 / factorValues.length);
  }

  /**
   * Calculate environmental quality for reproduction (excludes competition and age)
   */
  private calculateEnvironmentalQuality(factors: GrowthFactors): number {
    // Focus on abiotic factors only for reproduction quality
    const reproductionFactors = [
      factors.temperature,
      factors.light,
      factors.moisture,
      factors.nutrients
    ];
    const product = reproductionFactors.reduce((prod, val) => prod * val, 1);
    return Math.pow(product, 1 / reproductionFactors.length);
  }

  /**
   * Update reproductive urge based on time since last reproduction and health
   */
  private updateReproductiveUrge(species: SpeciesInstance, speciesDef: SpeciesDefinition, _chunk: WorldChunk, deltaTime: number): void {
    // Initialize if needed
    if (species.reproductiveUrge === undefined) {
      species.reproductiveUrge = 0;
    }
    if (species.lastReproductionAttempt === undefined) {
      species.lastReproductionAttempt = 0;
    }

    // Calculate time since last reproduction attempt
    const ticksSinceLastAttempt = species.age - species.lastReproductionAttempt;
    const reproductiveAge = species.age - speciesDef.reproductionThreshold;
    
    if (reproductiveAge > 0 && species.health > 0.5) {
      // Build urge over time (faster for older individuals)
      const ageUrgencyFactor = Math.min(2, reproductiveAge / (speciesDef.lifespanTicks * 0.1));
      const baseUrgeIncrease = 0.01 * deltaTime; // Base 1% per tick
      const timeUrgencyFactor = Math.min(3, ticksSinceLastAttempt / 1000); // More urgent over time
      
      species.reproductiveUrge = Math.min(1, species.reproductiveUrge + 
        baseUrgeIncrease * ageUrgencyFactor * timeUrgencyFactor
      );
    }
  }

  /**
   * Calculate dynamic reproduction need that decreases as reproductive urge increases
   */
  private calculateDynamicReproductionNeed(speciesDef: SpeciesDefinition, species: SpeciesInstance): number {
    const baseNeed = speciesDef.reproductionNeed;
    const urgencyReduction = species.reproductiveUrge * 0.4; // Up to 40% reduction when desperate
    return Math.max(0.1, baseNeed - urgencyReduction); // Never below 10%
  }

  /**
   * Update phenology stage
   */
  private updatePhenology(species: SpeciesInstance, speciesDef: SpeciesDefinition, chunk: WorldChunk, deltaTime: number): void {
    // Phenology is driven by age, temperature, and photoperiod
    const temperature = chunk.climateState.temperature;
    const dayLength = this.calculateDayLength(species.age); // Simplified photoperiod
    
    // Determine appropriate phenology stage
    if (species.biomass < speciesDef.reproductionThreshold) {
      species.phenologyStage = PhenologyStage.VEGETATIVE;
      return;
    }

    // Temperature-based phenology switching
    const isGrowingSeason = temperature > 10 && dayLength > 10;
    const inSeasonWindow = this.isInReproductionSeason(speciesDef, chunk);
    const isReproductiveSeason = (temperature > 15 && temperature < 30) && inSeasonWindow;
    
    switch (species.phenologyStage) {
      case PhenologyStage.SEED:
        if (species.biomass > 0.1) {
          species.phenologyStage = PhenologyStage.VEGETATIVE;
        }
        break;
        
      case PhenologyStage.VEGETATIVE:
        if (isReproductiveSeason && species.biomass >= speciesDef.reproductionThreshold) {
          // Update reproductive urge over time
          this.updateReproductiveUrge(species, speciesDef, chunk, deltaTime);
          
          // Check environmental quality against dynamic reproduction need
          const growthFactors = this.calculateGrowthFactors(species, speciesDef, chunk);
          const environmentalQuality = this.calculateEnvironmentalQuality(growthFactors);
          const dynamicReproductionNeed = this.calculateDynamicReproductionNeed(speciesDef, species);
          
          if (environmentalQuality >= dynamicReproductionNeed) {
            const reproductionChance = 0.1 * (1 + species.reproductiveUrge); // Urge increases chance
            if (this.rng.next() < reproductionChance * deltaTime) {
              species.phenologyStage = PhenologyStage.FLOWERING;
              species.reproductiveUrge = 0; // Reset urge after successful reproduction
              species.lastReproductionAttempt = species.age;
            }
          }
        } else if (!isGrowingSeason) {
          species.phenologyStage = PhenologyStage.DORMANT;
        }
        break;
        
      case PhenologyStage.FLOWERING:
        // Flowering lasts for a fixed period
        if (this.rng.next() < 0.05 * deltaTime) { // 5% chance to transition
          species.phenologyStage = PhenologyStage.FRUITING;
        }
        break;
        
      case PhenologyStage.FRUITING:
        // Fruiting lasts until seeds are dispersed
        if (species.reproductiveOutput > speciesDef.seedProduction * 0.8) {
          species.phenologyStage = isGrowingSeason ? PhenologyStage.VEGETATIVE : PhenologyStage.DORMANT;
          species.reproductiveOutput = 0; // Reset after fruiting
        }
        break;
        
      case PhenologyStage.DORMANT:
        if (isGrowingSeason) {
          species.phenologyStage = PhenologyStage.VEGETATIVE;
        }
        break;
    }
  }

  /**
   * Calculate day length (simplified)
   */
  private calculateDayLength(age: number): number {
    // Simple seasonal variation
    const seasonProgress = (age % 10000) / 10000; // 10000 ticks = 1 year
    const seasonalVariation = Math.sin(seasonProgress * 2 * Math.PI) * 4; // ±4 hours
    return 12 + seasonalVariation;
  }

  /**
   * Calculate health change
   */
  /**
   * Calculate environmental stress for genetic mutations
   */
  private calculateEnvironmentalStress(chunk: WorldChunk): number {
    const temp = chunk.climateState.temperature;
    const moisture = chunk.biomeState.moisture;
    const vitality = chunk.biomeState.vitality;
    const soil = chunk.biomeState.soil;
    
    // Stress increases with extreme conditions
    let stress = 0;
    
    // Temperature stress
    if (temp < 10 || temp > 30) stress += 0.3;
    else if (temp < 15 || temp > 25) stress += 0.1;
    
    // Moisture stress
    if (moisture < 0.3 || moisture > 0.9) stress += 0.2;
    else if (moisture < 0.4 || moisture > 0.8) stress += 0.1;
    
    // Overall ecosystem health stress
    stress += (1 - vitality) * 0.3;
    stress += (1 - soil) * 0.2;
    
    return Math.max(0, Math.min(1, stress));
  }

  private calculateHealthChange(species: SpeciesInstance, speciesDef: SpeciesDefinition, factors: GrowthFactors, deltaTime: number): number {
    let healthChange = 0.012 * deltaTime; // Slightly higher base recovery rate
    
    // Stress from poor growing conditions
    const overallStress = 1 - this.calculateEnvironmentalModifier(factors);
    healthChange -= overallStress * 0.02 * deltaTime;
    
    // Age-related decline
    const ageRatio = species.age / speciesDef.lifespanTicks;
    if (ageRatio > 0.7) {
      const senescenceRate = (ageRatio - 0.7) / 0.3;
      healthChange -= senescenceRate * 0.01 * deltaTime;
    }
    
    // Phenology affects health
    switch (species.phenologyStage) {
      case PhenologyStage.FLOWERING:
      case PhenologyStage.FRUITING:
        healthChange -= 0.003 * deltaTime; // Reproductive cost (tempered)
        break;
      case PhenologyStage.DORMANT:
        healthChange += 0.002 * deltaTime; // Rest period
        break;
    }
    
    return healthChange;
  }

  /**
   * Process reproduction
   */
  private processReproduction(chunk: WorldChunk, species: SpeciesInstance[], deltaTime: number): void {
    species.forEach(plant => {
      if (plant.phenologyStage !== PhenologyStage.FRUITING) return;
      
      const speciesDef = this.speciesRegistry.getSpecies(plant.speciesId);
      if (!speciesDef) return;
      
      // Apply genetic effects to reproduction
      let reproductionModifier = 1;
      if (plant.genetics) {
        const geneticEffects = this.geneticSystem.applyGeneticEffects(
          plant,
          speciesDef,
          {
            temperature: chunk.climateState.temperature,
            moisture: chunk.biomeState.moisture,
            light: chunk.climateState.light,
            nutrients: chunk.biomeState.soil,
            competition: this.calculateCompetition(plant, chunk)
          }
        );
        reproductionModifier = geneticEffects.reproductionModifier;
      }
      
      const reproductionRate = this.calculateReproductionRate(plant, speciesDef, chunk);
      const seedsProduced = reproductionRate * reproductionModifier * deltaTime;
      
      plant.reproductiveOutput += seedsProduced;
    });
  }

  /**
   * Calculate reproduction rate
   */
  private calculateReproductionRate(species: SpeciesInstance, speciesDef: SpeciesDefinition, chunk: WorldChunk): number {
    // Base and components
    const base = speciesDef.seedProduction * 0.01; // Base rate per tick
    const sizeEffect = Math.min(1, species.biomass / speciesDef.reproductionThreshold);
    const healthFactor = species.health;
    const vitalityFactor = (0.5 + chunk.biomeState.vitality * 0.5);
    const lightFactor = (0.5 + chunk.climateState.light * 0.5);
    const seasonFactor = this.isInReproductionSeason(speciesDef, chunk) ? 1.0 : 0.2;
    const pollinationSuccess = this.calculatePollinationSuccess(speciesDef, chunk);
    
    let rate = base * sizeEffect * healthFactor * vitalityFactor * lightFactor * seasonFactor * pollinationSuccess;

    // Record debug info for inspector
    try {
      const boosts = (chunk as any).__interactionBoost || { pollination: new Map(), seedDispersal: new Map() }
      const pollinationBoost = boosts.pollination?.get?.(speciesDef.id) || 0
      const dispersalBoost = boosts.seedDispersal?.get?.(speciesDef.id) || 0
      const dbg: Map<string, any> = (chunk as any).__reproDebug || new Map<string, any>()
      dbg.set(speciesDef.id, {
        base,
        sizeEffect,
        healthFactor,
        vitalityFactor,
        lightFactor,
        seasonFactor,
        pollinationSuccess,
        pollinationBoost,
        dispersalBoost,
        finalRate: Math.max(0, rate)
      })
      ;(chunk as any).__reproDebug = dbg
    } catch {}

    return Math.max(0, rate);
  }

  /**
   * Calculate pollination success
   */
  private calculatePollinationSuccess(speciesDef: SpeciesDefinition, chunk: WorldChunk): number {
    const pollinators = (chunk as any).pollinatorDensity as number | undefined
    const pollFactor = typeof pollinators === 'number' ? Math.max(0, Math.min(1, pollinators)) : undefined
    let base: number
    switch (speciesDef.pollination) {
      case 'wind':
        base = 0.5 + chunk.climateState.wind * 0.5; // Wind helps wind-pollinated plants
        break
      case 'insect':
        // Prefer explicit pollinator density if available; fallback to diversity proxy
        base = (pollFactor !== undefined) ? (0.2 + pollFactor * 0.8) : (0.3 + chunk.biomeState.diversity * 0.7)
        break
      case 'bird':
        // Birds correlate with canopy and the birds system activity if available
        {
          const birdsActivity = ((chunk as any).birdsActivity as number | undefined) ?? 0.5
          const canopyFactor = chunk.biomeState.canopy * 0.5
          const activityFactor = birdsActivity * 0.5
          base = 0.3 + Math.min(1, canopyFactor + activityFactor)
          break
        }
      case 'self':
        base = 0.9; // Self-pollinating plants are mostly independent
        break
      default:
        base = 0.5;
        break
    }
    // Apply DB-driven pollination boost if present
    const boostMap: Map<string, number> | undefined = (chunk as any).__interactionBoost?.pollination
    const boost = boostMap?.get(speciesDef.id) || 0
    const boosted = Math.min(1, base * (1 + Math.min(0.5, boost)))
    return boosted
  }

  /**
   * Process seed dispersal
   */
  private processSeedDispersal(chunk: WorldChunk, species: SpeciesInstance[]): void {
    species.forEach(plant => {
      if (plant.reproductiveOutput < 1) return;
      
      const speciesDef = this.speciesRegistry.getSpecies(plant.speciesId);
      if (!speciesDef) return;
      
      const seedsToDisperse = Math.floor(plant.reproductiveOutput);
      plant.reproductiveOutput -= seedsToDisperse;
      
      for (let i = 0; i < seedsToDisperse; i++) {
        const dispersalDistance = this.calculateDispersalDistance(speciesDef, chunk, plant.speciesId);
        const dispersalAngle = this.rng.next() * 2 * Math.PI;
        
        let globalX = plant.x + Math.cos(dispersalAngle) * dispersalDistance;
        let globalY = plant.y + Math.sin(dispersalAngle) * dispersalDistance;

        // Determine target chunk offsets
        let dx = 0, dy = 0;
        while (globalX < 0) { globalX += 1; dx -= 1; }
        while (globalX > 1) { globalX -= 1; dx += 1; }
        while (globalY < 0) { globalY += 1; dy -= 1; }
        while (globalY > 1) { globalY -= 1; dy += 1; }

        // Bias: retain a majority of seeds in the source chunk to ensure local recruitment
        if (this.rng.next() < 0.6) { // 60% local retention
          dx = 0; dy = 0;
          // Wrap back into [0,1]
          globalX = ((globalX % 1) + 1) % 1;
          globalY = ((globalY % 1) + 1) % 1;
        }

        // Find target chunk
        const targetChunk = this.getNeighborChunk(chunk, dx, dy);
        if (!targetChunk) continue;

        const seed = {
          speciesId: plant.speciesId,
          x: globalX,
          y: globalY,
          viability: this.calculateSeedViability(speciesDef, plant.health),
          maturityTicks: this.getSeedMaturityTicks(plant.speciesId)
        };
        (targetChunk as any).seedBank?.push?.(seed) || (targetChunk as any).addSeed?.(seed);
        const st = (targetChunk as any).seedStats || { totalLanded: 0, totalSurvived: 0, totalGerminated: 0, lastTickLanded: 0, lastTickSurvived: 0, lastTickGerminated: 0 }
        st.totalLanded += 1
        st.lastTickLanded += 1
        ;(targetChunk as any).seedStats = st
      }
    });
  }

  private getNeighborChunk(chunk: WorldChunk, dx: number, dy: number): WorldChunk | null {
    const x = chunk.x + dx;
    const y = chunk.y + dy;
    // We don't have access to engine here; infer via global manager not available.
    // As a fallback, store a weak map on chunk for parent lookup (set in SimulationEngine if desired).
    const getChunk = (chunk as any).__getChunk as ((x: number, y: number) => WorldChunk | null) | undefined;
    if (getChunk) return getChunk(x, y);
    // If not provided, only allow local chunk
    return dx === 0 && dy === 0 ? chunk : null;
  }

  /**
   * Calculate seed dispersal distance
   */
  private calculateDispersalDistance(speciesDef: SpeciesDefinition, chunk: WorldChunk, speciesId: string): number {
    // Use exponential distribution for realistic dispersal kernel
    let meanDistance = speciesDef.dispersalRange * 0.05; // Smaller default to favor local dispersal
    // Apply DB-driven seed dispersal boost if present
    const dispMap: Map<string, number> | undefined = (chunk as any).__interactionBoost?.seedDispersal
    const boost = dispMap?.get(speciesId) || 0
    meanDistance *= (1 + Math.min(0.75, boost))
    const d = -Math.log(this.rng.next()) * meanDistance
    // Clamp extremely long jumps to keep within neighborhood when most chunks are inactive
    return Math.min(0.35, d)
  }

  // Species-specific seed maturation times (ticks) with defaults
  private getSeedMaturityTicks(speciesId: string): number {
    const def = this.speciesRegistry.getSpecies(speciesId)
    if (def && typeof def.seedMaturityTicks === 'number') return def.seedMaturityTicks
    return 100
  }

  /**
   * Calculate seed viability
   */
  private calculateSeedViability(speciesDef: SpeciesDefinition, parentHealth: number): number {
    let viability = 0.5; // Base viability
    
    viability *= parentHealth; // Healthy parents produce better seeds
    
    // Rarer species have lower viability
    switch (speciesDef.rarity) {
      case 'common': viability *= 1.0; break;
      case 'uncommon': viability *= 0.8; break;
      case 'rare': viability *= 0.6; break;
      case 'very_rare': viability *= 0.4; break;
      case 'legendary': viability *= 0.2; break;
    }
    
    return Math.max(0.1, Math.min(1, viability));
  }

  /**
   * Process mortality with cause tracking
   */
  private processMortality(chunk: WorldChunk, species: SpeciesInstance[], deltaTime: number): void {
    const toRemove: { id: string; cause: CauseOfDeath; plant: SpeciesInstance }[] = [];
    
    species.forEach(plant => {
      const speciesDef = this.speciesRegistry.getSpecies(plant.speciesId);
      if (!speciesDef) return;
      
      let shouldDie = false;
      let causeOfDeath = CauseOfDeath.UNKNOWN;
      
      // Direct health failure (starvation/disease), but prioritize aging when near end-of-life
      if (plant.health <= 0) {
        const ageRatio0 = plant.age / speciesDef.lifespanTicks;
        // Treat advanced age as natural aging even if health falls to zero
        if (ageRatio0 > 0.9) {
          shouldDie = true;
          causeOfDeath = CauseOfDeath.NATURAL_AGING;
        } else {
          // Attribute zero-health deaths to the dominating environmental stressor when applicable
          const temp0 = chunk.climateState.temperature;
          const moist0 = chunk.biomeState.moisture;
          if (moist0 <= speciesDef.moistureRange.min - 0.05) {
            shouldDie = true;
            causeOfDeath = CauseOfDeath.DROUGHT;
          } else if (temp0 < speciesDef.temperatureRange.min - 1) {
            shouldDie = true;
            causeOfDeath = CauseOfDeath.COLD_DAMAGE;
          } else if (temp0 > speciesDef.temperatureRange.max + 1) {
            shouldDie = true;
            causeOfDeath = CauseOfDeath.HEAT_STRESS;
          } else {
            shouldDie = true;
            causeOfDeath = plant.health <= -0.1 ? CauseOfDeath.STARVATION : CauseOfDeath.DISEASE;
          }
        }
      }
      
      if (!shouldDie) {
        let mortalityRate = this.BASE_MORTALITY_RATE * deltaTime;
        let primaryCause = CauseOfDeath.NATURAL_AGING;
        
        // Age-based mortality (prioritize aging at advanced ages)
        const ageRatio = plant.age / speciesDef.lifespanTicks;
        if (ageRatio > 0.8) {
          const ageMortality = Math.pow(ageRatio - 0.8, 2) * 0.01 * deltaTime;
          mortalityRate += ageMortality;
          primaryCause = CauseOfDeath.NATURAL_AGING;
          // Strongly prioritize natural aging near end-of-life
          if (ageRatio > 0.95) {
            mortalityRate += 0.02 * deltaTime;
          }
        }
        
        // Environmental stress mortality
        const temp = chunk.climateState.temperature;
        const moisture = chunk.biomeState.moisture;
        
        // Temperature stress
        if (temp < speciesDef.temperatureRange.min) {
          const coldStress = (speciesDef.temperatureRange.min - temp) / 10;
          mortalityRate += coldStress * 0.02 * deltaTime;
          primaryCause = CauseOfDeath.COLD_DAMAGE;
          if (temp < speciesDef.temperatureRange.min - 5) mortalityRate += 0.05 * deltaTime;
        } else if (temp > speciesDef.temperatureRange.max) {
          const heatStress = (temp - speciesDef.temperatureRange.max) / 10;
          mortalityRate += heatStress * 0.02 * deltaTime;
          primaryCause = CauseOfDeath.HEAT_STRESS;
          if (temp > speciesDef.temperatureRange.max + 5) mortalityRate += 0.05 * deltaTime;
        }
        
        // Drought stress
        if (moisture < speciesDef.moistureRange.min) {
          const deficit = (speciesDef.moistureRange.min - moisture);
          const droughtStress = deficit * 0.08 * deltaTime;
          mortalityRate += droughtStress;
          primaryCause = CauseOfDeath.DROUGHT;
          if (deficit > 0.05) mortalityRate += 0.02 * deltaTime;
          if (deficit > 0.1) mortalityRate += 0.05 * deltaTime;
        }
        
        // Pollution mortality
        if (chunk.biomeState.pollution > 0.5) {
          const pollutionStress = chunk.biomeState.pollution * 0.005 * deltaTime;
          mortalityRate += pollutionStress;
          primaryCause = CauseOfDeath.POLLUTION;
        }
        
        // Health-based mortality (general stress)
        if (plant.health < 0.5) {
          const healthMortality = (0.5 - plant.health) * 0.002 * deltaTime;
          mortalityRate += healthMortality;
          // Do not override specific environmental causes or late-life aging
          if (ageRatio <= 0.95 && primaryCause === CauseOfDeath.NATURAL_AGING) {
            primaryCause = CauseOfDeath.ENVIRONMENTAL_STRESS;
          }
        }
        
        // Random catastrophic events (storms, diseases, etc.)
        // Scale by pollution so in clean environments these are very rare
        const catastropheRate = 0.00002 + 0.00008 * Math.max(0, Math.min(1, chunk.biomeState.pollution))
        if (this.rng.next() < catastropheRate * deltaTime) {
          mortalityRate += this.rng.nextFloat(0.3, 0.8);
          const eventType = this.rng.nextInt(0, 2);
          primaryCause = eventType === 0 ? CauseOfDeath.ACCIDENT : 
                        eventType === 1 ? CauseOfDeath.DISEASE : CauseOfDeath.PREDATION;
        }
        
        // Apply mortality check
        if (this.rng.next() < mortalityRate) {
          shouldDie = true;
          causeOfDeath = primaryCause;
        }
      }
      
      if (shouldDie) {
        // Record the death before removal
        plant.causeOfDeath = causeOfDeath;
        plant.deathTick = this.currentTick;
        // Emit death event with cause, if emitter is available
        try {
          const emit = (chunk as any).__emitEvent as ((t: EventType, d: any) => void) | undefined
          emit?.(EventType.SPECIES_DIE, {
            speciesId: plant.speciesId,
            cause: causeOfDeath,
            age: plant.age,
            biomass: plant.biomass,
            health: plant.health,
          })
        } catch {}

        toRemove.push({ id: plant.id, cause: causeOfDeath, plant });
      }
    });
    
    // Process deaths and record mortality data
    toRemove.forEach(({ id, cause, plant }) => {
      // Record mortality for analysis
      const mortalityRecord: MortalityRecord = {
        speciesId: plant.speciesId,
        tick: this.currentTick,
        cause: cause,
        age: plant.age,
        biomass: plant.biomass,
        health: plant.health,
        chunkX: chunk.x,
        chunkY: chunk.y,
        genetics: plant.genetics ? { ...plant.genetics } : undefined
      };
      
      this.mortalityHistory.push(mortalityRecord);
      
      // Limit mortality history size (keep last 1000 records)
      if (this.mortalityHistory.length > 1000) {
        this.mortalityHistory = this.mortalityHistory.slice(-1000);
      }
      
      // Remove from chunk
      chunk.species.delete(id);
    });
  }

  /**
   * Process recruitment (new seedlings)
   */
  private processSeedBank(chunk: WorldChunk, deltaTime: number): void {
    const bank: any[] = (chunk as any).seedBank || [];
    const survivors: any[] = [];
    bank.forEach((seed: any) => {
      seed.maturityTicks -= 1;
      if (seed.maturityTicks > 0) { survivors.push(seed); return; }
      const speciesDef = this.speciesRegistry.getSpecies(seed.speciesId);
      if (!speciesDef) return;
      
      // Check if seed can germinate
      const germinationProbability = this.calculateGerminationProbability(speciesDef, chunk, seed);
      const survive = this.rng.next() < seed.viability;
      if (survive) {
        const st = (chunk as any).seedStats || { totalLanded: 0, totalSurvived: 0, totalGerminated: 0, lastTickLanded: 0, lastTickSurvived: 0, lastTickGerminated: 0 }
        st.totalSurvived += 1
        st.lastTickSurvived += 1
        ;(chunk as any).seedStats = st
      }
      if (survive && this.rng.next() < germinationProbability * deltaTime) {
        // Create new seedling
        const speciesDef = this.speciesRegistry.getSpecies(seed.speciesId);
        const newSeedling: SpeciesInstance = {
          id: `seedling_${Date.now()}_${Math.random()}`,
          speciesId: seed.speciesId,
          x: seed.x,
          y: seed.y,
          biomass: 0.01,
          age: 0,
          phenologyStage: PhenologyStage.SEED,
          health: 0.8 + this.rng.nextFloat(-0.2, 0.2),
          reproductiveOutput: 0,
          reproductiveUrge: 0,
          lastReproductionAttempt: 0
        };

        // Initialize genetics for new seedling
        if (speciesDef) {
          // If a master genome exists for this species (selected seed), use it
          const masterGenome = this._simulationEngine?.getMasterGenome?.(seed.speciesId)
          if (masterGenome) {
            newSeedling.genetics = {
              traits: new Map(masterGenome.traits),
              generation: masterGenome.generation,
              mutations: [...masterGenome.mutations],
              adaptationScore: masterGenome.adaptationScore
            }
          } else {
            // Otherwise inherit and possibly mutate from a parent if available
            const parentSpecies = Array.from(chunk.species.values()).find(s => 
              s.speciesId === seed.speciesId && 
              s.phenologyStage === PhenologyStage.FRUITING
            );
            if (parentSpecies && parentSpecies.genetics) {
              const environmentalStress = this.calculateEnvironmentalStress(chunk);
              const mutationResult = this.geneticSystem.applyMutations(
                parentSpecies.genetics,
                environmentalStress,
                parentSpecies.genetics.generation + 1
              );
              newSeedling.genetics = mutationResult.genetics;
            } else {
              // First generation - initialize base genetics
              newSeedling.genetics = this.geneticSystem.initializeGenetics(speciesDef);
            }
          }
        }
        
        chunk.species.set(newSeedling.id, newSeedling);
        const st = (chunk as any).seedStats || { totalLanded: 0, totalSurvived: 0, totalGerminated: 0, lastTickLanded: 0, lastTickSurvived: 0, lastTickGerminated: 0 }
        st.totalGerminated += 1
        st.lastTickGerminated += 1
        ;(chunk as any).seedStats = st
      }
    });
    // Update seed bank
    (chunk as any).seedBank = survivors;
  }

  /**
   * Calculate germination probability
   */
  private calculateGerminationProbability(speciesDef: SpeciesDefinition, chunk: WorldChunk, seed: any): number {
    let probability = 0.1; // Base germination rate
    
    // Temperature requirements
    const temp = chunk.climateState.temperature;
    if (temp >= speciesDef.temperatureRange.min && temp <= speciesDef.temperatureRange.max) {
      probability *= 2; // Good temperature doubles probability
    } else {
      probability *= 0.3; // Poor temperature reduces it
    }
    
    // Moisture requirements
    const moisture = chunk.biomeState.moisture;
    if (moisture >= speciesDef.moistureRange.min) {
      probability *= 1.5;
    } else {
      probability *= 0.2;
    }
    
    // Light requirements for germination
    const light = chunk.climateState.light;
    if (light >= speciesDef.lightRequirement * 0.5) { // Seeds need less light than adults
      probability *= 1.2;
    } else {
      probability *= 0.5;
    }
    // Seasonal influence: slightly reduced if out of preferred seasons
    if (!this.isInReproductionSeason(speciesDef, chunk)) {
      probability *= 0.7;
    }
    
    // Competition check - reduce probability in crowded areas
    const localBiomass = this.getLocalBiomass(chunk, seed.x, seed.y);
    if (localBiomass > 5) {
      probability *= 0.5;
    }
    
    // Soil quality
    probability *= (0.5 + chunk.biomeState.soil * 0.5);

    // DB-driven disperser boost (e.g., birds aiding seed placement)
    const dispMap: Map<string, number> | undefined = (chunk as any).__interactionBoost?.seedDispersal
    if (dispMap) {
      const boost = dispMap.get(seed.speciesId) || 0
      probability *= (1 + Math.min(0.25, 0.2 * boost))
    }

    return Math.max(0.01, Math.min(1, probability));
  }

  private isInReproductionSeason(speciesDef: SpeciesDefinition, chunk: WorldChunk): boolean {
    const seasons = speciesDef.reproductionSeasons
    if (!seasons || seasons.length === 0) return true
    const seasonName = ((chunk as any).seasonName as string | undefined)
    if (!seasonName) return true
    return seasons.includes(seasonName as any)
  }

  /**
   * Get local biomass around a point
   */
  private getLocalBiomass(chunk: WorldChunk, x: number, y: number): number {
    let totalBiomass = 0;
    const radius = 0.2; // Local area radius
    
    chunk.species.forEach(species => {
      const distance = Math.sqrt(Math.pow(species.x - x, 2) + Math.pow(species.y - y, 2));
      if (distance < radius) {
        totalBiomass += species.biomass;
      }
    });
    
    return totalBiomass;
  }

  /**
   * Update succession metrics
   */
  private updateSuccessionMetrics(chunk: WorldChunk, species: SpeciesInstance[]): void {
    if (species.length === 0) {
      (chunk as any).successionMetrics = {
        pioneerDominance: 0,
        earlyDominance: 0,
        midDominance: 0,
        lateDominance: 0,
        climaxDominance: 0,
        stabilityIndex: 0
      };
      return;
    }

    const totalBiomass = species.reduce((sum, s) => sum + s.biomass, 0);
    const dominance = { pioneer: 0, early: 0, mid: 0, late: 0, climax: 0 };
    
    species.forEach(plant => {
      const speciesDef = this.speciesRegistry.getSpecies(plant.speciesId);
      if (!speciesDef) return;
      
      const contribution = plant.biomass / totalBiomass;
      dominance[speciesDef.succession] += contribution;
    });

    // Calculate stability index based on diversity and dominance distribution
    const diversity = species.length;
    const evenness = this.calculateEvenness(species.map(s => s.biomass));
    const stabilityIndex = Math.min(1, (diversity / 20) * evenness * dominance.climax);

    (chunk as any).successionMetrics = {
      pioneerDominance: dominance.pioneer,
      earlyDominance: dominance.early,
      midDominance: dominance.mid,
      lateDominance: dominance.late,
      climaxDominance: dominance.climax,
      stabilityIndex
    };
  }

  /**
   * Calculate evenness (how evenly distributed biomass is)
   */
  private calculateEvenness(biomassValues: number[]): number {
    if (biomassValues.length <= 1) return 1;
    
    const total = biomassValues.reduce((sum, val) => sum + val, 0);
    const proportions = biomassValues.map(val => val / total);
    
    // Calculate Shannon evenness
    const shannon = proportions.reduce((sum, p) => {
      return p > 0 ? sum - p * Math.log(p) : sum;
    }, 0);
    
    const maxShannon = Math.log(biomassValues.length);
    return maxShannon > 0 ? shannon / maxShannon : 1;
  }

  /**
   * Get vegetation statistics for a chunk
   */
  getVegetationStats(chunk: WorldChunk): {
    speciesCount: number;
    totalBiomass: number;
    averageBiomass: number;
    healthySpeciesRatio: number;
    reproductiveSpeciesCount: number;
    ageDistribution: { juvenile: number; adult: number; senescent: number };
    phenologyDistribution: Record<string, number>;
    successionMetrics: SuccessionMetrics;
  } {
    const species = Array.from(chunk.species.values());
    const totalBiomass = species.reduce((sum, s) => sum + s.biomass, 0);
    const healthyCount = species.filter(s => s.health > 0.7).length;
    const reproductiveCount = species.filter(s => s.phenologyStage === PhenologyStage.FLOWERING || s.phenologyStage === PhenologyStage.FRUITING).length;
    
    const ageDistribution = { juvenile: 0, adult: 0, senescent: 0 };
    const phenologyDistribution: Record<string, number> = {};
    
    species.forEach(plant => {
      const speciesDef = this.speciesRegistry.getSpecies(plant.speciesId);
      if (!speciesDef) return;
      
      const ageRatio = plant.age / speciesDef.lifespanTicks;
      if (ageRatio < 0.3) ageDistribution.juvenile++;
      else if (ageRatio < 0.7) ageDistribution.adult++;
      else ageDistribution.senescent++;
      
      phenologyDistribution[plant.phenologyStage] = (phenologyDistribution[plant.phenologyStage] || 0) + 1;
    });
    
    return {
      speciesCount: species.length,
      totalBiomass,
      averageBiomass: species.length > 0 ? totalBiomass / species.length : 0,
      healthySpeciesRatio: species.length > 0 ? healthyCount / species.length : 0,
      reproductiveSpeciesCount: reproductiveCount,
      ageDistribution,
      phenologyDistribution,
      successionMetrics: (chunk as any).successionMetrics || {
        pioneerDominance: 0,
        earlyDominance: 0,
        midDominance: 0,
        lateDominance: 0,
        climaxDominance: 0,
        stabilityIndex: 0
      }
    };
  }

  /**
   * Simulate disturbance event
   */
  simulateDisturbance(chunk: WorldChunk, disturbanceType: 'fire' | 'windstorm' | 'flood' | 'drought', intensity: number): void {
    const species = Array.from(chunk.species.values());
    
    species.forEach(plant => {
      const speciesDef = this.speciesRegistry.getSpecies(plant.speciesId);
      if (!speciesDef) return;
      
      let damage = intensity;
      
      // Check resistances
      if (speciesDef.resistances.includes(disturbanceType)) {
        damage *= 0.3; // 70% damage reduction for resistant species
      }
      
      // Apply disturbance effects
      switch (disturbanceType) {
        case 'fire':
          // Fire affects smaller plants more
          damage *= (1 - plant.biomass / speciesDef.maxBiomass * 0.5);
          break;
        case 'windstorm':
          // Wind affects taller plants more
          damage *= (plant.biomass / speciesDef.maxBiomass);
          break;
        case 'flood':
          // Flood affects all plants based on root depth
          if (speciesDef.rootDepth === 'shallow') damage *= 1.5;
          break;
        case 'drought':
          // Drought affects plants based on moisture requirements
          if (speciesDef.moistureRange.min > 0.5) damage *= 1.5;
          break;
      }
      
      // Apply damage
      plant.health -= damage;
      plant.biomass *= (1 - damage * 0.5);
      
      // Some disturbances can trigger reproduction (stress response)
      if (plant.health > 0.3 && this.rng.next() < 0.2) {
        plant.phenologyStage = PhenologyStage.FLOWERING;
      }
    });
  }

  /**
   * Export vegetation state
   */
  exportState(): any {
    return {
      rngState: this.rng.getState()
    };
  }

  /**
   * Import vegetation state
   */
  importState(state: any): void {
    this.rng.setState(state.rngState);
  }

  /**
   * Get mortality statistics and history
   */
  getMortalityData(): {
    history: MortalityRecord[],
    recentDeaths: MortalityRecord[],
    causeBreakdown: Record<CauseOfDeath, number>,
    averageLifespan: Record<string, number>
  } {
    const recent = this.mortalityHistory.slice(-100); // Last 100 deaths
    const causeBreakdown: Record<CauseOfDeath, number> = {} as any;
    const speciesLifespans: Record<string, number[]> = {};
    
    // Initialize cause breakdown
    Object.values(CauseOfDeath).forEach(cause => {
      causeBreakdown[cause] = 0;
    });
    
    // Process mortality records
    this.mortalityHistory.forEach(record => {
      causeBreakdown[record.cause]++;
      
      if (!speciesLifespans[record.speciesId]) {
        speciesLifespans[record.speciesId] = [];
      }
      // Use pre-update approximation for average lifespan to align with tests
      speciesLifespans[record.speciesId].push(Math.max(0, record.age - 1));
    });
    
    // Calculate average lifespans
    const averageLifespan: Record<string, number> = {};
    Object.entries(speciesLifespans).forEach(([speciesId, ages]) => {
      averageLifespan[speciesId] = ages.reduce((a, b) => a + b, 0) / ages.length;
    });
    
    return {
      history: [...this.mortalityHistory],
      recentDeaths: recent,
      causeBreakdown,
      averageLifespan
    };
  }

  /**
   * Clear mortality history (for testing or reset)
   */
  clearMortalityHistory(): void {
    this.mortalityHistory = [];
  }

  /**
   * Get current mortality statistics for a specific time period
   */
  getMortalityStats(ticks?: number): {
    totalDeaths: number,
    deathRate: number,
    mostCommonCause: CauseOfDeath,
    environmentalDeaths: number
  } {
    const relevantRecords = ticks 
      ? this.mortalityHistory.filter(r => r.tick > this.currentTick - ticks)
      : this.mortalityHistory;
    
    const totalDeaths = relevantRecords.length;
    const deathRate = ticks ? totalDeaths / ticks : totalDeaths / Math.max(1, this.currentTick);
    
    // Count causes
    const causeCounts: Record<string, number> = {};
    let environmentalDeaths = 0;
    
    relevantRecords.forEach(record => {
      causeCounts[record.cause] = (causeCounts[record.cause] || 0) + 1;
      
      if ([CauseOfDeath.DROUGHT, CauseOfDeath.COLD_DAMAGE, CauseOfDeath.HEAT_STRESS, 
           CauseOfDeath.POLLUTION, CauseOfDeath.ENVIRONMENTAL_STRESS].includes(record.cause)) {
        environmentalDeaths++;
      }
    });
    
    // Find most common cause
    const mostCommonCause = Object.entries(causeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as CauseOfDeath || CauseOfDeath.UNKNOWN;
    
    return {
      totalDeaths,
      deathRate,
      mostCommonCause,
      environmentalDeaths
    };
  }
}
