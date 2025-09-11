/**
 * Species Database Manager
 * Handles SQLite database operations for vegetal and bird species data
 */

import sqlite3, { Database } from 'sqlite3'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// TypeScript interfaces for database entities
export interface VegetalSpecies {
  id: string
  name: string
  common_name?: string
  family: string
  type: 'grass' | 'shrub' | 'tree' | 'fern' | 'moss' | 'flower'
  succession_stage: 'pioneer' | 'early' | 'mid' | 'late' | 'climax'
  
  // Growth characteristics
  max_biomass: number
  growth_rate: number
  max_age: number
  reproduction_age: number
  reproduction_need: number
  
  // Environmental preferences
  temp_min: number
  temp_max: number
  temp_optimal: number
  moisture_min: number
  moisture_max: number
  moisture_optimal: number
  
  // Light requirements
  light_min: number
  light_max: number
  light_optimal: number
  shade_tolerance: number
  
  // Soil preferences
  soil_ph_min: number
  soil_ph_max: number
  soil_ph_optimal: number
  nutrient_requirement: number
  
  // Ecological attributes
  pollution_tolerance: number
  drought_resistance: number
  cold_hardiness: number
  wind_resistance: number
  
  // Reproductive characteristics
  pollination_type: 'wind' | 'insect' | 'bird' | 'self' | 'mixed'
  seed_dispersal: 'wind' | 'animal' | 'water' | 'gravity' | 'ballistic'
  flowering_season?: string
  fruit_season?: string
  
  // Interaction factors
  allelopathy: number
  nitrogen_fixation: boolean
  mycorrhizal_association: boolean
  
  // Visual attributes
  color_primary?: string
  color_secondary?: string
  height_category: 'ground' | 'low' | 'medium' | 'tall' | 'canopy'

  // Optional simulation overrides (from simulation_species_overrides)
  sim_seed_production?: number
  sim_reproduction_threshold?: number
  sim_seed_maturity_ticks?: number
  sim_dispersal_range?: number
  sim_reproduction_seasons?: string
  sim_rarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'
}

export interface BirdSpecies {
  id: string
  name: string
  common_name?: string
  family: string
  order_name?: string
  
  // Physical characteristics
  body_mass_g?: number
  wingspan_cm?: number
  length_cm?: number
  
  // Behavioral characteristics
  diet_type: 'carnivore' | 'herbivore' | 'omnivore' | 'granivore' | 'nectarivore' | 'insectivore' | 'frugivore'
  feeding_strategy: 'ground' | 'aerial' | 'foliage' | 'bark' | 'nectar' | 'water' | 'mixed'
  social_behavior: 'solitary' | 'pair' | 'small_flock' | 'large_flock' | 'colonial'
  
  // Habitat preferences
  habitat_type: 'forest' | 'grassland' | 'wetland' | 'urban' | 'agricultural' | 'mountain' | 'coastal' | 'mixed'
  canopy_preference: 'ground' | 'understory' | 'midstory' | 'canopy' | 'emergent' | 'aerial'
  territory_size_ha?: number
  
  // Migration and seasonality
  migration_pattern: 'resident' | 'short_distance' | 'long_distance' | 'nomadic' | 'altitudinal'
  breeding_season?: string
  clutch_size_min?: number
  clutch_size_max?: number
  
  // Environmental tolerances
  temp_range_min?: number
  temp_range_max?: number
  elevation_min_m?: number
  elevation_max_m?: number
  
  // Ecological role
  pollinator_effectiveness: number
  seed_dispersal_effectiveness: number
  pest_control_effectiveness: number
  
  // Population characteristics
  abundance_category: 'rare' | 'uncommon' | 'common' | 'abundant' | 'very_abundant'
  conservation_status: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EX'
  
  // Activity patterns
  activity_period: 'diurnal' | 'nocturnal' | 'crepuscular' | 'mixed'
  foraging_time?: string
}

export interface SpeciesInteraction {
  id: number
  species_a_id: string
  species_a_type: 'vegetal' | 'bird'
  species_b_id: string
  species_b_type: 'vegetal' | 'bird'
  interaction_type: 'pollination' | 'seed_dispersal' | 'nesting' | 'feeding' | 'competition' | 'facilitation' | 'neutral'
  interaction_strength: number
  seasonal_modifier?: string
  notes?: string
}

