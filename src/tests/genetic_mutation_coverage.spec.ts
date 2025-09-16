import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { GeneticSystem } from '@/simulation/GeneticSystem'
import { SpeciesDefinition } from '@/simulation/SpeciesRegistry'

function makeSpeciesDef(overrides: Partial<SpeciesDefinition> = {}): SpeciesDefinition {
  return {
    id: 'test_species',
    name: 'Test Species',
    category: 'grass' as any,
    maxBiomass: 1.0,
    growthRate: 1.0, // growth_efficiency base ~ 0.5
    lifespanTicks: 5000,
    reproductionThreshold: 0.1,
    reproductionNeed: 0.4,
    seedProduction: 50,
    seedMaturityTicks: 0,
    reproductionSeasons: ['spring','summer','autumn'],
    temperatureRange: { min: 5, max: 35 },
    moistureRange: { min: 0.2, max: 0.9 },
    lightRequirement: 0.4,
    shadeToleranceMax: 0.5,
    pHRange: { min: 6, max: 8 },
    canopyLayer: 'herb' as any,
    rootDepth: 'shallow' as any,
    dispersalRange: 2,
    pollination: 'self' as any,
    succession: 'pioneer' as any,
    traits: [],
    resistances: [],
    visualProps: { color: '#0f0', size: 1, shape: 'grass', seasonalChanges: false },
    rarity: 'common' as any,
    preferredBiomes: ['grassland'] as any,
    nativeRegions: ['test'],
    ...overrides,
  }
}

describe('Genetic mutation coverage', () => {
  beforeEach(() => RNGManager.initialize(2025))

  it('does not mutate parent genetics when applying mutations (deep copy)', () => {
    const gs = new GeneticSystem(RNGManager.getInstance())
    const def = makeSpeciesDef()
    const parent = gs.initializeGenetics(def)

    // Snapshot parent trait values
    const snapshot = new Map<string, number>()
    parent.traits.forEach((t, id) => snapshot.set(id, t.value))

    // Apply mutations to child
    const child = gs.applyMutations(parent, 1.0, 1).genetics

    // Parent should remain unchanged
    parent.traits.forEach((t, id) => {
      expect(t.value).toBeCloseTo(snapshot.get(id)!, 10)
    })
    // Child should be allowed to differ
    let anyDiff = false
    child.traits.forEach((t, id) => { if (Math.abs(t.value - snapshot.get(id)!) > 1e-9) anyDiff = true })
    expect(anyDiff).toBe(true)
  })

  it('higher environmental stress increases mutation count', () => {
    const gs = new GeneticSystem(RNGManager.getInstance())
    const def = makeSpeciesDef()
    const base = gs.initializeGenetics(def)

    let lowCount = 0
    let highCount = 0
    let low = base
    let high = base
    for (let i = 1; i <= 50; i++) {
      const lr = gs.applyMutations(low, 0.0, i)
      const hr = gs.applyMutations(high, 0.9, i)
      lowCount += lr.mutations.length
      highCount += hr.mutations.length
      low = lr.genetics
      high = hr.genetics
    }
    expect(highCount).toBeGreaterThan(lowCount)
  })

  it('beneficial traits trend upward under stress bias (growth_efficiency)', () => {
    const gs = new GeneticSystem(RNGManager.getInstance())
    const def = makeSpeciesDef({ growthRate: 1.0 }) // base ~0.5
    let cur = gs.initializeGenetics(def)
    const traitId = 'growth_efficiency'
    const start = cur.traits.get(traitId)!.value

    // Apply many high-stress mutation steps
    for (let i = 1; i <= 100; i++) {
      cur = gs.applyMutations(cur, 0.9, i).genetics
    }
    const end = cur.traits.get(traitId)!.value
    expect(end).toBeGreaterThanOrEqual(start)
  })
})

