import { describe, it, expect } from 'vitest'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'
import { InteractionsSystem } from '@/simulation/InteractionsSystem'
import { RNGManager } from '@/simulation/SeededRNG'

describe('InteractionsSystem pollination and dispersal boosts', () => {
  RNGManager.initialize(7)

  it('applies bird-mediated pollination boost using bird group density', async () => {
    // Mock adapter with one vegetal species (hawthorn) and one interaction to a bird (blue_tit)
    const adapter = {
      getAllVegetalSpecies: () => [{ id: 'hawthorn' }],
      getAllBirdSpecies: () => [{ id: 'blue_tit', diet_type: 'insectivore', pest_control_effectiveness: 0.9 }],
      getSpeciesInteractions: async (id: string) => id === 'hawthorn' ? [
        { targetSpeciesId: 'blue_tit', targetType: 'bird', interactionType: 'pollination', strength: 0.8 },
      ] : []
    }

    const sys = await InteractionsSystem.create(adapter)
    const c = new WorldChunk(0, 0, 1)
    // Plant hawthorn instance in the chunk and a bird token to satisfy presence check
    c.addSpecies({ id: 'h1', speciesId: 'hawthorn', x: 0.5, y: 0.5, biomass: 1, age: 10, phenologyStage: PhenologyStage.FLOWERING, health: 0.9, reproductiveOutput: 0 })
    c.addSpecies({ id: 'btoken', speciesId: 'blue_tit', x: 0.6, y: 0.5, biomass: 0.1, age: 1, phenologyStage: PhenologyStage.VEGETATIVE, health: 1, reproductiveOutput: 0 })
    // Simulate BirdsSystem annotation: blue_tit maps to ROBIN group in BirdMapping
    ;(c as any).birds = { swift: 0.0, robin: 0.9, owl: 0.0 }
    ;(c as any).birdsActivity = 0.9

    sys.update(c)
    const boost = (c as any).__interactionBoost?.pollination?.get('hawthorn') || 0
    expect(boost).toBeGreaterThan(0)
  })
})
