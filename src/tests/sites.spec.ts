import { describe, expect, it } from 'vitest'
import { advance, elevationOf, siteById, SITES, STABLE, STABLE_SEASONS, STAGES, surveySite, type SiteSurvey } from '@/game/sites'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'

const targets = { cover: 0.5, plantKinds: 3, pollinatorKinds: 1, birdKinds: 1 }
const survey = (s: Partial<SiteSurvey>): SiteSurvey => ({ hexes: 4, coveredHexes: 0, plantKinds: 0, pollinatorKinds: 0, birdKinds: 0, ...s })
const thriving = survey({ coveredHexes: 2, plantKinds: 3, pollinatorKinds: 1, birdKinds: 1 })

describe('restoration sites', () => {
  it('use only real species and unlock sites that exist', () => {
    const registry = SpeciesRegistry.getInstance()
    for (const site of SITES) {
      for (const id of [...site.established, ...Object.keys(site.starterSeeds)]) expect(registry.getSpecies(id), id).toBeDefined()
      if (site.unlocks) expect(SITES.map(s => s.id)).toContain(site.unlocks)
    }
  })

  it('survey patches, plant kinds and animals by group', () => {
    const hex = (plants: string[], fauna: Record<string, number> = {}) => ({ species: new Map(plants.map((speciesId, i) => [String(i), { speciesId }])), fauna })
    expect(surveySite([
      hex(['common_grass', 'common_grass', 'white_clover'], { buff_tailed_bumblebee: 3, blackbird: 0.4 }),
      hex(['hawthorn'], { blackbird: 2 }),
    ])).toEqual({ hexes: 2, coveredHexes: 1, plantKinds: 3, pollinatorKinds: 1, birdKinds: 1 })
  })

  it('reach stages in order and keep them', () => {
    const start = { stage: 0, heldSeasons: 0 }
    // Birds without pioneers do not skip a stage.
    expect(advance(start, survey({ birdKinds: 3 }), targets, false).stage).toBe(0)
    const pollinated = advance(start, survey({ coveredHexes: 2, pollinatorKinds: 1 }), targets, false)
    expect(STAGES[pollinated.stage].title).toBe('Pollinators')
    expect(advance(pollinated, survey({}), targets, false).stage).toBe(pollinated.stage)
  })

  it('count as stable only after the whole community holds through consecutive season changes', () => {
    let progress = advance({ stage: 0, heldSeasons: 0 }, thriving, targets, false)
    expect(progress.stage).toBe(STABLE - 1)
    for (let season = 1; season < STABLE_SEASONS; season++) progress = advance(progress, thriving, targets, true)
    expect(progress).toEqual({ stage: STABLE - 1, heldSeasons: STABLE_SEASONS - 1 })
    // A lean season starts the count again; mid-season checks do not count.
    progress = advance(progress, survey({ ...thriving, birdKinds: 0 }), targets, true)
    expect(progress.heldSeasons).toBe(0)
    for (let season = 0; season < STABLE_SEASONS; season++) progress = advance(advance(progress, thriving, targets, false), thriving, targets, true)
    expect(progress.stage).toBe(STABLE)
  })

  it('shape the wetland as a basin whose floor gathers a pond from wet ground', () => {
    const hollow = siteById('wetland')!
    const height = elevationOf(hollow)!
    expect(height(0, 0)).toBeCloseTo(1)
    expect([height(2, 2), height(3, 3)]).toEqual([0, 0])
    expect(height(1, 2)).toBeGreaterThan(0)
    expect(elevationOf(siteById('meadow')!)).toBeUndefined()

    const engine = new SimulationEngine({ worldWidth: 5, worldHeight: 5, chunkSize: 32, tickRate: 10, masterSeed: 3, maxActiveChunks: 25 })
    engine.applyScenarioConditions({ biomeStates: { moisture: 0.85 }, elevation: (x, y) => Math.hypot(x - 2, y - 2) / Math.hypot(2, 2) })
    for (let day = 0; day < 60; day++) engine.update()
    const floor = engine.readChunk(2, 2)!
    expect(floor.elevation).toBe(0)
    expect(floor.biomeState.standingWater).toBeGreaterThan(0)
    expect(engine.readChunk(0, 0)!.biomeState.moisture).toBeLessThan(floor.biomeState.moisture)
  })
})
