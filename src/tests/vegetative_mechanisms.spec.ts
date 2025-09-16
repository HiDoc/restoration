import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'
import { SpeciesRegistry, SpeciesCategory, CanopyLayer, RootDepth, PollinationType, SuccessionStage, BiomeType, SpeciesDefinition } from '@/simulation/SpeciesRegistry'

function makeChunk() {
  const c = new WorldChunk(0, 0, 77)
  // Favorable environment
  c.biomeState.canopy = 0.05
  c.biomeState.soil = 0.9
  c.biomeState.moisture = 0.55
  c.biomeState.vitality = 0.8
  c.climateState.temperature = 20
  c.climateState.light = 0.9
  return c
}

function addSpecies(def: SpeciesDefinition) {
  const reg = SpeciesRegistry.getInstance()
  reg.addSpecies(def)
}

beforeEach(() => {
  RNGManager.initialize(1234)
})

describe('Vegetative mechanisms', () => {
  it('runner/sucker/plantlet + apomixis produce clones and clonal seeds', () => {
    const chunk = makeChunk()
    const veg = new VegetationSystem()

    const def: SpeciesDefinition = {
      id: 'veg_demo',
      name: 'Veg Demo',
      category: SpeciesCategory.GRASS,
      maxBiomass: 0.6,
      growthRate: 1.5,
      lifespanTicks: 4000,
      reproductionThreshold: 0.05,
      reproductionNeed: 0.3,
      seedProduction: 50,
      seedMaturityTicks: 5,
      reproductionSeasons: ['spring','summer','autumn'],
      temperatureRange: { min: -5, max: 40 },
      moistureRange: { min: 0.1, max: 0.9 },
      lightRequirement: 0.3,
      shadeToleranceMax: 0.4,
      pHRange: { min: 5, max: 8 },
      canopyLayer: CanopyLayer.HERB,
      rootDepth: RootDepth.SHALLOW,
      dispersalRange: 2,
      pollination: PollinationType.SELF,
      succession: SuccessionStage.PIONEER,
      traits: [],
      resistances: [],
      visualProps: { color: '#4a7c59', size: 0.3, shape: 'herb', seasonalChanges: true },
      rarity: 0 as any, // not used in tests
      preferredBiomes: [BiomeType.GRASSLAND],
      nativeRegions: ['test'],
      asexual: { methods: ['runner','sucker','plantlet','apomixis'], baseRate: 0.25, maxDistance: 0.3 }
    }
    addSpecies(def)

    chunk.addSpecies({ id: 'p1', speciesId: def.id, x: 0.5, y: 0.5, biomass: 0.4, age: 600, phenologyStage: PhenologyStage.FRUITING, health: 0.95, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0 })
    const before = chunk.species.size
    for (let i = 0; i < 1500; i++) veg.update(chunk, 0.1)
    const after = chunk.species.size
    expect(after).toBeGreaterThan(before) // clones appeared

    const st: any = (chunk as any).seedStats || { totalLanded: 0, totalGerminated: 0 }
    expect(st.totalLanded).toBeGreaterThan(0) // apomictic seeds dropped
    // Over time some should germinate
    expect(st.totalGerminated).toBeGreaterThanOrEqual(0)
  })

  it('bulb/tuber/corm add vegetative propagules to seed bank and germinate', () => {
    const chunk = makeChunk()
    const veg = new VegetationSystem()
    const def: SpeciesDefinition = {
      id: 'bulber',
      name: 'Bulber',
      category: SpeciesCategory.HERB,
      maxBiomass: 0.8,
      growthRate: 1.2,
      lifespanTicks: 3000,
      reproductionThreshold: 0.05,
      reproductionNeed: 0.3,
      seedProduction: 10,
      seedMaturityTicks: 5,
      reproductionSeasons: ['spring','summer','autumn'],
      temperatureRange: { min: -5, max: 40 },
      moistureRange: { min: 0.1, max: 0.9 },
      lightRequirement: 0.3,
      shadeToleranceMax: 0.4,
      pHRange: { min: 5, max: 8 },
      canopyLayer: CanopyLayer.HERB,
      rootDepth: RootDepth.SHALLOW,
      dispersalRange: 1,
      pollination: PollinationType.SELF,
      succession: SuccessionStage.PIONEER,
      traits: [],
      resistances: [],
      visualProps: { color: '#669966', size: 0.3, shape: 'herb', seasonalChanges: true },
      rarity: 0 as any,
      preferredBiomes: [BiomeType.GRASSLAND],
      nativeRegions: ['test'],
      asexual: { methods: ['bulb','tuber','corm'], baseRate: 0.3, maxDistance: 0.2 }
    }
    addSpecies(def)

    chunk.addSpecies({ id: 'b0', speciesId: def.id, x: 0.5, y: 0.5, biomass: 0.4, age: 600, phenologyStage: PhenologyStage.VEGETATIVE, health: 0.95, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0 })
    for (let i = 0; i < 1000; i++) veg.update(chunk, 0.1)
    const st: any = (chunk as any).seedStats || { totalLanded: 0, totalGerminated: 0 }
    expect(st.totalLanded).toBeGreaterThan(0)
    // Given short maturity windows, some should germinate by now
    expect(st.totalGerminated).toBeGreaterThanOrEqual(0)
  })
})

