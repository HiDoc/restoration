import { describe, expect, it } from 'vitest'
import type { SimulationEvent } from '@/simulation/EventJournal'
import { explainShift } from '@/game/shift'

const die = (tick: number, speciesId: string, cause: string, chunkId: string) =>
  ({ id: `${tick}${speciesId}`, tick, type: 'species_die', data: { speciesId, cause }, chunkId }) as unknown as SimulationEvent
const NAMES: Record<string, string> = { grass: 'Red Fescue', bluebell: 'Bluebell' }

describe('explainShift', () => {
  it('groups recent deaths by cause, the heaviest first, each with its worst hex', () => {
    const causes = explainShift([
      die(5, 'grass', 'pollution', 'chunk_0_0'),
      die(20, 'grass', 'drought', 'chunk_1_1'),
      die(21, 'bluebell', 'drought', 'chunk_1_1'),
      die(22, 'grass', 'drought', 'chunk_2_2'),
      die(23, 'bluebell', 'crowding', 'chunk_2_2'),
    ], 10, id => NAMES[id])
    expect(causes).toEqual([
      { text: 'Drought took 3 plants: Red Fescue and Bluebell.', plants: 3, chunkId: 'chunk_1_1' },
      { text: 'Crowding took 1 plant: Bluebell.', plants: 1, chunkId: 'chunk_2_2' },
    ])
  })
})
