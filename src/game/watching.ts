import catalogue from '@/database/catalogue.json'
import { buildFaunaDefinitions, type FaunaLink } from '@/simulation/faunaDefinitions'
import { buildFungusDefinitions } from '@/simulation/fungusDefinitions'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'
import type { Knowledge, Phase } from './knowledge'
import { speciesInfo } from './speciesInfo'

/** A hex as watching needs it: where it is, its plants and the animals about. */
export interface WatchedHex {
  id: string
  x: number
  y: number
  species: { forEach(fn: (plant: { speciesId: string; phenologyStage?: string }) => void): void }
  fauna?: Record<string, number>
}

const FORAGE = new Map(buildFaunaDefinitions(catalogue).map(def => [def.id, def.forage]))
/** Which plant stage offers what an animal takes. */
const OFFERED_AT: Record<FaunaLink['takes'], (stage: string) => boolean> = {
  nectar: stage => stage === 'flowering',
  fruit: stage => stage === 'fruiting',
  seed: stage => stage === 'fruiting',
  insects: stage => stage !== 'dormant',
}
const TAKING: Record<FaunaLink['takes'], string> = { nectar: 'nectaring on', fruit: 'eating the fruit of', seed: 'taking seed from', insects: 'hunting insects on' }

const present = (hex: WatchedHex) => Object.entries(hex.fauna ?? {}).filter(([, count]) => count >= 1).map(([id]) => id)

/** An animal as the player knows it: by name once seen, "(heard)" once heard, else only its kind. */
export function animalLabel(id: string, knowledge: Pick<Knowledge, 'species' | 'heard'>): string {
  const info = speciesInfo(id)
  if (knowledge.species[id]) return info.name
  if (knowledge.heard?.[id] !== undefined) return `${info.name} (heard)`
  return info.kind === 'bird' ? 'an unfamiliar bird' : 'an unfamiliar insect'
}

/** The hexes touching one on the map (pointy-top rows, odd rows shifted right). */
export function neighbours(x: number, y: number): Array<[number, number]> {
  const shift = y % 2 === 1 ? 0 : -1
  return [[x - 1, y], [x + 1, y], [x + shift, y - 1], [x + shift + 1, y - 1], [x + shift, y + 1], [x + shift + 1, y + 1]]
}

/** What a listener in a hex hears: the animals there and in the hexes around it. */
export function listen(hexes: Iterable<WatchedHex>, at: { x: number; y: number }): string[] {
  const near = new Set([`${at.x},${at.y}`, ...neighbours(at.x, at.y).map(([x, y]) => `${x},${y}`)])
  const heard = new Set<string>()
  for (const hex of hexes) if (near.has(`${hex.x},${hex.y}`)) present(hex).forEach(id => heard.add(id))
  return [...heard]
}

/** Plants in the hex offering this animal its food now, with how many of each. */
export function onOffer(hex: WatchedHex, animal: string): Array<{ plant: string; takes: FaunaLink['takes']; count: number }> {
  const offers = new Map<string, { plant: string; takes: FaunaLink['takes']; count: number }>()
  const links = FORAGE.get(animal) ?? []
  hex.species.forEach(plant => {
    // A hybrid feeds whatever feeds its parents, as in the engine.
    const kin = [plant.speciesId, ...(SpeciesRegistry.getInstance().getSpecies(plant.speciesId)?.hybridOf ?? [])]
    const link = links.find(l => kin.includes(l.plant) && OFFERED_AT[l.takes](plant.phenologyStage ?? ''))
    if (!link) return
    const offer = offers.get(plant.speciesId) ?? { plant: plant.speciesId, takes: link.takes, count: 0 }
    offer.count += 1
    offers.set(plant.speciesId, offer)
  })
  return [...offers.values()]
}

function pick<T>(items: T[], weight: (item: T) => number, rand: () => number): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let roll = rand() * total
  return items.find(item => (roll -= weight(item)) < 0) ?? items[items.length - 1]
}

/** Chance an animal with food at hand is caught feeding rather than resting. */
const FEEDING = 0.7

