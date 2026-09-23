import { speciesInfo, type SpeciesInfo } from './speciesInfo'

// No wetland yet: the engine has no standing water and the catalogue no wetland plants to define one.
export type Habitat = 'woodland' | 'scrub' | 'meadow' | 'dry_grassland' | 'blighted' | 'bare'
export type PlantActivity = 'flowering' | 'fruiting' | 'dormant' | 'growing'

export interface HexPlant { id: string; name: string; count: number; activity: PlantActivity }
export interface HexAnimal { id: string; name: string; count: number; group: string }

export interface HexDescription {
  habitat: Habitat
  title: string
  /** What a visitor would notice, in a sentence or two. */
  phrase: string
  plants: HexPlant[]
  animals: HexAnimal[]
}

export interface HexState {
  biomeState?: { moisture?: number; pollution?: number; canopy?: number }
  species?: { forEach(fn: (plant: { speciesId: string; phenologyStage?: string }) => void): void }
  fauna?: Record<string, number>
}

// Trees or shrubs change what a patch is once there are a few of them and they make up a real share of it.
const WOODY_DOMINANCE = 3
const WOODY_SHARE = 0.25
const WOODY = new Set(['tree', 'shrub'])

/** Joins names the way a sentence would: "a, b and c". */
export const list = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0])

function habitatOf(hex: HexState, plants: HexPlant[], kind: (id: string) => string): Habitat {
  const { moisture = 0.5, pollution = 0, canopy = 0 } = hex.biomeState ?? {}
  const count = (k: string) => plants.filter(p => kind(p.id) === k).reduce((n, p) => n + p.count, 0)
  const total = plants.reduce((n, p) => n + p.count, 0)
  const dominant = (k: string) => count(k) >= WOODY_DOMINANCE && count(k) >= total * WOODY_SHARE
  if (pollution > 0.65) return 'blighted'
  if (plants.length === 0) return 'bare'
  if (canopy > 0.4 || dominant('tree')) return 'woodland'
  if (dominant('shrub')) return 'scrub'
  if (moisture < 0.25) return 'dry_grassland'
  return 'meadow'
}

/** What a hex is and what is going on in it, told the way a visitor would see it. */
export function describeHex(hex: HexState, info: (id: string) => SpeciesInfo = speciesInfo): HexDescription {
  const bySpecies = new Map<string, { count: number; stages: Set<string> }>()
  hex.species?.forEach(plant => {
    const entry = bySpecies.get(plant.speciesId) ?? { count: 0, stages: new Set<string>() }
    entry.count += 1
    entry.stages.add(plant.phenologyStage ?? 'vegetative')
    bySpecies.set(plant.speciesId, entry)
  })
  const plants: HexPlant[] = [...bySpecies]
    .map(([id, { count, stages }]) => ({
      id,
      name: info(id).name,
      count,
      activity: stages.has('flowering') ? 'flowering' : stages.has('fruiting') ? 'fruiting' : stages.has('dormant') && stages.size === 1 ? 'dormant' : 'growing',
    } as HexPlant))
    .sort((a, b) => b.count - a.count)
  const animals: HexAnimal[] = Object.entries(hex.fauna ?? {})
    .filter(([, count]) => count >= 1)
    .map(([id, count]) => ({ id, name: info(id).name, count, group: info(id).kind }))
    .sort((a, b) => b.count - a.count)

  const kind = (id: string) => info(id).kind
  const habitat = habitatOf(hex, plants, kind)
  const dominantWoody = plants.find(p => WOODY.has(kind(p.id)))
  const flowering = plants.filter(p => p.activity === 'flowering')
  const title = {
    woodland: `${dominantWoody?.name ?? 'Mixed'} woodland`,
    scrub: `${dominantWoody?.name ?? 'Mixed'} scrub`,
    meadow: flowering.length ? `${flowering[0].name} meadow` : 'Meadow',
    dry_grassland: 'Dry grassland',
    blighted: 'Blighted ground',
    bare: 'Bare ground',
  }[habitat]

  const fruitingWoody = plants.filter(p => p.activity === 'fruiting' && WOODY.has(kind(p.id)))
  const seeding = plants.filter(p => p.activity === 'fruiting' && !WOODY.has(kind(p.id)))
  const state =
    habitat === 'blighted' ? 'Choked by pollution.'
    : habitat === 'bare' ? 'Bare ground, waiting for seed.'
    : flowering.length ? `${list(flowering.slice(0, 2).map(p => p.name))} in flower.`
    : fruitingWoody.length ? `${list(fruitingWoody.slice(0, 2).map(p => p.name))} heavy with fruit.`
    : seeding.length ? `${list(seeding.slice(0, 2).map(p => p.name))} going to seed.`
    : plants.every(p => p.activity === 'dormant') ? 'Resting through the cold.'
    : 'Green and growing.'
  const visitors = animals.length ? ` Seen here: ${list(animals.slice(0, 3).map(a => a.name))}.` : ''

  return { habitat, title, phrase: state + visitors, plants, animals }
}
