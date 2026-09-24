import { EventType, type SimulationEvent } from '@/simulation/EventJournal'
import { CAUSES, mostCommon } from './causes'
import { list } from './hexDescription'

export interface ShiftCause {
  text: string
  plants: number
  /** Where that cause took the most plants. */
  chunkId?: string
}

/** What emptied the land: the deaths since `sinceTick` grouped by cause, the largest first. */
export function explainShift(events: readonly SimulationEvent[], sinceTick: number, nameOf: (id: string) => string): ShiftCause[] {
  const byCause = new Map<string, SimulationEvent[]>()
  for (const event of events) {
    if (event.type !== EventType.SPECIES_DIE || event.tick <= sinceTick) continue
    const cause = event.data?.cause ?? 'environmental_stress'
    byCause.set(cause, [...(byCause.get(cause) ?? []), event])
  }
  return [...byCause]
    .map(([cause, deaths]) => {
      const noun = CAUSES[cause]?.noun ?? CAUSES.environmental_stress.noun
      const species = [...new Set(deaths.map(death => nameOf(death.data?.speciesId)))]
      return {
        text: `${noun[0].toUpperCase()}${noun.slice(1)} took ${deaths.length} ${deaths.length === 1 ? 'plant' : 'plants'}: ${list(species)}.`,
        plants: deaths.length,
        chunkId: mostCommon(deaths.map(death => death.chunkId).filter((id): id is string => !!id)),
      }
    })
    .sort((a, b) => b.plants - a.plants)
}
