import { describe, it, expect } from 'vitest'
import { emptyKnowledge, learn, see, pairKey } from '@/game/knowledge'
import { codexEntries, codexTotals, knowledgeSummary } from '@/game/codex'
import type { SimulationEvent } from '@/simulation/EventJournal'
import type { Season } from '@/simulation/SpeciesRegistry'

const event = (type: string, data: Record<string, unknown>, tick = 10, chunkId = 'chunk_2_2') =>
  ({ tick, timestamp: 0, type, data, chunkId }) as SimulationEvent
const seasonOf = (tick: number): Season => (['spring', 'summer', 'autumn', 'winter'] as const)[Math.floor(tick / 90) % 4]
const entry = (k: ReturnType<typeof emptyKnowledge>, id: string) => codexEntries(k).find(e => e.id === id)!

describe('knowledge', () => {
  it('knows plants on the map once, and reports only the first time', () => {
    const k = emptyKnowledge()
    expect(see(k, ['white_clover', 'hawthorn'], 0)).toEqual([{ kind: 'species', id: 'white_clover' }, { kind: 'species', id: 'hawthorn' }])
    expect(see(k, ['white_clover'], 5)).toEqual([])
    expect(k.species.white_clover.firstSeen).toBe(0)
  })

  it('learns seasons, spreading and interactions from witnessed events', () => {
    const k = emptyKnowledge()
    const found = learn(k, [
      event('flowering_started', { speciesId: 'white_clover' }, 20),
      event('seeds_ripe', { speciesId: 'white_clover' }, 120),
      event('species_spawn', { speciesId: 'white_clover', source: 'clonal' }),
      event('species_spawn', { speciesId: 'hawthorn', source: 'germination' }),
      event('first_sighting', { faunaId: 'buff_tailed_bumblebee' }),
      event('interaction_observed', { faunaId: 'buff_tailed_bumblebee', plantId: 'white_clover' }),
      event('interaction_observed', { faunaId: 'buff_tailed_bumblebee', plantId: 'white_clover' }),
    ], seasonOf)
    expect(k.species.white_clover).toMatchObject({ flowering: ['spring'], fruiting: ['summer'], spreads: true })
    expect(k.species.hawthorn).toBeUndefined() // a seedling alone is not a sighting of the species' habits
    expect(found.map(d => d.kind)).toEqual(['species', 'species', 'interaction'])
    expect(k.interactions[pairKey('buff_tailed_bumblebee', 'white_clover')]).toMatchObject({ firstSeen: 10, chunkId: 'chunk_2_2' })
  })
})

describe('codex', () => {
  it('sets what was seen against the catalogue, leaving the rest as ?', () => {
    const k = emptyKnowledge()
    see(k, ['white_clover'], 0)
    learn(k, [event('flowering_started', { speciesId: 'white_clover' }, 20)], seasonOf)
    const clover = entry(k, 'white_clover')
    expect(clover).toMatchObject({ known: true, name: 'White Clover', scientificName: 'Trifolium repens', group: 'plant' })
    expect(clover.facts).toEqual([
      { label: 'Flowers', known: ['spring'], missing: 1 },
      { label: 'Fruits', known: [], missing: 2 },
      { label: 'Spreads without seed', known: [], missing: 1 },
    ])
    expect(clover.partners.map(p => p.id)).toEqual(expect.arrayContaining(['buff_tailed_bumblebee', 'common_blue', 'marmalade_hoverfly']))
    expect(clover.partners.every(p => !p.known)).toBe(true)
    expect(clover.progress).toBeGreaterThan(0)
    expect(clover.progress).toBeLessThan(1)
  })

  it('counts each section and summarises for goals', () => {
    const k = emptyKnowledge()
    learn(k, [event('interaction_observed', { faunaId: 'goldfinch', plantId: 'common_grass' })], seasonOf)
    const totals = codexTotals(k)
    expect(totals.plant).toEqual({ known: 1, total: 16 })
    expect(totals.bird).toEqual({ known: 1, total: 12 })
    expect(totals.pollinator).toEqual({ known: 0, total: 4 })
    expect(totals.interaction.known).toBe(1)
    // The Goldfinch's only catalogue link is Red Fescue seed, so seeing it completes the Goldfinch's entry.
    expect(knowledgeSummary(k)).toEqual({ knownSpecies: 2, completeEntries: 1, interactions: 1 })
  })

  it('marks an entry complete once every fact and partner has been seen', () => {
    const k = emptyKnowledge()
    const hoverfly = entry(k, 'marmalade_hoverfly')
    learn(k, hoverfly.partners.map(p => event('interaction_observed', { faunaId: 'marmalade_hoverfly', plantId: p.id })), seasonOf)
    expect(entry(k, 'marmalade_hoverfly').progress).toBe(1)
    expect(knowledgeSummary(k).completeEntries).toBeGreaterThanOrEqual(1)
  })
})
