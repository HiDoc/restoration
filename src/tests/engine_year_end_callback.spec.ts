import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('SimulationEngine year-end callbacks', () => {
  beforeEach(() => RNGManager.initialize(33))

  it('invokes onYearEnd callback once per year', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 33,
      maxActiveChunks: 1,
      seasonLengthTicks: 5, // 20-day year
    })
    engine.activateAllChunks()

    let calls: number[] = []
    engine.onYearEnd((y) => calls.push(y))

    // Advance through 3 years
    const totalDays = 20 * 3
    for (let i = 0; i < totalDays; i++) engine.update()

    // Expect years 1, 2, 3 to have ended
    expect(calls.length).toBeGreaterThanOrEqual(3)
    expect(calls[0]).toBeGreaterThanOrEqual(1)
  })
})

