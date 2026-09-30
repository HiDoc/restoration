import { describe, expect, it } from 'vitest'
import { compare, notebookEntries, type Cross } from '@/game/notebook'

const traits = (drought: number) => ({ drought_tolerance: drought, cold_resistance: 0.5, growth_efficiency: 0.5, reproduction_vigor: 0.5, nutrient_efficiency: 0.5 })

describe('hybrid notebook', () => {
  it('places a child against its parents', () => {
    expect(compare(0.5, 0.4, 0.6)).toBe('between')
    expect(compare(0.3, 0.4, 0.6)).toBe('lower')
    expect(compare(0.7, 0.6, 0.4)).toBe('higher')
    expect(compare(0.502, 0.5, 0.5)).toBe('between')
  })

  it('compares each prediction with how the seedlings came out', () => {
    const cross: Cross = {
      tick: 10, mother: 'p1', father: 'p2', motherSpecies: 'wild_bluebell', fatherSpecies: 'spanish_bluebell',
      parents: [traits(0.4), traits(0.6)],
      prediction: { drought_tolerance: 'between', cold_resistance: 'higher' },
      seedlings: [{ id: 's1', traits: traits(0.5) }, { id: 's2', traits: traits(0.55) }, { id: 's3', traits: traits(0.7) }],
    }
    const tags = { p1: { label: '#M1', speciesId: 'wild_bluebell', taggedTick: 0, reason: 'planted' as const, seedsSet: 0, descendants: 0 } }
    const [entry] = notebookEntries([cross], tags, id => ({ wild_bluebell: 'Bluebell', spanish_bluebell: 'Spanish Bluebell' })[id]!)
    expect(entry.title).toBe('#M1 Bluebell × Spanish Bluebell')
    expect(entry.status).toBe('3 seedlings so far')
    expect(entry.rows[0]).toEqual({ name: 'Drought tolerance', predicted: 'between', outcome: '2 between, 1 higher', right: true })
    expect(entry.rows[1]).toMatchObject({ predicted: 'higher', outcome: '3 between', right: false })
    expect(entry.rows[2].right).toBeUndefined()
  })

  it('waits for seedlings', () => {
    const cross = { tick: 1, mother: 'a', father: 'b', motherSpecies: 'x', fatherSpecies: 'x', parents: [traits(0.5), traits(0.5)], prediction: {}, seedlings: [] } as Cross
    expect(notebookEntries([cross], {}, () => 'Clover')[0].status).toMatch(/^Waiting/)
  })
})
