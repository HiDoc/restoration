import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Vegetation master genome on germination', () => {
  beforeEach(() => RNGManager.initialize(2024))

  it('seedlings spawned after year rollover adopt master genome', () => {
    const engine = new SimulationEngine({
      worldWidth: 3,
      worldHeight: 3,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 11,
      maxActiveChunks: 9,
      seasonLengthTicks: 5,
    })
    engine.activateAllChunks()

    // Choose a parent as selected seed source
    const center = engine.getChunk(1,1)!
    const parent = Array.from(center.species.values()).find((s: any) => s.speciesId === 'common_grass') as any
    expect(parent).toBeDefined()
    parent.genetics.traits.set('drought_tolerance', { ...parent.genetics.traits.get('drought_tolerance'), value: 0.71 })
    expect(engine.selectSeedForNextYear('common_grass', parent.id)).toBe(true)

    // Roll over the year
    for (let i = 0; i < 20; i++) engine.update()

    // Process seed bank until a new seedling appears
    const before = Array.from(center.species.keys())
    engine.advance(10)
    const after = Array.from(engine.getChunk(1, 1)!.species.keys())
    const newId = after.find(id => !before.includes(id))!
    const child: any = engine.getChunk(1, 1)!.species.get(newId)
    expect(child).toBeDefined()
    const master = engine.getMasterGenome('common_grass')!
    expect(child.genetics.traits.get('drought_tolerance').value).toBeCloseTo(master.traits.get('drought_tolerance')!.value, 5)
  })
})

