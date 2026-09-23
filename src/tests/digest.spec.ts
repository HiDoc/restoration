import { describe, it, expect } from 'vitest'
import { buildDigest, type DigestInput } from '@/game/digest'
import type { SimulationEvent } from '@/simulation/EventJournal'

const names: Record<string, string> = { white_clover: 'White Clover', hawthorn: 'Hawthorn', wild_bluebell: 'Bluebell', scots_pine: 'Scots Pine' }
const event = (type: string, data: Record<string, unknown>, chunkId = 'chunk_1_1'): SimulationEvent =>
  ({ tick: 1, timestamp: 0, type, data, chunkId }) as SimulationEvent

function digest(overrides: Partial<DigestInput>) {
  return buildDigest({
    events: [],
    seasonBefore: 'spring',
    seasonAfter: 'spring',
    populationBefore: new Map(),
    populationAfter: new Map(),
    nameOf: id => names[id] ?? id,
    ...overrides,
  })
}

describe('buildDigest', () => {
  it('is empty when nothing notable happened', () => {
    expect(digest({ populationBefore: new Map([['hawthorn', 10]]), populationAfter: new Map([['hawthorn', 11]]) })).toEqual([])
  })

  it('announces the season change first', () => {
    expect(digest({ seasonAfter: 'summer' })[0]).toEqual({ icon: 'season', text: 'Spring gave way to summer.' })
  })

  it('counts distinct hexes where a species flowered or set seed', () => {
    const lines = digest({
      events: [
        event('flowering_started', { speciesId: 'white_clover' }, 'chunk_1_1'),
        event('flowering_started', { speciesId: 'white_clover' }, 'chunk_2_1'),
        event('flowering_started', { speciesId: 'white_clover' }, 'chunk_2_1'),
        event('seeds_ripe', { speciesId: 'hawthorn' }, 'chunk_3_3'),
      ],
    })
    expect(lines).toEqual([
      { icon: 'flower', text: 'White Clover came into flower in 2 hexes.', chunkId: 'chunk_1_1' },
      { icon: 'seed', text: 'Hawthorn set seed in 1 hex.', chunkId: 'chunk_3_3' },
    ])
  })

  it('reports losses, spread and decline with the main cause', () => {
    const lines = digest({
      events: [
        event('species_die', { speciesId: 'scots_pine', cause: 'drought' }, 'chunk_4_4'),
        event('species_die', { speciesId: 'wild_bluebell', cause: 'drought' }, 'chunk_1_2'),
        event('species_die', { speciesId: 'wild_bluebell', cause: 'drought' }, 'chunk_1_3'),
        event('species_die', { speciesId: 'wild_bluebell', cause: 'natural_aging' }, 'chunk_1_4'),
        event('species_spawn', { speciesId: 'white_clover' }, 'chunk_5_5'),
      ],
      populationBefore: new Map([['scots_pine', 2], ['wild_bluebell', 20], ['white_clover', 10]]),
      populationAfter: new Map([['wild_bluebell', 12], ['white_clover', 18]]),
    })
    expect(lines).toEqual([
      { icon: 'lost', text: 'Scots Pine has disappeared.', chunkId: 'chunk_4_4' },
      { icon: 'decline', text: 'Bluebell declined: 20 → 12 plants, mostly from drought.', chunkId: 'chunk_1_4' },
      { icon: 'spread', text: 'White Clover spread: 10 → 18 plants.', chunkId: 'chunk_5_5' },
    ])
  })

  it('mentions each kind of weather once', () => {
    const lines = digest({ events: [event('weather_change', { type: 'drought' }), event('weather_change', { type: 'drought' }), event('weather_change', { type: 'storm' })] })
    expect(lines.map(line => line.text)).toEqual(['A drought dried out part of the land.', 'A storm passed through.'])
  })
})
