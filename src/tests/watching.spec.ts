import { describe, expect, it } from 'vitest'
import { animalLabel, calendar, listen, neighbours, nextHop, photograph, visibleFirsts, type WatchedHex } from '@/game/watching'
import { emptyKnowledge } from '@/game/knowledge'

const hex = (x: number, y: number, plants: Array<[string, string]>, fauna: Record<string, number> = {}): WatchedHex => {
  const list = plants.map(([speciesId, phenologyStage]) => ({ speciesId, phenologyStage }))
  return { id: `chunk_${x}_${y}`, x, y, species: { forEach: fn => list.forEach(fn) }, fauna }
}
const always = () => 0

describe('watching', () => {
  it('names an animal only as far as the player knows it', () => {
    const k = emptyKnowledge()
    expect(animalLabel('greenfinch', k)).toBe('an unfamiliar bird')
    k.heard.greenfinch = 3
    expect(animalLabel('greenfinch', k)).toBe('European Greenfinch (heard)')
    k.species.greenfinch = { firstSeen: 4, flowering: [], fruiting: [], spreads: false }
    expect(animalLabel('greenfinch', k)).toBe('European Greenfinch')
  })

  it('finds the hexes touching one on the offset map', () => {
    expect(neighbours(2, 2)).toEqual([[1, 2], [3, 2], [1, 1], [2, 1], [1, 3], [2, 3]])
    expect(neighbours(2, 1)).toEqual([[1, 1], [3, 1], [2, 0], [3, 0], [2, 2], [3, 2]])
  })

  it('hears the animals in a hex and around it, not beyond', () => {
    const hexes = [hex(2, 2, [], { greenfinch: 2 }), hex(3, 2, [], { buff_tailed_bumblebee: 4 }), hex(5, 5, [], { blackbird: 3 }), hex(1, 2, [], { common_blue: 0.5 })]
    expect(listen(hexes, { x: 2, y: 2 }).sort()).toEqual(['buff_tailed_bumblebee', 'greenfinch'])
  })

  it('catches an animal feeding when its food is on offer', () => {
    const flowering = hex(2, 2, [['white_clover', 'flowering']], { buff_tailed_bumblebee: 3 })
    expect(photograph(flowering, 'buff_tailed_bumblebee', always)).toEqual({ caption: 'nectaring on White Clover', plant: 'white_clover' })
    const resting = hex(2, 2, [['white_clover', 'vegetative']])
    expect(photograph(resting, 'buff_tailed_bumblebee', always)).toEqual({ caption: 'resting on a leaf' })
    expect(photograph(flowering, 'white_clover', always)).toEqual({ caption: 'in flower' })
  })

  it('flies a followed insect only to a touching hex with its food', () => {
    const hexes = [
      hex(2, 2, [['white_clover', 'flowering']]),
      hex(3, 2, [['white_clover', 'vegetative']]),
      hex(2, 3, [['white_clover', 'flowering']]),
      hex(4, 4, [['white_clover', 'flowering']]),
    ]
    expect(nextHop(hexes, 'buff_tailed_bumblebee', { x: 2, y: 2 }, always)).toMatchObject({ hex: { x: 2, y: 3 }, plant: 'white_clover' })
    expect(nextHop(hexes, 'buff_tailed_bumblebee', { x: 4, y: 4 }, always)).toBeUndefined()
  })

  it('lists the firsts to note, and a site calendar in words', () => {
    const k = emptyKnowledge()
    k.species.buff_tailed_bumblebee = { firstSeen: 1, flowering: [], fruiting: [], spreads: false }
    const firsts = visibleFirsts(hex(2, 2, [['white_clover', 'flowering'], ['hawthorn', 'fruiting']], { buff_tailed_bumblebee: 2, greenfinch: 2 }), k)
    expect(firsts).toEqual([
      { species: 'white_clover', phase: 'flower' },
      { species: 'hawthorn', phase: 'fruit' },
      { species: 'buff_tailed_bumblebee', phase: 'arrival' },
    ])
    const rows = calendar({ white_clover: { 0: { flower: 34, fruit: 120 }, 1: { flower: 31 } } }, () => 'White Clover')
    expect(rows).toEqual([{ species: 'white_clover', name: 'White Clover', years: ['Year 1: first flower day 31', 'Year 0: first flower day 34 · first fruit day 120'] }])
  })
})

describe('fungi', () => {
  it('shows what fruits in a hex with its hosts there, and inspecting it fills the Codex', async () => {
    const { inspectFungi } = await import('@/game/knowledge')
    const { codexEntries, codexTotals } = await import('@/game/codex')
    const { fruitingBodies } = await import('@/game/watching')
    const woods = { ...hex(1, 1, [['silver_birch', 'vegetative'], ['hazel', 'vegetative']]), fruiting: ['fly_agaric', 'candlesnuff'] }
    const bodies = fruitingBodies(woods)
    expect(bodies).toEqual([{ fungus: 'fly_agaric', hosts: ['silver_birch'] }, { fungus: 'candlesnuff', hosts: ['silver_birch', 'hazel'] }])
    const k = emptyKnowledge()
    const found = inspectFungi(k, bodies, 'autumn', 200, woods.id)
    expect(found.filter(d => d.kind === 'interaction')).toHaveLength(3)
    const agaric = codexEntries(k).find(e => e.id === 'fly_agaric')!
    expect(agaric).toMatchObject({ known: true, name: 'Fly Agaric', scientificName: 'Amanita muscaria', group: 'fungus' })
    expect(agaric.facts).toEqual([{ label: 'Fruits', known: ['autumn'], missing: 0 }])
    expect(agaric.partners.find(p => p.id === 'silver_birch')).toMatchObject({ takes: 'mycorrhiza', known: true })
    expect(codexTotals(k).fungus).toEqual({ known: 2, total: 5 })
  })
})
