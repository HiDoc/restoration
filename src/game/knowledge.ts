import { EventType, type SimulationEvent } from '@/simulation/EventJournal'
import type { Season } from '@/simulation/SpeciesRegistry'
import { speciesInfo } from './speciesInfo'

/** What the player has witnessed of one species. */
export interface SpeciesKnowledge {
  firstSeen: number
  flowering: Season[]
  fruiting: Season[]
  /** Seen making new plants without seed (runners, rhizomes, bulbs). */
  spreads: boolean
  /** For an animal followed long enough, the habitat it kept to. */
  habitat?: string
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
  /** Mysteries the player has come across, by tick noticed and solved. */
  mysteries: Record<string, { noticed: number; solved?: number }>
  /** Animals heard but not yet seen, by tick first heard. */
  heard: Record<string, number>
  /** The player's photos, oldest first. */
  photos: Photo[]
  /** The phenology calendar per site: species → year → day of year each first was noted. */
  phenology: Record<string, Record<string, Record<number, Partial<Record<Phase, number>>>>>
}

export type Phase = 'flower' | 'fruit' | 'arrival'

export interface Photo {
  subject: string
  /** The plant an animal was caught feeding on. */
  plant?: string
  /** What it was doing, in words: "nectaring on White Clover", "in flower". */
  caption: string
  habitat: string
  site: string
  tick: number
  /** When, in words: "day 34 of year 1". */
  when: string
}

/** Photos kept; the oldest go first. */
export const ALBUM = 24

export type Discovery =
  | { kind: 'species'; id: string; chunkId?: string }
  | { kind: 'interaction'; animal: string; plant: string; chunkId?: string }
  | { kind: 'mystery'; id: string; solved: boolean }
  | { kind: 'heard'; id: string }

export const emptyKnowledge = (): Knowledge => ({ species: {}, interactions: {}, names: {}, mysteries: {}, heard: {}, photos: [], phenology: {} })
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

/**
 * Folds witnessed events into knowledge (in place) and returns what is new to the player. Interactions are not
 * among them: those are learned only by watching (following, photographing).
 */
export function learn(knowledge: Knowledge, events: readonly SimulationEvent[], seasonOf: (tick: number) => Season): Discovery[] {
  const found: Discovery[] = []
  for (const event of events) {
    const { speciesId, faunaId } = (event.data ?? {}) as Record<string, string | undefined>
    switch (event.type) {
      // Insects on flowers are there to be seen; birds keep out of sight until photographed.
      case EventType.FIRST_SIGHTING:
        if (faunaId && speciesInfo(faunaId).kind !== 'bird') meet(knowledge, faunaId, event.tick, found, event.chunkId)
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
    }
  }
  return found
}

/** A sighting of an animal (a photo, a follow). */
export function sight(knowledge: Knowledge, animal: string, tick: number, chunkId?: string): Discovery[] {
  const found: Discovery[] = []
  meet(knowledge, animal, tick, found, chunkId)
  return found
}

/** An animal seen feeding on a plant: both are seen, and the pair is known. */
export function witness(knowledge: Knowledge, animal: string, plant: string, tick: number, chunkId?: string): Discovery[] {
  const found: Discovery[] = []
  meet(knowledge, animal, tick, found, chunkId)
  meet(knowledge, plant, tick, found, chunkId)
  if (!knowledge.interactions[pairKey(animal, plant)]) {
    knowledge.interactions[pairKey(animal, plant)] = { animal, plant, firstSeen: tick, chunkId }
    found.push({ kind: 'interaction', animal, plant, chunkId })
  }
  return found
}

/** Animals heard; those neither seen nor heard before are new. */
export function hear(knowledge: Knowledge, animals: Iterable<string>, tick: number): Discovery[] {
  const found: Discovery[] = []
  for (const id of animals) {
    if (knowledge.species[id] || knowledge.heard[id] !== undefined) continue
    knowledge.heard[id] = tick
    found.push({ kind: 'heard', id })
  }
  return found
}

export function keepPhoto(knowledge: Knowledge, photo: Photo) {
  knowledge.photos = [...knowledge.photos, photo].slice(-ALBUM)
}

/** Note a first of the year in the site's calendar; false if that first was already noted. */
export function notePhase(knowledge: Knowledge, site: string, species: string, year: number, phase: Phase, day: number): boolean {
  const years = ((knowledge.phenology[site] ??= {})[species] ??= {})
  const noted = (years[year] ??= {})
  if (noted[phase] !== undefined) return false
  noted[phase] = day
  return true
}
