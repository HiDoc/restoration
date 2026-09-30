import type { Habitat } from '@/game/hexDescription'
import { nv } from './nouveauAssets'

/** Kit tile and legacy biome name (used by the calm view's seasonal tint) for each habitat. */
export const HABITAT_LOOK: Record<Habitat, { tile: string; biome: string; wash?: string }> = {
  open_water: { tile: nv('hex-water'), biome: 'wetland' },
  // Marsh: grassland under a wash of water.
  wetland: { tile: nv('hex-grassland'), biome: 'wetland', wash: 'rgba(52, 110, 128, 0.38)' },
  woodland: { tile: nv('hex-forest'), biome: 'forest' },
  scrub: { tile: nv('hex-grassland'), biome: 'grassland' }, // the grassland tile shows scattered trees
  meadow: { tile: nv('hex-grassland'), biome: 'grassland' },
  dry_grassland: { tile: nv('hex-savanna'), biome: 'savanna' },
  blighted: { tile: nv('hex-degraded'), biome: 'wasteland' },
  bare: { tile: nv('hex-degraded'), biome: 'wasteland' },
}

/** Sprite drawn for an animal group; butterflies have none and are drawn as an inline shape. */
export const SPRITE_ICON: Record<string, string> = { bird: nv('icon-birds'), bee: nv('icon-pollinators'), hoverfly: nv('icon-pollinators') }

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
