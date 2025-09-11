import { describe, it, expect } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { CanopySystem } from '@/simulation/CanopySystem'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'

describe('CanopySystem', () => {
  it('builds canopy from biomass and reduces ground light', () => {
    RNGManager.initialize(11)
    const chunk = new WorldChunk(0, 0, 123)
    chunk.climateState.light = 1
    chunk.climateState.temperature = 22
    chunk.climateState.wind = 0.2

    // Add several species with biomass above canopy threshold
    chunk.addSpecies({ id: 'a', speciesId: 'oak', x: 0.2, y: 0.3, biomass: 5, age: 100, phenologyStage: PhenologyStage.VEGETATIVE, health: 1, reproductiveOutput: 0 })
    chunk.addSpecies({ id: 'b', speciesId: 'pine', x: 0.6, y: 0.5, biomass: 7, age: 200, phenologyStage: PhenologyStage.FLOWERING, health: 0.9, reproductiveOutput: 0 })
    chunk.addSpecies({ id: 'c', speciesId: 'birch', x: 0.7, y: 0.8, biomass: 3, age: 150, phenologyStage: PhenologyStage.FRUITING, health: 0.8, reproductiveOutput: 0 })

    const initialLight = chunk.climateState.light
    const canopy = new CanopySystem()
    canopy.update(chunk)

    expect(chunk.biomeState.canopy).toBeGreaterThan(0)
    expect(chunk.climateState.light).toBeLessThanOrEqual(initialLight)
    expect(chunk.climateState.light).toBeGreaterThanOrEqual(0.05)

    const structure = canopy.getCanopyStructure(chunk)
    expect(structure.layers.length).toBeGreaterThan(0)
    expect(structure.lightProfile.groundLevel).toBeLessThanOrEqual(1)
    expect(structure.lightProfile.groundLevel).toBeGreaterThanOrEqual(0.05)
  })
})
