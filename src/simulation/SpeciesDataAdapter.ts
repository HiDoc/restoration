/**
 * Species Data Adapter
 * Bridges SQLite species database with the simulation registry
 */

import { SpeciesDefinition, SpeciesCategory, CanopyLayer, RootDepth, PollinationType, SuccessionStage, SpeciesRarity, BiomeType, type Season } from './SpeciesRegistry'
import { SpeciesDatabase, VegetalSpecies, BirdSpecies, type SpeciesInteraction } from '../database/SpeciesDatabase'

// One tick is one day; the engine year is four 90-day seasons.
const DAYS_PER_YEAR = 360
// Shrubs and trees live on a compressed clock (1 game year ≈ 5 real years) so they flower and fruit within a
// session; herbs keep real timing. Real ages stay in the catalogue for the Codex.
const WOODY_COMPRESSION = 5
// Balance defaults; per-species tuning lives in simulation_species_overrides.
const DEFAULT_SEED_PRODUCTION = 60 // 120 is the engine's reference rate
const DEFAULT_SEED_DORMANCY_DAYS = 20
const MATURITY_BIOMASS_FRACTION = 0.15

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** Catalogue season text ("late spring", "late spring-summer", "none") → engine seasons. */
function parseSeason(text: string | undefined): Season[] {
  const [from, to = from] = (text ?? '').split('-').map(part => SEASONS.indexOf(part.trim().split(' ').pop() as Season))
  return from < 0 || to < from ? [] : SEASONS.slice(from, to + 1)
}

export class SpeciesDataAdapter {
  private database: SpeciesDatabase
  private vegetalCache: Map<string, SpeciesDefinition> = new Map()
  private birdCache: Map<string, BirdSpecies> = new Map()
  private biomeCache: Map<BiomeType, { vegetal: string[], birds: string[] }> = new Map()

  constructor(database: SpeciesDatabase) {
    this.database = database
  }

  /**
   * Load species data from database and populate caches
   */
  async initialize(): Promise<void> {
    // Associations first: converting a plant reads its preferred biomes from them.
    await this.loadBiomeAssociations()
    await this.loadVegetalSpecies()
    await this.loadBirdSpecies()
  }

  /**
   * Load vegetal species from database and convert to simulation format
   */
  private async loadVegetalSpecies(): Promise<void> {
    const vegetalSpecies = await (this.database as any).getVegetalSpeciesWithOverrides?.()
      ?? await this.database.getVegetalSpecies()
    
    this.vegetalCache.clear()

    for (const dbSpecies of vegetalSpecies) {
      const simSpecies = this.convertVegetalToSimulation(dbSpecies)
      this.vegetalCache.set(dbSpecies.id, simSpecies)
    }
  }

  /**
   * Load bird species from database
   */
  private async loadBirdSpecies(): Promise<void> {
    const birdSpecies = await this.database.getBirdSpecies()
    
    this.birdCache.clear()
    for (const bird of birdSpecies) {
      this.birdCache.set(bird.id, bird)
    }
  }

  /**
   * Load biome associations for species spawning
   */
  private async loadBiomeAssociations(): Promise<void> {
    const biomes = [
      { db: 'temperate_forest', sim: BiomeType.TEMPERATE_FOREST },
      { db: 'coniferous_forest', sim: BiomeType.BOREAL_FOREST },
      { db: 'grassland', sim: BiomeType.GRASSLAND },
      { db: 'forest_edge', sim: BiomeType.TEMPERATE_FOREST } // Map edge to temperate for now
    ]
    
    // Several catalogue biomes share one simulation biome, so their species lists are merged.
    for (const { db, sim } of biomes) {
      const species = await this.database.getSpeciesByBiome(db)
      const entry = this.biomeCache.get(sim) ?? { vegetal: [], birds: [] }
      const add = (list: string[], ids: string[]) => ids.forEach(id => { if (!list.includes(id)) list.push(id) })
      add(entry.vegetal, species.vegetal.map(s => s.id))
      add(entry.birds, species.bird.map(s => s.id))
      this.biomeCache.set(sim, entry)
    }
  }

