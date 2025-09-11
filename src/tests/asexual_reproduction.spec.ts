import { describe, it, expect } from 'vitest'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { RNGManager } from '@/simulation/SeededRNG'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'

function makeChunk(seed = 42) {
  const c = new WorldChunk(0, 0, seed)
  // Favorable for vegetative spread: open canopy, good soil, moderate moisture
  c.biomeState.canopy = 0.05
  c.biomeState.soil = 0.9
  c.biomeState.moisture = 0.55
  c.biomeState.vitality = 0.8
  c.climateState.temperature = 20
  c.climateState.light = 0.9
  return c
}

describe('Asexual (vegetative) reproduction', () => {
  RNGManager.initialize(123)
  it('common_grass clones locally via rhizome/stolon when conditions are good', () => {
    const chunk = makeChunk(7)
    const veg = new VegetationSystem()

    // Plant a healthy adult grass individual
    chunk.addSpecies({
      id: 'g0', speciesId: 'common_grass', x: 0.5, y: 0.5,
      biomass: 0.4, age: 600, phenologyStage: PhenologyStage.VEGETATIVE, health: 0.95,
      reproductiveOutput: 0
    })

    const before = chunk.species.size
    // Run many short updates to accumulate asexual attempts deterministically
    for (let i = 0; i < 3000; i++) veg.update(chunk, 0.1)
    const after = chunk.species.size
    expect(after).toBeGreaterThan(before)
  })
})
