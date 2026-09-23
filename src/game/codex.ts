import catalogue from '@/database/catalogue.json'
import { buildFaunaDefinitions, type FaunaLink } from '@/simulation/faunaDefinitions'
import type { Season, SpeciesDefinition } from '@/simulation/SpeciesRegistry'
import { pairKey, type Knowledge } from './knowledge'

export type CodexGroup = 'plant' | 'pollinator' | 'bird'

/** One fact about a species: the parts the player has seen, and how many are still `?`. */
export interface CodexFact { label: string; known: string[]; missing: number }
export interface CodexPartner { id: string; name: string; takes: FaunaLink['takes']; known: boolean }

export interface CodexEntry {
  id: string
  name: string
  scientificName: string
  group: CodexGroup
  known: boolean
  facts: CodexFact[]
  partners: CodexPartner[]
  /** Share of this entry's facts and partners the player has seen [0-1]. */
  progress: number
}

const PLANTS = catalogue.plants as SpeciesDefinition[]
const ANIMALS = [
  ...catalogue.pollinators.map(p => ({ id: p.id, name: p.common_name ?? p.name, scientificName: p.name, group: 'pollinator' as const })),
  ...catalogue.birds.map(b => ({ id: b.id, name: b.common_name ?? b.name, scientificName: b.name, group: 'bird' as const })),
]
// Every interaction the game can show: the links animals feed by in the engine.
const LINKS = buildFaunaDefinitions(catalogue).flatMap(def => def.forage.map(link => ({ animal: def.id, plant: link.plant, takes: link.takes })))
const NAMES = new Map<string, string>([...PLANTS.map(p => [p.id, p.name] as const), ...ANIMALS.map(a => [a.id, a.name] as const)])

function seasonFact(label: string, truth: Season[], seen: Season[] = []): CodexFact {
  const known = truth.filter(season => seen.includes(season))
  return { label, known, missing: truth.length - known.length }
}

function entry(base: Omit<CodexEntry, 'progress' | 'known'>, knowledge: Knowledge): CodexEntry {
  const slots = base.facts.reduce((n, f) => n + f.known.length + f.missing, 0) + base.partners.length
  const seen = base.facts.reduce((n, f) => n + f.known.length, 0) + base.partners.filter(p => p.known).length
  return { ...base, known: base.id in knowledge.species, progress: slots === 0 ? 1 : seen / slots }
}

/** Every species in the Codex, with what the player knows set against what is true. */
export function codexEntries(knowledge: Knowledge): CodexEntry[] {
  const plants = PLANTS.map(plant => {
    const seen = knowledge.species[plant.id]
    const facts = [
      seasonFact('Flowers', plant.ecology?.floweringSeasons ?? [], seen?.flowering),
      seasonFact('Fruits', plant.ecology?.fruitingSeasons ?? [], seen?.fruiting),
    ].filter(fact => fact.known.length + fact.missing > 0)
    if ((plant.clonalRate ?? 0) > 0) facts.push({ label: 'Spreads without seed', known: seen?.spreads ? ['yes'] : [], missing: seen?.spreads ? 0 : 1 })
    const partners = LINKS.filter(link => link.plant === plant.id).map(link => ({
      id: link.animal, name: NAMES.get(link.animal) ?? link.animal, takes: link.takes, known: pairKey(link.animal, plant.id) in knowledge.interactions,
    }))
    return entry({ id: plant.id, name: plant.name, scientificName: plant.scientificName ?? '', group: 'plant', facts, partners }, knowledge)
  })
  const animals = ANIMALS.map(animal => {
    const partners = LINKS.filter(link => link.animal === animal.id).map(link => ({
      id: link.plant, name: NAMES.get(link.plant) ?? link.plant, takes: link.takes, known: pairKey(animal.id, link.plant) in knowledge.interactions,
    }))
    return entry({ ...animal, facts: [], partners }, knowledge)
  })
  return [...plants, ...animals]
}

export interface Tally { known: number; total: number }

/** Known/total for each Codex section. */
export function codexTotals(knowledge: Knowledge): Record<CodexGroup | 'interaction', Tally> {
  const entries = codexEntries(knowledge)
  const tally = (group: CodexGroup) => ({ known: entries.filter(e => e.group === group && e.known).length, total: entries.filter(e => e.group === group).length })
  return {
    plant: tally('plant'),
    pollinator: tally('pollinator'),
    bird: tally('bird'),
    interaction: { known: LINKS.filter(link => pairKey(link.animal, link.plant) in knowledge.interactions).length, total: LINKS.length },
  }
}

/** What goals measure of the player's understanding. */
export function knowledgeSummary(knowledge: Knowledge) {
  return {
    knownSpecies: Object.keys(knowledge.species).length,
    completeEntries: codexEntries(knowledge).filter(e => e.known && e.progress === 1).length,
    interactions: Object.keys(knowledge.interactions).length,
  }
}
export type KnowledgeSummary = ReturnType<typeof knowledgeSummary>
