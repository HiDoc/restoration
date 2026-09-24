import { speciesInfo } from './speciesInfo'
import { STARTING_MEADOW } from './startingMeadow'
import { STARTER_SEEDS } from './seeds'

/** What a site counts as restored. */
export interface SiteTargets {
  /** Share of hexes holding a real patch of plants. */
  cover: number
  plantKinds: number
  pollinatorKinds: number
  birdKinds: number
}

export interface Site {
  id: string
  name: string
  blurb: string
  world: { width: number; height: number; seed: number }
  /** Starting ground, applied to every hex. */
  conditions?: { moisture?: number; pollution?: number; nutrients?: number }
  /** Plants already growing in the centre when the site is founded. */
  established: string[]
  /** Seeds the player gets the first time they arrive. */
  starterSeeds: Record<string, number>
  targets: SiteTargets
  unlocks?: string
}

export const SITES: Site[] = [
  {
    id: 'meadow',
    name: 'The Old Meadow',
    blurb: 'A grazed-out pasture with one surviving patch of grass, clover and bluebells under a few hawthorns.',
    world: { width: 6, height: 6, seed: 12345 },
    established: STARTING_MEADOW,
    starterSeeds: STARTER_SEEDS,
    targets: { cover: 0.5, plantKinds: 8, pollinatorKinds: 2, birdKinds: 2 },
    unlocks: 'woodland',
  },
  {
    id: 'woodland',
    name: 'Felled Wood',
    blurb: 'Clear-felled twenty years ago. Bracken took the ground; a few old oaks and birches still stand.',
    world: { width: 6, height: 6, seed: 2718 },
    conditions: { moisture: 0.55, nutrients: 0.4 },
    established: ['bracken_fern', 'english_oak', 'silver_birch'],
    starterSeeds: { sessile_oak: 2, midland_hawthorn: 3, wild_bluebell: 3 },
    targets: { cover: 0.6, plantKinds: 10, pollinatorKinds: 2, birdKinds: 4 },
  },
]

export const siteById = (id: string) => SITES.find(site => site.id === id)

/** What a site's map holds now. */
export interface SiteSurvey {
  hexes: number
  coveredHexes: number
  plantKinds: number
  pollinatorKinds: number
  birdKinds: number
}

interface SurveyedHex {
  species: { size: number; forEach(fn: (plant: { speciesId: string }) => void): void }
  fauna?: Record<string, number>
}

// A hex counts as covered once it holds a patch, not a lone seedling.
const PATCH = 3

export function surveySite(chunks: Iterable<SurveyedHex>): SiteSurvey {
  const plants = new Set<string>()
  const animals = new Set<string>()
  let hexes = 0
  let coveredHexes = 0
  for (const chunk of chunks) {
    hexes += 1
    if (chunk.species.size >= PATCH) coveredHexes += 1
    chunk.species.forEach(plant => plants.add(plant.speciesId))
    Object.entries(chunk.fauna ?? {}).forEach(([id, count]) => count >= 1 && animals.add(id))
  }
  const birds = [...animals].filter(id => speciesInfo(id).kind === 'bird').length
  return { hexes, coveredHexes, plantKinds: plants.size, pollinatorKinds: animals.size - birds, birdKinds: birds }
}

/** How far a site has come: reached stages stay reached; `heldSeasons` counts toward stability. */
export interface SiteProgress {
  stage: number
  heldSeasons: number
}

interface Stage {
  title: string
  /** Whether the survey meets this stage's target. */
  met: (survey: SiteSurvey, targets: SiteTargets) => boolean
  /** The target in words, with where the map stands now. */
  goal: (survey: SiteSurvey, targets: SiteTargets, progress: SiteProgress) => string
}

const needed = (survey: SiteSurvey, targets: SiteTargets) => Math.ceil(targets.cover * survey.hexes)
const kinds = (n: number, what: string) => `${n} ${n === 1 ? 'kind' : 'kinds'} of ${what}`

// Seasons in a row the whole community must hold before a site counts as stable.
export const STABLE_SEASONS = 4

export const STAGES: Stage[] = [
  { title: 'Degraded', met: () => true, goal: () => '' },
  {
    title: 'Pioneers',
    met: (s, t) => s.coveredHexes >= needed(s, t),
    goal: (s, t) => `Plants established in ${needed(s, t)} hexes (${s.coveredHexes} now)`,
  },
  {
    title: 'Pollinators',
    met: (s, t) => s.pollinatorKinds >= t.pollinatorKinds,
    goal: (s, t) => `${kinds(t.pollinatorKinds, 'pollinator')} visiting (${s.pollinatorKinds} now)`,
  },
  {
    title: 'Birds',
    met: (s, t) => s.birdKinds >= t.birdKinds,
    goal: (s, t) => `${kinds(t.birdKinds, 'bird')} living here (${s.birdKinds} now)`,
  },
  {
    title: 'Stable',
    met: (s, t) => STAGES.slice(1, 4).every(stage => stage.met(s, t)) && s.plantKinds >= t.plantKinds,
    goal: (s, t, p) =>
      `${kinds(t.plantKinds, 'plant')} (${s.plantKinds} now) and everything above, held through ${STABLE_SEASONS} season changes (${p.heldSeasons} so far)`,
  },
]

export const STABLE = STAGES.length - 1

/**
 * The next progress for a survey. Stages are reached in order; stability is judged only when a season turns,
 * and a season that falls short starts the count again.
 */
export function advance(progress: SiteProgress, survey: SiteSurvey, targets: SiteTargets, seasonTurned: boolean): SiteProgress {
  let { stage, heldSeasons } = progress
  while (stage < STABLE - 1 && STAGES[stage + 1].met(survey, targets)) stage += 1
  if (stage === STABLE - 1 && seasonTurned) {
    heldSeasons = STAGES[STABLE].met(survey, targets) ? heldSeasons + 1 : 0
    if (heldSeasons >= STABLE_SEASONS) stage = STABLE
  }
  return { stage, heldSeasons }
}
