/**
 * Species registry with finite, closed ontology for species and hybrids
 */

export interface SpeciesTrait {
  name: string;
  value: number;      // Normalized value [0-1]
  description: string;
}

export interface SpeciesDefinition {
  id: string;
  name: string;
  category: SpeciesCategory;
  
  // Core attributes
  maxBiomass: number;           // Maximum size this species can reach
  growthRate: number;           // Base growth rate multiplier
  lifespanTicks: number;        // Maximum age in ticks
  reproductionThreshold: number; // Minimum biomass to reproduce
  reproductionNeed: number;     // Environmental quality threshold to reproduce [0-1]
  seedProduction: number;       // Seeds per reproductive cycle
  // Reproduction params
  seedMaturityTicks?: number;   // Ticks before a dropped seed attempts germination
  reproductionSeasons?: Array<'spring'|'summer'|'autumn'|'winter'>; // Preferred seasons for flowering/fruiting
  
  // Environmental tolerances
  temperatureRange: { min: number; max: number };
  moistureRange: { min: number; max: number };
  lightRequirement: number;     // Minimum light needed [0-1]
  shadeToleranceMax: number;    // Maximum shade tolerated [0-1]
  pHRange: { min: number; max: number };
  
  // Ecological traits
  canopyLayer: CanopyLayer;     // Which layer this species occupies
  rootDepth: RootDepth;         // How deep roots go
  dispersalRange: number;       // How far seeds can travel
  pollination: PollinationType; // How this species is pollinated
  succession: SuccessionStage;  // Early/mid/late successional
  
  // Special abilities
  traits: SpeciesTrait[];       // Special traits and abilities
  resistances: string[];        // What this species resists (fire, drought, etc.)
  
  // Appearance and behavior
  visualProps: {
    color: string;
    size: number;
    shape: string;
    seasonalChanges: boolean;
  };
  
  // Rarity and distribution
  rarity: SpeciesRarity;
  preferredBiomes: BiomeType[];
  nativeRegions: string[];      // Where this species naturally occurs

  // Optional asexual (vegetative) reproduction parameters
  asexual?: {
    methods: Array<'rhizome' | 'stolon'>; // Mechanisms used
    baseRate: number;                     // Base per-tick chance scaled by environment
    maxDistance: number;                  // Spread distance within chunk units [0..1]
  };
}

export enum SpeciesCategory {
  TREE = 'tree',
  SHRUB = 'shrub', 
  HERB = 'herb',
  GRASS = 'grass',
  FERN = 'fern',
  MOSS = 'moss',
  VINE = 'vine',
  AQUATIC = 'aquatic',
  EPIPHYTE = 'epiphyte'
}

export enum CanopyLayer {
  EMERGENT = 'emergent',     // Tallest trees
  CANOPY = 'canopy',         // Main canopy
  UNDERSTORY = 'understory', // Mid-level
  SHRUB = 'shrub',          // Shrub layer
  HERB = 'herb',            // Ground herbs
  MOSS = 'moss'             // Ground cover
}

export enum RootDepth {
  SHALLOW = 'shallow',   // Surface feeder
  MEDIUM = 'medium',     // Moderate depth
  DEEP = 'deep',        // Deep taproot
  EXTENSIVE = 'extensive' // Wide spreading
}

export enum PollinationType {
  WIND = 'wind',
  INSECT = 'insect',
  BIRD = 'bird',
  MAMMAL = 'mammal',
  WATER = 'water',
  SELF = 'self'
}

export enum SuccessionStage {
  PIONEER = 'pioneer',     // First to colonize
  EARLY = 'early',         // Early succession
  MID = 'mid',             // Mid succession
  LATE = 'late',           // Late succession
  CLIMAX = 'climax'        // Climax community
}

export enum SpeciesRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  VERY_RARE = 'very_rare',
  LEGENDARY = 'legendary'
}

