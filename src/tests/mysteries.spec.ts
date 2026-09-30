import { describe, expect, it } from 'vitest'
import { investigate, MYSTERIES, type SiteView } from '@/game/mysteries'
import { emptyKnowledge } from '@/game/knowledge'
import { elevationOf, siteById, SITES } from '@/game/sites'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import type { Season } from '@/simulation/SpeciesRegistry'

const mystery = (id: string) => MYSTERIES.find(m => m.id === id)!
const hex = (plants: Array<[string, string, string?]>, fauna: Record<string, number> = {}) => ({
  species: plants.map(([speciesId, phenologyStage, limit]) => ({ speciesId, phenologyStage, limit })),
  fauna,
})
const view = (season: Season, ...chunks: ReturnType<typeof hex>[]): SiteView => ({ season, chunks })
const clover = Array.from({ length: 10 }, (): [string, string] => ['white_clover', 'flowering'])

describe('mysteries', () => {
  it('each belong to a site that exists, one per site', () => {
    expect(MYSTERIES.map(m => m.site).sort()).toEqual(SITES.map(s => s.id).sort())
  })

  it('notice clover without Common Blues in summer, and solve once they come', () => {
    const blues = mystery('meadow_blues')
    expect(blues.noticed(view('summer', hex(clover)))).toBe(true)
    expect(blues.noticed(view('spring', hex(clover)))).toBe(false)
    expect(blues.solved(view('summer', hex(clover, { common_blue: 2 })))).toBe(true)
  })

  it('notice a silent summer wood, and solve it when two kinds of pollinator visit', () => {
    const silence = mystery('woodland_silence')
    expect(silence.noticed(view('summer', hex([['english_oak', 'vegetative']], { blue_tit: 3 })))).toBe(true)
    expect(silence.solved(view('summer', hex([], { common_carder_bee: 2 })))).toBe(false)
    expect(silence.solved(view('summer', hex([], { common_carder_bee: 2, peacock: 1 })))).toBe(true)
  })

  it('notice barren willow catkins, and solve when a crop is mostly pollinated', () => {
    const catkins = mystery('wetland_catkins')
    const willows = (barren: number, set: number) => hex([
      ...Array.from({ length: barren }, (): [string, string, string] => ['grey_willow', 'fruiting', 'no_pollinator']),
      ...Array.from({ length: set }, (): [string, string] => ['grey_willow', 'fruiting']),
    ])
    expect(catkins.noticed(view('spring', willows(4, 1)))).toBe(true)
    expect(catkins.solved(view('spring', willows(4, 1)))).toBe(false)
    expect(catkins.solved(view('spring', willows(1, 4)))).toBe(true)
    // Too few fruiting to judge either way.
    expect(catkins.noticed(view('spring', willows(2, 0)))).toBe(false)
  })

  it('are noticed once and solved later, only for the site the player is on', () => {
    const knowledge = emptyKnowledge()
    // Clover without blues in the wood is not the meadow's mystery (and a bee keeps the wood from silence).
    expect(investigate(knowledge, 'woodland', view('summer', hex(clover, { common_carder_bee: 1 })), 5)).toEqual([])
    expect(investigate(knowledge, 'meadow', view('summer', hex(clover)), 5)).toEqual([{ kind: 'mystery', id: 'meadow_blues', solved: false }])
    expect(investigate(knowledge, 'meadow', view('summer', hex(clover)), 6)).toEqual([])
    expect(investigate(knowledge, 'meadow', view('summer', hex(clover, { common_blue: 1 })), 7)).toEqual([{ kind: 'mystery', id: 'meadow_blues', solved: true }])
    expect(knowledge.mysteries.meadow_blues).toEqual({ noticed: 5, solved: 7 })
  })

  it('in the Old Meadow as founded: the Common Blue mystery shows in the first summer and resolves by the second', () => {
    const site = siteById('meadow')!
    const { width, height, seed } = site.world
    const engine = new SimulationEngine({ worldWidth: width, worldHeight: height, chunkSize: 16, tickRate: 10, masterSeed: seed, maxActiveChunks: width * height, seasonLengthTicks: 90, timePerTickMinutes: 1440 })
    engine.applyScenarioConditions({ biomeStates: site.conditions, elevation: elevationOf(site), establishedSpecies: site.established, initialSpecies: site.established })
    const knowledge = emptyKnowledge()
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter']
    for (let day = 0; day < 720 && knowledge.mysteries.meadow_blues?.solved === undefined; day += 10) {
      engine.advance(10)
      investigate(knowledge, 'meadow', { season: seasons[Math.floor(day / 90) % 4], chunks: engine.readChunks().values() }, day)
    }
    const record = knowledge.mysteries.meadow_blues
    expect(record.noticed).toBeLessThan(180)
    expect(record.solved).toBeGreaterThan(360)
  }, 60_000)
})