  /**
   * Convert database vegetal species to simulation species definition
   */
  private convertVegetalToSimulation(dbSpecies: VegetalSpecies): SpeciesDefinition {
    const clock = dbSpecies.type === 'tree' || dbSpecies.type === 'shrub' ? WOODY_COMPRESSION : 1
    return {
      id: dbSpecies.id,
      name: dbSpecies.common_name || dbSpecies.name,
      category: this.convertSpeciesCategory(dbSpecies.type),
      maxBiomass: dbSpecies.max_biomass,
      growthRate: dbSpecies.growth_rate * clock,
      lifespanTicks: Math.round(dbSpecies.max_age * DAYS_PER_YEAR / clock),
      maturityDays: Math.round(dbSpecies.reproduction_age * DAYS_PER_YEAR / clock),
      reproductionThreshold: typeof dbSpecies.sim_reproduction_threshold === 'number'
        ? dbSpecies.sim_reproduction_threshold
        : dbSpecies.max_biomass * MATURITY_BIOMASS_FRACTION,
      reproductionNeed: dbSpecies.reproduction_need,
      seedProduction: typeof dbSpecies.sim_seed_production === 'number'
        ? dbSpecies.sim_seed_production
        : DEFAULT_SEED_PRODUCTION,
      seedMaturityTicks: typeof dbSpecies.sim_seed_maturity_ticks === 'number'
        ? dbSpecies.sim_seed_maturity_ticks
        : DEFAULT_SEED_DORMANCY_DAYS,
      temperatureRange: {
        min: dbSpecies.temp_min,
        max: dbSpecies.temp_max
      },
      moistureRange: {
        min: dbSpecies.moisture_min,
        max: dbSpecies.moisture_max
      },
      lightRequirement: dbSpecies.light_min,
      shadeToleranceMax: dbSpecies.shade_tolerance,
      pHRange: {
        min: dbSpecies.soil_ph_min,
        max: dbSpecies.soil_ph_max
      },
      canopyLayer: this.convertCanopyLayer(dbSpecies.height_category),
      rootDepth: this.estimateRootDepth(dbSpecies),
      dispersalRange: typeof dbSpecies.sim_dispersal_range === 'number'
        ? dbSpecies.sim_dispersal_range
        : this.estimateDispersalRange(dbSpecies),
      pollination: this.convertPollinationType(dbSpecies.pollination_type),
      succession: this.convertSuccessionStage(dbSpecies.succession_stage),
      traits: this.generateTraits(dbSpecies),
      resistances: this.generateResistances(dbSpecies),
      visualProps: {
        color: dbSpecies.color_primary || '#4a7c59',
        size: dbSpecies.max_biomass / 10, // Normalize to 0-1 range
        shape: this.getShapeFromType(dbSpecies.type),
        seasonalChanges: dbSpecies.type !== 'moss' && dbSpecies.type !== 'fern'
      },
      rarity: dbSpecies.sim_rarity ? (dbSpecies.sim_rarity as any) : this.convertRarity(dbSpecies.max_biomass, dbSpecies.succession_stage),
      preferredBiomes: this.getPreferredBiomes(dbSpecies),
      nativeRegions: this.generateNativeRegions(dbSpecies),
      ecology: {
        floweringSeasons: parseSeason(dbSpecies.flowering_season),
        fruitingSeasons: parseSeason(dbSpecies.fruit_season),
        dormantSeasons: parseSeason(dbSpecies.dormant_season),
        nitrogenFixation: Boolean(dbSpecies.nitrogen_fixation),
        allelopathy: dbSpecies.allelopathy
      }
    }
  }

  /**
   * Convert database species type to simulation category
   */
  private convertSpeciesCategory(type: string): SpeciesCategory {
    switch (type) {
      case 'tree': return SpeciesCategory.TREE
      case 'shrub': return SpeciesCategory.SHRUB
      case 'grass': return SpeciesCategory.GRASS
      case 'fern': return SpeciesCategory.FERN
      case 'moss': return SpeciesCategory.MOSS
      case 'flower': return SpeciesCategory.HERB
      default: return SpeciesCategory.HERB
    }
  }

  /**
   * Convert database height category to canopy layer
   */
  private convertCanopyLayer(heightCategory: string): CanopyLayer {
    switch (heightCategory) {
      case 'canopy': return CanopyLayer.EMERGENT
      case 'tall': return CanopyLayer.CANOPY
      case 'medium': return CanopyLayer.UNDERSTORY
      case 'low': return CanopyLayer.SHRUB
      case 'ground': return CanopyLayer.HERB
      default: return CanopyLayer.HERB
    }
  }

