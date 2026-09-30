import { CAUSES } from './causes'

/** A plant the player follows, as the engine records it (kept after it dies). */
export interface Tag {
  label: string
  speciesId: string
  name?: string
  taggedTick: number
  reason: 'planted' | 'hybrid' | 'crossed' | 'chosen'
  seedsSet: number
  descendants: number
  died?: { tick: number; cause: string; ageDays: number }
  /** The hex it grows in. */
  hex?: string
  /** The site its seed was set on; absent for packet seed and a site's first plants. */
  origin?: string
}

interface LivingPlant {
  id: string
  ageDays?: number
  age: number
  phenologyStage?: string
  health: number
  biomass?: number
  limit?: string
  genetics?: { mother?: string; father?: string }
}

interface Hex { x: number; y: number; species: { forEach(fn: (plant: LivingPlant) => void): void } }

export interface JournalEntry {
  instanceId: string
  label: string
  title: string
  species: string
  /** How it came to be followed, in a few words. */
  origin: string
  /** Where and how it is now, or how it died. */
  status: string
  parents?: string
  offspring: string
  alive: boolean
  chunkId?: string
}

const YEAR_DAYS = 360
const REASONS = { planted: 'Planted by you', hybrid: 'A hybrid seedling', crossed: 'From your cross', chosen: 'Tagged by you' } as const

export function age(days: number): string {
  if (days >= YEAR_DAYS) {
    const years = Math.floor(days / YEAR_DAYS)
    return `${years} ${years === 1 ? 'year' : 'years'}`
  }
  const whole = Math.max(1, Math.floor(days))
  return `${whole} ${whole === 1 ? 'day' : 'days'}`
}

const health = (h: number) => (h >= 0.7 ? 'thriving' : h >= 0.4 ? 'holding on' : 'failing')
const STAGES: Record<string, string> = { flowering: 'in flower', fruiting: 'in fruit', dormant: 'dormant', seed: 'a seedling' }

/** The Journal: every tagged plant, the living first, told in words. */
export function journalEntries(tags: Record<string, Tag>, chunks: Iterable<Hex>, nameOf: (speciesId: string) => string, siteName: (site: string) => string = site => site): JournalEntry[] {
  const living = new Map<string, { plant: LivingPlant; hex: Hex }>()
  for (const hex of chunks) hex.species.forEach(plant => { if (tags[plant.id]) living.set(plant.id, { plant, hex }) })
  const called = (id?: string) => (id ? (tags[id] ? tags[id].label : 'an untagged plant') : undefined)

  const entries = Object.entries(tags).map(([instanceId, tag]): JournalEntry => {
    const species = nameOf(tag.speciesId)
    const found = living.get(instanceId)
    const days = found ? (found.plant.ageDays ?? found.plant.age) : tag.died?.ageDays ?? 0
    const status = found
      ? [
          `${age(days)} old at (${found.hex.x}, ${found.hex.y})`,
          STAGES[found.plant.phenologyStage ?? ''] ?? 'growing',
          found.plant.limit ? CAUSES[found.plant.limit]?.state ?? health(found.plant.health) : health(found.plant.health),
        ].join(', ')
      : tag.died
        ? `Died of ${CAUSES[tag.died.cause]?.noun ?? 'harsh conditions'} at ${age(tag.died.ageDays)}`
        : 'Gone'
    const genetics = found?.plant.genetics
    const parents = [called(genetics?.mother), called(genetics?.father)].filter(Boolean).join(' × ')
    return {
      instanceId,
      label: tag.label,
      title: tag.name ? `${tag.name} (${species})` : species,
      species,
      origin: `${REASONS[tag.reason] ?? 'Tagged'}${tag.origin ? `, seed from ${siteName(tag.origin)}` : ''}`,
      status: status.charAt(0).toUpperCase() + status.slice(1),
      parents: parents || undefined,
      offspring: `${tag.seedsSet} ${tag.seedsSet === 1 ? 'seed' : 'seeds'} set, ${tag.descendants} grew`,
      alive: !!found,
      chunkId: found ? `chunk_${found.hex.x}_${found.hex.y}` : undefined,
    }
  })
  return entries.sort((a, b) => Number(b.alive) - Number(a.alive) || a.label.localeCompare(b.label, undefined, { numeric: true }))
}