export enum BiomeType {
  TEMPERATE_FOREST = 'temperate_forest',
  TROPICAL_FOREST = 'tropical_forest',
  BOREAL_FOREST = 'boreal_forest',
  GRASSLAND = 'grassland',
  WETLAND = 'wetland',
  DESERT = 'desert',
  ALPINE = 'alpine',
  COASTAL = 'coastal'
}

/**
 * Hybrid definition - results from crossing two parent species
 */
export interface HybridDefinition {
  id: string;
  name: string;
  parentA: string;              // Species ID
  parentB: string;              // Species ID
  catalyst?: string;            // Required catalyst item/condition
  
  // Success conditions
  successRate: number;          // Probability of successful hybridization
  environmentalRequirements: {  // Conditions needed for hybridization
    temperatureRange?: { min: number; max: number };
    moistureMin?: number;
    seasonRequired?: string;
    biomeRequired?: BiomeType;
  };
  
  // Hybrid properties
  lifespanTicks: number;        // How long the hybrid lasts
  effectRadius: number;         // Area of influence
  effectStrength: number;       // Magnitude of effects
  
  // Effects on environment
  biomeEffects: {
    [key in keyof import('./WorldChunk').BiomeState]?: number;
  };
  
  // Special abilities
  abilities: HybridAbility[];
  
  // Rarity and unlock conditions
  rarity: SpeciesRarity;
  unlockConditions: string[];   // What must be achieved to discover this hybrid
  
  // Visual representation
  visualProps: {
    color: string;
    glowIntensity: number;
    particleEffect?: string;
  };
}

export interface HybridAbility {
  name: string;
  description: string;
  type: HybridAbilityType;
  parameters: Record<string, number>;
}

export enum HybridAbilityType {
  CLEANSE_POLLUTION = 'cleanse_pollution',
  ENHANCE_FERTILITY = 'enhance_fertility', 
  ACCELERATE_GROWTH = 'accelerate_growth',
  WATER_GENERATION = 'water_generation',
  PEST_RESISTANCE = 'pest_resistance',
  SUCCESSION_BOOST = 'succession_boost',
  CANOPY_MANIPULATION = 'canopy_manipulation',
  POLLINATOR_ATTRACTION = 'pollinator_attraction'
}

/**
 * Species Registry - maintains the finite ontology
 */
export class SpeciesRegistry {
  private static instance: SpeciesRegistry;
  
  private species: Map<string, SpeciesDefinition> = new Map();
  private hybrids: Map<string, HybridDefinition> = new Map();
  private categoryIndex: Map<SpeciesCategory, string[]> = new Map();
  private biomeIndex: Map<BiomeType, string[]> = new Map();
  private rarityIndex: Map<SpeciesRarity, string[]> = new Map();

  private constructor() {
    this.initializeBaseSpecies();
    this.initializeHybrids();
    this.buildIndices();
  }

  static getInstance(): SpeciesRegistry {
    if (!SpeciesRegistry.instance) {
      SpeciesRegistry.instance = new SpeciesRegistry();
    }
    return SpeciesRegistry.instance;
  }

