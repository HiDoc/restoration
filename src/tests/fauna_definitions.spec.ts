import { describe, it, expect } from 'vitest'
import { buildFaunaDefinitions } from '@/simulation/faunaDefinitions'
import catalogue from '@/database/catalogue.json'

const fauna = new Map(buildFaunaDefinitions(catalogue).map(def => [def.id, def]))

describe('buildFaunaDefinitions', () => {
  it('gives butterflies their larval hosts and makes them depend on one', () => {
    expect(fauna.get('common_blue')).toMatchObject({ group: 'butterfly', needsHost: true, activeSeasons: ['spring', 'summer'] })
    expect(fauna.get('common_blue')!.hosts).toEqual(expect.arrayContaining(['white_clover', 'birds_foot_trefoil']))
  })

  it('gives every butterfly and moth a larval host that is in the catalogue', () => {
    const plants = new Set(catalogue.plants.map(plant => plant.id))
    for (const def of fauna.values()) {
      if (!def.needsHost) continue
      expect(def.hosts.length, def.id).toBeGreaterThan(0)
      for (const host of def.hosts) expect(plants.has(host), `${def.id} → ${host}`).toBe(true)
    }
  })

  it('lets bees pollinate the flowers they take nectar from', () => {
    const plants = fauna.get('buff_tailed_bumblebee')!.forage.map(link => [link.plant, link.takes, link.pollinates])
    expect(plants).toEqual(expect.arrayContaining([['white_clover', 'nectar', true], ['wild_bluebell', 'nectar', true], ['hawthorn', 'nectar', true]]))
  })

  it('reads what birds take from the plant they use', () => {
    expect(fauna.get('blackbird')!.forage).toContainEqual({ plant: 'hawthorn', strength: 0.8, takes: 'fruit', pollinates: false, disperses: true })
    expect(fauna.get('goldfinch')!.forage).toContainEqual(expect.objectContaining({ plant: 'common_grass', takes: 'seed', disperses: false }))
    expect(fauna.get('blue_tit')!.forage).toContainEqual(expect.objectContaining({ plant: 'english_oak', takes: 'insects' }))
    expect(fauna.get('robin_european')!.hosts).toContain('hawthorn')
    // A seed eater on a tree takes seed, not insects.
    expect(fauna.get('siskin')!.forage).toContainEqual(expect.objectContaining({ plant: 'alder', takes: 'seed' }))
  })

  it('keeps long-distance migrants to the breeding months', () => {
    expect(fauna.get('reed_warbler')!.activeSeasons).toEqual(['spring', 'summer'])
    expect(fauna.get('blackbird')!.activeSeasons).toHaveLength(4)
  })

  it('keeps pollination links off birds', () => {
    for (const def of fauna.values()) if (def.group === 'bird') expect(def.forage.some(link => link.pollinates)).toBe(false)
  })
})
