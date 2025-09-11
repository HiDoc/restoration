/**
 * Canopy system managing shade, biomass-derived canopy cover, and light dynamics
 */

import { SeededRNG, RNGManager } from './SeededRNG';
import { WorldChunk, SpeciesInstance, PhenologyStage } from './WorldChunk';

export interface CanopyLayer {
  height: number;          // Relative height (0-1, where 1 is emergent layer)
  coverage: number;        // Percentage coverage at this height (0-1)
  leafAreaIndex: number;   // Density of leaves (affects light filtering)
  biomass: number;         // Total biomass in this layer
  species: string[];       // Species contributing to this layer
}

export interface LightProfile {
  layers: Array<{
    height: number;
    lightLevel: number;    // Light level at this height (0-1)
    lightQuality: number;  // Quality/spectrum of light (0-1)
  }>;
  groundLevel: number;     // Light reaching the ground
  photosyntheticallyActiveRadiation: number; // PAR for plant growth
}

export interface CanopyGap {
  id: string;
  x: number;              // Position in chunk
  y: number;              
  radius: number;         // Gap size
  age: number;            // Ticks since gap formed
  lightBonus: number;     // Extra light in this area
}

export class CanopySystem {
  private rng: SeededRNG;
  
  // Canopy structure constants
  private readonly MAX_CANOPY_LAYERS = 5;
  private readonly MIN_BIOMASS_FOR_CANOPY = 2.0;
  private readonly LIGHT_EXTINCTION_COEFFICIENT = 0.5;
  
  constructor() {
    this.rng = RNGManager.getInstance().getRNG('canopy');
  }

  /**
   * Update canopy system for a chunk
   */
  update(chunk: WorldChunk): void {
    // Calculate canopy structure from species biomass
    const canopyLayers = this.calculateCanopyLayers(chunk);
    
    // Calculate light profile through canopy
    const lightProfile = this.calculateLightProfile(chunk, canopyLayers);
    
    // Update canopy gaps
    this.updateCanopyGaps(chunk);
    
    // Apply canopy effects to chunk
    this.applyCanopyEffects(chunk, canopyLayers, lightProfile);
    
    // Self-thinning and gap dynamics
    this.processGapDynamics(chunk, canopyLayers);
  }

  /**
   * Calculate canopy layers from species biomass
   */
  private calculateCanopyLayers(chunk: WorldChunk): CanopyLayer[] {
    const layers: CanopyLayer[] = [];
    
    // Initialize layers
    for (let i = 0; i < this.MAX_CANOPY_LAYERS; i++) {
      layers.push({
        height: (i + 1) / this.MAX_CANOPY_LAYERS,
        coverage: 0,
        leafAreaIndex: 0,
        biomass: 0,
        species: []
      });
    }
    
    // Assign species to layers based on their biomass and characteristics
    chunk.species.forEach(species => {
      if (species.biomass < this.MIN_BIOMASS_FOR_CANOPY) return;
      
      // Determine which layer this species occupies
      const layerIndex = this.getSpeciesCanopyLayer(species);
      if (layerIndex >= 0 && layerIndex < layers.length) {
        const layer = layers[layerIndex];
        
        layer.biomass += species.biomass;
        layer.species.push(species.speciesId);
        
        // Calculate contribution to coverage based on biomass and phenology
        const coverageContribution = this.calculateCoverageContribution(species);
        layer.coverage += coverageContribution;
        
        // Leaf area index based on species type and phenology
        const laiContribution = this.calculateLAIContribution(species);
        layer.leafAreaIndex += laiContribution;
      }
    });
    
    // Normalize coverage and LAI values
    layers.forEach(layer => {
      layer.coverage = Math.min(1, layer.coverage);
      layer.leafAreaIndex = Math.min(10, layer.leafAreaIndex); // Max LAI of 10
    });
    
    return layers;
  }

  /**
   * Determine which canopy layer a species occupies
   */
  private getSpeciesCanopyLayer(species: SpeciesInstance): number {
    // This would typically be based on species-specific data
    // For now, use biomass as a proxy for height
    if (species.biomass > 8) return 4; // Emergent layer
    if (species.biomass > 6) return 3; // Upper canopy
    if (species.biomass > 4) return 2; // Mid canopy
    if (species.biomass > 2) return 1; // Lower canopy
    return 0; // Understory
  }