  /**
   * Initialize base species library
   */
  private initializeBaseSpecies(): void {
    // Pioneer species - first colonizers
    this.species.set('common_grass', {
      id: 'common_grass',
      name: 'Common Grass',
      category: SpeciesCategory.GRASS,
      maxBiomass: 0.5,
      growthRate: 1.5,
      lifespanTicks: 2000,
      reproductionThreshold: 0.05,
      reproductionNeed: 0.3,
      seedProduction: 120,
      seedMaturityTicks: 0,
      reproductionSeasons: ['spring','summer','autumn'],
      temperatureRange: { min: -5, max: 35 },
      moistureRange: { min: 0.1, max: 0.9 },
      lightRequirement: 0.3,
      shadeToleranceMax: 0.4,
      pHRange: { min: 5.5, max: 8.0 },
      canopyLayer: CanopyLayer.HERB,
      rootDepth: RootDepth.SHALLOW,
      dispersalRange: 2,
      pollination: PollinationType.SELF,
      succession: SuccessionStage.PIONEER,
      traits: [
        { name: 'fast_growth', value: 0.8, description: 'Grows quickly in open areas' },
        { name: 'drought_tolerance', value: 0.6, description: 'Can survive dry periods' }
      ],
      resistances: ['light_frost', 'grazing'],
      visualProps: { color: '#4a7c59', size: 0.3, shape: 'blade', seasonalChanges: true },
      rarity: SpeciesRarity.COMMON,
      preferredBiomes: [BiomeType.GRASSLAND, BiomeType.TEMPERATE_FOREST],
      nativeRegions: ['central_plains', 'forest_edge'],
      asexual: {
        methods: ['rhizome','stolon'],
        baseRate: 0.02,
        maxDistance: 0.15
      }
    });

    this.species.set('silver_birch', {
      id: 'silver_birch',
      name: 'Silver Birch',
      category: SpeciesCategory.TREE,
      maxBiomass: 8.0,
      growthRate: 1.2,
      lifespanTicks: 15000,
      reproductionThreshold: 3.0,
      reproductionNeed: 0.5,
      seedProduction: 200,
      seedMaturityTicks: 200,
      reproductionSeasons: ['spring'],
      temperatureRange: { min: -20, max: 25 },
      moistureRange: { min: 0.3, max: 0.8 },
      lightRequirement: 0.6,
      shadeToleranceMax: 0.3,
      pHRange: { min: 4.5, max: 7.5 },
      canopyLayer: CanopyLayer.CANOPY,
      rootDepth: RootDepth.MEDIUM,
      dispersalRange: 5,
      pollination: PollinationType.WIND,
      succession: SuccessionStage.EARLY,
      traits: [
        { name: 'pioneer_species', value: 0.9, description: 'Excellent colonizer of disturbed areas' },
        { name: 'cold_hardy', value: 0.8, description: 'Survives harsh winters' }
      ],
      resistances: ['cold', 'wind'],
      visualProps: { color: '#f0f0f0', size: 0.8, shape: 'deciduous', seasonalChanges: true },
      rarity: SpeciesRarity.COMMON,
      preferredBiomes: [BiomeType.TEMPERATE_FOREST, BiomeType.BOREAL_FOREST],
      nativeRegions: ['northern_forest', 'mountain_foothills']
    });

    this.species.set('shadow_moss', {
      id: 'shadow_moss',
      name: 'Shadow Moss',
      category: SpeciesCategory.MOSS,
      maxBiomass: 0.2,
      growthRate: 0.8,
      lifespanTicks: 5000,
      reproductionThreshold: 0.05,
      reproductionNeed: 0.6,
      seedProduction: 1000,
      seedMaturityTicks: 20,
      reproductionSeasons: ['autumn','spring'],
      temperatureRange: { min: 0, max: 20 },
      moistureRange: { min: 0.6, max: 1.0 },
      lightRequirement: 0.1,
      shadeToleranceMax: 0.9,
      pHRange: { min: 4.0, max: 6.5 },
      canopyLayer: CanopyLayer.MOSS,
      rootDepth: RootDepth.SHALLOW,
      dispersalRange: 1,
      pollination: PollinationType.WATER,
      succession: SuccessionStage.LATE,
      traits: [
        { name: 'shade_specialist', value: 0.95, description: 'Thrives in deep shade' },
        { name: 'moisture_retention', value: 0.7, description: 'Helps retain soil moisture' }
      ],
      resistances: ['low_light', 'humidity_loss'],
      visualProps: { color: '#2d4a2d', size: 0.1, shape: 'carpet', seasonalChanges: false },
      rarity: SpeciesRarity.UNCOMMON,
      preferredBiomes: [BiomeType.TEMPERATE_FOREST, BiomeType.BOREAL_FOREST],
      nativeRegions: ['deep_forest', 'stream_banks']
    });

    this.species.set('crimson_oak', {
      id: 'crimson_oak',
      name: 'Crimson Oak',
      category: SpeciesCategory.TREE,
      maxBiomass: 12.0,
      growthRate: 0.8,
      lifespanTicks: 25000,
      reproductionThreshold: 5.0,
      reproductionNeed: 0.7,
      seedProduction: 100,
      seedMaturityTicks: 300,
      reproductionSeasons: ['autumn'],
      temperatureRange: { min: -10, max: 30 },
      moistureRange: { min: 0.4, max: 0.7 },
      lightRequirement: 0.5,
      shadeToleranceMax: 0.4,
      pHRange: { min: 5.0, max: 7.0 },
      canopyLayer: CanopyLayer.EMERGENT,
      rootDepth: RootDepth.DEEP,
      dispersalRange: 3,
      pollination: PollinationType.WIND,
      succession: SuccessionStage.CLIMAX,
      traits: [
        { name: 'longevity', value: 0.9, description: 'Extremely long-lived' },
        { name: 'fire_resistance', value: 0.6, description: 'Thick bark resists fire' },
        { name: 'allelopathy', value: 0.5, description: 'Suppresses competing species' }
      ],
      resistances: ['fire', 'drought', 'wind'],
      visualProps: { color: '#8b2635', size: 1.2, shape: 'oak', seasonalChanges: true },
      rarity: SpeciesRarity.RARE,
      preferredBiomes: [BiomeType.TEMPERATE_FOREST],
      nativeRegions: ['ancient_groves', 'sacred_forests']
    });

    this.species.set('healing_fern', {
      id: 'healing_fern',
      name: 'Healing Fern',
      category: SpeciesCategory.FERN,
      maxBiomass: 1.5,
      growthRate: 1.0,
      lifespanTicks: 8000,
      reproductionThreshold: 0.8,
      reproductionNeed: 0.5,
      seedProduction: 500,
      seedMaturityTicks: 120,
      reproductionSeasons: ['spring','summer'],
      temperatureRange: { min: 10, max: 25 },
      moistureRange: { min: 0.7, max: 1.0 },
      lightRequirement: 0.2,
      shadeToleranceMax: 0.8,
      pHRange: { min: 5.0, max: 6.5 },
      canopyLayer: CanopyLayer.UNDERSTORY,
      rootDepth: RootDepth.SHALLOW,
      dispersalRange: 2,
      pollination: PollinationType.WIND,
      succession: SuccessionStage.MID,
      traits: [
        { name: 'medicinal', value: 0.8, description: 'Produces healing compounds' },
        { name: 'spore_dispersal', value: 0.9, description: 'Excellent spore production' }
      ],
      resistances: ['disease', 'pests'],
      visualProps: { color: '#32a852', size: 0.6, shape: 'frond', seasonalChanges: false },
      rarity: SpeciesRarity.UNCOMMON,
      preferredBiomes: [BiomeType.TEMPERATE_FOREST, BiomeType.WETLAND],
      nativeRegions: ['misty_valleys', 'stream_sides']
    });
  }

