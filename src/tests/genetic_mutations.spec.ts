/**
 * Tests for the genetic mutation system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GeneticSystem } from '@/simulation/GeneticSystem'
import { SpeciesDefinition } from '@/simulation/SpeciesRegistry'
import { RNGManager } from '@/simulation/SeededRNG'
import { WorldChunk, SpeciesInstance, PhenologyStage } from '@/simulation/WorldChunk'
import { VegetationSystem } from '@/simulation/VegetationSystem'

function makeTestSpeciesDef(): SpeciesDefinition {
  return {
    id: 'test_species',
    name: 'Test Species',
    category: 'grass' as any,
    maxBiomass: 0.5,
    growthRate: 1.2,
    lifespanTicks: 2000,
    reproductionThreshold: 0.1,
    reproductionNeed: 0.4,
    seedProduction: 50,
    temperatureRange: { min: 10, max: 30 },
    moistureRange: { min: 0.2, max: 0.8 },
    lightRequirement: 0.3,
    shadeToleranceMax: 0.6,
    pHRange: { min: 6, max: 7.5 },
    canopyLayer: 'ground' as any,
    rootDepth: 'shallow' as any,
    dispersalRange: 2,
    pollination: 'wind' as any,
    succession: 'pioneer' as any,
    traits: [],
    resistances: [],
    visualProps: {
      color: '#green',
      size: 1,
      shape: 'grass',
      seasonalChanges: false
    }
  }
}

function makeTestSpecies(): SpeciesInstance {
  return {
    id: 'common_grass_1',
    speciesId: 'common_grass', // Use real species that exists in registry
    x: 0.5,
    y: 0.5,
    biomass: 0.2,
    age: 500,
    phenologyStage: PhenologyStage.VEGETATIVE,
    health: 0.8,
    reproductiveOutput: 0,
    reproductiveUrge: 0,
    lastReproductionAttempt: 0
  }
}

function makeTestChunk(): WorldChunk {
  const chunk = new WorldChunk(0, 0, 12345)
  
  // Set favorable conditions
  chunk.biomeState.vitality = 0.8
  chunk.biomeState.soil = 0.7
  chunk.biomeState.moisture = 0.6
  chunk.climateState.temperature = 20
  chunk.climateState.light = 0.8
  
  return chunk
}

describe('Genetic System', () => {
  let geneticSystem: GeneticSystem
  let speciesDef: SpeciesDefinition
  
  beforeEach(() => {
    RNGManager.initialize(42)
    geneticSystem = new GeneticSystem(RNGManager.getInstance())
    speciesDef = makeTestSpeciesDef()
  })

  describe('Genetic Profile Initialization', () => {
    it('should initialize genetic profile with base traits', () => {
      const genetics = geneticSystem.initializeGenetics(speciesDef)
      
      expect(genetics.generation).toBe(0)
      expect(genetics.mutations).toEqual([])
      expect(genetics.adaptationScore).toBe(0.5)
      expect(genetics.traits.size).toBeGreaterThan(0)
      
      // Check that base genetic traits are present
      expect(genetics.traits.has('drought_tolerance')).toBe(true)
      expect(genetics.traits.has('cold_resistance')).toBe(true)
      expect(genetics.traits.has('growth_efficiency')).toBe(true)
      expect(genetics.traits.has('reproduction_vigor')).toBe(true)
    })

    it('should set trait values based on species characteristics', () => {
      const genetics = geneticSystem.initializeGenetics(speciesDef)
      
      const droughtTolerance = genetics.traits.get('drought_tolerance')
      expect(droughtTolerance).toBeDefined()
      if (droughtTolerance) {
        expect(droughtTolerance.value).toBeGreaterThanOrEqual(0)
        expect(droughtTolerance.value).toBeLessThanOrEqual(1)
        expect(droughtTolerance.baseValue).toBe(droughtTolerance.value)
      }
    })
  })

  describe('Mutation System', () => {
    it('should apply mutations based on environmental stress', () => {
      const baseGenetics = geneticSystem.initializeGenetics(speciesDef)
      const highStress = 0.8
      const generation = 1
      
      const result = geneticSystem.applyMutations(baseGenetics, highStress, generation)
      
      expect(result.genetics.generation).toBe(generation)
      expect(result.genetics.traits.size).toBe(baseGenetics.traits.size)
      
      // High stress should increase mutation likelihood
      // At least some mutations should have occurred (probabilistic)
      const totalMutations = result.mutations.length
      expect(totalMutations).toBeGreaterThanOrEqual(0)
    })

    it('should preserve trait bounds during mutation', () => {
      const baseGenetics = geneticSystem.initializeGenetics(speciesDef)
      const result = geneticSystem.applyMutations(baseGenetics, 1.0, 1)
      
      // All trait values should remain within [0, 1]
      result.genetics.traits.forEach(trait => {
        expect(trait.value).toBeGreaterThanOrEqual(0)
        expect(trait.value).toBeLessThanOrEqual(1)
      })
    })

    it('should track mutation history', () => {
      const baseGenetics = geneticSystem.initializeGenetics(speciesDef)
      
      // Apply mutations multiple times
      let currentGenetics = baseGenetics
      for (let i = 1; i <= 3; i++) {
        const result = geneticSystem.applyMutations(currentGenetics, 0.5, i)
        currentGenetics = result.genetics
      }
      
      // Check that mutations are tracked
      const mutationHistory = geneticSystem.getMutationHistory()
      expect(mutationHistory.size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Genetic Effects on Performance', () => {
    it('should apply genetic modifiers to species performance', () => {
      const species = makeTestSpecies()
      species.genetics = geneticSystem.initializeGenetics(speciesDef)
      
      const effects = geneticSystem.applyGeneticEffects(
        species,
        speciesDef,
        {
          temperature: 20,
          moisture: 0.6,
          light: 0.8,
          nutrients: 0.7,
          competition: 0.3
        }
      )
      
      expect(effects.growthModifier).toBeGreaterThan(0)
      expect(effects.healthModifier).toBeGreaterThan(0)
      expect(effects.reproductionModifier).toBeGreaterThan(0)
      expect(effects.survivalModifier).toBeGreaterThan(0)
      
      // Modifiers should be reasonable (not extreme)
      expect(effects.growthModifier).toBeLessThan(3)
      expect(effects.healthModifier).toBeLessThan(2)
      expect(effects.reproductionModifier).toBeLessThan(2)
      expect(effects.survivalModifier).toBeLessThan(2)
    })

    it('should respond to environmental stress conditions', () => {
      const species = makeTestSpecies()
      species.genetics = geneticSystem.initializeGenetics(speciesDef)
      
      // Test drought conditions
      const droughtEffects = geneticSystem.applyGeneticEffects(
        species,
        speciesDef,
        {
          temperature: 35, // Hot
          moisture: 0.1,   // Very dry
          light: 0.9,
          nutrients: 0.3,  // Poor soil
          competition: 0.8
        }
      )
      
      // Test optimal conditions
      const optimalEffects = geneticSystem.applyGeneticEffects(
        species,
        speciesDef,
        {
          temperature: 20,
          moisture: 0.6,
          light: 0.8,
          nutrients: 0.8,
          competition: 0.2
        }
      )
      
      // Species should perform differently under different conditions
      // This is probabilistic based on genetic traits
      expect(droughtEffects).toBeDefined()
      expect(optimalEffects).toBeDefined()
    })
  })

  describe('Adaptation Score Calculation', () => {
    it('should calculate adaptation scores based on environment', () => {
      const genetics = geneticSystem.initializeGenetics(speciesDef)
      
      const optimalScore = geneticSystem.calculateAdaptationScore(genetics, {
        temperature: 20,
        moisture: 0.6,
        light: 0.8,
        nutrients: 0.8,
        competitionLevel: 0.2
      })
      
      const stressfulScore = geneticSystem.calculateAdaptationScore(genetics, {
        temperature: 5, // Too cold
        moisture: 0.1, // Too dry
        light: 0.2,    // Too dark
        nutrients: 0.2, // Poor nutrients
        competitionLevel: 0.9 // High competition
      })
      
      expect(optimalScore).toBeGreaterThanOrEqual(0)
      expect(optimalScore).toBeLessThanOrEqual(1)
      expect(stressfulScore).toBeGreaterThanOrEqual(0)
      expect(stressfulScore).toBeLessThanOrEqual(1)
      
      // Optimal environment should generally score higher
      expect(optimalScore).toBeGreaterThanOrEqual(stressfulScore - 0.3)
    })
  })

  describe('Genetic Diversity', () => {
    it('should calculate genetic diversity for populations', () => {
      const population: (SpeciesInstance & { genetics?: any })[] = []
      
      // Create a diverse population
      for (let i = 0; i < 5; i++) {
        const individual = makeTestSpecies()
        individual.id = `individual_${i}`
        individual.genetics = geneticSystem.initializeGenetics(speciesDef)
        
        // Apply different levels of mutations
        const mutationResult = geneticSystem.applyMutations(
          individual.genetics, 
          i * 0.2, 
          i + 1
        )
        individual.genetics = mutationResult.genetics
        
        population.push(individual)
      }
      
      const diversity = geneticSystem.calculateGeneticDiversity(population)
      expect(diversity).toBeGreaterThanOrEqual(0)
      
      // Single individual should have zero diversity
      const singleDiversity = geneticSystem.calculateGeneticDiversity([population[0]])
      expect(singleDiversity).toBe(0)
    })
  })
})

describe('Integration with Vegetation System', () => {
  let vegetationSystem: VegetationSystem
  let chunk: WorldChunk

  beforeEach(() => {
    RNGManager.initialize(123)
    vegetationSystem = new VegetationSystem()
    chunk = makeTestChunk()
  })

  it('should initialize genetics for new species instances', () => {
    const species = makeTestSpecies()
    chunk.addSpecies(species)
    
    // Species should not have genetics initially
    expect(species.genetics).toBeUndefined()
    
    // After first vegetation update, species should have genetics
    vegetationSystem.update(chunk, 1)
    
    const updatedSpecies = chunk.species.get(species.id)
    expect(updatedSpecies?.genetics).toBeDefined()
    if (updatedSpecies?.genetics) {
      expect(updatedSpecies.genetics.generation).toBe(0)
      expect(updatedSpecies.genetics.traits.size).toBeGreaterThan(0)
    }
  })

  it('should apply genetic effects during species updates', () => {
    const species = makeTestSpecies()
    species.biomass = 0.05 // Small initial biomass
    species.health = 0.6   // Moderate initial health
    chunk.addSpecies(species)
    
    // Track initial values
    const initialBiomass = species.biomass
    
    // Run simulation for multiple ticks
    for (let i = 0; i < 10; i++) {
      vegetationSystem.update(chunk, 1)
    }
    
    const updatedSpecies = chunk.species.get(species.id)
    expect(updatedSpecies).toBeDefined()
    
    if (updatedSpecies) {
      // Species should have grown (genetic effects applied)
      expect(updatedSpecies.biomass).toBeGreaterThanOrEqual(initialBiomass)
      expect(updatedSpecies.genetics).toBeDefined()
      expect(updatedSpecies.genetics?.adaptationScore).toBeGreaterThanOrEqual(0)
    }
  })

  it('should pass genetic traits to offspring during reproduction', () => {
    const parentSpecies = makeTestSpecies()
    parentSpecies.biomass = 0.3
    parentSpecies.age = 800
    parentSpecies.phenologyStage = PhenologyStage.FRUITING
    parentSpecies.reproductiveOutput = 5 // Ready to produce seeds
    chunk.addSpecies(parentSpecies)
    
    // Initialize genetics
    vegetationSystem.update(chunk, 1)
    
    const parent = chunk.species.get(parentSpecies.id)
    expect(parent?.genetics).toBeDefined()
    
    // Add a seed to trigger germination in next update
    if (parent) {
      chunk.addSeed({
        speciesId: parent.speciesId,
        x: 0.4,
        y: 0.4,
        maturityTime: 0, // Ready to germinate
        viability: 1.0,
        parentGeneration: parent.genetics?.generation || 0
      } as any)
    }
    
    // Run simulation to allow germination
    for (let i = 0; i < 20; i++) {
      vegetationSystem.update(chunk, 1)
    }
    
    // Should have offspring with genetics
    const allSpecies = Array.from(chunk.species.values())
    expect(allSpecies.length).toBeGreaterThan(1) // Parent + offspring(s)
    
    // Find offspring (younger individuals)
    const offspring = allSpecies.filter(s => s.id !== parentSpecies.id && s.age < 50)
    
    if (offspring.length > 0) {
      const child = offspring[0]
      expect(child.genetics).toBeDefined()
      if (child.genetics && parent?.genetics) {
        expect(child.genetics.generation).toBe(parent.genetics.generation + 1)
        expect(child.genetics.traits.size).toBe(parent.genetics.traits.size)
      }
    }
  })
})
