import { describe, it, expect } from 'vitest'
import { SpeciesRegistry, SpeciesCategory, SpeciesRarity, BiomeType } from '@/simulation/SpeciesRegistry'

describe('SpeciesRegistry finite ontology and hybrids', () => {
  it('contains the 5 base species with expected traits', () => {
    const reg = SpeciesRegistry.getInstance()
    const ids = reg.getAllSpecies().map(s => s.id)
    ;['common_grass','silver_birch','shadow_moss','crimson_oak','healing_fern'].forEach(id => {
      expect(ids).toContain(id)
    })

    const moss = reg.getSpecies('shadow_moss')!
    expect(moss.moistureRange.min).toBeGreaterThanOrEqual(0.6)
    expect(moss.shadeToleranceMax).toBeGreaterThanOrEqual(0.8)
    expect(moss.category).toBe(SpeciesCategory.MOSS)
  })

  it('indexes by rarity/biome/category and finds compatible hybrids', () => {
    const reg = SpeciesRegistry.getInstance()
    const rares = reg.getSpeciesByRarity(SpeciesRarity.RARE)
    expect(rares.some(s => s.id === 'crimson_oak')).toBe(true)

    const temperate = reg.getSpeciesByBiome(BiomeType.TEMPERATE_FOREST).map(s => s.id)
    expect(temperate).toContain('silver_birch')

    const trees = reg.getSpeciesByCategory(SpeciesCategory.TREE).map(s => s.id)
    expect(trees).toEqual(expect.arrayContaining(['silver_birch','crimson_oak']))

    const hybrids = reg.findCompatibleHybrids('shadow_moss','healing_fern').map(h => h.id)
    expect(hybrids).toContain('purifier_moss')
  })

  it('validates hybrid unlock and environmental requirements', () => {
    const reg = SpeciesRegistry.getInstance()
    const needed = ['discover_moonwater','mature_healing_fern','polluted_area_restoration']

    // Fails without unlocks
    expect(
      reg.canCreateHybrid('purifier_moss', 18, 0.9, BiomeType.TEMPERATE_FOREST, 'spring', [])
    ).toBe(false)

    // Succeeds with unlocks and required season/moisture
    expect(
      reg.canCreateHybrid('purifier_moss', 18, 0.9, BiomeType.TEMPERATE_FOREST, 'spring', needed)
    ).toBe(true)

    // Fails if season mismatch
    expect(
      reg.canCreateHybrid('purifier_moss', 18, 0.9, BiomeType.TEMPERATE_FOREST, 'winter', needed)
    ).toBe(false)
  })
})