  /**
   * Initialize hybrid definitions
   */
  private initializeHybrids(): void {
    this.hybrids.set('purifier_moss', {
      id: 'purifier_moss',
      name: 'Purifier Moss',
      parentA: 'shadow_moss',
      parentB: 'healing_fern',
      catalyst: 'moonwater',
      successRate: 0.3,
      environmentalRequirements: {
        moistureMin: 0.8,
        seasonRequired: 'spring'
      },
      lifespanTicks: 3000,
      effectRadius: 2,
      effectStrength: 0.8,
      biomeEffects: {
        pollution: -0.05,
        vitality: 0.02
      },
      abilities: [
        {
          name: 'pollution_cleansing',
          description: 'Actively removes pollution from surrounding area',
          type: HybridAbilityType.CLEANSE_POLLUTION,
          parameters: { cleansingRate: 0.05, radius: 2 }
        }
      ],
      rarity: SpeciesRarity.RARE,
      unlockConditions: ['discover_moonwater', 'mature_healing_fern', 'polluted_area_restoration'],
      visualProps: { color: '#4a9d6f', glowIntensity: 0.3, particleEffect: 'sparkles' }
    });

    this.hybrids.set('growth_bloom', {
      id: 'growth_bloom',
      name: 'Growth Bloom',
      parentA: 'common_grass', 
      parentB: 'healing_fern',
      successRate: 0.6,
      environmentalRequirements: {
        temperatureRange: { min: 15, max: 25 },
        moistureMin: 0.5
      },
      lifespanTicks: 1500,
      effectRadius: 3,
      effectStrength: 1.0,
      biomeEffects: {
        soil: 0.03,
        vitality: 0.04
      },
      abilities: [
        {
          name: 'accelerated_growth',
          description: 'Speeds up growth of nearby plants',
          type: HybridAbilityType.ACCELERATE_GROWTH,
          parameters: { growthBoost: 1.5, radius: 3 }
        }
      ],
      rarity: SpeciesRarity.UNCOMMON,
      unlockConditions: ['basic_hybridization'],
      visualProps: { color: '#7fb069', glowIntensity: 0.5, particleEffect: 'pollen' }
    });

    this.hybrids.set('ancient_sentinel', {
      id: 'ancient_sentinel',
      name: 'Ancient Sentinel',
      parentA: 'crimson_oak',
      parentB: 'silver_birch',
      catalyst: 'druid_blessing',
      successRate: 0.1,
      environmentalRequirements: {
        biomeRequired: BiomeType.TEMPERATE_FOREST,
        seasonRequired: 'autumn'
      },
      lifespanTicks: 10000,
      effectRadius: 5,
      effectStrength: 1.5,
      biomeEffects: {
        succession: 0.02,
        diversity: 0.03,
        canopy: 0.01
      },
      abilities: [
        {
          name: 'ecosystem_guardian',
          description: 'Protects and stabilizes the surrounding ecosystem',
          type: HybridAbilityType.SUCCESSION_BOOST,
          parameters: { stabilityBoost: 0.3, radius: 5 }
        },
        {
          name: 'ancient_wisdom',
          description: 'Accelerates succession in surrounding area',
          type: HybridAbilityType.SUCCESSION_BOOST,
          parameters: { successionRate: 0.02, radius: 5 }
        }
      ],
      rarity: SpeciesRarity.LEGENDARY,
      unlockConditions: ['master_hybridization', 'ancient_grove_discovered', 'druid_alliance'],
      visualProps: { color: '#d4af37', glowIntensity: 0.8, particleEffect: 'golden_leaves' }
    });
  }

