import type { Habitat } from '@/game/hexDescription'
import { HEX_SCENE, HEX_TILE } from './hexTiles'

export { SPRITE_ICON } from './hexTiles'

const BIOME: Record<Habitat, string> = {
  open_water: 'wetland',
  wetland: 'wetland',
  woodland: 'forest',
  scrub: 'grassland',
  meadow: 'grassland',
  dry_grassland: 'savanna',
  blighted: 'wasteland',
  bare: 'wasteland',
}

/** Map tile, photograph backdrop and legacy biome name (used by the calm view's seasonal tint) for each habitat. */
export const HABITAT_LOOK = Object.fromEntries(
  (Object.keys(HEX_TILE) as Habitat[]).map(habitat => [habitat, { tile: HEX_TILE[habitat], scene: HEX_SCENE[habitat], biome: BIOME[habitat] }]),
) as Record<Habitat, { tile: string; scene: string; biome: string }>

/** A habitat in words, for captions and the Codex. */
export const HABITAT_WORDS: Record<Habitat, string> = {
  open_water: 'open water',
  wetland: 'marsh',
  woodland: 'woodland',
  scrub: 'scrub',
  meadow: 'meadow',
  dry_grassland: 'dry grassland',
  blighted: 'blighted ground',
  bare: 'bare ground',
}
