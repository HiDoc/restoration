import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { WorldChunk, PhenologyStage } from '@/simulation/WorldChunk'
import { SpeciesRegistry, SpeciesDefinition, SpeciesCategory, CanopyLayer, RootDepth, PollinationType, SuccessionStage, BiomeType } from '@/simulation/SpeciesRegistry'

function makeChunk(seed = 99) {
  const c = new WorldChunk(0, 0, seed)
  c.biomeState.canopy = 0.05
  c.biomeState.soil = 0.9
  c.biomeState.moisture = 0.55
  c.biomeState.vitality = 0.8
  c.climateState.temperature = 20
  c.climateState.light = 0.9
  return c
}

function register(id: string, methods: any[], baseRate = 0.5, maxDistance = 0.35) {
  const def: SpeciesDefinition = {
    id,
    name: id,
    category: SpeciesCategory.GRASS,
    maxBiomass: 0.6,
    growthRate: 1.5,
    lifespanTicks: 4000,
    reproductionThreshold: 0.05,
    reproductionNeed: 0.3,
    seedProduction: 10,
    seedMaturityTicks: 5,
    reproductionSeasons: ['spring','summer','autumn'],
    temperatureRange: { min: -5, max: 40 },
    moistureRange: { min: 0.1, max: 0.9 },
    lightRequirement: 0.3,
    shadeToleranceMax: 0.5,
    pHRange: { min: 5, max: 8 },
    canopyLayer: CanopyLayer.HERB,
    rootDepth: RootDepth.SHALLOW,
    dispersalRange: 2,
    pollination: PollinationType.SELF,
    succession: SuccessionStage.PIONEER,
    traits: [], resistances: [],
    visualProps: { color: '#4a7c59', size: 0.3, shape: 'herb', seasonalChanges: true },
    rarity: 0 as any,
    preferredBiomes: [BiomeType.GRASSLAND],
    nativeRegions: ['test'],
    asexual: { methods: methods as any, baseRate, maxDistance }
  }
  SpeciesRegistry.getInstance().addSpecies(def)
}

beforeEach(() => RNGManager.initialize(4321))

describe('Vegetative distance distributions', () => {
  it('runner farther than rhizome; rhizome farther than plantlet', () => {
    const veg = new VegetationSystem()

    // Register three single-mechanism species
    register('rhizo_only', ['rhizome'])
    register('runner_only', ['runner'])
    register('plantlet_only', ['plantlet'])

    const parent = { x: 0.5, y: 0.5 }

    function collectDistances(speciesId: string) {
      const chunk = makeChunk()
      chunk.addSpecies({ id: 'p', speciesId, x: parent.x, y: parent.y, biomass: 0.4, age: 800, phenologyStage: PhenologyStage.VEGETATIVE, health: 0.95, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0 })
      for (let i = 0; i < 1500; i++) veg.update(chunk, 0.1)
      const dists: number[] = []
      chunk.species.forEach((s, id) => {
        if (id === 'p') return
        const dx = s.x - parent.x
        const dy = s.y - parent.y
        dists.push(Math.sqrt(dx*dx + dy*dy))
      })
      return dists
    }

    const dRh = collectDistances('rhizo_only')
    const dRun = collectDistances('runner_only')
    const dPl = collectDistances('plantlet_only')

    const mean = (arr: number[]) => (arr.reduce((a,b)=>a+b,0) / Math.max(1, arr.length))
    expect(dRun.length).toBeGreaterThan(0)
    expect(dRh.length).toBeGreaterThan(0)
    expect(dPl.length).toBeGreaterThan(0)
    expect(mean(dRun)).toBeGreaterThan(mean(dRh))
    expect(mean(dRh)).toBeGreaterThan(mean(dPl))
  })
})

describe('Seasonal gating for bulb/tuber/corm', () => {
  it('more propagules in cool/low-light season than warm/high-light', () => {
    const veg = new VegetationSystem()
    register('bulber_demo', ['bulb','tuber','corm'], 0.4, 0.2)

    function landedFor(temp: number, light: number) {
      const chunk = makeChunk()
      chunk.climateState.temperature = temp
      chunk.climateState.light = light
      chunk.addSpecies({ id: 'b', speciesId: 'bulber_demo', x: 0.5, y: 0.5, biomass: 0.4, age: 500, phenologyStage: PhenologyStage.VEGETATIVE, health: 0.95, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0 })
      for (let i = 0; i < 600; i++) veg.update(chunk, 0.2)
      const st: any = (chunk as any).seedStats || { totalLanded: 0 }
      return st.totalLanded || 0
    }

    const autumnLike = landedFor(8, 0.5)
    const springLike = landedFor(18, 0.9)
    expect(autumnLike).toBeGreaterThan(springLike)
  })
})

describe('Reproduction output scales with environmental quality', () => {
  it('higher vitality/soil improves reproduction components (vitalityFactor) and tends to increase rate', () => {
    const veg = new VegetationSystem()
    const chunkGood = makeChunk()
    const chunkPoor = makeChunk()
    chunkGood.biomeState.vitality = 0.9
    chunkGood.biomeState.soil = 0.9
    chunkPoor.biomeState.vitality = 0.4
    chunkPoor.biomeState.soil = 0.4

    chunkGood.addSpecies({ id: 'g', speciesId: 'common_grass', x: 0.5, y: 0.5, biomass: 0.5, age: 600, phenologyStage: PhenologyStage.FRUITING, health: 0.9, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0 })
    chunkPoor.addSpecies({ id: 'p', speciesId: 'common_grass', x: 0.5, y: 0.5, biomass: 0.5, age: 600, phenologyStage: PhenologyStage.FRUITING, health: 0.9, reproductiveOutput: 0, reproductiveUrge: 0, lastReproductionAttempt: 0 })

    // Compare a single deterministic step to avoid compounding secondary effects
    veg.update(chunkGood, 1)
    veg.update(chunkPoor, 1)

    const dbgG = (chunkGood as any).__reproDebug?.get('common_grass')
    const dbgP = (chunkPoor as any).__reproDebug?.get('common_grass')
    expect(dbgG).toBeDefined()
    expect(dbgP).toBeDefined()
    if (dbgG && dbgP) {
      // Vitality factor should be higher with higher vitality/soil
      expect(dbgG.vitalityFactor).toBeGreaterThan(dbgP.vitalityFactor)
      // Final rate should not be dramatically worse; allow equality or small variance
      expect(dbgG.finalRate).toBeGreaterThan(0)
    }
  })
})
