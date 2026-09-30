import catalogue from '@/database/catalogue.json'
import { buildFaunaDefinitions, type FaunaLink } from '@/simulation/faunaDefinitions'
import { buildFungusDefinitions, type FungalLink } from '@/simulation/fungusDefinitions'
import { SpeciesRegistry, type Season, type SpeciesDefinition } from '@/simulation/SpeciesRegistry'
import { pairKey, type Knowledge } from './knowledge'
import { MYSTERIES } from './mysteries'

export type CodexGroup = 'plant' | 'pollinator' | 'bird' | 'fungus'
export type CodexTab = CodexGroup | 'interaction' | 'mystery'

/** One fact about a species: the parts the player has seen, and how many are still `?`. */
export interface CodexFact { label: string; known: string[]; missing: number }
export interface CodexPartner { id: string; name: string; takes: FaunaLink['takes'] | FungalLink; known: boolean }

export interface CodexEntry {
  id: string
  name: string
  scientificName: string
  group: CodexGroup
  known: boolean
  /** Heard but not yet seen. */
  heard: boolean
  facts: CodexFact[]
  partners: CodexPartner[]
  /** For a bred hybrid, its parents ("Bluebell × Spanish Bluebell"). */
  pedigree?: string
  /** Share of this entry's facts and partners the player has seen [0-1]. */
  progress: number
}

const PLANTS = catalogue.plants as SpeciesDefinition[]
const ANIMALS = [
  ...catalogue.pollinators.map(p => ({ id: p.id, name: p.common_name ?? p.name, scientificName: p.name, group: 'pollinator' as const })),
  ...catalogue.birds.map(b => ({ id: b.id, name: b.common_name ?? b.name, scientificName: b.name, group: 'bird' as const })),
]
const FUNGI = catalogue.fungi.map(f => ({ id: f.id, name: f.common_name, scientificName: f.name, group: 'fungus' as const }))
const FUNGAL_LINK: Record<string, FungalLink> = { mycorrhizal: 'mycorrhiza', parasite: 'parasitism', saprotroph: 'decomposition' }
const FRUITING = new Map(buildFungusDefinitions(catalogue as any).map(def => [def.id, def]))
// Every interaction the game can show: the links animals feed by in the engine, and fungi with their hosts.
// A fungus stands in the `animal` place of its links.
const LINKS: Array<{ animal: string; plant: string; takes: FaunaLink['takes'] | FungalLink }> = [
  ...buildFaunaDefinitions(catalogue).flatMap(def => def.forage.map(link => ({ animal: def.id, plant: link.plant, takes: link.takes }))),
  ...[...FRUITING.values()].flatMap(def => def.hosts.map(plant => ({ animal: def.id, plant, takes: FUNGAL_LINK[def.lifestyle] }))),
]
/** What each pair (`animal|plant`, or fungus in the animal's place) consists of. */
export const TAKES_OF = new Map(LINKS.map(link => [pairKey(link.animal, link.plant), link.takes]))
const NAMES = new Map<string, string>([...PLANTS.map(p => [p.id, p.name] as const), ...ANIMALS.map(a => [a.id, a.name] as const), ...FUNGI.map(f => [f.id, f.name] as const)])

function seasonFact(label: string, truth: Season[], seen: Season[] = []): CodexFact {
  const known = truth.filter(season => seen.includes(season))
  return { label, known, missing: truth.length - known.length }
}

function entry(base: Omit<CodexEntry, 'progress' | 'known' | 'heard'>, knowledge: Knowledge): CodexEntry {
  const slots = base.facts.reduce((n, f) => n + f.known.length + f.missing, 0) + base.partners.length
  const seen = base.facts.reduce((n, f) => n + f.known.length, 0) + base.partners.filter(p => p.known).length
  const known = base.id in knowledge.species
  return { ...base, known, heard: !known && knowledge.heard?.[base.id] !== undefined, progress: slots === 0 ? 1 : seen / slots }
}

