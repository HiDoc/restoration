/**
 * Genetic System - Handles mutations, trait inheritance, and genetic diversity
 */

import { RNGManager, SeededRNG } from './SeededRNG'
import { SpeciesInstance } from './WorldChunk'
import { SpeciesDefinition } from './SpeciesRegistry'

export interface GeneticTrait {
  id: string
  name: string
  value: number        // Current trait value
  baseValue: number    // Original species value
  mutationRate: number // How likely this trait is to mutate [0-1]
  variance: number     // How much variation is possible
  dominance: number    // How likely this trait is to be inherited [0-1]
  beneficial: boolean  // Whether this trait is generally beneficial
}

export interface GeneticProfile {
  traits: Map<string, GeneticTrait>
  generation: number   // How many generations from original species
  mutations: string[]  // History of mutations applied
  adaptationScore: number // How well adapted to current environment [0-1]
}

export interface MutationEvent {
  traitId: string
  oldValue: number
  newValue: number
  generation: number
  environmentalPressure: number
  beneficial: boolean
}

export class GeneticSystem {
  private rng: SeededRNG
  private mutationHistory: Map<string, MutationEvent[]> = new Map()

  // Base genetic traits that all species can have
  private readonly baseGeneticTraits = [
    {
      id: 'drought_tolerance',
      name: 'Drought Tolerance',
      mutationRate: 0.05,
      variance: 0.3,
      dominance: 0.7,
      beneficial: true
    },
    {
      id: 'cold_resistance',
      name: 'Cold Resistance', 
      mutationRate: 0.04,
      variance: 0.25,
      dominance: 0.6,
      beneficial: true
    },
    {
      id: 'growth_efficiency',
      name: 'Growth Efficiency',
      mutationRate: 0.06,
      variance: 0.2,
      dominance: 0.8,
      beneficial: true
    },
    {
      id: 'reproduction_vigor',
      name: 'Reproduction Vigor',
      mutationRate: 0.07,
      variance: 0.4,
      dominance: 0.75,
      beneficial: true
    },
    {
      id: 'nutrient_efficiency',
      name: 'Nutrient Efficiency',
      mutationRate: 0.05,
      variance: 0.3,
      dominance: 0.65,
      beneficial: true
    },
    {
      id: 'light_sensitivity',
      name: 'Light Sensitivity',
      mutationRate: 0.08,
      variance: 0.35,
      dominance: 0.5,
      beneficial: false // Can be good or bad depending on environment
    },
    {
      id: 'competition_aggression',
      name: 'Competition Aggression',
      mutationRate: 0.06,
      variance: 0.4,
      dominance: 0.7,
      beneficial: false // Trade-off trait
    }
  ]

  constructor(rngManager?: RNGManager) {
    this.rng = rngManager ? rngManager.getRNG('genetics') : RNGManager.getInstance().getRNG('genetics')
  }

  /**
   * Initialize genetic profile for a new species instance
   */
  initializeGenetics(speciesDef: SpeciesDefinition): GeneticProfile {
    const traits = new Map<string, GeneticTrait>()

    // Initialize base genetic traits from species definition
    for (const baseTrait of this.baseGeneticTraits) {
      const baseValue = this.getBaseTraitValue(baseTrait.id, speciesDef)
      
      traits.set(baseTrait.id, {
        id: baseTrait.id,
        name: baseTrait.name,
        value: baseValue,
        baseValue: baseValue,
        mutationRate: baseTrait.mutationRate,
        variance: baseTrait.variance,
        dominance: baseTrait.dominance,
        beneficial: baseTrait.beneficial
      })
    }

    return {
      traits,
      generation: 0,
      mutations: [],
      adaptationScore: 0.5
    }
  }

