import type { Season } from '@/simulation/SpeciesRegistry'
import { speciesInfo } from './speciesInfo'
import type { Discovery, Knowledge } from './knowledge'

interface Plant { speciesId: string; phenologyStage?: string; limit?: string }

/** What a mystery can see of a site: its hexes as the engine projects them, and the season. */
export interface SiteView {
  season: Season
  chunks: Iterable<{ species: { forEach(fn: (plant: Plant) => void): void }; fauna?: Record<string, number> }>
}

export interface Mystery {
  id: string
  site: string
  question: string
  /** A nudge towards the cause, shown while the mystery is open. */
  clue: string
  /** The cause, logged in the Codex once solved. */
  explanation: string
  noticed: (view: SiteView) => boolean
  solved: (view: SiteView) => boolean
}

function plants(view: SiteView, species: string, stage?: string): Plant[] {
  const found: Plant[] = []
  for (const chunk of view.chunks) chunk.species.forEach(p => { if (p.speciesId === species && (!stage || p.phenologyStage === stage)) found.push(p) })
  return found
}

function animals(view: SiteView): Set<string> {
  const present = new Set<string>()
  for (const chunk of view.chunks) Object.entries(chunk.fauna ?? {}).forEach(([id, count]) => count >= 1 && present.add(id))
  return present
}

const pollinators = (view: SiteView) => [...animals(view)].filter(id => speciesInfo(id).kind !== 'bird')

/** Most of a species' fruiting plants set seed nobody pollinated; `undefined` when too few fruit to tell. */
function barren(view: SiteView, species: string): boolean | undefined {
  const fruiting = plants(view, species, 'fruiting')
  if (fruiting.length < 3) return undefined
  return fruiting.filter(p => p.limit === 'no_pollinator').length * 2 >= fruiting.length
}

export const MYSTERIES: Mystery[] = [
  {
    id: 'meadow_blues',
    site: 'meadow',
    question: 'Clover blooms all over the meadow, so why do no Common Blues come?',
    clue: 'Common Blues seldom fly further than the next field of flowers.',
    explanation:
      'The meadow was an island in bare ground. Common Blues rarely cross more than a hex without flowers, so none could find it until plants spread to the edge and linked it to the land beyond.',
    noticed: view => view.season === 'summer' && plants(view, 'white_clover', 'flowering').length >= 10 && !animals(view).has('common_blue'),
    solved: view => animals(view).has('common_blue'),
  },
  {
    id: 'woodland_silence',
    site: 'woodland',
    question: 'Why is the wood silent all summer, without a bee or butterfly?',
    clue: 'Oak, birch, hazel and bracken all flower early or not at all.',
    explanation:
      'Nothing in the felled wood flowered in summer, so there was no nectar for bees or butterflies. Summer flowers along the rides, such as bramble and honeysuckle, brought them in.',
    noticed: view => view.season === 'summer' && pollinators(view).length === 0,
    solved: view => view.season === 'summer' && pollinators(view).length >= 2,
  },
  {
    id: 'wetland_catkins',
    site: 'wetland',
    question: 'The willows flower in early spring, so why do their catkins set no seed?',
    clue: 'Few insects fly as early as willow catkins open, and the hollow is cut off from the land around it.',
    explanation:
      'Willow depends on the first bees of spring: mining bees and bumblebee queens. They could not reach the hollow across bare ground; once cover linked it to its surroundings, they came and the catkins set seed.',
    noticed: view => barren(view, 'grey_willow') === true,
    solved: view => barren(view, 'grey_willow') === false,
  },
]

/**
 * Notice a site's mysteries when their symptom shows and solve them when the cause is gone, recording both in
 * the player's knowledge (in place). A mystery is solved only after the tick it was noticed.
 */
export function investigate(knowledge: Knowledge, siteId: string, view: SiteView, tick: number): Discovery[] {
  const found: Discovery[] = []
  for (const mystery of MYSTERIES.filter(m => m.site === siteId)) {
    const record = knowledge.mysteries[mystery.id]
    if (!record && mystery.noticed(view)) {
      knowledge.mysteries[mystery.id] = { noticed: tick }
      found.push({ kind: 'mystery', id: mystery.id, solved: false })
    } else if (record && record.solved === undefined && tick > record.noticed && mystery.solved(view)) {
      record.solved = tick
      found.push({ kind: 'mystery', id: mystery.id, solved: true })
    }
  }
  return found
}
