import { describe, expect, it } from 'vitest'
import { commonGardens, journalEntries, type Tag } from '@/game/journal'
import { pouchOptions } from '@/game/seeds'

const names: Record<string, string> = { white_clover: 'White Clover', meadow: 'The Old Meadow', wetland: 'Wet Hollow' }
const nameOf = (id: string) => names[id] ?? id
const tag = (label: string, origin: string | undefined, extra: Partial<Tag> = {}): Tag =>
  ({ label, speciesId: 'white_clover', taggedTick: 0, reason: 'planted', seedsSet: 0, descendants: 0, hex: 'chunk_3_3', origin, ...extra })
const hexOf = (plants: Array<{ id: string; health: number; biomass: number; phenologyStage: string }>) =>
  ({ x: 3, y: 3, species: { forEach: (fn: (p: any) => void) => plants.forEach(p => fn({ ...p, age: 30, speciesId: 'white_clover' })) } })

describe('common garden', () => {
  it('splits the pouch by where seed was set only when a species holds seed from several sites', () => {
    expect(pouchOptions({ white_clover: { meadow: 2, '': 3 }, yarrow: { '': 1 } }, nameOf, nameOf)).toEqual([
      { key: 'white_clover|meadow', speciesId: 'white_clover', origin: 'meadow', label: 'White Clover, from The Old Meadow × 2' },
      { key: 'white_clover|', speciesId: 'white_clover', origin: '', label: 'White Clover, packet seed × 3' },
      { key: 'yarrow', speciesId: 'yarrow', label: 'yarrow × 1' },
    ])
  })

  it('compares plants of one species from different sites side by side', () => {
    const tags = {
      a: tag('#M1', 'meadow', { seedsSet: 2 }),
      b: tag('#M2', 'meadow'),
      c: tag('#M3', 'wetland', { died: { tick: 40, cause: 'drought', ageDays: 40 } }),
      d: tag('#M4', 'wetland'),
      e: tag('#M5', undefined, { hex: 'chunk_1_1' }),
    }
    const chunks = [hexOf([
      { id: 'a', health: 0.9, biomass: 0.4, phenologyStage: 'flowering' },
      { id: 'b', health: 0.8, biomass: 0.2, phenologyStage: 'vegetative' },
      { id: 'd', health: 0.3, biomass: 0.1, phenologyStage: 'vegetative' },
    ])]
    const [garden, ...others] = commonGardens(tags, chunks, nameOf, nameOf)
    expect(others).toEqual([])
    expect(garden.species).toBe('White Clover')
    expect(garden.rows).toEqual([
      { provenance: 'The Old Meadow', planted: 2, alive: 2, health: 'thriving', size: '30%', flowering: 1, seedsSet: 2, deaths: 'none' },
      { provenance: 'Wet Hollow', planted: 2, alive: 1, health: 'failing', size: '10%', flowering: 0, seedsSet: 0, deaths: '1 of drought' },
    ])
    expect(garden.note).toMatch(/inherited\. With fewer than three/)
    expect(journalEntries(tags, chunks, nameOf, nameOf)[0].origin).toBe('Planted by you, seed from The Old Meadow')
  })
})