  /**
   * Apply mutations during reproduction
   */
  applyMutations(
    parentGenetics: GeneticProfile,
    environmentalStress: number,
    generation: number
  ): { genetics: GeneticProfile; mutations: MutationEvent[] } {
    // Deep-copy traits so child mutations don't affect parent
    const copiedTraits = new Map<string, GeneticTrait>()
    parentGenetics.traits.forEach((t, id) => {
      copiedTraits.set(id, { ...t })
    })
    const newGenetics: GeneticProfile = {
      traits: copiedTraits,
      generation: generation,
      mutations: [...parentGenetics.mutations],
      adaptationScore: parentGenetics.adaptationScore
    }

    const mutationsApplied: MutationEvent[] = []

    // Environmental stress increases mutation rate
    const stressMultiplier = 1 + environmentalStress * 2

    for (const trait of newGenetics.traits.values()) {
      const effectiveMutationRate = trait.mutationRate * stressMultiplier
      
      if (this.rng.next() < effectiveMutationRate) {
        const mutation = this.mutateTrait(trait, environmentalStress, generation)
        if (mutation) {
          mutationsApplied.push(mutation)
          newGenetics.mutations.push(`G${generation}:${mutation.traitId}`)
        }
      }
    }

    // Store mutation history
    if (mutationsApplied.length > 0) {
      const speciesKey = `${generation}`
      if (!this.mutationHistory.has(speciesKey)) {
        this.mutationHistory.set(speciesKey, [])
      }
      this.mutationHistory.get(speciesKey)!.push(...mutationsApplied)
    }

    return { genetics: newGenetics, mutations: mutationsApplied }
  }

  /**
   * Mutate a single trait
   */
  private mutateTrait(trait: GeneticTrait, environmentalStress: number, generation: number): MutationEvent | null {
    const oldValue = trait.value
    
    // Determine mutation direction - environmental stress can guide beneficial mutations
    const beneficialBias = trait.beneficial ? environmentalStress * 0.3 : 0
    const mutationDirection = this.rng.nextFloat(-1, 1) + beneficialBias
    
    // Calculate mutation magnitude
    const magnitude = trait.variance * this.rng.nextFloat(0.1, 1.0)
    const change = mutationDirection * magnitude
    
    // Apply mutation with bounds checking
    trait.value = Math.max(0, Math.min(1, trait.value + change))
    
    // Only record significant mutations
    if (Math.abs(change) < 0.05) {
      trait.value = oldValue // Revert insignificant mutation
      return null
    }

    const isBeneficial = trait.beneficial ? (change > 0) : (Math.abs(change) < 0.1)

    return {
      traitId: trait.id,
      oldValue,
      newValue: trait.value,
      generation,
      environmentalPressure: environmentalStress,
      beneficial: isBeneficial
    }
  }

  /**
   * Get base trait value from species definition
   */
  private getBaseTraitValue(traitId: string, speciesDef: SpeciesDefinition): number {
    switch (traitId) {
      case 'drought_tolerance':
        return 1 - ((speciesDef.moistureRange.min + speciesDef.moistureRange.max) / 2)
      case 'cold_resistance':
        return Math.max(0, 1 - (speciesDef.temperatureRange.min + 20) / 40)
      case 'growth_efficiency':
        return Math.min(1, speciesDef.growthRate / 2)
      case 'reproduction_vigor':
        return Math.min(1, speciesDef.seedProduction / 100)
      case 'nutrient_efficiency':
        return 0.5 + (speciesDef.canopyLayer === 'canopy' ? 0.3 : 0.2)
      case 'light_sensitivity':
        return speciesDef.lightRequirement
      case 'competition_aggression':
        return speciesDef.succession === 'pioneer' ? 0.8 : 0.4
      default:
        return 0.5
    }
  }

  /**
   * Calculate environmental adaptation score
   */
  calculateAdaptationScore(
    genetics: GeneticProfile,
    environment: {
      temperature: number
      moisture: number
      light: number
      nutrients: number
      competitionLevel: number
    }
  ): number {
    let totalScore = 0
    let traitCount = 0

    for (const trait of genetics.traits.values()) {
      let traitScore = 0

      switch (trait.id) {
        case 'drought_tolerance':
          traitScore = environment.moisture < 0.4 ? trait.value : (1 - trait.value * 0.5)
          break
        case 'cold_resistance':
          traitScore = environment.temperature < 15 ? trait.value : (1 - trait.value * 0.3)
          break
        case 'growth_efficiency':
          traitScore = trait.value * (environment.nutrients + environment.light) / 2
          break
        case 'reproduction_vigor':
          traitScore = trait.value * 0.8 + 0.2
          break
        case 'nutrient_efficiency':
          traitScore = environment.nutrients < 0.5 ? trait.value : (1 - trait.value * 0.2)
          break
        case 'light_sensitivity':
          const lightDiff = Math.abs(environment.light - trait.value)
          traitScore = 1 - lightDiff
          break
        case 'competition_aggression':
          traitScore = environment.competitionLevel > 0.6 ? trait.value : (1 - trait.value * 0.4)
          break
      }

      totalScore += Math.max(0, Math.min(1, traitScore))
      traitCount++
    }

    genetics.adaptationScore = traitCount > 0 ? totalScore / traitCount : 0.5
    return genetics.adaptationScore
  }

