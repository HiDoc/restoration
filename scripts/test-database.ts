#!/usr/bin/env ts-node
/**
 * Database Integration Test Script
 * Tests the SpeciesDataAdapter functionality
 */

import { createSpeciesDataAdapter } from '../src/simulation/SpeciesDataAdapter'
import { BiomeType } from '../src/simulation/SpeciesRegistry'
import path from 'path'

async function testDatabaseIntegration() {
  console.log('🧪 Testing Database Integration...')
  
  const dbPath = path.join(process.cwd(), 'data', 'species.db')
  
  try {
    const adapter = await createSpeciesDataAdapter(dbPath)
    
    // Test vegetal species loading
    console.log('\n🌱 Testing Vegetal Species:')
    const vegetalSpecies = adapter.getAllVegetalSpecies()
    console.log(`   Loaded ${vegetalSpecies.length} vegetal species`)
    
    vegetalSpecies.slice(0, 3).forEach(species => {
      console.log(`   - ${species.name} (${species.category}, ${species.succession})`)
      console.log(`     Max biomass: ${species.maxBiomass}, Growth rate: ${species.growthRate}`)
      console.log(`     Temperature: ${species.temperatureRange.min}°C to ${species.temperatureRange.max}°C`)
    })
    
    // Test bird species loading
    console.log('\n🐦 Testing Bird Species:')
    const birdSpecies = adapter.getAllBirdSpecies()
    console.log(`   Loaded ${birdSpecies.length} bird species`)
    
    birdSpecies.slice(0, 3).forEach(bird => {
      console.log(`   - ${bird.common_name || bird.name} (${bird.diet_type}, ${bird.habitat_type})`)
      console.log(`     Mass: ${bird.body_mass_g}g, Wingspan: ${bird.wingspan_cm}cm`)
    })
    
    // Test biome associations
    console.log('\n🌲 Testing Biome Associations:')
    const forestSpecies = adapter.getSpeciesForBiome(BiomeType.TEMPERATE_FOREST)
    const forestBirds = adapter.getBirdsForBiome(BiomeType.TEMPERATE_FOREST)
    console.log(`   Temperate Forest: ${forestSpecies.length} plants, ${forestBirds.length} birds`)
    
    const grasslandSpecies = adapter.getSpeciesForBiome(BiomeType.GRASSLAND)
    const grasslandBirds = adapter.getBirdsForBiome(BiomeType.GRASSLAND)
    console.log(`   Grassland: ${grasslandSpecies.length} plants, ${grasslandBirds.length} birds`)
    
    // Test environmental suitability
    console.log('\n🌡️  Testing Environmental Suitability:')
    const commonGrass = adapter.getSpeciesDefinition('common_grass')
    if (commonGrass) {
      const suitability = await adapter.getEnvironmentalSuitability('common_grass', {
        temperature: 20,
        moisture: 0.5,
        light: 0.7,
        pollution: 0.1
      })
      console.log(`   Common grass suitability at 20°C, 50% moisture, 70% light: ${suitability.toFixed(3)}`)
    }
    
    // Test species interactions
    console.log('\n🔗 Testing Species Interactions:')
    const oakInteractions = await adapter.getSpeciesInteractions('english_oak')
    console.log(`   English oak has ${oakInteractions.length} interactions:`)
    oakInteractions.slice(0, 3).forEach(interaction => {
      console.log(`     → ${interaction.targetSpeciesId} (${interaction.interactionType}, strength: ${interaction.strength})`)
    })
    
    // Test specific species lookup
    console.log('\n🔍 Testing Species Lookup:')
    const silverBirch = adapter.getSpeciesDefinition('silver_birch')
    if (silverBirch) {
      console.log(`   Silver Birch:`)
      console.log(`     Category: ${silverBirch.category}`)
      console.log(`     Succession: ${silverBirch.succession}`)
      console.log(`     Traits: ${silverBirch.traits.map(t => t.name).join(', ')}`)
      console.log(`     Resistances: ${silverBirch.resistances.join(', ')}`)
      console.log(`     Preferred biomes: ${silverBirch.preferredBiomes.join(', ')}`)
    }
    
    await adapter.close()
    console.log('\n✅ Database integration test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database integration test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseIntegration().catch(console.error)
}

export { testDatabaseIntegration }