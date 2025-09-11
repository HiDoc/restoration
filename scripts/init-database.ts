#!/usr/bin/env ts-node
/**
 * Database Initialization Script
 * Run with: npm run init-db or ts-node scripts/init-database.ts
 */

import { SpeciesDatabase } from '../src/database/SpeciesDatabase'
import path from 'path'

async function initializeDatabase() {
  console.log('🌱 Initializing Species Database...')
  
  const dbPath = path.join(process.cwd(), 'data', 'species.db')
  const db = new SpeciesDatabase(dbPath)

  try {
    console.log('📊 Setting up database schema...')
    await db.setup()
    
    console.log('🔍 Verifying data integrity...')
    const vegetalSpecies = await db.getVegetalSpecies()
    const birdSpecies = await db.getBirdSpecies()
    const interactions = await db.getSpeciesInteractions()
    
    console.log(`✅ Database initialized successfully!`)
    console.log(`   📱 Vegetal species: ${vegetalSpecies.length}`)
    console.log(`   🐦 Bird species: ${birdSpecies.length}`)
    console.log(`   🔗 Species interactions: ${interactions.length}`)
    console.log(`   💾 Database saved to: ${dbPath}`)
    
    // Show some example data
    console.log('\n🌳 Sample Vegetal Species:')
    vegetalSpecies.slice(0, 3).forEach(species => {
      console.log(`   - ${species.common_name || species.name} (${species.type}, ${species.succession_stage})`)
    })
    
    console.log('\n🐦 Sample Bird Species:')
    birdSpecies.slice(0, 3).forEach(species => {
      console.log(`   - ${species.common_name || species.name} (${species.diet_type}, ${species.habitat_type})`)
    })
    
    console.log('\n🔗 Sample Interactions:')
    interactions.slice(0, 3).forEach(interaction => {
      console.log(`   - ${interaction.species_a_id} → ${interaction.species_b_id} (${interaction.interaction_type})`)
    })

    // Test biome queries
    console.log('\n🌲 Testing Biome Associations:')
    const forestSpecies = await db.getSpeciesByBiome('temperate_forest')
    console.log(`   Forest: ${forestSpecies.vegetal.length} plants, ${forestSpecies.bird.length} birds`)
    
    const grasslandSpecies = await db.getSpeciesByBiome('grassland')
    console.log(`   Grassland: ${grasslandSpecies.vegetal.length} plants, ${grasslandSpecies.bird.length} birds`)
    
    await db.close()
    console.log('\n🎉 Database initialization complete!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    await db.close()
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error)
}

export { initializeDatabase }