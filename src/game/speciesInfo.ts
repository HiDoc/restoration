import catalogue from '@/database/catalogue.json'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'

export type AnimalGroup = 'bee' | 'butterfly' | 'hoverfly' | 'moth' | 'beetle' | 'bird'

export interface SpeciesInfo {
  name: string
  /** Plant category (tree, shrub, grass, herb, …) or animal group. */
  kind: string
  animal: boolean
}

const ANIMALS = new Map<string, SpeciesInfo>([
  ...catalogue.pollinators.map(p => [p.id, { name: p.common_name ?? p.name, kind: p.pollinator_group, animal: true }] as const),
  ...catalogue.birds.map(b => [b.id, { name: b.common_name ?? b.name, kind: 'bird', animal: true }] as const),
])

/** Display name and kind of any plant or animal id, including player-bred plants in the registry. */
export function speciesInfo(id: string): SpeciesInfo {
  const animal = ANIMALS.get(id)
  if (animal) return animal
  const plant = SpeciesRegistry.getInstance().getSpecies(id)
  return { name: plant?.name ?? id, kind: plant?.category ?? 'herb', animal: false }
}
