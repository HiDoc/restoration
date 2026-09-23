import type { Season } from './SpeciesRegistry'
import type catalogueJson from '../database/catalogue.json'

type Catalogue = typeof catalogueJson

export interface FaunaLink {
  plant: string
  strength: number
  /** What the animal takes: nectar while the plant flowers, fruit or seed while it fruits, insects while it grows. */
  takes: 'nectar' | 'fruit' | 'seed' | 'insects'
  pollinates: boolean
  disperses: boolean
}

/** Mirrors the Rust `FaunaDefinition` the engine sends with the plant definitions. */
export interface FaunaDefinition {
  id: string
  group: string
  activeSeasons: Season[]
  temperatureRange: { min: number; max: number }
  pollutionTolerance: number
  foragingRange: number
  capacityPerForage: number
  forage: FaunaLink[]
  hosts: string[]
  needsHost: boolean
}

const ALL_YEAR: Season[] = ['spring', 'summer', 'autumn', 'winter']
// Animals supported per plant offering food: pollinators are many and small, birds few and territorial.
const CAPACITY_PER_FORAGE = { pollinator: 0.6, bird: 0.35 }
// The bird table has no pollution tolerance; assume a middling one until it does.
const BIRD_POLLUTION_TOLERANCE = 0.5

/** Turns the catalogue's animals and their plant interactions into engine fauna definitions. */
export function buildFaunaDefinitions(catalogue: Catalogue): FaunaDefinition[] {
  const categoryOf = new Map(catalogue.plants.map(plant => [plant.id, plant.category]))
  const linksOf = (id: string, types: string[]) =>
    catalogue.interactions.filter(link => link.species_b_id === id && types.includes(link.interaction_type))

  const pollinators = catalogue.pollinators.map((p): FaunaDefinition => ({
    id: p.id,
    group: p.pollinator_group,
    activeSeasons: JSON.parse(p.flight_seasons) as Season[],
    temperatureRange: { min: p.temp_min, max: p.temp_max },
    pollutionTolerance: p.pollution_tolerance,
    foragingRange: p.foraging_range,
    capacityPerForage: CAPACITY_PER_FORAGE.pollinator,
    forage: linksOf(p.id, ['pollination']).map(link => ({
      plant: link.species_a_id, strength: link.interaction_strength, takes: 'nectar', pollinates: true, disperses: false,
    })),
    hosts: linksOf(p.id, ['larval_host']).map(link => link.species_a_id),
    // Caterpillars need their food plants; adults alone can't sustain a population.
    needsHost: p.pollinator_group === 'butterfly' || p.pollinator_group === 'moth',
  }))

  const birds = catalogue.birds.map((b): FaunaDefinition => ({
    id: b.id,
    group: 'bird',
    activeSeasons: ALL_YEAR, // every catalogue bird is resident or a short-distance migrant
    temperatureRange: { min: b.temp_range_min, max: b.temp_range_max },
    pollutionTolerance: BIRD_POLLUTION_TOLERANCE,
    foragingRange: b.body_mass_g > 150 ? 2 : 1,
    capacityPerForage: CAPACITY_PER_FORAGE.bird,
    forage: linksOf(b.id, ['seed_dispersal', 'feeding']).map(link => {
      const disperses = link.interaction_type === 'seed_dispersal'
      const category = categoryOf.get(link.species_a_id)
      const takes = disperses ? 'fruit' : category === 'grass' || category === 'herb' ? 'seed' : 'insects'
      return { plant: link.species_a_id, strength: link.interaction_strength, takes, pollinates: false, disperses }
    }),
    hosts: linksOf(b.id, ['nesting']).map(link => link.species_a_id),
    needsHost: false,
  }))

  return [...pollinators, ...birds]
}
