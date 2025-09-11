import { describe, it, expect } from 'vitest'
import { SimulationEngine, type SimulationConfig } from '@/simulation/SimulationEngine'

const baseConfig: SimulationConfig = {
  worldWidth: 3,
  worldHeight: 3,
  chunkSize: 32,
  tickRate: 60,
  masterSeed: 1234,
  maxActiveChunks: 9,
}

describe('SimulationEngine', () => {
  it('initializes world and activates chunks', () => {
    const engine = new SimulationEngine(baseConfig)
    // Total chunks
    expect(engine.getChunksInArea(0, 0, 2, 2).length).toBe(9)

    engine.activateChunksAroundPoint(1, 1, 1)
    // Center chunk should be active after activation
    const center = engine.getChunk(1, 1)
    expect(center).not.toBeNull()
  })

  it('executes interventions and updates chunk state', () => {
    const engine = new SimulationEngine(baseConfig)
    engine.activateChunksAroundPoint(1, 1, 0)
    const chunk = engine.getChunk(1, 1)!
    const beforeMoisture = chunk.biomeState.moisture
    const beforePollution = chunk.biomeState.pollution
    const beforeSpecies = chunk.species.size

    const okIrrigate = engine.executeIntervention({
      chunkId: chunk.id, x: 0.5, y: 0.5, type: 'irrigate', data: { amount: 0.25 },
    })
    expect(okIrrigate).toBe(true)
    expect(chunk.biomeState.moisture).toBeGreaterThanOrEqual(beforeMoisture)

    const okCleanse = engine.executeIntervention({
      chunkId: chunk.id, x: 0.5, y: 0.5, type: 'cleanse', data: { amount: 0.1 },
    })
    expect(okCleanse).toBe(true)
    expect(chunk.biomeState.pollution).toBeLessThanOrEqual(beforePollution)

    const okPlant = engine.executeIntervention({
      chunkId: chunk.id, x: 0.5, y: 0.5, type: 'plant', data: { speciesId: 'oak' },
    })
    expect(okPlant).toBe(true)
    expect(chunk.species.size).toBeGreaterThan(beforeSpecies)
  })

  it('exports and imports complete state', () => {
    const engine = new SimulationEngine(baseConfig)
    engine.activateChunksAroundPoint(1, 1, 1)

    const state = engine.exportState()
    const engine2 = new SimulationEngine(baseConfig)
    engine2.importState(state)

    expect(engine2.getChunksInArea(0, 0, 2, 2).length).toBe(9)
    expect(engine2.getStatistics().totalChunks).toBe(engine.getStatistics().totalChunks)
  })
})

