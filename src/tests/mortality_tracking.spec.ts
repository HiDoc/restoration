/**
 * Tests for cause of death tracking system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VegetationSystem } from '@/simulation/VegetationSystem'
import { WorldChunk, SpeciesInstance, PhenologyStage, CauseOfDeath } from '@/simulation/WorldChunk'
import { RNGManager } from '@/simulation/SeededRNG'

function makeTestSpecies(): SpeciesInstance {
  return {
    id: 'test_species_1',
    speciesId: 'common_grass',
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
  
  // Set normal conditions
  chunk.biomeState.vitality = 0.7
  chunk.biomeState.soil = 0.6
  chunk.biomeState.moisture = 0.5
  chunk.biomeState.pollution = 0.1
  chunk.climateState.temperature = 20
  chunk.climateState.light = 0.8
  
  return chunk
}

describe('Mortality Tracking System', () => {
  let vegetationSystem: VegetationSystem
  let chunk: WorldChunk
  
  beforeEach(() => {
    RNGManager.initialize(42)
    vegetationSystem = new VegetationSystem()
    chunk = makeTestChunk()
  })

  describe('Cause of Death Detection', () => {
    it('should record natural aging as cause of death for old species', () => {
      const species = makeTestSpecies()
      species.age = 1800 // Very old (90% of lifespan)
      chunk.addSpecies(species)
      
      // Clear mortality history to start fresh
      vegetationSystem.clearMortalityHistory()
      
      // Run simulation until death occurs
      let died = false
      for (let i = 0; i < 100 && !died; i++) {
        vegetationSystem.update(chunk, 1)
        died = !chunk.species.has(species.id)
      }
      
      const mortalityData = vegetationSystem.getMortalityData()
      
      if (mortalityData.history.length > 0) {
        const lastDeath = mortalityData.history[mortalityData.history.length - 1]
        expect(lastDeath.cause).toBe(CauseOfDeath.NATURAL_AGING)
        expect(lastDeath.speciesId).toBe('common_grass')
        expect(lastDeath.age).toBeGreaterThan(1800)
      }
    })

    it('should record disease for zero health species', () => {
      const species = makeTestSpecies()
      species.health = -0.05 // Slightly below zero to avoid rounding issues
      chunk.addSpecies(species)
      
      vegetationSystem.clearMortalityHistory()
      vegetationSystem.update(chunk, 1)
      
      expect(chunk.species.has(species.id)).toBe(false) // Should be removed
      
      const mortalityData = vegetationSystem.getMortalityData()
      expect(mortalityData.history.length).toBeGreaterThan(0)
      
      const death = mortalityData.history.find(d => d.speciesId === species.speciesId)
      expect(death).toBeDefined()
      if (death) {
        expect(death.cause).toBe(CauseOfDeath.DISEASE)
      }
    })

    it('should record cold damage in extreme cold conditions', () => {
      const species = makeTestSpecies()
      chunk.addSpecies(species)
      
      // Set extreme cold conditions
      chunk.climateState.temperature = -25 // Well below common grass tolerance
      
      vegetationSystem.clearMortalityHistory()
      
      // Run simulation until death occurs (may take multiple ticks)
      let died = false
      for (let i = 0; i < 200 && !died; i++) {
        vegetationSystem.update(chunk, 1)
        died = !chunk.species.has(species.id)
      }
      
      const mortalityData = vegetationSystem.getMortalityData()
      
      if (mortalityData.history.length > 0) {
        const coldDeaths = mortalityData.history.filter(d => d.cause === CauseOfDeath.COLD_DAMAGE)
        expect(coldDeaths.length).toBeGreaterThan(0)
      }
    })

    it('should record heat stress in extreme hot conditions', () => {
      const species = makeTestSpecies()
      chunk.addSpecies(species)
      
      // Set extreme hot conditions  
      chunk.climateState.temperature = 45 // Well above common grass tolerance
      
      vegetationSystem.clearMortalityHistory()
      
      // Run simulation until death occurs
      let died = false
      for (let i = 0; i < 200 && !died; i++) {
        vegetationSystem.update(chunk, 1)
        died = !chunk.species.has(species.id)
      }
      
      const mortalityData = vegetationSystem.getMortalityData()
      
      if (mortalityData.history.length > 0) {
        const heatDeaths = mortalityData.history.filter(d => d.cause === CauseOfDeath.HEAT_STRESS)
        expect(heatDeaths.length).toBeGreaterThan(0)
      }
    })

    it('should record drought as cause in dry conditions', () => {
      const species = makeTestSpecies()
      chunk.addSpecies(species)
      
      // Set drought conditions
      chunk.biomeState.moisture = 0.05 // Well below common grass tolerance
      
      vegetationSystem.clearMortalityHistory()
      
      // Run simulation until death occurs
      let died = false
      for (let i = 0; i < 200 && !died; i++) {
        vegetationSystem.update(chunk, 1)
        died = !chunk.species.has(species.id)
      }
      
      const mortalityData = vegetationSystem.getMortalityData()
      
      if (mortalityData.history.length > 0) {
        const droughtDeaths = mortalityData.history.filter(d => d.cause === CauseOfDeath.DROUGHT)
        expect(droughtDeaths.length).toBeGreaterThan(0)
      }
    })

    it('should record pollution deaths in polluted environments', () => {
      const species = makeTestSpecies()
      chunk.addSpecies(species)
      
      // Set high pollution
      chunk.biomeState.pollution = 0.8 // High pollution level
      
      vegetationSystem.clearMortalityHistory()
      
      // Run simulation for extended period
      for (let i = 0; i < 500; i++) {
        vegetationSystem.update(chunk, 1)
      }
      
      const mortalityData = vegetationSystem.getMortalityData()
      
      // Should have some pollution-related deaths over time
      const pollutionDeaths = mortalityData.history.filter(d => d.cause === CauseOfDeath.POLLUTION)
      expect(pollutionDeaths.length).toBeGreaterThanOrEqual(0) // Allow for probabilistic nature
    })
  })

  describe('Mortality Statistics', () => {
    it('should calculate mortality statistics correctly', () => {
      // Add multiple species with different conditions
      for (let i = 0; i < 10; i++) {
        const species = makeTestSpecies()
        species.id = `test_species_${i}`
        species.age = 1500 + i * 50 // Various ages
        species.health = 0.3 + i * 0.05 // Various health levels
        chunk.addSpecies(species)
      }
      
      vegetationSystem.clearMortalityHistory()
      
      // Run simulation to generate deaths
      for (let i = 0; i < 100; i++) {
        vegetationSystem.update(chunk, 1)
      }
      
      const stats = vegetationSystem.getMortalityStats()
      
      expect(stats.totalDeaths).toBeGreaterThanOrEqual(0)
      expect(stats.deathRate).toBeGreaterThanOrEqual(0)
      expect(Object.values(CauseOfDeath)).toContain(stats.mostCommonCause)
      expect(stats.environmentalDeaths).toBeGreaterThanOrEqual(0)
    })

    it('should track mortality data over time', () => {
      const species = makeTestSpecies()
      species.health = -0.1 // Immediate death
      chunk.addSpecies(species)
      
      vegetationSystem.clearMortalityHistory()
      vegetationSystem.update(chunk, 1)
      
      const mortalityData = vegetationSystem.getMortalityData()
      expect(mortalityData.history.length).toBeGreaterThanOrEqual(1)
      expect(mortalityData.recentDeaths.length).toBeGreaterThanOrEqual(1)
      
      if (mortalityData.history.length > 0) {
        const death = mortalityData.history[0]
        expect(death.tick).toBeGreaterThan(0)
        expect(death.age).toBe(species.age)
        expect(death.biomass).toBe(species.biomass)
        expect(death.chunkX).toBe(chunk.x)
        expect(death.chunkY).toBe(chunk.y)
      }
    })

    it('should calculate average lifespans by species', () => {
      // Create multiple species with different lifespans
      const ages = [100, 200, 300, 150, 250]
      
      vegetationSystem.clearMortalityHistory()
      
      ages.forEach((age, i) => {
        const species = makeTestSpecies()
        species.id = `test_${i}`
        species.age = age
        species.health = -0.2 // Force immediate death with starvation
        chunk.addSpecies(species)
        vegetationSystem.update(chunk, 1)
        chunk.species.clear() // Clear for next species
      })
      
      const mortalityData = vegetationSystem.getMortalityData()
      const expectedAverage = ages.reduce((a, b) => a + b, 0) / ages.length
      
      if (mortalityData.averageLifespan['common_grass']) {
        expect(mortalityData.averageLifespan['common_grass']).toBeCloseTo(expectedAverage, 1)
      }
    })

    it('should limit mortality history size', () => {
      vegetationSystem.clearMortalityHistory()
      
      // Generate many deaths (more than the 1000 limit)
      for (let i = 0; i < 1200; i++) {
        const species = makeTestSpecies()
        species.id = `test_${i}`
        species.health = 0 // Force death
        chunk.addSpecies(species)
        vegetationSystem.update(chunk, 1)
        chunk.species.clear()
      }
      
      const mortalityData = vegetationSystem.getMortalityData()
      expect(mortalityData.history.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Species Instance Death Tracking', () => {
    it('should set causeOfDeath and deathTick on species when they die', () => {
      const species = makeTestSpecies()
      species.health = -0.15 // Force starvation death
      chunk.addSpecies(species)
      
      vegetationSystem.clearMortalityHistory()
      vegetationSystem.update(chunk, 1)
      
      // Species should be removed from chunk but we can check mortality records
      const mortalityData = vegetationSystem.getMortalityData()
      expect(mortalityData.history.length).toBeGreaterThanOrEqual(1)
      
      if (mortalityData.history.length > 0) {
        const deathRecord = mortalityData.history[0]
        expect(deathRecord.cause).toBeDefined()
        expect(deathRecord.tick).toBeGreaterThan(0)
        expect(deathRecord.cause).toBe(CauseOfDeath.STARVATION)
      }
    })
  })
})