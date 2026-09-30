import { describe, it, expect } from 'vitest'
import { SpeciesRegistry, SpeciesCategory, SpeciesRarity, BiomeType } from '@/simulation/SpeciesRegistry'

describe('SpeciesRegistry', () => {
  it('holds the catalogue plants with their real traits', () => {
    const reg = SpeciesRegistry.getInstance()
    const ids = reg.getAllSpecies().map(s => s.id)
    expect(ids).toEqual(expect.arrayContaining(['common_grass', 'white_clover', 'wild_bluebell', 'hawthorn', 'english_oak', 'moss_cushion']))

    const moss = reg.getSpecies('moss_cushion')!
    expect(moss.moistureRange.min).toBeGreaterThanOrEqual(0.6)
    expect(moss.shadeToleranceMax).toBeGreaterThanOrEqual(0.8)
    expect(moss.category).toBe(SpeciesCategory.MOSS)
    expect(reg.getSpecies('white_clover')?.ecology?.nitrogenFixation).toBe(true)
  })

  it('indexes by rarity/biome/category', () => {
    const reg = SpeciesRegistry.getInstance()
    expect(reg.getSpeciesByRarity(SpeciesRarity.RARE).map(s => s.id)).toContain('scots_pine')

    const temperate = reg.getSpeciesByBiome(BiomeType.TEMPERATE_FOREST).map(s => s.id)
    expect(temperate).toEqual(expect.arrayContaining(['english_oak', 'wild_bluebell']))
    expect(reg.getSpeciesByBiome(BiomeType.BOREAL_FOREST).map(s => s.id)).toEqual(['scots_pine'])

    const trees = reg.getSpeciesByCategory(SpeciesCategory.TREE).map(s => s.id)
    expect(trees).toEqual(expect.arrayContaining(['silver_birch', 'english_oak']))

  })

  it('registers an engine-bred hybrid under an invented name and the botanical formula', () => {
    const reg = SpeciesRegistry.getInstance()
    reg.addHybrid({ id: 'hybrid_spanish_bluebell__wild_bluebell', hybridOf: ['spanish_bluebell', 'wild_bluebell'], maxBiomass: 0.65 })
    const hybrid = reg.getSpecies('hybrid_spanish_bluebell__wild_bluebell')!
    expect(hybrid.name).toMatch(/ Bluebell$/)
    expect(hybrid.scientificName).toBe('Hyacinthoides hispanica × Hyacinthoides non-scripta')
    expect(hybrid.maxBiomass).toBe(0.65)
    expect(hybrid.genus).toBe('Hyacinthoides')
  })
})
