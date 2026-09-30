import { describe, it, expect } from 'vitest'
import { emptyKnowledge, hear, keepPhoto, learn, notePhase, see, sight, pairKey, witness, ALBUM } from '@/game/knowledge'
import { codexEntries, codexTotals, knowledgeSummary } from '@/game/codex'
import type { SimulationEvent } from '@/simulation/EventJournal'
import type { Season } from '@/simulation/SpeciesRegistry'
import catalogue from '@/database/catalogue.json'

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

  it('learns seasons and spreading from events, but neither interactions nor birds', () => {
    const k = emptyKnowledge()
    const found = learn(k, [
      event('flowering_started', { speciesId: 'white_clover' }, 20),
      event('seeds_ripe', { speciesId: 'white_clover' }, 120),
      event('species_spawn', { speciesId: 'white_clover', source: 'clonal' }),
      event('species_spawn', { speciesId: 'hawthorn', source: 'germination' }),
      event('first_sighting', { faunaId: 'buff_tailed_bumblebee' }),
      event('first_sighting', { faunaId: 'greenfinch' }),
      event('interaction_observed', { faunaId: 'buff_tailed_bumblebee', plantId: 'white_clover' }),
    ], seasonOf)
    expect(k.species.white_clover).toMatchObject({ flowering: ['spring'], fruiting: ['summer'], spreads: true })
    expect(k.species.hawthorn).toBeUndefined() // a seedling alone is not a sighting of the species' habits
    expect(found.map(d => d.kind)).toEqual(['species', 'species'])
    expect(k.species.greenfinch).toBeUndefined() // birds keep out of sight
    expect(k.interactions).toEqual({})
  })

  it('learns by watching: witnessed feeding, sounds, photos and calendar notes', () => {
    const k = emptyKnowledge()
    expect(hear(k, ['greenfinch', 'buff_tailed_bumblebee'], 3)).toEqual([{ kind: 'heard', id: 'greenfinch' }, { kind: 'heard', id: 'buff_tailed_bumblebee' }])
    expect(hear(k, ['greenfinch'], 4)).toEqual([])
    expect(sight(k, 'greenfinch', 5).map(d => d.kind)).toEqual(['species'])
    expect(entry(k, 'greenfinch')).toMatchObject({ known: true, heard: false })
    expect(entry(k, 'buff_tailed_bumblebee')).toMatchObject({ known: false, heard: true })
    expect(witness(k, 'greenfinch', 'common_grass', 6, 'chunk_1_1').map(d => d.kind)).toEqual(['species', 'interaction'])
    expect(witness(k, 'greenfinch', 'common_grass', 7)).toEqual([])
    expect(k.interactions[pairKey('greenfinch', 'common_grass')]).toMatchObject({ firstSeen: 6, chunkId: 'chunk_1_1' })

    for (let i = 0; i < ALBUM + 2; i++) keepPhoto(k, { subject: 'greenfinch', caption: 'perched', habitat: 'meadow', site: 'meadow', tick: i, when: '' })
    expect(k.photos).toHaveLength(ALBUM)
    expect(k.photos[0].tick).toBe(2)

    expect(notePhase(k, 'meadow', 'white_clover', 0, 'flower', 34)).toBe(true)
    expect(notePhase(k, 'meadow', 'white_clover', 0, 'flower', 40)).toBe(false)
    expect(notePhase(k, 'meadow', 'white_clover', 1, 'flower', 31)).toBe(true)
    expect(k.phenology.meadow.white_clover).toEqual({ 0: { flower: 34 }, 1: { flower: 31 } })
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
    witness(k, 'greenfinch', 'common_grass', 10)
    const totals = codexTotals(k)
    expect(totals.plant).toEqual({ known: 1, total: catalogue.plants.length })
    expect(totals.bird).toEqual({ known: 1, total: catalogue.birds.length })
    expect(totals.pollinator).toEqual({ known: 0, total: catalogue.pollinators.length })
    expect(totals.interaction.known).toBe(1)
    // The Greenfinch's only catalogue link is Red Fescue seed, so seeing it completes the Greenfinch's entry.
    expect(knowledgeSummary(k)).toEqual({ knownSpecies: 2, completeEntries: 1, interactions: 1, noted: 0 })
  })

  it('marks an entry complete once every fact and partner has been seen', () => {
    const k = emptyKnowledge()
    const hoverfly = entry(k, 'marmalade_hoverfly')
    hoverfly.partners.forEach(p => witness(k, 'marmalade_hoverfly', p.id, 10))
    expect(entry(k, 'marmalade_hoverfly').progress).toBeLessThan(1) // where it keeps to is still unknown
    k.species.marmalade_hoverfly.habitat = 'meadow'
    expect(entry(k, 'marmalade_hoverfly').progress).toBe(1)
    expect(knowledgeSummary(k).completeEntries).toBeGreaterThanOrEqual(1)
  })
})
