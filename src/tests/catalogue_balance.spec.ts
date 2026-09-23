import { describe, it, expect, beforeAll } from 'vitest'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { EventType } from '@/simulation/EventJournal'

// Milestone A's meadow: every plant here must hold its own for two game years, and draw its animals.
const SLICE_PLANTS = ['common_grass', 'white_clover', 'wild_bluebell', 'hawthorn']
const SLICE_ANIMALS = ['buff_tailed_bumblebee', 'common_blue', 'blackbird']
const YEARS = 2

describe('catalogue species balance', () => {
  const alive = new Map<string, number>()
  const seeded = new Map<string, number>()
  const sighted = new Set<string>()
  let total = 0

  beforeAll(() => {
    const engine = new SimulationEngine({
      worldWidth: 6, worldHeight: 6, chunkSize: 16, tickRate: 10, masterSeed: 7,
      maxActiveChunks: 36, seasonLengthTicks: 90, timePerTickMinutes: 1440,
    })
    engine.applyScenarioConditions({ establishedSpecies: SLICE_PLANTS, initialSpecies: SLICE_PLANTS })
    engine.advance(360 * YEARS)
    for (const chunk of engine.readChunks().values()) {
      chunk.species.forEach(plant => alive.set(plant.speciesId, (alive.get(plant.speciesId) ?? 0) + 1))
    }
    total = [...alive.values()].reduce((a, b) => a + b, 0)
    for (const event of engine.getEventJournal().getAllEvents()) {
      const id = (event.data as { speciesId?: string } | undefined)?.speciesId
      if (event.type === 'species_reproduce' && id) seeded.set(id, (seeded.get(id) ?? 0) + 1)
      if (event.type === EventType.FIRST_SIGHTING) sighted.add((event.data as { faunaId: string }).faunaId)
    }
    console.log('balance', JSON.stringify({ total, alive: Object.fromEntries(alive), seeded: Object.fromEntries(seeded) }))
  }, 120_000)

  it.each(SLICE_PLANTS)('%s persists and sets seed', id => {
    expect(alive.get(id) ?? 0).toBeGreaterThan(0)
    expect(seeded.get(id) ?? 0).toBeGreaterThan(0)
  })

  it.each(SLICE_ANIMALS)('draws %s within two years', id => {
    expect(sighted.has(id)).toBe(true)
  })

  it('lets no species take over', () => {
    for (const [id, count] of alive) expect(count / total, id).toBeLessThanOrEqual(0.5)
  })
})