  /**
   * Build search indices
   */
  private buildIndices(): void {
    // Clear existing indices
    this.categoryIndex.clear();
    this.biomeIndex.clear();
    this.rarityIndex.clear();

    // Build species indices
    this.species.forEach((species, id) => {
      // Category index
      if (!this.categoryIndex.has(species.category)) {
        this.categoryIndex.set(species.category, []);
      }
      this.categoryIndex.get(species.category)!.push(id);

      // Biome index
      species.preferredBiomes.forEach(biome => {
        if (!this.biomeIndex.has(biome)) {
          this.biomeIndex.set(biome, []);
        }
        this.biomeIndex.get(biome)!.push(id);
      });

      // Rarity index
      if (!this.rarityIndex.has(species.rarity)) {
        this.rarityIndex.set(species.rarity, []);
      }
      this.rarityIndex.get(species.rarity)!.push(id);
    });
  }

  // Query methods
  getSpecies(id: string): SpeciesDefinition | undefined {
    return this.species.get(id);
  }

  getHybrid(id: string): HybridDefinition | undefined {
    return this.hybrids.get(id);
  }

  getAllSpecies(): SpeciesDefinition[] {
    return Array.from(this.species.values());
  }

  getAllHybrids(): HybridDefinition[] {
    return Array.from(this.hybrids.values());
  }

