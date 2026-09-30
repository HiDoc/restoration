import { TRAIT_NAMES, TRAITS } from './traits'
import type { Tag } from './journal'

export type Guess = 'lower' | 'between' | 'higher'
export const GUESSES: Guess[] = ['lower', 'between', 'higher']

/** A cross the player made, as the engine keeps it. */
export interface Cross {
  tick: number
  mother: string
  father: string
  motherSpecies: string
  fatherSpecies: string
  parents: [Record<string, number>, Record<string, number>]
  prediction: Partial<Record<string, Guess>>
  seedlings: Array<{ id: string; traits: Record<string, number> }>
}

export interface NotebookRow { name: string; predicted?: Guess; outcome: string; right?: boolean }
export interface NotebookEntry { key: string; title: string; status: string; rows: NotebookRow[] }

/** Where a child's trait falls against its parents'. Differences below this are noise, not a side. */
const MARGIN = 0.005
export function compare(child: number, a: number, b: number): Guess {
  return child < Math.min(a, b) - MARGIN ? 'lower' : child > Math.max(a, b) + MARGIN ? 'higher' : 'between'
}

/** The notebook: each cross, newest first, with the prediction for each trait against how the seedlings came out. */
export function notebookEntries(crosses: Cross[], tags: Record<string, Tag>, nameOf: (speciesId: string) => string): NotebookEntry[] {
  const parent = (id: string, species: string) => (tags[id] ? `${tags[id].label} ${nameOf(species)}` : nameOf(species))
  return crosses
    .map((cross, index) => {
      const [mother, father] = cross.parents
      const seedlings = cross.seedlings.length
      const rows = TRAITS.map((trait): NotebookRow => {
        const predicted = cross.prediction[trait]
        const outcomes = cross.seedlings.map(s => compare(s.traits[trait] ?? 0.5, mother[trait] ?? 0.5, father[trait] ?? 0.5))
        const counts = GUESSES.map(guess => [guess, outcomes.filter(o => o === guess).length] as const).filter(([, n]) => n > 0)
        const hits = outcomes.filter(o => o === predicted).length
        return {
          name: TRAIT_NAMES[trait],
          predicted,
          outcome: counts.map(([guess, n]) => `${n} ${guess}`).join(', '),
          right: predicted && seedlings ? hits * 2 > seedlings : undefined,
        }
      })
      return {
        key: `${index}`,
        title: `${parent(cross.mother, cross.motherSpecies)} × ${parent(cross.father, cross.fatherSpecies)}`,
        status: seedlings
          ? `${seedlings} ${seedlings === 1 ? 'seedling' : 'seedlings'} so far`
          : 'Waiting for its seed to come up. Collect it when ripe and sow it, or let it fall.',
        rows,
      }
    })
    .reverse()
}