  /**
   * Calculate coverage contribution from a species
   */
  private calculateCoverageContribution(species: SpeciesInstance): number {
    let contribution = species.biomass * 0.02; // Base contribution
    
    // Phenology affects canopy coverage
    switch (species.phenologyStage) {
      case PhenologyStage.VEGETATIVE:
      case PhenologyStage.FLOWERING:
        contribution *= 1.0; // Full coverage
        break;
      case PhenologyStage.FRUITING:
        contribution *= 0.9; // Slightly less due to energy going to fruits
        break;
      case PhenologyStage.DORMANT:
        contribution *= 0.3; // Much less coverage when dormant
        break;
      case PhenologyStage.SEED:
        contribution *= 0.1; // Minimal coverage
        break;
    }
    
    // Health affects coverage
    contribution *= species.health;
    
    return contribution;
  }

  /**
   * Calculate Leaf Area Index contribution
   */
  private calculateLAIContribution(species: SpeciesInstance): number {
    let lai = species.biomass * 0.3; // Base LAI
    
    // Different species have different leaf densities
    // This would be species-specific in a full implementation
    const leafDensityMultiplier = this.rng.nextFloat(0.5, 1.5);
    lai *= leafDensityMultiplier;
    
    // Phenology affects LAI
    switch (species.phenologyStage) {
      case PhenologyStage.VEGETATIVE:
        lai *= 1.2; // Peak leaf production
        break;
      case PhenologyStage.FLOWERING:
        lai *= 1.0; // Normal LAI
        break;
      case PhenologyStage.FRUITING:
        lai *= 0.8; // Some leaf drop
        break;
      case PhenologyStage.DORMANT:
        lai *= 0.2; // Most leaves gone
        break;
      case PhenologyStage.SEED:
        lai *= 0.0; // No leaves yet
        break;
    }
    
    return Math.max(0, lai * species.health);
  }

  /**
   * Calculate light profile through the canopy
   */
  private calculateLightProfile(chunk: WorldChunk, layers: CanopyLayer[]): LightProfile {
    const profile: LightProfile = {
      layers: [],
      groundLevel: chunk.climateState.light,
      photosyntheticallyActiveRadiation: chunk.climateState.light
    };
    
    let currentLightLevel = chunk.climateState.light;
    
    // Calculate light attenuation through each layer from top to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      
      // Light extinction based on Beer-Lambert law
      const extinction = Math.exp(-this.LIGHT_EXTINCTION_COEFFICIENT * layer.leafAreaIndex * layer.coverage);
      currentLightLevel *= extinction;
      
      // Light quality degradation (red/far-red ratio changes)
      const lightQuality = Math.max(0.2, 1 - (layer.leafAreaIndex * 0.1));
      
      profile.layers.unshift({
        height: layer.height,
        lightLevel: currentLightLevel,
        lightQuality: lightQuality
      });
    }
    
    profile.groundLevel = currentLightLevel;
    profile.photosyntheticallyActiveRadiation = currentLightLevel * 0.45; // ~45% of sunlight is PAR
    
