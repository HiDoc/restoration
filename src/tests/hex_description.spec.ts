import { describe, it, expect } from 'vitest'
import { describeHex, type HexState } from '@/game/hexDescription'

const INFO: Record<string, { name: string; kind: string }> = {
  grass: { name: 'Red Fescue', kind: 'grass' },
  clover: { name: 'White Clover', kind: 'herb' },
  bluebell: { name: 'Bluebell', kind: 'herb' },
  hawthorn: { name: 'Hawthorn', kind: 'shrub' },
  oak: { name: 'English Oak', kind: 'tree' },
  bee: { name: 'Buff-tailed Bumblebee', kind: 'bee' },
  blackbird: { name: 'Blackbird', kind: 'bird' },
}
const info = (id: string) => ({ ...INFO[id], animal: ['bee', 'blackbird'].includes(id) })
const hex = (plants: Array<[string, string, number]>, extra: Partial<HexState> = {}): HexState => ({
  biomeState: { moisture: 0.6, pollution: 0, canopy: 0 },
  species: plants.flatMap(([speciesId, phenologyStage, n]) => Array.from({ length: n }, () => ({ speciesId, phenologyStage }))),
  ...extra,
})

describe('describeHex', () => {
  it('names a flowering meadow after its flower and lists visitors', () => {
    const d = describeHex(hex([['grass', 'vegetative', 6], ['bluebell', 'flowering', 3]], { fauna: { bee: 4, blackbird: 0.6 } }), info)
    expect(d).toMatchObject({ habitat: 'meadow', title: 'Bluebell meadow', phrase: 'Bluebell in flower. Seen here: Buff-tailed Bumblebee.' })
    expect(d.plants.map(p => [p.name, p.count, p.activity])).toEqual([['Red Fescue', 6, 'growing'], ['Bluebell', 3, 'flowering']])
    expect(d.animals).toEqual([{ id: 'bee', name: 'Buff-tailed Bumblebee', count: 4, group: 'bee' }])
  })

  it('stays a meadow when a few shrubs stand among many herbs', () => {
    expect(describeHex(hex([['grass', 'vegetative', 11], ['clover', 'vegetative', 4], ['hawthorn', 'vegetative', 4]]), info).habitat).toBe('meadow')
  })

  it('turns scrub and woodland on woody plants, not on moisture', () => {
    expect(describeHex(hex([['hawthorn', 'fruiting', 3], ['grass', 'fruiting', 2]], { biomeState: { moisture: 0.99 } }), info)).toMatchObject({
      habitat: 'scrub', title: 'Hawthorn scrub', phrase: 'Hawthorn heavy with fruit.',
    })
    expect(describeHex(hex([['oak', 'vegetative', 3]]), info)).toMatchObject({ habitat: 'woodland', title: 'English Oak woodland', phrase: 'Green and growing.' })
  })

  it('stays a meadow when soil is merely wet, and reads seeding and winter', () => {
    expect(describeHex(hex([['grass', 'fruiting', 5]], { biomeState: { moisture: 0.99 } }), info)).toMatchObject({ habitat: 'meadow', phrase: 'Red Fescue going to seed.' })
    expect(describeHex(hex([['grass', 'dormant', 5]]), info).phrase).toBe('Resting through the cold.')
  })

  it('recognises bare ground, even when wet, and polluted ground', () => {
    expect(describeHex(hex([]), info)).toMatchObject({ habitat: 'bare', title: 'Bare ground' })
    expect(describeHex(hex([], { biomeState: { moisture: 0.98 } }), info).habitat).toBe('bare')
    expect(describeHex(hex([['grass', 'vegetative', 5]], { biomeState: { pollution: 0.8 } }), info).habitat).toBe('blighted')
  })

  it('says why a plant struggles when at least half of it does', () => {
    const plants = (limits: Array<string | undefined>) => ({
      biomeState: { moisture: 0.1 },
      species: limits.map(limit => ({ speciesId: 'bluebell', phenologyStage: 'vegetative', limit })),
    })
    expect(describeHex(plants(['drought', 'drought', undefined]), info).plants[0].limit).toBe('too dry')
    expect(describeHex(plants(['drought', undefined, undefined]), info).plants[0].limit).toBeUndefined()
  })
})
