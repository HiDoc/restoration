import { describe, it, expect } from 'vitest'
import { EventJournal, EventType } from '@/simulation/EventJournal'

describe('EventJournal', () => {
  it('records, filters, and validates events', () => {
    const journal = new EventJournal()
    expect(journal.getCurrentTick()).toBe(0)
    journal.recordEvent(EventType.SIM_START, { a: 1 })
    journal.advanceTick()
    journal.recordEvent(EventType.PLAYER_PLANT, { x: 1, y: 2 }, 'chunk_0_0', 'p1')
    journal.recordEvent(EventType.WEATHER_CHANGE, { cloudy: true })
    journal.advanceTick()

    const all = journal.getAllEvents()
    expect(all.length).toBeGreaterThanOrEqual(4)

    const tick1 = journal.getEventsForTicks(1, 1)
    expect(tick1.some(e => e.type === EventType.TICK_ADVANCE)).toBe(true)

    const chunkEvents = journal.getEventsForChunk('chunk_0_0')
    expect(chunkEvents.every(e => e.chunkId === 'chunk_0_0')).toBe(true)

    const playerEvents = journal.getPlayerEvents('p1')
    expect(playerEvents.length).toBe(1)
    expect(playerEvents[0].type).toBe(EventType.PLAYER_PLANT)

    const stats = journal.getStatistics()
    expect(stats.totalEvents).toBe(all.length)
    expect(stats.eventsByType[EventType.PLAYER_PLANT]).toBe(1)

    const integrity = journal.validateIntegrity()
    expect(integrity.valid).toBe(true)
  })

  it('exports and imports JSON, supports replay', () => {
    const journal = new EventJournal()
    journal.recordEvent(EventType.SIM_START, {})
    journal.advanceTick()
    journal.recordEvent(EventType.WEATHER_CHANGE, { t: 1 })

    const json = journal.exportToJSON()
    const reloaded = new EventJournal()
    reloaded.importFromJSON(json)

    expect(reloaded.getAllEvents().length).toBe(journal.getAllEvents().length)

    reloaded.startReplay()
    // Tick 0 events should be available
    const e0 = reloaded.getNextReplayEvent()
    expect(e0).not.toBeNull()
    reloaded.stopReplay()
  })
})

