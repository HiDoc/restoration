import type { SimulationEvent } from '@/simulation/EventJournal'

export type DigestIcon = 'season' | 'flower' | 'seed' | 'spread' | 'decline' | 'lost' | 'weather'

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
  nameOf: (speciesId: string) => string
}

const WEATHER: Record<string, string> = {
  drought: 'A drought dried out part of the land.',
  storm: 'A storm passed through.',
  cold_snap: 'A cold snap swept in.',
}

const CAUSES: Record<string, string> = {
  drought: 'drought',
  natural_aging: 'old age',
  pollution: 'pollution',
  environmental_stress: 'harsh conditions',
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const last = <T>(items: readonly T[] | undefined): T | undefined => items?.[items.length - 1]
const hexes = (count: number) => `${count} ${count === 1 ? 'hex' : 'hexes'}`

/** Events of one type, grouped by species, in first-seen order. */
function bySpecies(events: readonly SimulationEvent[], type: string): Map<string, SimulationEvent[]> {
  const groups = new Map<string, SimulationEvent[]>()
  for (const event of events) {
    const id = event.data?.speciesId
    if (event.type !== type || typeof id !== 'string') continue
    groups.set(id, [...(groups.get(id) ?? []), event])
  }
  return groups
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>()
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}

/** What changed while time was advanced, most notable first, in plain words. */
export function buildDigest({ events, seasonBefore, seasonAfter, populationBefore, populationAfter, nameOf }: DigestInput): DigestLine[] {
  const lines: DigestLine[] = []
  const deaths = bySpecies(events, 'species_die')
  const births = bySpecies(events, 'species_spawn')

  if (seasonBefore !== seasonAfter) {
    lines.push({ icon: 'season', text: `${capitalize(seasonBefore)} gave way to ${seasonAfter}.` })
  }

  for (const [id, before] of populationBefore) {
    if (before > 0 && !populationAfter.get(id)) {
      lines.push({ icon: 'lost', text: `${nameOf(id)} has disappeared.`, chunkId: last(deaths.get(id))?.chunkId })
    }
  }

  for (const [type, icon, verb] of [['flowering_started', 'flower', 'came into flower'], ['seeds_ripe', 'seed', 'set seed']] as const) {
    for (const [id, found] of bySpecies(events, type)) {
      const places = new Set(found.map(event => event.chunkId))
      lines.push({ icon, text: `${nameOf(id)} ${verb} in ${hexes(places.size)}.`, chunkId: found[0].chunkId })
    }
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
      const cause = CAUSES[mostCommon(died.map(event => event.data?.cause)) ?? '']
      lines.push({
        icon: 'decline',
        text: `${nameOf(id)} declined: ${before} → ${after} plants${cause ? `, mostly from ${cause}` : ''}.`,
        chunkId: last(died)?.chunkId,
      })
    }
  }

  const weather = new Set(events.filter(event => event.type === 'weather_change').map(event => event.data?.type))
  weather.forEach(kind => { if (WEATHER[kind]) lines.push({ icon: 'weather', text: WEATHER[kind] }) })

  return lines
}
