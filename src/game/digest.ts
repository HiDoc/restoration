import { EventType, type SimulationEvent } from '@/simulation/EventJournal'
import { CAUSES, mostCommon } from './causes'

export type DigestIcon = 'season' | 'sighting' | 'arrival' | 'interaction' | 'flower' | 'seed' | 'spread' | 'decline' | 'lost' | 'weather' | 'more'

export interface DigestLine {
  icon: DigestIcon
  text: string
  /** A hex worth inspecting for this line. */
  chunkId?: string
}

export interface DigestInput {
  /** Events from the advanced span only. */
  events: readonly SimulationEvent[]
  seasonBefore: string
  seasonAfter: string
  populationBefore: ReadonlyMap<string, number>
  populationAfter: ReadonlyMap<string, number>
  /** Display name of a plant or animal. */
  nameOf: (speciesId: string) => string
  /** Pairs (`animal|plant`) the player already knew before this span; only new ones are reported. */
  knownInteractions?: ReadonlySet<string>
}

const WEATHER: Record<string, string> = {
  drought: 'A drought dried out part of the land.',
  storm: 'A storm passed through.',
  cold_snap: 'A cold snap swept in.',
}

// A digest is read at a glance; the rest is summarised in one line.
const MAX_LINES = 8

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const last = <T>(items: readonly T[] | undefined): T | undefined => items?.[items.length - 1]
const hexes = (count: number) => `${count} ${count === 1 ? 'hex' : 'hexes'}`

/** Events of one type, grouped by species, in first-seen order. */
function bySpecies(events: readonly SimulationEvent[], type: EventType, key = 'speciesId'): Map<string, SimulationEvent[]> {
  const groups = new Map<string, SimulationEvent[]>()
  for (const event of events) {
    const id = event.data?.[key]
    if (event.type !== type || typeof id !== 'string') continue
    groups.set(id, [...(groups.get(id) ?? []), event])
  }
  return groups
}

/** What changed while time was advanced, most notable first, in plain words. */
export function buildDigest({ events, seasonBefore, seasonAfter, populationBefore, populationAfter, nameOf, knownInteractions }: DigestInput): DigestLine[] {
  const lines: DigestLine[] = []
  const deaths = bySpecies(events, EventType.SPECIES_DIE)
  const births = bySpecies(events, EventType.SPECIES_SPAWN)

  if (seasonBefore !== seasonAfter) {
    lines.push({ icon: 'season', text: `${capitalize(seasonBefore)} gave way to ${seasonAfter}.` })
  }

  for (const [id, found] of bySpecies(events, EventType.FIRST_SIGHTING, 'faunaId')) {
    lines.push({ icon: 'sighting', text: `First sighting: ${nameOf(id)}!`, chunkId: found[0].chunkId })
  }

  for (const [id, before] of populationBefore) {
    if (before > 0 && !populationAfter.get(id)) {
      lines.push({ icon: 'lost', text: `${nameOf(id)} has disappeared.`, chunkId: last(deaths.get(id))?.chunkId })
    }
  }

  const pairs = new Map<string, SimulationEvent>()
  for (const event of events) {
    const key = `${event.data?.faunaId}|${event.data?.plantId}`
    if (event.type === EventType.INTERACTION_OBSERVED && !pairs.has(key) && !knownInteractions?.has(key)) pairs.set(key, event)
  }
  for (const event of pairs.values()) {
    lines.push({ icon: 'interaction', text: `Seen together: ${nameOf(event.data.faunaId)} ↔ ${nameOf(event.data.plantId)}.`, chunkId: event.chunkId })
  }

  for (const [type, icon, verb] of [[EventType.FLOWERING_STARTED, 'flower', 'came into flower'], [EventType.SEEDS_RIPE, 'seed', 'set seed']] as const) {
    for (const [id, found] of bySpecies(events, type)) {
      const places = new Set(found.map(event => event.chunkId))
      lines.push({ icon, text: `${nameOf(id)} ${verb} in ${hexes(places.size)}.`, chunkId: found[0].chunkId })
    }
  }

  for (const [id, found] of bySpecies(events, EventType.FAUNA_ARRIVED, 'faunaId')) {
    const places = new Set(found.map(event => event.chunkId))
    lines.push({ icon: 'arrival', text: `${nameOf(id)} arrived in ${hexes(places.size)}.`, chunkId: found[0].chunkId })
  }

  // Only changes large enough to notice: at least three plants and a fifth of the population.
  for (const [id, after] of populationAfter) {
    const before = populationBefore.get(id) ?? 0
    const delta = after - before
    const notable = Math.max(3, before * 0.2)
    if (after > 0 && delta >= notable) {
      lines.push({ icon: 'spread', text: `${nameOf(id)} spread: ${before} → ${after} plants.`, chunkId: last(births.get(id))?.chunkId })
    } else if (after > 0 && -delta >= notable) {
      const died = deaths.get(id) ?? []
      const cause = CAUSES[mostCommon(died.map(event => event.data?.cause)) ?? '']?.noun
      lines.push({
        icon: 'decline',
        text: `${nameOf(id)} declined: ${before} → ${after} plants${cause ? `, mostly from ${cause}` : ''}.`,
        chunkId: last(died)?.chunkId,
      })
    }
  }

  const weather = new Set(events.filter(event => event.type === EventType.WEATHER_CHANGE).map(event => event.data?.type))
  weather.forEach(kind => { if (WEATHER[kind]) lines.push({ icon: 'weather', text: WEATHER[kind] }) })

  if (lines.length <= MAX_LINES) return lines
  const hidden = lines.length - (MAX_LINES - 1)
  return [...lines.slice(0, MAX_LINES - 1), { icon: 'more', text: `…and ${hidden} more changes.` }]
}
