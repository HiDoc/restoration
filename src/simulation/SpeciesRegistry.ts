import catalogue from '../database/catalogue.json';
import { hybridName } from '../game/hybrids';

/**
 * Species registry: the catalogue's wild species plus hybrids the player has bred
 */

export interface SpeciesTrait {
  name: string;
  value: number;      // Normalized value [0-1]
  description: string;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SpeciesDefinition {
  id: string;
  name: string;
  scientificName?: string;
  /** Only species of one genus can cross; unset means the species crosses with nothing. */
  genus?: string;
  /** For a bred hybrid, the non-hybrid species it descends from. */
  hybridOf?: string[];
  category: SpeciesCategory;
  
  // Core attributes
  maxBiomass: number;           // Maximum size this species can reach
  growthRate: number;           // Base growth rate multiplier
  lifespanTicks: number;        // Maximum age in ticks
  maturityDays?: number;        // Age before first flowering; unset means biomass alone decides
  clonalRate?: number;          // New shoots per plant per growing day (runners, rhizomes, bulbs)
  reproductionThreshold: number; // Minimum biomass to reproduce
  reproductionNeed: number;     // Environmental quality threshold to reproduce [0-1]
  seedProduction: number;       // Seeds per reproductive cycle
  // Reproduction params
  seedMaturityTicks?: number;   // Ticks before a dropped seed attempts germination
  reproductionSeasons?: Season[]; // Preferred seasons for flowering/fruiting
  
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

  // Phenology and soil effects from the species catalogue. Nectar, fruit and larval-host links
  // live in the catalogue's interactions, not here.
  ecology?: {
    floweringSeasons: Season[];
    fruitingSeasons: Season[];
    dormantSeasons: Season[];     // Dormant underground outside winter (spring ephemerals)
    nitrogenFixation: boolean;
    allelopathy: number;          // Suppression of neighbours [0-1]
  };

  // Optional asexual (vegetative) reproduction parameters
  asexual?: {
    methods: Array<
      'rhizome' | 'stolon' | 'runner' | 'sucker' | 'plantlet' | 'bulb' | 'tuber' | 'corm' | 'apomixis'
    >;                                     // Mechanisms used
    baseRate: number;                      // Base per-tick chance scaled by environment
    maxDistance: number;                   // Spread distance within chunk units [0..1]
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
 * Species Registry - maintains the finite ontology
 */
export class SpeciesRegistry {
  private static instance: SpeciesRegistry;
  
  private species: Map<string, SpeciesDefinition> = new Map();
  private categoryIndex: Map<SpeciesCategory, string[]> = new Map();
  private biomeIndex: Map<BiomeType, string[]> = new Map();
  private rarityIndex: Map<SpeciesRarity, string[]> = new Map();

  private constructor() {
    this.initializeBaseSpecies();
    this.buildIndices();
  }

  static getInstance(): SpeciesRegistry {
    if (!SpeciesRegistry.instance) {
      SpeciesRegistry.instance = new SpeciesRegistry();
    }
    return SpeciesRegistry.instance;
  }

  /** Wild species come from the catalogue built from the SQLite seed data (`npm run build:catalogue`). */
  private initializeBaseSpecies(): void {
    for (const species of catalogue.plants as SpeciesDefinition[]) this.species.set(species.id, species);
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

  getAllSpecies(): SpeciesDefinition[] {
    return Array.from(this.species.values());
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
   * Get species statistics
   */
  getStatistics(): {
    totalSpecies: number;
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
   * Register a hybrid the engine has defined: its first parent's description with the engine's blended values,
   * an invented name and the botanical hybrid formula.
   */
  addHybrid(engineDefinition: Partial<SpeciesDefinition> & { id: string; hybridOf: string[] }): void {
    if (this.species.has(engineDefinition.id)) return;
    const parents = engineDefinition.hybridOf.map(id => this.species.get(id)).filter((p): p is SpeciesDefinition => !!p);
    if (parents.length === 0) return;
    this.addSpecies({
      ...parents[0],
      ...engineDefinition,
      name: hybridName(engineDefinition.id, parents.map(p => p.name)),
      scientificName: parents.map(p => p.scientificName ?? p.name).join(' × '),
    } as SpeciesDefinition);
  }

  /** Name a hybrid: the player's chosen name, or its invented one when none is given. */
  nameHybrid(id: string, name?: string): void {
    const hybrid = this.species.get(id);
    if (!hybrid?.hybridOf?.length) return;
    hybrid.name = name ?? hybridName(id, hybrid.hybridOf.map(parent => this.species.get(parent)?.name ?? parent));
  }

  /**
   * Export registry data
   */
  exportData(): { species: SpeciesDefinition[] } {
    return { species: Array.from(this.species.values()) };
  }

  /**
   * Import registry data
   */
  importData(data: { species: SpeciesDefinition[] }): void {
    this.species.clear();
    data.species.forEach(species => {
      this.species.set(species.id, species);
    });
    this.buildIndices();
  }
}
