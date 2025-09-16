import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Center seeding in small world', () => {
  beforeEach(() => RNGManager.initialize(77))

  it('1x1 world still gets initial center seeds and year rollover reseeding', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 9,
      maxActiveChunks: 1,
      seasonLengthTicks: 5,
    })
    const c = engine.getChunk(0,0)!
    expect(((c as any).seedBank as any[]).length).toBeGreaterThan(0)

    // Select a seed source (any grass)
    const grass = Array.from(c.species.values()).find((s: any) => s.speciesId === 'common_grass')!
    const ok = engine.selectSeedForNextYear('common_grass', grass.id)
    expect(ok).toBe(true)
    for (let i = 0; i < 20; i++) engine.update()
    const bank = (engine.getChunk(0,0) as any).seedBank as any[]
    expect(bank.length).toBeGreaterThan(0)
    bank.forEach(s => expect(s.speciesId).toBe('common_grass'))
  })
})

