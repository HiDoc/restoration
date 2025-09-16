import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('SimulationEngine export/import', () => {
  beforeEach(() => RNGManager.initialize(77))

  it('roundtrips state with chunks and events', () => {
    const engine = new SimulationEngine({
      worldWidth: 2,
      worldHeight: 2,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 77,
      maxActiveChunks: 4,
    })
    engine.activateAllChunks()
    const c = engine.getChunk(0, 0)!
    const planted = engine.executeIntervention({ chunkId: c.id, x: 0.4, y: 0.4, type: 'plant', data: { speciesId: 'common_grass' } })
    expect(planted).toBe(true)
    engine.update()

    const state = engine.exportState()
    const engine2 = new SimulationEngine({
      worldWidth: 2,
      worldHeight: 2,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 77,
      maxActiveChunks: 4,
    })
    engine2.importState(state)

    // Check species persisted
    const c2 = engine2.getChunk(0, 0)!
    expect(c2.species.size).toBeGreaterThan(0)
    // Check event journal persisted
    const ej = JSON.parse(engine2.exportState().eventJournal)
    expect(ej.events.length).toBeGreaterThan(0)
  })
})