/** A photo's subject in the frame: an animal feeding (the interaction it shows) or at rest, or a plant. */
export function photograph(hex: WatchedHex, subject: string, rand: () => number): { caption: string; plant?: string } {
  const info = speciesInfo(subject)
  if (!info.animal) {
    let stage = ''
    hex.species.forEach(plant => { if (plant.speciesId === subject && !stage) stage = plant.phenologyStage ?? '' })
    return { caption: stage === 'flowering' ? 'in flower' : stage === 'fruiting' ? 'in fruit' : 'growing' }
  }
  const offer = pick(onOffer(hex, subject), o => o.count, rand)
  if (offer && rand() < FEEDING) return { caption: `${TAKING[offer.takes]} ${speciesInfo(offer.plant).name}`, plant: offer.plant }
  return { caption: info.kind === 'bird' ? 'perched, watching' : 'resting on a leaf' }
}

/** Where a followed animal flies next: a touching hex where its food is on offer, and what it feeds on there. */
export function nextHop(hexes: WatchedHex[], animal: string, at: { x: number; y: number }, rand: () => number): { hex: WatchedHex; plant: string } | undefined {
  const around = new Set(neighbours(at.x, at.y).map(([x, y]) => `${x},${y}`))
  const options = hexes
    .filter(hex => around.has(`${hex.x},${hex.y}`))
    .map(hex => ({ hex, offers: onOffer(hex, animal) }))
    .filter(option => option.offers.length > 0)
  const choice = pick(options, o => o.offers.reduce((n, offer) => n + offer.count, 0), rand)
  const offer = choice && pick(choice.offers, o => o.count, rand)
  return choice && offer ? { hex: choice.hex, plant: offer.plant } : undefined
}

/** The firsts a player can note in a hex now: flowers, fruit, and animals they know by sight. */
export function visibleFirsts(hex: WatchedHex, knowledge: Pick<Knowledge, 'species'>): Array<{ species: string; phase: Phase }> {
  const firsts = new Map<string, { species: string; phase: Phase }>()
  hex.species.forEach(plant => {
    const phase: Phase | undefined = plant.phenologyStage === 'flowering' ? 'flower' : plant.phenologyStage === 'fruiting' ? 'fruit' : undefined
    if (phase) firsts.set(`${plant.speciesId}|${phase}`, { species: plant.speciesId, phase })
  })
  for (const id of present(hex)) if (knowledge.species[id]) firsts.set(`${id}|arrival`, { species: id, phase: 'arrival' })
  return [...firsts.values()]
}

const PHASES: Array<[Phase, string]> = [['flower', 'first flower'], ['fruit', 'first fruit'], ['arrival', 'arrived']]

/** A site's calendar: per species, each year's noted firsts in words, newest year first. */
export function calendar(site: Knowledge['phenology'][string] = {}, nameOf: (id: string) => string): Array<{ species: string; name: string; years: string[] }> {
  return Object.entries(site)
    .map(([species, years]) => ({
      species,
      name: nameOf(species),
      years: Object.entries(years)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([year, noted]) => `Year ${year}: ${PHASES.filter(([phase]) => noted[phase] !== undefined).map(([phase, words]) => `${words} day ${noted[phase]}`).join(' · ')}`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const FUNGAL_HOSTS = new Map(buildFungusDefinitions(catalogue as any).map(def => [def.id, def.hosts]))

/** The fungi fruiting in a hex, each with the host plants growing there (a hybrid counts through its parents). */
export function fruitingBodies(hex: WatchedHex & { fruiting?: string[] }): Array<{ fungus: string; hosts: string[] }> {
  return (hex.fruiting ?? []).map(fungus => {
    const hosts = new Set<string>()
    const of = FUNGAL_HOSTS.get(fungus) ?? []
    hex.species.forEach(plant => {
      const kin = [plant.speciesId, ...(SpeciesRegistry.getInstance().getSpecies(plant.speciesId)?.hybridOf ?? [])]
      if (kin.some(id => of.includes(id))) hosts.add(plant.speciesId)
    })
    return { fungus, hosts: [...hosts] }
  })
}
