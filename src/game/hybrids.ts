import type { SpeciesDefinition } from '@/simulation/SpeciesRegistry'

const DESCRIPTORS = ['Silver', 'Dusk', 'Amber', 'Moonlit', 'Velvet', 'Ember', 'Frost', 'Mist', 'Dawn', 'Copper', 'Pale', 'Twilight']

/** A stable invented name for a bred hybrid: a descriptor picked by its id and the kind of plant it is. */
export function hybridName(id: string, parentNames: string[]): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const kind = parentNames[0]?.split(' ').pop() ?? 'Hybrid'
  return `${DESCRIPTORS[hash % DESCRIPTORS.length]} ${kind}`
}

/** Why two species cannot cross, in the engine's terms, or null if they can. */
export function crossBarrier(receiver?: SpeciesDefinition, donor?: SpeciesDefinition): string | null {
  if (!receiver || !donor) return 'Choose two plants in flower.'
  if (receiver.id !== donor.id && (!receiver.genus || receiver.genus !== donor.genus)) return 'Too distant to cross: only plants of one genus can.'
  return null
}