    return profile;
  }

  /**
   * Update canopy gaps
   */
  private updateCanopyGaps(chunk: WorldChunk): void {
    if (!(chunk as any).canopyGaps) {
      (chunk as any).canopyGaps = [];
    }
    
    const gaps: CanopyGap[] = (chunk as any).canopyGaps;
    
    // Age existing gaps
    for (let i = gaps.length - 1; i >= 0; i--) {
      const gap = gaps[i];
      gap.age++;
      
      // Gaps slowly close as vegetation regrows
      gap.lightBonus *= 0.995; // 0.5% decay per tick
      gap.radius *= 0.999; // Slowly shrink
      
      // Remove gaps that are too old or too small
      if (gap.age > 5000 || gap.radius < 0.1) {
        gaps.splice(i, 1);
      }
    }
    
    // Randomly create new gaps (tree falls, disturbances)
    if (this.rng.next() < 0.0001) { // Very rare
      this.createCanopyGap(chunk, gaps);
    }
  }

  /**
   * Create a new canopy gap
   */
  private createCanopyGap(chunk: WorldChunk, gaps: CanopyGap[]): void {
    const newGap: CanopyGap = {
      id: `gap_${Date.now()}_${Math.random()}`,
      x: this.rng.next(),
      y: this.rng.next(),
      radius: this.rng.nextFloat(0.1, 0.3),
      age: 0,
      lightBonus: this.rng.nextFloat(0.3, 0.8)
    };
    
    gaps.push(newGap);
    
    // Gap creation might kill some species in the area
    const speciesInGap = Array.from(chunk.species.values()).filter(species => {
      const distance = Math.sqrt(
        Math.pow(species.x - newGap.x, 2) + Math.pow(species.y - newGap.y, 2)
      );
      return distance < newGap.radius;
    });
    
    // Some species die from the disturbance
    speciesInGap.forEach(species => {
      if (this.rng.next() < 0.3) { // 30% chance to die
        species.health -= this.rng.nextFloat(0.3, 0.8);
      }
    });
  }

  /**
   * Apply canopy effects to chunk properties
   */
  private applyCanopyEffects(chunk: WorldChunk, layers: CanopyLayer[], lightProfile: LightProfile): void {
    // Update chunk canopy coverage
    const totalCoverage = layers.reduce((sum, layer) => sum + layer.coverage * layer.height, 0) / layers.length;
    chunk.biomeState.canopy = Math.min(1, totalCoverage);
    
    // Canopy affects ground-level light
    chunk.climateState.light = Math.max(lightProfile.groundLevel, 0.05); // Minimum 5% light
    
    // Canopy effects on microclimate
    if (chunk.biomeState.canopy > 0.3) {
      // Canopy moderates temperature
      const temperatureModeration = chunk.biomeState.canopy * 2; // Up to 2 degree moderation
      if (chunk.climateState.temperature > 25) {
        chunk.climateState.temperature -= temperatureModeration; // Cooling effect
      } else if (chunk.climateState.temperature < 15) {
        chunk.climateState.temperature += temperatureModeration * 0.5; // Slight warming
      }
      
      // Canopy increases humidity and reduces wind
      chunk.biomeState.moisture += chunk.biomeState.canopy * 0.01;
      chunk.climateState.wind *= (1 - chunk.biomeState.canopy * 0.3);
    }
    
    // Apply gap effects
    const gaps: CanopyGap[] = (chunk as any).canopyGaps || [];
    if (gaps.length > 0) {
      const totalGapEffect = gaps.reduce((sum, gap) => sum + gap.lightBonus * gap.radius, 0);
      chunk.climateState.light += totalGapEffect * 0.1; // Boost light in gaps
      chunk.climateState.light = Math.min(1, chunk.climateState.light);
    }
  }

  /**
   * Process gap dynamics and self-thinning
   */
  private processGapDynamics(chunk: WorldChunk, layers: CanopyLayer[]): void {
    // Self-thinning in overcrowded areas
    const totalBiomass = layers.reduce((sum, layer) => sum + layer.biomass, 0);
    const carryingCapacity = 100; // Max biomass per chunk
    
    if (totalBiomass > carryingCapacity) {
      const competitionIntensity = (totalBiomass - carryingCapacity) / carryingCapacity;
      
      // Apply competition stress to species
      chunk.species.forEach(species => {
        const competitionStress = competitionIntensity * this.rng.nextFloat(0.1, 0.3);
        species.health -= competitionStress;
        
        // Smaller/weaker species are more affected
        const sizeAdvantage = species.biomass / 10; // Normalize biomass
        species.health += sizeAdvantage * 0.1; // Slight advantage for larger species
      });
    }
    
    // Light competition - species in lower layers suffer without adequate light
    chunk.species.forEach(species => {
      const layerIndex = this.getSpeciesCanopyLayer(species);
      if (layerIndex < layers.length) {
        const availableLight = this.getLightAtLayer(layers, layerIndex);
        const lightRequirement = 0.3; // Minimum light requirement (species-specific)
        
        if (availableLight < lightRequirement) {
          const lightStress = (lightRequirement - availableLight) * 0.05;
          species.health -= lightStress;
        }
      }
    });
  }

  /**
   * Get light level at a specific canopy layer
   */
  private getLightAtLayer(layers: CanopyLayer[], targetLayer: number): number {
    let lightLevel = 1.0; // Start at full sunlight
    
    // Attenuate light through layers above the target
    for (let i = layers.length - 1; i > targetLayer; i--) {
      const layer = layers[i];
      const extinction = Math.exp(-this.LIGHT_EXTINCTION_COEFFICIENT * layer.leafAreaIndex * layer.coverage);
      lightLevel *= extinction;
    }
    
    return lightLevel;
  }

  /**
   * Get canopy structure for a chunk
   */
  getCanopyStructure(chunk: WorldChunk): {
    layers: CanopyLayer[];
    lightProfile: LightProfile;
    gaps: CanopyGap[];
    totalBiomass: number;
    averageHeight: number;
  } {
    const layers = this.calculateCanopyLayers(chunk);
    const lightProfile = this.calculateLightProfile(chunk, layers);
    const gaps = (chunk as any).canopyGaps || [];
    
    const totalBiomass = layers.reduce((sum, layer) => sum + layer.biomass, 0);
    const averageHeight = layers.reduce((sum, layer) => {
      return sum + (layer.biomass * layer.height);
    }, 0) / Math.max(1, totalBiomass);
    
    return {
      layers,
      lightProfile,
      gaps,
      totalBiomass,
      averageHeight
    };
  }

  /**
   * Calculate shade tolerance requirement for a position
   */
  calculateShadeToleranceRequired(chunk: WorldChunk, x: number, y: number): number {
    const layers = this.calculateCanopyLayers(chunk);
    let lightLevel = 1.0;
    
    // Calculate light reaching this position
    layers.forEach(layer => {
      // Simple model - in reality this would consider 3D canopy structure
      const extinction = Math.exp(-this.LIGHT_EXTINCTION_COEFFICIENT * layer.leafAreaIndex * layer.coverage);
      lightLevel *= extinction;
    });
    
    // Check for gap effects
    const gaps: CanopyGap[] = (chunk as any).canopyGaps || [];
    gaps.forEach(gap => {
      const distance = Math.sqrt(Math.pow(x - gap.x, 2) + Math.pow(y - gap.y, 2));
      if (distance < gap.radius) {
        lightLevel += gap.lightBonus * (1 - distance / gap.radius);
      }
    });
    
    return Math.max(0, Math.min(1, 1 - lightLevel)); // Shade tolerance needed
  }

  /**
   * Simulate controlled burn effects on canopy
   */
  simulateControlledBurn(chunk: WorldChunk, intensity: number): void {
    const layers = this.calculateCanopyLayers(chunk);
    
    // Burns primarily affect lower layers and understory
    chunk.species.forEach(species => {
      const layerIndex = this.getSpeciesCanopyLayer(species);
      let burnDamage = intensity;
      
      // Higher layers are less affected
      burnDamage *= Math.max(0.1, 1 - (layerIndex / layers.length));
      
      // Apply damage
      species.biomass *= (1 - burnDamage);
      species.health -= burnDamage * 0.5;
      
      // Some species might be fire-adapted and benefit
      if (this.rng.next() < 0.1) { // 10% of species are fire-adapted
        species.health += 0.1; // Small boost for fire-adapted species
      }
    });
    
    // Create canopy gaps from burn
    const gaps: CanopyGap[] = (chunk as any).canopyGaps || [];
    for (let i = 0; i < Math.floor(intensity * 3); i++) {
      this.createCanopyGap(chunk, gaps);
    }
  }

  /**
   * Export canopy system state
   */
  exportState(): any {
    return {
      rngState: this.rng.getState()
    };
  }

  /**
   * Import canopy system state
   */
  importState(state: any): void {
    this.rng.setState(state.rngState);
  }
}
