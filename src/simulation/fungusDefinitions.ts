import type { FungalSpecies, SpeciesInteraction } from '@/database/SpeciesDatabase'
import type { Season } from './SpeciesRegistry'

/** A fungus as the engine models it: how it lives, the plants it lives with or on, and when it fruits. */
export interface FungusDefinition {
  id: string
  lifestyle: FungalSpecies['lifestyle']
  hosts: string[]
  fruitingSeasons: Season[]
}

/** How a fungus relates to one of its hosts. */
export type FungalLink = 'mycorrhiza' | 'parasitism' | 'decomposition'

export function buildFungusDefinitions(catalogue: { fungi: FungalSpecies[]; interactions: SpeciesInteraction[] }): FungusDefinition[] {
  return catalogue.fungi.map(fungus => ({
    id: fungus.id,
    lifestyle: fungus.lifestyle,
    hosts: catalogue.interactions.filter(link => link.species_b_id === fungus.id).map(link => link.species_a_id),
    fruitingSeasons: JSON.parse(fungus.fruiting_seasons) as Season[],
  }))
}