/** The note when a followed plant dies. */
export function deathNote(tag: Pick<Tag, 'label' | 'name' | 'reason'>, species: string, cause: string, ageDays: number): string {
  const whose = tag.reason === 'chosen' ? 'the' : 'your'
  const who = tag.name ? `${tag.name}, ${whose} ${species}` : `${whose} ${species}`
  return `${tag.label}, ${who}, died of ${CAUSES[cause]?.noun ?? 'harsh conditions'} at ${age(ageDays)}.`
}

/** A plant as a panel lists it: its label and name when tagged, species and age. */
export function plantTitle(plant: { age: number; ageDays?: number }, species: string, tag?: Pick<Tag, 'label' | 'name'>): string {
  const called = tag ? [tag.label, tag.name].filter(Boolean).join(' ') + ' ' : ''
  return `${called}${species}, ${age(plant.ageDays ?? plant.age)} old`
}

export interface GardenRow {
  provenance: string
  planted: number
  alive: number
  health: string
  size: string
  flowering: number
  seedsSet: number
  deaths: string
}
export interface CommonGarden { key: string; species: string; hex: string; rows: GardenRow[]; note: string }

/**
 * Common gardens: tagged plants of one species from seed of different sites, growing in one hex. Side by side
 * they share soil, water and weather, so what differs between the rows is inherited.
 */
export function commonGardens(
  tags: Record<string, Tag>,
  chunks: Iterable<Hex>,
  nameOf: (speciesId: string) => string,
  siteName: (site: string) => string,
): CommonGarden[] {
  const living = new Map<string, LivingPlant>()
  for (const hex of chunks) hex.species.forEach(plant => { if (tags[plant.id]) living.set(plant.id, plant) })
  const groups = new Map<string, Array<[string, Tag]>>()
  for (const [id, tag] of Object.entries(tags)) {
    if (!tag.hex || tag.reason === 'chosen') continue
    const key = `${tag.hex}|${tag.speciesId}`
    groups.set(key, [...(groups.get(key) ?? []), [id, tag]])
  }
  const gardens: CommonGarden[] = []
  for (const [key, members] of groups) {
    const byOrigin = new Map<string, Array<[string, Tag]>>()
    for (const member of members) byOrigin.set(member[1].origin ?? '', [...(byOrigin.get(member[1].origin ?? '') ?? []), member])
    if (byOrigin.size < 2) continue
    const rows = [...byOrigin].map(([origin, plants]): GardenRow => {
      const alive = plants.map(([id]) => living.get(id)).filter((p): p is LivingPlant => !!p)
      const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)
      const causes = plants.flatMap(([, tag]) => (tag.died ? [CAUSES[tag.died.cause]?.noun ?? 'harsh conditions'] : []))
      const counted = [...new Set(causes)].map(cause => `${causes.filter(c => c === cause).length} of ${cause}`)
      return {
        provenance: origin ? siteName(origin) : 'Packet seed',
        planted: plants.length,
        alive: alive.length,
        health: alive.length ? health(mean(alive.map(p => p.health))) : '–',
        size: alive.length ? `${Math.round(mean(alive.map(p => p.biomass ?? 0)) * 100)}%` : '–',
        flowering: alive.filter(p => p.phenologyStage === 'flowering').length,
        seedsSet: plants.reduce((n, [, tag]) => n + tag.seedsSet, 0),
        deaths: counted.join(', ') || 'none',
      }
    })
    const [hex, species] = key.split('|')
    const coords = hex.split('_').slice(1).join(', ')
    const few = rows.some(row => row.planted < 3)
    gardens.push({
      key,
      species: nameOf(species),
      hex: `(${coords})`,
      rows,
      note: `All grow side by side in (${coords}), in the same soil, water and weather, so what differs between the rows is inherited.${few ? ' With fewer than three plants of an origin, chance can look like a difference: sow more.' : ''}`,
    })
  }
  return gardens
}
