import { EventType, type SimulationEvent } from '@/simulation/EventJournal'
import type { Season } from '@/simulation/SpeciesRegistry'

/** What the player has witnessed of one species. */
export interface SpeciesKnowledge {
  firstSeen: number
  flowering: Season[]
  fruiting: Season[]
  /** Seen making new plants without seed (runners, rhizomes, bulbs). */
  spreads: boolean
}

export interface InteractionKnowledge {
  animal: string
  plant: string
  firstSeen: number
  chunkId?: string
}

/** Everything the player knows. Plain JSON, saved with the game; absence means "not yet seen". */
export interface Knowledge {
  species: Record<string, SpeciesKnowledge>
  interactions: Record<string, InteractionKnowledge>
  /** Names the player gave the hybrids they bred. */
  names: Record<string, string>
}

export type Discovery =
  | { kind: 'species'; id: string; chunkId?: string }
  | { kind: 'interaction'; animal: string; plant: string; chunkId?: string }

export const emptyKnowledge = (): Knowledge => ({ species: {}, interactions: {}, names: {} })
export const pairKey = (animal: string, plant: string) => `${animal}|${plant}`

function meet(knowledge: Knowledge, id: string, tick: number, found: Discovery[], chunkId?: string): SpeciesKnowledge {
  let entry = knowledge.species[id]
  if (!entry) {
    entry = knowledge.species[id] = { firstSeen: tick, flowering: [], fruiting: [], spreads: false }
    found.push({ kind: 'species', id, chunkId })
  }
  return entry
}

/** Plants on the map are there to be seen. Records them (in place) and returns those seen for the first time. */
export function see(knowledge: Knowledge, plantIds: Iterable<string>, tick: number): Discovery[] {
  const found: Discovery[] = []
  for (const id of plantIds) meet(knowledge, id, tick, found)
  return found
}

/** Folds witnessed events into knowledge (in place) and returns what is new to the player. */
export function learn(knowledge: Knowledge, events: readonly SimulationEvent[], seasonOf: (tick: number) => Season): Discovery[] {
  const found: Discovery[] = []
  for (const event of events) {
    const { speciesId, faunaId, plantId } = (event.data ?? {}) as Record<string, string | undefined>
    switch (event.type) {
      case EventType.FIRST_SIGHTING:
        if (faunaId) meet(knowledge, faunaId, event.tick, found, event.chunkId)
        break
      case EventType.FLOWERING_STARTED:
      case EventType.SEEDS_RIPE: {
        if (!speciesId) break
        const seasons = meet(knowledge, speciesId, event.tick, found, event.chunkId)[event.type === EventType.FLOWERING_STARTED ? 'flowering' : 'fruiting']
        const season = seasonOf(event.tick)
        if (!seasons.includes(season)) seasons.push(season)
        break
      }
      case EventType.SPECIES_SPAWN:
        if (speciesId && event.data?.source === 'clonal') meet(knowledge, speciesId, event.tick, found, event.chunkId).spreads = true
        break
      case EventType.INTERACTION_OBSERVED: {
        if (!faunaId || !plantId || knowledge.interactions[pairKey(faunaId, plantId)]) break
        meet(knowledge, faunaId, event.tick, found, event.chunkId)
        meet(knowledge, plantId, event.tick, found, event.chunkId)
        knowledge.interactions[pairKey(faunaId, plantId)] = { animal: faunaId, plant: plantId, firstSeen: event.tick, chunkId: event.chunkId }
        found.push({ kind: 'interaction', animal: faunaId, plant: plantId, chunkId: event.chunkId })
        break
      }
    }
  }
  return found
}
