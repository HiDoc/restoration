import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Center seeding counts', () => {
  beforeEach(() => RNGManager.initialize(1234))

  it('seeds exactly 3 seeds per center chunk at start (5x5 world)', () => {
    const engine = new SimulationEngine({
      worldWidth: 5,
      worldHeight: 5,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 1,
      maxActiveChunks: 9,
      seasonLengthTicks: 5,
    })
    let total = 0
    for (let x = 1; x <= 3; x++) {
      for (let y = 1; y <= 3; y++) {
        const bank = (engine.getChunk(x,y) as any).seedBank as any[]
        expect(bank.length).toBe(3)
        bank.forEach(s => expect(s.speciesId).toBe('common_grass'))
        total += bank.length
      }
    }
    expect(total).toBe(9 * 3)
  })
})