  /**
   * Apply genetic effects to species performance
   */
  applyGeneticEffects(
    species: SpeciesInstance & { genetics?: GeneticProfile },
    speciesDef: SpeciesDefinition,
    environmentalFactors: {
      temperature: number
      moisture: number
      light: number
      nutrients: number
      competition: number
    }
  ): {
    growthModifier: number
    healthModifier: number
    reproductionModifier: number
    survivalModifier: number
  } {
    if (!species.genetics) {
      return { growthModifier: 1, healthModifier: 1, reproductionModifier: 1, survivalModifier: 1 }
    }

    const traits = species.genetics.traits
    let growthMod = 1
    let healthMod = 1
    let reproductionMod = 1
    let survivalMod = 1

    // Apply trait effects
    const droughtTolerance = traits.get('drought_tolerance')?.value || 0.5
    const coldResistance = traits.get('cold_resistance')?.value || 0.5
    const growthEfficiency = traits.get('growth_efficiency')?.value || 0.5
    const reproductionVigor = traits.get('reproduction_vigor')?.value || 0.5
    const nutrientEfficiency = traits.get('nutrient_efficiency')?.value || 0.5

    // Drought tolerance affects survival in low moisture
    if (environmentalFactors.moisture < 0.4) {
      survivalMod *= (0.5 + droughtTolerance * 0.5)
      healthMod *= (0.7 + droughtTolerance * 0.3)
    }

    // Cold resistance affects survival in low temperature
    if (environmentalFactors.temperature < speciesDef.temperatureRange.min + 5) {
      survivalMod *= (0.6 + coldResistance * 0.4)
      growthMod *= (0.8 + coldResistance * 0.2)
    }

    // Growth efficiency affects overall growth
    growthMod *= (0.5 + growthEfficiency)

    // Reproduction vigor affects reproductive success
    reproductionMod *= (0.7 + reproductionVigor * 0.6)

    // Nutrient efficiency affects performance in poor soils
    if (environmentalFactors.nutrients < 0.5) {
      growthMod *= (0.6 + nutrientEfficiency * 0.4)
      healthMod *= (0.8 + nutrientEfficiency * 0.2)
    }

    return {
      growthModifier: growthMod,
      healthModifier: healthMod,
      reproductionModifier: reproductionMod,
      survivalModifier: survivalMod
    }
  }

  /**
   * Get mutation history for analysis
   */
  getMutationHistory(): Map<string, MutationEvent[]> {
    return this.mutationHistory
  }

  /**
   * Get genetic diversity score for a population
   */
  calculateGeneticDiversity(population: (SpeciesInstance & { genetics?: GeneticProfile })[]): number {
    if (population.length < 2) return 0

    const traitVariances = new Map<string, number[]>()
    
    // Collect trait values
    for (const individual of population) {
      if (!individual.genetics) continue
      
      for (const [traitId, trait] of individual.genetics.traits) {
        if (!traitVariances.has(traitId)) {
          traitVariances.set(traitId, [])
        }
        traitVariances.get(traitId)!.push(trait.value)
      }
    }

    // Calculate average variance
    let totalVariance = 0
    let traitCount = 0

    for (const values of traitVariances.values()) {
      if (values.length < 2) continue
      
      const mean = values.reduce((a, b) => a + b) / values.length
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length
      
      totalVariance += variance
      traitCount++
    }

    return traitCount > 0 ? totalVariance / traitCount : 0
  }
}
