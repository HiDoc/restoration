import { describe, it, expect, beforeAll } from 'vitest'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { EventType } from '@/simulation/EventJournal'
import { elevationOf, siteById } from '@/game/sites'

// Every site as founded: each established plant must hold its own for two game years and set seed, the
// site must draw animals, and no plant may take over.
const YEARS = 2
const SITE_ANIMALS: Record<string, string[]> = {
  meadow: ['buff_tailed_bumblebee', 'common_blue', 'blackbird'],
  woodland: ['blue_tit', 'jay'],
  wetland: ['tawny_mining_bee', 'reed_warbler', 'reed_bunting'],
}

describe.each(Object.keys(SITE_ANIMALS))('%s site balance', siteId => {
  const site = siteById(siteId)!
  const alive = new Map<string, number>()
  const seeded = new Map<string, number>()
  const sighted = new Set<string>()
  let total = 0

  beforeAll(() => {
    const { width, height, seed } = site.world
    const engine = new SimulationEngine({
      worldWidth: width, worldHeight: height, chunkSize: 16, tickRate: 10, masterSeed: seed,
      maxActiveChunks: width * height, seasonLengthTicks: 90, timePerTickMinutes: 1440,
    })
    engine.applyScenarioConditions({ biomeStates: site.conditions, elevation: elevationOf(site), establishedSpecies: site.established, initialSpecies: site.established })
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
    console.log(`balance ${siteId}`, JSON.stringify({ total, alive: Object.fromEntries(alive), seeded: Object.fromEntries(seeded), sighted: [...sighted] }))
  }, 120_000)

  it.each(site.established)('%s persists and sets seed', id => {
    expect(alive.get(id) ?? 0).toBeGreaterThan(0)
    expect(seeded.get(id) ?? 0).toBeGreaterThan(0)
  })

  it.each(SITE_ANIMALS[siteId])('draws %s within two years', id => {
    expect(sighted.has(id)).toBe(true)
  })

  it('lets no species take over', () => {
    for (const [id, count] of alive) expect(count / total, id).toBeLessThanOrEqual(0.5)
  })
})
