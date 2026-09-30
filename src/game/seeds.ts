import catalogue from '@/database/catalogue.json'
import type { SpeciesDefinition } from '@/simulation/SpeciesRegistry'
import { list } from './hexDescription'

/** A new game's pouch: two plants the starting meadow lacks, each feeding animals the meadow cannot. */
export const STARTER_SEEDS: Record<string, number> = { pioneer_willow: 3, silver_birch: 3 }

/** Seeds sent for each completed goal. */
export const REWARD_SEEDS = 3

interface Place { species: { forEach(fn: (plant: { speciesId: string }) => void): void } }

/** The first catalogue plant neither growing on the map nor in the pouch, so each reward brings a new species in. */
export function rewardSpecies(chunks: Iterable<Place>, pouch: Record<string, number>): string | null {
  const have = new Set(Object.keys(pouch))
  for (const chunk of chunks) chunk.species.forEach(plant => have.add(plant.speciesId))
  return catalogue.plants.find(plant => !have.has(plant.id))?.id ?? null
}

export interface HexConditions {
  biomeState: { moisture: number; canopy: number; pollution: number; soil: number }
  climateState: { light: number }
}

export interface HabitatFit { good: boolean; words: string }

// Pollution and poor soil both slow growth in the engine; below these they are worth a warning.
const POLLUTED = 0.3
const POOR_SOIL = 0.3

/**
 * How a species would fare in a hex, in words, from the stress terms the engine applies to a growing plant.
 * Temperature is left out: it follows the season across the whole map, not the hex.
 */
export function habitatFit(species: SpeciesDefinition, hex: HexConditions): HabitatFit {
  const { moisture, canopy, pollution, soil } = hex.biomeState
  const groundLight = hex.climateState.light * (1 - canopy * (1 - species.shadeToleranceMax))
  const problems = [
    moisture < species.moistureRange.min && 'too dry',
    moisture > species.moistureRange.max && 'too wet',
    groundLight < species.lightRequirement && 'too shady',
    pollution > POLLUTED && 'polluted',
    soil < POOR_SOIL && 'poor soil',
  ].filter((problem): problem is string => Boolean(problem))
  if (problems.length === 0) return { good: true, words: 'Likes it here.' }
  const text = list(problems)
  return { good: false, words: `${text[0].toUpperCase()}${text.slice(1)}.` }
}

export interface PouchOption { key: string; speciesId: string; origin?: string; label: string }

/**
 * The pouch as the planting list shows it: one line per species, split by the site the seed was set on once a
 * species holds seed from more than one, so the player can choose which to sow.
 */
export function pouchOptions(pouch: Record<string, Record<string, number>>, nameOf: (id: string) => string, siteName: (id: string) => string): PouchOption[] {
  return Object.entries(pouch).flatMap(([speciesId, origins]) => {
    const name = nameOf(speciesId)
    const groups = Object.entries(origins)
    if (groups.length === 1) return [{ key: speciesId, speciesId, label: `${name} × ${groups[0][1]}` }]
    return groups.map(([origin, count]) => ({
      key: `${speciesId}|${origin}`,
      speciesId,
      origin,
      label: `${name}, ${origin ? `from ${siteName(origin)}` : 'packet seed'} × ${count}`,
    }))
  })
}
