import { describe, expect, it } from 'vitest'
import { age, deathNote, journalEntries, type Tag } from '@/game/journal'

const NAMES: Record<string, string> = { sessile_oak: 'Sessile Oak', wild_bluebell: 'Bluebell', hybrid_x: 'Mist Bluebell' }
const nameOf = (id: string) => NAMES[id] ?? id
const tag = (label: string, speciesId: string, extra: Partial<Tag> = {}): Tag =>
  ({ label, speciesId, taggedTick: 0, reason: 'planted', seedsSet: 0, descendants: 0, ...extra })

describe('journal', () => {
  it('tells ages in days, then years', () => {
    expect([age(0.4), age(1), age(40), age(360), age(1100)]).toEqual(['1 day', '1 day', '40 days', '1 year', '3 years'])
  })

  it('lists the living with where and how they are, and the dead with how they died', () => {
    const tags = {
      ecs_1: tag('#M1', 'sessile_oak', { name: 'Old Gnarly', seedsSet: 12, descendants: 3 }),
      ecs_2: tag('#M2', 'wild_bluebell', { died: { tick: 400, cause: 'drought', ageDays: 800 } }),
      ecs_3: tag('#M3', 'hybrid_x', { reason: 'hybrid' }),
    }
    const hex = {
      x: 2, y: 3,
      species: [
        { id: 'ecs_1', ageDays: 730, age: 730, phenologyStage: 'flowering', health: 0.9 },
        { id: 'ecs_3', ageDays: 20, age: 20, phenologyStage: 'vegetative', health: 0.3, limit: 'waterlogging', genetics: { mother: 'ecs_2', father: 'ecs_9' } },
      ],
    }
    const [oak, hybrid, bluebell] = journalEntries(tags, [hex], nameOf)
    expect(oak).toMatchObject({
      label: '#M1', title: 'Old Gnarly (Sessile Oak)', origin: 'Planted by you', alive: true, chunkId: 'chunk_2_3',
      status: '2 years old at (2, 3), in flower, thriving', offspring: '12 seeds set, 3 grew',
    })
    expect(hybrid).toMatchObject({ origin: 'A hybrid seedling', status: '20 days old at (2, 3), growing, waterlogged', parents: '#M2 × an untagged plant' })
    expect(bluebell).toMatchObject({ alive: false, status: 'Died of drought at 2 years', chunkId: undefined })
  })

  it('writes a death note', () => {
    expect(deathNote(tag('#M17', 'sessile_oak'), 'Sessile Oak', 'drought', 4400)).toBe('#M17, your Sessile Oak, died of drought at 12 years.')
    expect(deathNote(tag('#M4', 'sessile_oak', { name: 'Old Gnarly', reason: 'chosen' }), 'Sessile Oak', 'old_age', 800))
      .toBe('#M4, Old Gnarly, the Sessile Oak, died of old age at 2 years.')
  })
})
