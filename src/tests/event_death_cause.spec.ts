import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { PhenologyStage } from '@/simulation/WorldChunk'

describe('Death events include cause', () => {
  beforeEach(() => RNGManager.initialize(11))

  it('emits SPECIES_DIE with cause when an organism dies in WorldChunk', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 5,
      maxActiveChunks: 1,
    })
    engine.activateAllChunks()

    const chunk = engine.getChunk(0, 0)!
    // Use natural aging death path to avoid recovery from health regeneration
    chunk.addSpecies({
      id: 'will_die',
      speciesId: 'common_grass',
      x: 0.5,
      y: 0.5,
      biomass: 0.05,
      age: 10050, // exceeds internal age limit in WorldChunk
      phenologyStage: PhenologyStage.SEED,
      health: 0.5,
      reproductiveOutput: 0,
      reproductiveUrge: 0,
      lastReproductionAttempt: 0,
    })

    // Advance a few ticks to ensure removal path runs and event is recorded
    for (let i = 0; i < 3; i++) engine.update()

    const journal = JSON.parse(engine.exportState().eventJournal) as { events: any[] }
    const death = journal.events.reverse().find((e) => e.type === 'species_die' && e.data?.speciesId === 'common_grass')
    expect(death).toBeDefined()
    expect(death.data).toBeDefined()
    expect(death.data.speciesId).toBe('common_grass')
    expect(death.data.cause).toBeDefined()
  })
})