  /**
   * Estimate root depth based on species characteristics
   */
  private estimateRootDepth(species: VegetalSpecies): RootDepth {
    if (species.type === 'tree' && species.max_biomass > 10) return RootDepth.DEEP
    if (species.type === 'tree' || species.type === 'shrub') return RootDepth.MEDIUM
    if (species.drought_resistance > 0.7) return RootDepth.EXTENSIVE
    return RootDepth.SHALLOW
  }

  /**
   * Estimate seed dispersal range based on dispersal type
   */
  private estimateDispersalRange(species: VegetalSpecies): number {
    switch (species.seed_dispersal) {
      case 'wind': return species.max_biomass > 5 ? 8 : 4
      case 'animal': return 6
      case 'water': return 10
      case 'ballistic': return 2
      case 'gravity': return 1
      default: return 3
    }
  }

  /**
   * Convert database pollination type to simulation enum
   */
  private convertPollinationType(type: string): PollinationType {
    switch (type) {
      case 'wind': return PollinationType.WIND
      case 'insect': return PollinationType.INSECT
      case 'bird': return PollinationType.BIRD
      case 'self': return PollinationType.SELF
      // Treat explicit vegetative/asexual markers as self for simulation purposes
      case 'asexual':
      case 'rhizome':
      case 'stolon':
      case 'runner':
      case 'sucker':
      case 'plantlet':
      case 'bulb':
      case 'tuber':
      case 'corm':
      case 'apomixis':
      case 'vegetative':
        return PollinationType.SELF
      case 'mixed': return PollinationType.INSECT // Default to insect for mixed
      default: return PollinationType.WIND
    }
  }

  /**
   * Convert database succession stage to simulation enum
   */
  private convertSuccessionStage(stage: string): SuccessionStage {
    switch (stage) {
      case 'pioneer': return SuccessionStage.PIONEER
      case 'early': return SuccessionStage.EARLY
      case 'mid': return SuccessionStage.MID
      case 'late': return SuccessionStage.LATE
      case 'climax': return SuccessionStage.CLIMAX
      default: return SuccessionStage.PIONEER
    }
  }

  /**
   * Generate traits based on species characteristics
   */
  private generateTraits(species: VegetalSpecies): Array<{ name: string; value: number; description: string }> {
    const traits: Array<{ name: string; value: number; description: string }> = []

    if (species.growth_rate > 0.2) {
      traits.push({
        name: 'fast_growth',
        value: Math.min(1, species.growth_rate * 4),
        description: 'Grows rapidly in suitable conditions'
      })
    }

    if (species.drought_resistance > 0.7) {
      traits.push({
        name: 'drought_tolerance',
        value: species.drought_resistance,
        description: 'Can survive extended dry periods'
      })
    }

    if (species.cold_hardiness > 0.7) {
      traits.push({
        name: 'cold_hardy',
        value: species.cold_hardiness,
        description: 'Tolerates freezing temperatures'
      })
    }

    if (species.shade_tolerance > 0.7) {
      traits.push({
        name: 'shade_specialist',
        value: species.shade_tolerance,
        description: 'Thrives in low-light conditions'
      })
    }

    if (species.nitrogen_fixation) {
      traits.push({
        name: 'nitrogen_fixation',
        value: 0.8,
        description: 'Enriches soil with nitrogen'
      })
    }

    return traits
  }

  /**
   * Generate resistances based on species characteristics
   */
  private generateResistances(species: VegetalSpecies): string[] {
    const resistances: string[] = []

    if (species.cold_hardiness > 0.6) resistances.push('cold', 'frost')
    if (species.drought_resistance > 0.6) resistances.push('drought')
    if (species.wind_resistance > 0.7) resistances.push('wind')
    if (species.pollution_tolerance > 0.5) resistances.push('pollution')
    if (species.type === 'moss' || species.type === 'fern') resistances.push('low_light')

    return resistances
  }

  /**
   * Get shape string from species type
   */
  private getShapeFromType(type: string): string {
    switch (type) {
      case 'tree': return 'deciduous'
      case 'shrub': return 'bush'
      case 'grass': return 'blade'
      case 'fern': return 'frond'
      case 'moss': return 'carpet'
      case 'flower': return 'bloom'
      default: return 'generic'
    }
  }

