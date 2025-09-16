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

  it('replaces seeds in 3x3 center with selected species at year start', () => {
    const engine = new SimulationEngine({
      worldWidth: 5,
      worldHeight: 5,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 7,
      maxActiveChunks: 9,
      seasonLengthTicks: 5, // 20 days per year
    })
    engine.activateAllChunks()

    // Pick any existing grass as seed source
    const chunks = engine.getChunksInArea(0,0,4,4)
    const grass = chunks.flatMap(c => Array.from(c.species.values())).find(s => s.speciesId === 'common_grass')!
    expect(grass).toBeDefined()
    const ok = engine.selectSeedForNextYear('common_grass', grass.id)
    expect(ok).toBe(true)

    // Advance to year boundary (20 days with seasonLength=5)
    for (let i = 0; i < 20; i++) engine.update()

    // All seeds in center area should now be for selected species (common_grass)
    for (let x = 1; x <= 3; x++) {
      for (let y = 1; y <= 3; y++) {
        const bank = (engine.getChunk(x,y) as any).seedBank as any[]
        expect(bank.length).toBeGreaterThan(0)
        bank.forEach(s => expect(s.speciesId).toBe('common_grass'))
      }
    }
  })
})

