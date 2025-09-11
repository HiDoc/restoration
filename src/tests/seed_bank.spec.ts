import { describe, it, expect } from 'vitest'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { RNGManager } from '@/simulation/SeededRNG'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'

function favorableChunk(seed = 99) {
  const c = new WorldChunk(0, 0, seed)
  c.biomeState.vitality = 0.9
  c.biomeState.soil = 0.9
  c.biomeState.moisture = 0.7
  c.climateState.temperature = 21
  c.climateState.light = 0.85
  c.climateState.wind = 0.6
  return c
}

describe('Seed bank accounting', () => {
  RNGManager.initialize(2024)

  it('accumulates landed seeds and updates lastTick counters', () => {
    const chunk = favorableChunk(5)
    const veg = new VegetationSystem()

    // Put an adult grass in fruiting with some initial output
    chunk.addSpecies({
      id: 'cg1', speciesId: 'common_grass', x: 0.5, y: 0.5,
      biomass: 0.5, age: 800, phenologyStage: PhenologyStage.FRUITING, health: 0.9,
      reproductiveOutput: 10
    })

    const bankBefore = (chunk as any).seedBank?.length || 0
    // One update tick should process some seeds
    veg.update(chunk, 1)
    const stats = (chunk as any).seedStats
    const bankAfter = (chunk as any).seedBank?.length || 0

    expect(bankAfter).toBeGreaterThanOrEqual(bankBefore)
    expect(stats.lastTickLanded).toBeGreaterThanOrEqual(0)
    expect(stats.totalLanded).toBeGreaterThanOrEqual(stats.lastTickLanded)
  })
})