/** Every species in the Codex, with what the player knows set against what is true. */
export function codexEntries(knowledge: Knowledge): CodexEntry[] {
  // Hybrids exist in the Codex only once the player has seen one growing.
  const hybrids = SpeciesRegistry.getInstance().getAllSpecies().filter(s => s.hybridOf?.length && s.id in knowledge.species)
  const plants = [...PLANTS, ...hybrids].map(plant => {
    const seen = knowledge.species[plant.id]
    const facts = [
      seasonFact('Flowers', plant.ecology?.floweringSeasons ?? [], seen?.flowering),
      seasonFact('Fruits', plant.ecology?.fruitingSeasons ?? [], seen?.fruiting),
    ].filter(fact => fact.known.length + fact.missing > 0)
    if ((plant.clonalRate ?? 0) > 0) facts.push({ label: 'Spreads without seed', known: seen?.spreads ? ['yes'] : [], missing: seen?.spreads ? 0 : 1 })
    // A hybrid is visited by whatever visits its parents, once per animal (as the engine links it).
    const feeds = (link: (typeof LINKS)[number]) => link.plant === plant.id || plant.hybridOf?.includes(link.plant)
    const partners = LINKS.filter((link, i, all) => feeds(link) && all.findIndex(l => feeds(l) && l.animal === link.animal) === i).map(link => ({
      id: link.animal, name: NAMES.get(link.animal) ?? link.animal, takes: link.takes, known: pairKey(link.animal, plant.id) in knowledge.interactions,
    }))
    const pedigree = plant.hybridOf?.map(id => NAMES.get(id) ?? id).join(' × ')
    return entry({ id: plant.id, name: knowledge.names[plant.id] ?? plant.name, scientificName: plant.scientificName ?? '', group: 'plant', facts, partners, pedigree }, knowledge)
  })
  const animals = ANIMALS.map(animal => {
    const partners = LINKS.filter(link => link.animal === animal.id).map(link => ({
      id: link.plant, name: NAMES.get(link.plant) ?? link.plant, takes: link.takes, known: pairKey(animal.id, link.plant) in knowledge.interactions,
    }))
    // Where a pollinator keeps to is learned by following one.
    const habitat = knowledge.species[animal.id]?.habitat
    const facts = animal.group === 'pollinator' ? [{ label: 'Found in', known: habitat ? [habitat] : [], missing: habitat ? 0 : 1 }] : []
    return entry({ ...animal, facts, partners }, knowledge)
  })
  const fungi = FUNGI.map(fungus => {
    const partners = LINKS.filter(link => link.animal === fungus.id).map(link => ({
      id: link.plant, name: NAMES.get(link.plant) ?? link.plant, takes: link.takes, known: pairKey(fungus.id, link.plant) in knowledge.interactions,
    }))
    const facts = [seasonFact('Fruits', FRUITING.get(fungus.id)?.fruitingSeasons ?? [], knowledge.species[fungus.id]?.fruiting)]
    return entry({ ...fungus, facts, partners }, knowledge)
  })
  return [...plants, ...animals, ...fungi]
}

export interface Tally { known: number; total: number }

/** Known/total for each Codex section. */
export function codexTotals(knowledge: Knowledge): Record<CodexTab, Tally> {
  const entries = codexEntries(knowledge)
  const tally = (group: CodexGroup) => ({ known: entries.filter(e => e.group === group && e.known).length, total: entries.filter(e => e.group === group).length })
  return {
    plant: tally('plant'),
    pollinator: tally('pollinator'),
    bird: tally('bird'),
    fungus: tally('fungus'),
    interaction: { known: LINKS.filter(link => pairKey(link.animal, link.plant) in knowledge.interactions).length, total: LINKS.length },
    mystery: { known: MYSTERIES.filter(m => knowledge.mysteries[m.id]?.solved !== undefined).length, total: MYSTERIES.length },
  }
}

/** What goals measure of the player's understanding. */
export function knowledgeSummary(knowledge: Knowledge) {
  return {
    knownSpecies: Object.keys(knowledge.species).length,
    completeEntries: codexEntries(knowledge).filter(e => e.known && e.progress === 1).length,
    interactions: Object.keys(knowledge.interactions).length,
    /** Firsts noted in the calendar, over every site and year. */
    noted: Object.values(knowledge.phenology ?? {}).flatMap(site => Object.values(site)).flatMap(years => Object.values(years)).reduce((n, firsts) => n + Object.keys(firsts).length, 0),
  }
}
export type KnowledgeSummary = ReturnType<typeof knowledgeSummary>
