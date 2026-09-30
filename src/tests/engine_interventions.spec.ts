import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('SimulationEngine interventions', () => {
  beforeEach(() => RNGManager.initialize(9))

  it('plants a seed from the pouch into a chunk', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 9,
      maxActiveChunks: 1,
    })
    engine.activateAllChunks()
    const chunk = engine.getChunk(0, 0)!
    const before = chunk.species.size
    const sow = () => engine.executeIntervention({
      chunkId: chunk.id,
      x: 0.5,
      y: 0.5,
      type: 'plant',
      data: { speciesId: 'common_grass' },
    })
    expect(sow()).toBe(false)
    engine.addSeeds({ common_grass: 1 })
    expect(sow()).toBe(true)
    expect(chunk.species.size).toBeGreaterThan(before)
    expect(engine.getInventory()).toEqual({})
    expect(sow()).toBe(false)
  })

  it('irrigates and cleanses a chunk', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 9,
      maxActiveChunks: 1,
    })
    engine.activateAllChunks()
    const chunk = engine.getChunk(0, 0)!
    chunk.biomeState.moisture = 0.2
    chunk.biomeState.pollution = 0.5

    const ok1 = engine.executeIntervention({ chunkId: chunk.id, x: 0.5, y: 0.5, type: 'irrigate', data: { amount: 0.3 } })
    const ok2 = engine.executeIntervention({ chunkId: chunk.id, x: 0.5, y: 0.5, type: 'cleanse', data: { amount: 0.2 } })
    expect(ok1 && ok2).toBe(true)
    expect(chunk.biomeState.moisture).toBeCloseTo(0.5, 5)
    expect(chunk.biomeState.pollution).toBeCloseTo(0.3, 5)
  })
})

