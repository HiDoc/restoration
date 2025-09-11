import { describe, it, expect } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'

describe('VegetationSystem growth, reproduction, and succession', () => {
  it('grows biomass under favorable conditions and responds to stress', () => {
    RNGManager.initialize(123)
    const chunk = new WorldChunk(0, 0, 1)
    // Favorable climate
    chunk.climateState.temperature = 20
    chunk.climateState.light = 0.9
    chunk.biomeState.moisture = 0.6
    chunk.biomeState.soil = 0.8

    // Common grass individual
    const plantId = 'p1'
    chunk.addSpecies({ id: plantId, speciesId: 'common_grass', x: 0.5, y: 0.5, biomass: 0.09, age: 0, phenologyStage: PhenologyStage.VEGETATIVE, health: 1, reproductiveOutput: 0 })

    const veg = new VegetationSystem()
    const biomassBefore = chunk.species.get(plantId)!.biomass
    veg.update(chunk, 1)
    const biomassAfter = chunk.species.get(plantId)!.biomass
    expect(biomassAfter).toBeGreaterThan(biomassBefore)

    // Now induce temperature stress and verify health declines after update
    const healthBefore = chunk.species.get(plantId)!.health
    chunk.climateState.temperature = 60 // outside tolerance
    veg.update(chunk, 1)
    const healthAfter = chunk.species.get(plantId)!.health
    expect(healthAfter).toBeLessThanOrEqual(healthBefore)
  })

  it('reproduces when fruiting, disperses seeds, and recruits seedlings', () => {
    RNGManager.initialize(456)
    const chunk = new WorldChunk(0, 0, 2)
    // Favorable establishment conditions
    chunk.climateState.temperature = 20
    chunk.climateState.light = 0.8
    chunk.biomeState.moisture = 0.7
    chunk.biomeState.soil = 0.8

    // Adult flowering/fruiting grass to trigger reproduction
    const plantId = 'p2'
    chunk.addSpecies({ id: plantId, speciesId: 'common_grass', x: 0.4, y: 0.4, biomass: 0.5, age: 500, phenologyStage: PhenologyStage.FRUITING, health: 0.9, reproductiveOutput: 5 })

    const veg = new VegetationSystem()
    const beforeCount = chunk.species.size
    // Run a few ticks to ensure dispersal + recruitment
    for (let i = 0; i < 5; i++) veg.update(chunk, 1)
    const afterCount = chunk.species.size
    expect(afterCount).toBeGreaterThan(beforeCount)
  })

  it('computes succession metrics from species composition', () => {
    RNGManager.initialize(789)
    const chunk = new WorldChunk(0, 0, 3)
    // Add pioneer and climax species
    chunk.addSpecies({ id: 'g', speciesId: 'common_grass', x: 0.2, y: 0.2, biomass: 0.3, age: 100, phenologyStage: PhenologyStage.VEGETATIVE, health: 1, reproductiveOutput: 0 })
    chunk.addSpecies({ id: 'o', speciesId: 'crimson_oak', x: 0.8, y: 0.8, biomass: 3, age: 1000, phenologyStage: PhenologyStage.VEGETATIVE, health: 1, reproductiveOutput: 0 })

    const veg = new VegetationSystem()
    veg.update(chunk, 1)
    const stats = veg.getVegetationStats(chunk)
    expect(stats.successionMetrics.climaxDominance).toBeGreaterThan(0)
    expect(stats.successionMetrics.pioneerDominance).toBeGreaterThanOrEqual(0)
    expect(stats.successionMetrics.stabilityIndex).toBeGreaterThanOrEqual(0)
    expect(stats.successionMetrics.stabilityIndex).toBeLessThanOrEqual(1)
  })
})

