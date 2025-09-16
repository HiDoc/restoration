import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Chunk diffusion', () => {
  beforeEach(() => RNGManager.initialize(555))

  it('moisture diffuses from wetter to drier neighbors', () => {
    const engine = new SimulationEngine({
      worldWidth: 3,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 123,
      maxActiveChunks: 3,
      seasonLengthTicks: 5,
    })
    engine.activateAllChunks()

    const left = engine.getChunk(0,0)!
    const mid = engine.getChunk(1,0)!
    const right = engine.getChunk(2,0)!

    // Set strong gradient
    left.biomeState.moisture = 0.1
    mid.biomeState.moisture = 0.9
    right.biomeState.moisture = 0.1

    const m0L = left.biomeState.moisture
    const m0M = mid.biomeState.moisture
    const m0R = right.biomeState.moisture
    const d0L = Math.abs(m0M - m0L)
    const d0R = Math.abs(m0M - m0R)

    // Run several ticks to let diffusion accumulate
    for (let i = 0; i < 8; i++) engine.update()

    expect(left.biomeState.moisture).toBeGreaterThan(m0L)
    expect(right.biomeState.moisture).toBeGreaterThan(m0R)
    // Distance to center moisture should shrink (diffusion)
    const d1L = Math.abs(mid.biomeState.moisture - left.biomeState.moisture)
    const d1R = Math.abs(mid.biomeState.moisture - right.biomeState.moisture)
    expect(d1L + d1R).toBeLessThan(d0L + d0R)
  })

  it('pollution spreads from higher to lower neighboring chunks', () => {
    const engine = new SimulationEngine({
      worldWidth: 3,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 456,
      maxActiveChunks: 3,
      seasonLengthTicks: 5,
    })
    engine.activateAllChunks()

    const left = engine.getChunk(0,0)!
    const mid = engine.getChunk(1,0)!
    const right = engine.getChunk(2,0)!

    left.biomeState.pollution = 0.0
    mid.biomeState.pollution = 0.9
    right.biomeState.pollution = 0.0

    const p0L = left.biomeState.pollution
    const p0M = mid.biomeState.pollution
    const p0R = right.biomeState.pollution
    const dp0L = Math.abs(p0M - p0L)
    const dp0R = Math.abs(p0M - p0R)

    for (let i = 0; i < 8; i++) engine.update()

    expect(left.biomeState.pollution).toBeGreaterThan(p0L)
    expect(right.biomeState.pollution).toBeGreaterThan(p0R)
    const dp1L = Math.abs(mid.biomeState.pollution - left.biomeState.pollution)
    const dp1R = Math.abs(mid.biomeState.pollution - right.biomeState.pollution)
    expect(dp1L).toBeLessThan(dp0L)
    expect(dp1R).toBeLessThan(dp0R)
  })
})
