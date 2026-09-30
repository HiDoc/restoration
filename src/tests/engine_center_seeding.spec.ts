import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Center area seeding (3x3)', () => {
  beforeEach(() => RNGManager.initialize(99))

  it('places seeds in 3x3 center at start', () => {
    const engine = new SimulationEngine({
      worldWidth: 5,
      worldHeight: 5,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 7,
      maxActiveChunks: 9,
      seasonLengthTicks: 5,
    })
    // Center is (2,2); 3x3 includes x=1..3,y=1..3
    let seeded = 0
    for (let x = 1; x <= 3; x++) {
      for (let y = 1; y <= 3; y++) {
        const chunk = engine.getChunk(x, y)!
        expect(chunk).toBeTruthy()
        const bank = (chunk as any).seedBank as any[]
        expect(bank.length).toBeGreaterThan(0)
        seeded += bank.length
      }
    }
    expect(seeded).toBeGreaterThanOrEqual(9)
  })
})

