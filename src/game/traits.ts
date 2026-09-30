/** Heritable traits in words. The player sees how a plant fares, not the numbers behind it. */
export const TRAITS = ['drought_tolerance', 'cold_resistance', 'growth_efficiency', 'reproduction_vigor', 'nutrient_efficiency'] as const
export type Trait = (typeof TRAITS)[number]

export const TRAIT_NAMES: Record<Trait, string> = {
  drought_tolerance: 'Drought tolerance',
  cold_resistance: 'Frost hardiness',
  growth_efficiency: 'Growth',
  reproduction_vigor: 'Seed set',
  nutrient_efficiency: 'Poor-soil tolerance',
}

/** What a trait well below and well above the species' ordinary value looks like. */
const WORDS: Record<Trait, [string, string]> = {
  drought_tolerance: ['wilts in drought', 'hardy in drought'],
  cold_resistance: ['tender to frost', 'hardy to frost'],
  growth_efficiency: ['slow-growing', 'vigorous'],
  reproduction_vigor: ['sets little seed', 'sets seed freely'],
  nutrient_efficiency: ['needs rich soil', 'thrives on poor soil'],
}
/** How far from the ordinary 0.5 a trait must be before it shows. */
const NOTICEABLE = 0.1

export function traitWords(traits: Partial<Record<string, number>> = {}): string[] {
  return TRAITS.flatMap(id => {
    const value = traits[id] ?? 0.5
    return value <= 0.5 - NOTICEABLE ? [WORDS[id][0]] : value >= 0.5 + NOTICEABLE ? [WORDS[id][1]] : []
  })
}

/** A plant's traits as one line. */
export function traitLine(traits?: Partial<Record<string, number>>): string {
  const words = traitWords(traits)
  return words.length ? words.join(', ') : 'ordinary for its kind'
}

/** Seed a fruiting plant must have ripened before it can give any, as in the engine. */
export const RIPE = 0.1

/** Whether a plant has seed to give; `least` asks for riper seed than the first. */
export function isRipe(plant: { phenologyStage?: string; reproductiveOutput: number }, least = RIPE): boolean {
  return plant.phenologyStage === 'fruiting' && plant.reproductiveOutput >= least
}

/** How ripe a fruiting plant's seed is; the engine's viability follows the same reserve. */
export function ripeness(reserve: number): string {
  return reserve < 0.35 ? 'barely ripe, seed often fails' : reserve < 0.7 ? 'ripening' : 'fully ripe'
}

/** Bins over [0, 1], as the engine records a species' baseline. */
export const BINS = 10

export function spread(values: number[]): number[] {
  const counts = new Array<number>(BINS).fill(0)
  for (const value of values) counts[Math.min(BINS - 1, Math.max(0, Math.floor(value * BINS)))]++
  return counts
}

export function mean(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0)
  return total ? counts.reduce((sum, count, bin) => sum + count * (bin + 0.5) / BINS, 0) / total : 0.5
}

/** A species' trait spread when first recorded at a site, as the engine keeps it. */
export interface Baseline { tick: number; traits: Partial<Record<Trait, number[]>> }

export interface TraitShift { trait: Trait; name: string; then: number[]; now: number[]; words?: string }

/** How far a trait's mean must move before it counts as a shift. */
const SHIFTED = 0.03

/** Each trait's spread then and now, with the direction of any shift in words. */
export function adaptation(baseline: Baseline, living: Array<Partial<Record<string, number>>>): TraitShift[] {
  return TRAITS.map(trait => {
    const then = baseline.traits[trait] ?? new Array<number>(BINS).fill(0)
    const now = spread(living.map(traits => traits[trait] ?? 0.5))
    const shift = mean(now) - mean(then)
    const words = Math.abs(shift) < SHIFTED ? undefined : `shifted towards ${WORDS[trait][shift > 0 ? 1 : 0]}`
    return { trait, name: TRAIT_NAMES[trait], then, now, words }
  })
}