  getSpeciesByCategory(category: SpeciesCategory): SpeciesDefinition[] {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.species.get(id)!).filter(Boolean);
  }

  getSpeciesByBiome(biome: BiomeType): SpeciesDefinition[] {
    const ids = this.biomeIndex.get(biome) || [];
    return ids.map(id => this.species.get(id)!).filter(Boolean);
  }

  getSpeciesByRarity(rarity: SpeciesRarity): SpeciesDefinition[] {
    const ids = this.rarityIndex.get(rarity) || [];
    return ids.map(id => this.species.get(id)!).filter(Boolean);
  }

  /**
   * Find compatible hybrids for two species
   */
  findCompatibleHybrids(speciesA: string, speciesB: string): HybridDefinition[] {
    return Array.from(this.hybrids.values()).filter(hybrid => 
      (hybrid.parentA === speciesA && hybrid.parentB === speciesB) ||
      (hybrid.parentA === speciesB && hybrid.parentB === speciesA)
    );
  }

  /**
   * Get hybrids by rarity
   */
  getHybridsByRarity(rarity: SpeciesRarity): HybridDefinition[] {
    return Array.from(this.hybrids.values()).filter(hybrid => hybrid.rarity === rarity);
  }

  /**
   * Check if a hybrid can be created given current conditions
   */
  canCreateHybrid(hybridId: string, temperature: number, moisture: number, biome: BiomeType, season: string, unlockedConditions: string[]): boolean {
    const hybrid = this.hybrids.get(hybridId);
    if (!hybrid) return false;

    // Check unlock conditions
    const hasAllConditions = hybrid.unlockConditions.every(condition => 
      unlockedConditions.includes(condition)
    );
    if (!hasAllConditions) return false;

    // Check environmental requirements
    const req = hybrid.environmentalRequirements;
    
    if (req.temperatureRange) {
      if (temperature < req.temperatureRange.min || temperature > req.temperatureRange.max) {
        return false;
      }
    }

    if (req.moistureMin && moisture < req.moistureMin) {
      return false;
    }

    if (req.biomeRequired && biome !== req.biomeRequired) {
      return false;
    }

    if (req.seasonRequired && season !== req.seasonRequired) {
      return false;
    }

    return true;
  }

  /**
   * Get species statistics
   */
  getStatistics(): {
    totalSpecies: number;
    totalHybrids: number;
    categoryCounts: Record<string, number>;
    rarityDistribution: Record<string, number>;
    averageLifespan: number;
  } {
    const categoryCounts: Record<string, number> = {};
    const rarityDistribution: Record<string, number> = {};
    let totalLifespan = 0;

    this.species.forEach(species => {
      categoryCounts[species.category] = (categoryCounts[species.category] || 0) + 1;
      rarityDistribution[species.rarity] = (rarityDistribution[species.rarity] || 0) + 1;
      totalLifespan += species.lifespanTicks;
    });

    return {
      totalSpecies: this.species.size,
      totalHybrids: this.hybrids.size,
      categoryCounts,
      rarityDistribution,
      averageLifespan: this.species.size > 0 ? totalLifespan / this.species.size : 0
    };
  }

  /**
   * Add custom species (for modding/testing)
   */
  addSpecies(species: SpeciesDefinition): void {
    this.species.set(species.id, species);
    this.buildIndices();
  }

  /**
   * Add custom hybrid
   */
  addHybrid(hybrid: HybridDefinition): void {
    this.hybrids.set(hybrid.id, hybrid);
  }

  /**
   * Export registry data
   */
  exportData(): { species: SpeciesDefinition[]; hybrids: HybridDefinition[] } {
    return {
      species: Array.from(this.species.values()),
      hybrids: Array.from(this.hybrids.values())
    };
  }

  /**
   * Import registry data
   */
  importData(data: { species: SpeciesDefinition[]; hybrids: HybridDefinition[] }): void {
    this.species.clear();
    this.hybrids.clear();

    data.species.forEach(species => {
      this.species.set(species.id, species);
    });

    data.hybrids.forEach(hybrid => {
      this.hybrids.set(hybrid.id, hybrid);
    });

    this.buildIndices();
  }
}
