import { describe, it, expect } from 'vitest'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'

describe('WorldChunk', () => {
  it('produces deterministic state with same seed and updates', () => {
    const c1 = new WorldChunk(0, 0, 123)
    const c2 = new WorldChunk(0, 0, 123)
    for (let t = 1; t <= 10; t++) {
      c1.update(t, 1/60)
      c2.update(t, 1/60)
    }
    expect(c1.getStateHash()).toBe(c2.getStateHash())
  })

  it('exports and imports state consistently', () => {
    const c = new WorldChunk(1, 2, 999)
    // Add one simple species instance
    c.addSpecies({
      id: 's1', speciesId: 'oak', x: 0.5, y: 0.5,
      biomass: 1, age: 0, phenologyStage: PhenologyStage.SEED, health: 1, reproductiveOutput: 0,
      reproductiveUrge: 0, lastReproductionAttempt: 0
    })
    c.update(1, 1/60)

    const exported = c.exportState()
    const c2 = new WorldChunk(exported.x, exported.y, exported.rngSeed)
    c2.importState(exported)

    expect(c2.biomeState.vitality).toBeCloseTo(c.biomeState.vitality)
    expect(c2.species.size).toBe(1)
    expect(c2.getStateHash()).toBe(c.getStateHash())
  })
})

