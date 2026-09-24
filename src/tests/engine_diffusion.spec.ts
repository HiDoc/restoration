import { describe, it, expect } from 'vitest'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('SimulationEngine chunk diffusion', () => {
  // A twin world with the same seed has the same weather, so comparing against it isolates the flow.
  const world = (left: number, right: number) => {
    const engine = new SimulationEngine({ worldWidth: 2, worldHeight: 1, chunkSize: 32, tickRate: 60, masterSeed: 21, maxActiveChunks: 2 })
    engine.activateAllChunks()
    engine.getChunk(0, 0)!.biomeState.moisture = left
    engine.getChunk(1, 0)!.biomeState.moisture = right
    engine.update()
    return [engine.getChunk(0, 0)!.biomeState.moisture, engine.getChunk(1, 0)!.biomeState.moisture]
  }

  it('moves water from a wet chunk to a dry neighbour', () => {
    const [dryAfter, wetAfter] = world(0.2, 0.8)
    const [evenLeft, evenRight] = world(0.5, 0.5)
    expect(dryAfter - 0.2).toBeGreaterThan(evenLeft - 0.5)
    expect(wetAfter - 0.8).toBeLessThan(evenRight - 0.5)
  })
})
