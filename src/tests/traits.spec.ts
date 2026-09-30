import { describe, expect, it } from 'vitest'
import { adaptation, BINS, mean, ripeness, spread, traitWords } from '@/game/traits'

describe('traits in words', () => {
  it('names only traits well away from the ordinary', () => {
    expect(traitWords({ drought_tolerance: 0.72, cold_resistance: 0.45, growth_efficiency: 0.3 })).toEqual(['hardy in drought', 'slow-growing'])
    expect(traitWords()).toEqual([])
  })

  it('says how ripe seed is', () => {
    expect(ripeness(0.15)).toBe('barely ripe, seed often fails')
    expect(ripeness(0.9)).toBe('fully ripe')
  })
})

describe('adaptation', () => {
  it('bins trait values over [0, 1]', () => {
    expect(spread([0, 0.05, 0.55, 1])).toEqual([2, 0, 0, 0, 0, 1, 0, 0, 0, 1])
    expect(mean(spread([0.55, 0.55]))).toBeCloseTo(0.55)
  })

  it('reports the direction a trait has moved since the baseline', () => {
    const then = spread([0.45, 0.5, 0.55])
    const rows = adaptation({ tick: 1, traits: { drought_tolerance: then, cold_resistance: then } }, [
      { drought_tolerance: 0.65, cold_resistance: 0.45 },
      { drought_tolerance: 0.6, cold_resistance: 0.5 },
      { drought_tolerance: 0.6, cold_resistance: 0.55 },
    ])
    const row = (trait: string) => rows.find(r => r.trait === trait)!
    expect(row('drought_tolerance').words).toBe('shifted towards hardy in drought')
    expect(row('drought_tolerance').now).toHaveLength(BINS)
    expect(row('cold_resistance').words).toBeUndefined()
  })
})