  /**
   * Convert database characteristics to rarity
   */
  private convertRarity(maxBiomass: number, succession: string): SpeciesRarity {
    if (succession === 'climax' && maxBiomass > 10) return SpeciesRarity.RARE
    if (succession === 'late' || maxBiomass > 8) return SpeciesRarity.UNCOMMON
    return SpeciesRarity.COMMON
  }

  /**
   * Determine preferred biomes based on characteristics
   */
  private getPreferredBiomes(species: VegetalSpecies): BiomeType[] {
    // The catalogue's biome associations are authoritative; the heuristic covers species without any.
    const associated = [...this.biomeCache].filter(([, ids]) => ids.vegetal.includes(species.id)).map(([biome]) => biome)
    if (associated.length > 0) return associated

    const biomes: BiomeType[] = []

    // Forest species
    if (species.type === 'tree' || species.shade_tolerance > 0.5) {
      if (species.temp_min < -10) {
        biomes.push(BiomeType.BOREAL_FOREST)
      } else {
        biomes.push(BiomeType.TEMPERATE_FOREST)
      }
    }

    // Grassland species  
    if (species.type === 'grass' || species.succession_stage === 'pioneer') {
      biomes.push(BiomeType.GRASSLAND)
    }

    // Wetland species
    if (species.moisture_min > 0.7) {
      biomes.push(BiomeType.WETLAND)
    }

    return biomes.length > 0 ? biomes : [BiomeType.TEMPERATE_FOREST]
  }

  /**
   * Generate native regions based on characteristics
   */
  private generateNativeRegions(species: VegetalSpecies): string[] {
    const regions: string[] = []

    if (species.succession_stage === 'pioneer') regions.push('disturbed_areas')
    if (species.type === 'tree') regions.push('forest_interior')
    if (species.moisture_min > 0.7) regions.push('stream_banks')
    if (species.shade_tolerance > 0.7) regions.push('forest_understory')

    return regions.length > 0 ? regions : ['temperate_zone']
  }

  // Public query methods
  getSpeciesDefinition(id: string): SpeciesDefinition | undefined {
    return this.vegetalCache.get(id)
  }

  getBirdSpecies(id: string): BirdSpecies | undefined {
    return this.birdCache.get(id)
  }

  getAllVegetalSpecies(): SpeciesDefinition[] {
    return Array.from(this.vegetalCache.values())
  }

  getAllBirdSpecies(): BirdSpecies[] {
    return Array.from(this.birdCache.values())
  }

  getSpeciesForBiome(biome: BiomeType): string[] {
    const cached = this.biomeCache.get(biome)
    return cached?.vegetal || []
  }

  getBirdsForBiome(biome: BiomeType): string[] {
    const cached = this.biomeCache.get(biome)
    return cached?.birds || []
  }

  /**
   * Get environmental suitability for a species
   */
  async getEnvironmentalSuitability(speciesId: string, conditions: {
    temperature: number
    moisture: number
    light: number
    pollution?: number
  }): Promise<number> {
    const dbSpecies = await this.database.getVegetalSpecies()
    const species = dbSpecies.find(s => s.id === speciesId)
    
    if (!species) return 0
    
    return this.database.getVegetalSuitability(species, conditions)
  }

  /**
   * Get species interactions for ecological modeling
   */
  async getSpeciesInteractions(speciesId: string): Promise<Array<{
    targetSpeciesId: string
    targetType: SpeciesInteraction['species_a_type']
    interactionType: SpeciesInteraction['interaction_type']
    strength: number
  }>> {
    const interactions = await this.database.getSpeciesInteractions()

    return interactions
      .filter(interaction =>
        interaction.species_a_id === speciesId || interaction.species_b_id === speciesId
      )
      .map(interaction => {
        const isA = interaction.species_a_id === speciesId
        return {
          targetSpeciesId: isA ? interaction.species_b_id : interaction.species_a_id,
          targetType: isA ? interaction.species_b_type : interaction.species_a_type,
          interactionType: interaction.interaction_type,
          strength: interaction.interaction_strength
        }
      })
  }

  async close(): Promise<void> {
    await this.database.close()
  }
}

// Factory function to create database-powered adapter
export async function createSpeciesDataAdapter(databasePath?: string): Promise<SpeciesDataAdapter> {
  const database = new SpeciesDatabase(databasePath)
  await database.initialize()
  
  const adapter = new SpeciesDataAdapter(database)
  await adapter.initialize()
  
  return adapter
}
