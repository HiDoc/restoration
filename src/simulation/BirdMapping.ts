import { BirdSpecies } from './BirdsSystem'

// Heuristic mapping from DB bird IDs to BirdsSystem groups.
// Extend this mapping as new DB species are added.
const explicit: Record<string, BirdSpecies> = {
  swift: BirdSpecies.SWIFT,
  common_swift: BirdSpecies.SWIFT,
  barn_swallow: BirdSpecies.SWIFT,
  house_martin: BirdSpecies.SWIFT,
  robin: BirdSpecies.ROBIN,
  robin_european: BirdSpecies.ROBIN,
  european_robin: BirdSpecies.ROBIN,
  blue_tit: BirdSpecies.ROBIN,
  great_tit: BirdSpecies.ROBIN,
  chaffinch: BirdSpecies.ROBIN,
  goldfinch: BirdSpecies.ROBIN,
  blackbird: BirdSpecies.ROBIN,
  jay: BirdSpecies.ROBIN,
  eurasian_jay: BirdSpecies.ROBIN,
  wood_pigeon: BirdSpecies.ROBIN,
  greenfinch: BirdSpecies.ROBIN,
  nuthatch: BirdSpecies.ROBIN,
  wren: BirdSpecies.ROBIN,
  song_thrush: BirdSpecies.ROBIN,
  tawny_owl: BirdSpecies.OWL,
  barn_owl: BirdSpecies.OWL,
  little_owl: BirdSpecies.OWL,
}

export function mapDbBirdIdToGroup(id: string): BirdSpecies {
  const norm = id.toLowerCase()
  if (explicit[norm]) return explicit[norm]
  if (/(swift|swallow|martin)/.test(norm)) return BirdSpecies.SWIFT
  if (/(owl|nightjar)/.test(norm)) return BirdSpecies.OWL
  return BirdSpecies.ROBIN
}
