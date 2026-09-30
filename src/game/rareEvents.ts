import { list } from './hexDescription'

/** A rare event from the engine, in words. */
export function describeRareEvent(data: Record<string, any>, nameOf: (id: string) => string): string {
  switch (data.kind) {
    case 'superbloom':
      return 'A superbloom: after a wet winter, seed long buried in the soil is sprouting everywhere.'
    case 'mast_year':
      return 'A mast year: the trees are loaded with seed, far beyond their usual crop.'
    case 'butterfly_migration':
      return `A migration: ${list((data.species ?? []).map(nameOf))} swept in on warm winds.`
    case 'temporary_pond':
      return 'A downpour left a pond standing in the lowest ground.'
    case 'spontaneous_hybrid':
      return `Insects carried ${nameOf(data.donor)} pollen to ${nameOf(data.receiver)}: some of its seed will be hybrid.`
    case 'ancient_seed':
      return `${nameOf(data.speciesId)} sprouted from seed buried long ago.`
    default:
      return 'Something rare happened.'
  }
}
