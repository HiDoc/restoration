import { describe, it, expect } from 'vitest'
import { buildCatalogue } from '@/database/buildCatalogue'
import catalogue from '@/database/catalogue.json'

describe('species catalogue', () => {
  it('matches the SQLite seed data (run `npm run build:catalogue` after editing the SQL)', async () => {
    expect(JSON.parse(JSON.stringify(await buildCatalogue()))).toEqual(catalogue)
  })

  it('only links species that exist, with the plant always on side a', () => {
    const ids = {
      vegetal: new Set(catalogue.plants.map(p => p.id)),
      bird: new Set(catalogue.birds.map(b => b.id)),
      pollinator: new Set(catalogue.pollinators.map(p => p.id)),
      fungus: new Set(catalogue.fungi.map(f => f.id)),
    }
    for (const link of catalogue.interactions) {
      expect(link.species_a_type, `${link.species_a_id} → ${link.species_b_id}`).toBe('vegetal')
      expect(ids.vegetal.has(link.species_a_id), link.species_a_id).toBe(true)
      expect(ids[link.species_b_type as keyof typeof ids].has(link.species_b_id), link.species_b_id).toBe(true)
    }
  })

  it('gives every fungus a host, matching how it lives', () => {
    const link = { mycorrhizal: 'mycorrhiza', parasite: 'parasitism', saprotroph: 'decomposition' } as const
    for (const fungus of catalogue.fungi) {
      const hosts = catalogue.interactions.filter(l => l.species_b_id === fungus.id)
      expect(hosts.length, fungus.id).toBeGreaterThan(0)
      expect(hosts.every(l => l.interaction_type === link[fungus.lifestyle as keyof typeof link]), fungus.id).toBe(true)
    }
  })

  it('gives every pollinator something to feed on', () => {
    const fed = new Set(catalogue.interactions.filter(l => l.interaction_type === 'pollination').map(l => l.species_b_id))
    expect(catalogue.pollinators.filter(p => !fed.has(p.id)).map(p => p.id)).toEqual([])
  })

  it('reads flowering seasons, including ranges', () => {
    const clover = catalogue.plants.find(p => p.id === 'white_clover')
    expect(clover?.ecology).toMatchObject({ floweringSeasons: ['spring', 'summer'], nitrogenFixation: true })
    expect(catalogue.plants.find(p => p.id === 'bracken_fern')?.ecology?.floweringSeasons).toEqual([])
  })
})