export interface BiomeAssociation {
  id: number
  species_id: string
  species_type: 'vegetal' | 'bird'
  biome_type: string
  abundance_weight: number
}

export class SpeciesDatabase {
  private db: Database | null = null
  private dbPath: string

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'species.db')
  }

  /**
   * Initialize the database connection and create tables if needed
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath)
      fs.mkdir(dir, { recursive: true }).catch(() => {}) // Ignore if already exists

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`))
          return
        }
        resolve()
      })
    })
  }

  /**
   * Create database schema from SQL file
   */
  async createSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = await fs.readFile(schemaPath, 'utf-8')

    return new Promise((resolve, reject) => {
      this.db!.exec(schema, (err) => {
        if (err) {
          reject(new Error(`Failed to create schema: ${err.message}`))
          return
        }
        resolve()
      })
    })
  }

  /**
   * Load initial species data from SQL file
   */
  async loadInitialData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const dataPath = path.join(__dirname, 'init-species-data.sql')
    const data = await fs.readFile(dataPath, 'utf-8')

    return new Promise((resolve, reject) => {
      // Make seeding idempotent for associations and interactions
      const pre = `BEGIN; DELETE FROM species_interactions; DELETE FROM biome_associations; COMMIT;`;
      this.db!.exec(pre + '\n' + data, (err) => {
        if (err) {
          reject(new Error(`Failed to load initial data: ${err.message}`))
          return
        }
        resolve()
      })
    })
  }

  /**
   * Setup database with schema and initial data
   */
  async setup(): Promise<void> {
    await this.initialize()
    await this.createSchema()
    await this.loadInitialData()
  }

  /**
   * Get all vegetal species
   */
  async getVegetalSpecies(): Promise<VegetalSpecies[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM vegetal_species ORDER BY name', (err, rows) => {
        if (err) {
          reject(new Error(`Failed to get vegetal species: ${err.message}`))
          return
        }
        resolve(rows as VegetalSpecies[])
      })
    })
  }

  /**
   * Get vegetal species with simulation overrides (LEFT JOIN)
   */
  async getVegetalSpeciesWithOverrides(): Promise<VegetalSpecies[]> {
    if (!this.db) throw new Error('Database not initialized')

    const query = `
      SELECT v.*,
             o.seed_production            AS sim_seed_production,
             o.reproduction_threshold     AS sim_reproduction_threshold,
             o.seed_maturity_ticks        AS sim_seed_maturity_ticks,
             o.dispersal_range            AS sim_dispersal_range,
             o.reproduction_seasons       AS sim_reproduction_seasons,
             o.rarity                     AS sim_rarity
      FROM vegetal_species v
      LEFT JOIN simulation_species_overrides o ON o.species_id = v.id
      ORDER BY v.name
    `

    return new Promise((resolve, reject) => {
      this.db!.all(query, (err, rows) => {
        if (err) {
          reject(new Error(`Failed to get vegetal species with overrides: ${err.message}`))
          return
        }
        resolve(rows as VegetalSpecies[])
      })
    })
  }

  /**
   * Get all bird species
   */
  async getBirdSpecies(): Promise<BirdSpecies[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.all('SELECT * FROM bird_species ORDER BY name', (err, rows) => {
        if (err) {
          reject(new Error(`Failed to get bird species: ${err.message}`))
          return
        }
        resolve(rows as BirdSpecies[])
      })
    })
  }

  /**
   * Get vegetal species by succession stage
   */
  async getVegetalSpeciesBySuccession(stage: string): Promise<VegetalSpecies[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM vegetal_species WHERE succession_stage = ? ORDER BY name',
        [stage],
        (err, rows) => {
          if (err) {
            reject(new Error(`Failed to get species by succession: ${err.message}`))
            return
          }
          resolve(rows as VegetalSpecies[])
        }
      )
    })
  }

  /**
   * Get bird species by habitat type
   */
  async getBirdSpeciesByHabitat(habitat: string): Promise<BirdSpecies[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM bird_species WHERE habitat_type = ? OR habitat_type = "mixed" ORDER BY name',
        [habitat],
        (err, rows) => {
          if (err) {
            reject(new Error(`Failed to get species by habitat: ${err.message}`))
            return
          }
          resolve(rows as BirdSpecies[])
        }
      )
    })
  }

  /**
   * Get species interactions by type
   */
  async getSpeciesInteractions(interactionType?: string): Promise<SpeciesInteraction[]> {
    if (!this.db) throw new Error('Database not initialized')

    const query = interactionType 
      ? 'SELECT * FROM species_interactions WHERE interaction_type = ? ORDER BY interaction_strength DESC'
      : 'SELECT * FROM species_interactions ORDER BY interaction_type, interaction_strength DESC'
    
    const params = interactionType ? [interactionType] : []

    return new Promise((resolve, reject) => {
      this.db!.all(query, params, (err, rows) => {
        if (err) {
          reject(new Error(`Failed to get species interactions: ${err.message}`))
          return
        }
        resolve(rows as SpeciesInteraction[])
      })
    })
  }

  /**
   * Get species by biome type with abundance weights
   */
  async getSpeciesByBiome(biomeType: string): Promise<{
    vegetal: Array<VegetalSpecies & { abundance_weight: number }>
    bird: Array<BirdSpecies & { abundance_weight: number }>
  }> {
    if (!this.db) throw new Error('Database not initialized')

    const vegetalQuery = `
      SELECT v.*, ba.abundance_weight 
      FROM vegetal_species v
      JOIN biome_associations ba ON v.id = ba.species_id 
      WHERE ba.biome_type = ? AND ba.species_type = 'vegetal'
      ORDER BY ba.abundance_weight DESC, v.name
    `

    const birdQuery = `
      SELECT b.*, ba.abundance_weight 
      FROM bird_species b
      JOIN biome_associations ba ON b.id = ba.species_id 
      WHERE ba.biome_type = ? AND ba.species_type = 'bird'
      ORDER BY ba.abundance_weight DESC, b.name
    `

    const [vegetalResults, birdResults] = await Promise.all([
      new Promise<Array<VegetalSpecies & { abundance_weight: number }>>((resolve, reject) => {
        this.db!.all(vegetalQuery, [biomeType], (err, rows) => {
          if (err) {
            reject(new Error(`Failed to get vegetal species by biome: ${err.message}`))
            return
          }
          resolve(rows as Array<VegetalSpecies & { abundance_weight: number }>)
        })
      }),
      new Promise<Array<BirdSpecies & { abundance_weight: number }>>((resolve, reject) => {
        this.db!.all(birdQuery, [biomeType], (err, rows) => {
          if (err) {
            reject(new Error(`Failed to get bird species by biome: ${err.message}`))
            return
          }
          resolve(rows as Array<BirdSpecies & { abundance_weight: number }>)
        })
      })
    ])

    return {
      vegetal: vegetalResults,
      bird: birdResults
    }
  }

  /**
   * Get environmental suitability for a species given conditions
   */
  getVegetalSuitability(species: VegetalSpecies, conditions: {
    temperature: number
    moisture: number
    light: number
    soilPh?: number
    pollution?: number
  }): number {
    let suitability = 1.0

    // Temperature suitability (Gaussian curve)
    const tempDiff = Math.abs(conditions.temperature - species.temp_optimal)
    const tempRange = (species.temp_max - species.temp_min) / 2
    suitability *= Math.exp(-(tempDiff * tempDiff) / (2 * tempRange * tempRange))

    // Moisture suitability
    const moistureDiff = Math.abs(conditions.moisture - species.moisture_optimal)
    const moistureRange = (species.moisture_max - species.moisture_min) / 2
    suitability *= Math.exp(-(moistureDiff * moistureDiff) / (2 * moistureRange * moistureRange))

    // Light suitability
    const lightDiff = Math.abs(conditions.light - species.light_optimal)
    const lightRange = (species.light_max - species.light_min) / 2
    suitability *= Math.exp(-(lightDiff * lightDiff) / (2 * lightRange * lightRange))

    // Pollution tolerance
    if (conditions.pollution !== undefined) {
      if (conditions.pollution > species.pollution_tolerance) {
        suitability *= Math.max(0, 1 - (conditions.pollution - species.pollution_tolerance))
      }
    }

    return Math.max(0, Math.min(1, suitability))
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`))
          return
        }
        this.db = null
        resolve()
      })
    })
  }
}

// Singleton instance for global access
let databaseInstance: SpeciesDatabase | null = null

export function getSpeciesDatabase(): SpeciesDatabase {
  if (!databaseInstance) {
    databaseInstance = new SpeciesDatabase()
  }
  return databaseInstance
}
