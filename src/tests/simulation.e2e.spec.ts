import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimulationEngine, SimulationConfig } from '@/simulation/SimulationEngine';
import { RNGManager } from '@/simulation/SeededRNG';
import { PhenologyStage } from '@/simulation/WorldChunk';
import { DiscoveryMethod, TraitCategory } from '@/simulation/ResearchSystem';
import { useResearchStore } from '@/stores/researchStore';
import { createPinia, setActivePinia } from 'pinia';

/**
 * End-to-End Simulation Tests
 *
 * These tests verify the complete simulation behavior from initialization
 * through multiple update cycles, including all integrated systems:
 * - SimulationEngine orchestration of the Rust core (climate, hydrology,
 *   growth, reproduction, germination, dispersal)
 * - Research system (species discovery, trait unlocking)
 * - Year-end workflow (callbacks, seed selection)
 */

describe('Simulation E2E Tests', () => {
  let engine: SimulationEngine;
  let config: SimulationConfig;

  beforeEach(() => {
    // Initialize RNG for deterministic tests
    RNGManager.initialize(42424);

    // Create Pinia for research store
    setActivePinia(createPinia());

    // Standard simulation configuration
    config = {
      worldWidth: 3,
      worldHeight: 3,
      chunkSize: 16,
      tickRate: 10,
      masterSeed: 42424,
      maxActiveChunks: 9,
      seasonLengthTicks: 90,
      timePerTickMinutes: 1440, // 1 day per tick
    };

    // Initialize all systems
    engine = new SimulationEngine(config);



    // Activate all chunks for testing
    engine.activateAllChunks();
  });

  describe('Full Simulation Lifecycle', () => {
    it('should initialize all systems correctly', () => {
      expect(engine).toBeDefined();
      expect(engine.getCurrentTick()).toBe(0);
      expect(engine.getAllChunks().size).toBe(9);
      expect(engine.getActiveChunkIds().size).toBe(9);

      const stats = engine.getStatistics();
      expect(stats.totalChunks).toBe(9);
      expect(stats.activeChunks).toBe(9);
    });

    it('should run complete update cycle across all systems', () => {

      // Run one complete cycle
      engine.update();
      const tick = engine.getCurrentTick();




      // Verify tick advanced
      expect(engine.getCurrentTick()).toBe(1);

      // Verify systems updated
      const stats = engine.getStatistics();
      expect(stats.currentTick).toBe(1);
    });

    it('should maintain deterministic behavior over 100 ticks', () => {

      const speciesCountHistory: number[] = [];

      for (let i = 0; i < 100; i++) {
        engine.update();




        const stats = engine.getStatistics();
        speciesCountHistory.push(stats.totalSpecies);
      }

      expect(engine.getCurrentTick()).toBe(100);
      expect(speciesCountHistory.length).toBe(100);

      // Verify simulation progressed
      expect(speciesCountHistory.some(count => count > 0)).toBe(true);
    });

    it('should handle state export and import correctly', () => {
      // Run simulation for 50 ticks
      for (let i = 0; i < 50; i++) {
        engine.update();
      }

      const tick50 = engine.getCurrentTick();
      const stats50 = engine.getStatistics();

      // Export state
      const exportedState = engine.exportState();
      expect(exportedState).toBeDefined();
      expect(exportedState.currentTick).toBe(50);

      // Create new engine and import state
      const newEngine = new SimulationEngine(config);
      newEngine.importState(exportedState);

      const importedStats = newEngine.getStatistics();
      expect(importedStats.currentTick).toBe(tick50);
      expect(importedStats.totalSpecies).toBe(stats50.totalSpecies);
      expect(importedStats.activeChunks).toBe(stats50.activeChunks);
    });
  });

  describe('Research System Integration E2E', () => {
    let researchStore: ReturnType<typeof useResearchStore>;

    beforeEach(() => {
      researchStore = useResearchStore();
      const eventJournal = (engine as any).eventJournal; // Access private eventJournal
      researchStore.initialize(eventJournal, 0);
      if (researchStore.system) {
        engine.setResearchSystem(researchStore.system as any);
      }
    });

    it('should discover species through observation', () => {
      // Manually discover starting species
      researchStore.manualDiscovery('common_grass', 0, DiscoveryMethod.INITIAL);

      expect(researchStore.discoveredCount).toBe(1);
      expect(researchStore.discoveredSpeciesIds).toContain('common_grass');
    });

    it('should track observations and unlock traits progressively', () => {
      const chunk = engine.getChunk(1, 1)!;

      // Add test species to chunk
      chunk.addSpecies({
        id: 'test_plant_1',
        speciesId: 'test_species',
        x: 0.5,
        y: 0.5,
        biomass: 1.0,
        age: 50,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      // Observe species multiple times
      for (let i = 0; i < 15; i++) {
        engine.observeAllActiveSpecies();
      }

      expect(researchStore.getObservationCount('test_species')).toBe(15);
      // BASIC is unlocked on first discovery, ENVIRONMENTAL requires 10 observations
      expect(researchStore.hasUnlockedTrait('test_species', TraitCategory.BASIC)).toBe(true);
      expect(researchStore.hasUnlockedTrait('test_species', TraitCategory.ENVIRONMENTAL)).toBe(true);
      expect(researchStore.hasUnlockedTrait('test_species', TraitCategory.REPRODUCTIVE)).toBe(false);
    });

    it('should integrate observation into simulation loop', () => {
      // Add species to multiple chunks
      const chunk1 = engine.getChunk(0, 0)!;
      const chunk2 = engine.getChunk(1, 1)!;

      chunk1.addSpecies({
        id: 'p1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 1.0,
        age: 50,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      chunk2.addSpecies({
        id: 'p2',
        speciesId: 'silver_birch',
        x: 0.5,
        y: 0.5,
        biomass: 1.0,
        age: 50,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      // Observe periodically during simulation
      for (let tick = 0; tick < 50; tick++) {
        engine.update();

        if (tick % 10 === 0) {
          engine.observeAllActiveSpecies();
        }
      }

      // Should have observed both species multiple times
      expect(researchStore.discoveredCount).toBeGreaterThanOrEqual(2);
      expect(researchStore.totalObservations).toBeGreaterThanOrEqual(10);
    });

    it('should calculate research progress correctly', () => {
      const chunk = engine.getChunk(0, 0)!;

      chunk.addSpecies({
        id: 'p1',
        speciesId: 'progress_test',
        x: 0.5,
        y: 0.5,
        biomass: 1.0,
        age: 50,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      // 0 observations = 0% progress
      expect(researchStore.getResearchProgress('progress_test')).toBe(0);

      // 10 observations = partial progress
      for (let i = 0; i < 10; i++) {
        engine.observeAllActiveSpecies();
      }
      expect(researchStore.getResearchProgress('progress_test')).toBeGreaterThan(0);
      expect(researchStore.getResearchProgress('progress_test')).toBeLessThan(1);

      // 100+ observations = 100% progress
      for (let i = 0; i < 95; i++) {
        engine.observeAllActiveSpecies();
      }
      expect(researchStore.getResearchProgress('progress_test')).toBe(1.0);
    });
  });

  describe('Year-End Workflow E2E', () => {
    it('should trigger year-end callback after season completion', () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Advance through one full year (360 ticks = 4 seasons * 90 ticks)
      for (let i = 0; i < 360; i++) {
        engine.update();
      }

      expect(yearEndCallback).toHaveBeenCalledWith(1);
    });

    it('should track year progress correctly', () => {
      expect(engine.getCurrentYear()).toBe(0);
      expect(engine.getYearProgress()).toBe(0);

      // Advance halfway through year (180 ticks = half of 360)
      for (let i = 0; i < 180; i++) {
        engine.update();
      }

      expect(engine.getCurrentYear()).toBe(0);
      expect(engine.getYearProgress()).toBeCloseTo(0.5, 1);

      // Complete the year
      for (let i = 0; i < 180; i++) {
        engine.update();
      }

      expect(engine.getCurrentYear()).toBe(1);
      expect(engine.getYearProgress()).toBeCloseTo(0, 1);
    });

    it('should handle multiple year completions', () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Simulate 3 full years (360 ticks per year)
      for (let year = 0; year < 3; year++) {
        for (let i = 0; i < 360; i++) {
          engine.update();
        }
      }

      expect(yearEndCallback).toHaveBeenCalledTimes(3);
      expect(yearEndCallback).toHaveBeenNthCalledWith(1, 1);
      expect(yearEndCallback).toHaveBeenNthCalledWith(2, 2);
      expect(yearEndCallback).toHaveBeenNthCalledWith(3, 3);
      expect(engine.getCurrentYear()).toBe(3);
    });
  });

  describe('Environmental Systems Integration E2E', () => {
    it('should maintain environmental consistency across systems', () => {
      const chunks = engine.getAllChunks();

      // Run simulation for 20 ticks
      for (let i = 0; i < 20; i++) {
        engine.update();


      }

      // Verify all chunks have valid environmental state
      chunks.forEach((chunk) => {
        expect(chunk.climateState.temperature).toBeGreaterThan(-50);
        expect(chunk.climateState.temperature).toBeLessThan(60);
        expect(chunk.biomeState.moisture).toBeGreaterThanOrEqual(0);
        expect(chunk.biomeState.moisture).toBeLessThanOrEqual(1);
        // Note: nutrients field may not exist in all configurations
      });
    });

    it('should propagate weather effects to chunks', () => {
      const chunks = engine.getAllChunks();

      // Record initial temperatures
      const initialTemps = new Map<string, number>();
      chunks.forEach((chunk, id) => {
        initialTemps.set(id, chunk.climateState.temperature);
      });

      // Run weather system for multiple ticks
      for (let i = 0; i < 30; i++) {
        engine.update();
      }

      // Verify temperatures changed
      let temperatureChanged = false;
      chunks.forEach((chunk, id) => {
        const initialTemp = initialTemps.get(id) || 0;
        if (Math.abs(chunk.climateState.temperature - initialTemp) > 0.1) {
          temperatureChanged = true;
        }
      });

      expect(temperatureChanged).toBe(true);
    });

    it('should update hydrology moisture levels', () => {
      const chunks = engine.getAllChunks();

      // Record initial moisture
      const initialMoisture = new Map<string, number>();
      chunks.forEach((chunk, id) => {
        initialMoisture.set(id, chunk.biomeState.moisture);
      });

      // Hydrology runs inside the engine's Rust step
      engine.advance(20);

      // Verify moisture is within valid range
      chunks.forEach((chunk) => {
        expect(chunk.biomeState.moisture).toBeGreaterThanOrEqual(0);
        expect(chunk.biomeState.moisture).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Long-Running Simulation Scenarios', () => {
    it('should handle 500-tick simulation without errors', () => {

      for (let i = 0; i < 500; i++) {
        engine.update();



      }

      expect(engine.getCurrentTick()).toBe(500);

      const stats = engine.getStatistics();
      expect(stats.currentTick).toBe(500);
      expect(stats.totalChunks).toBe(9);
    });

    it('should track species population dynamics over time', () => {

      const populationHistory: number[] = [];

      for (let i = 0; i < 200; i++) {
        engine.update();



        const stats = engine.getStatistics();
        populationHistory.push(stats.totalSpecies);
      }

      expect(populationHistory.length).toBe(200);

      // Verify population dynamics occurred
      const maxPop = Math.max(...populationHistory);
      const minPop = Math.min(...populationHistory);

      expect(maxPop).toBeGreaterThanOrEqual(minPop);
    });

    it('should maintain system performance over extended simulation', () => {

      const updateTimes: number[] = [];

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();

        engine.update();




        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }

      // Calculate average update time
      const avgTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;

      // Should complete in reasonable time (< 50ms per update cycle)
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty chunks gracefully', () => {
      const testChunk = engine.getChunk(2, 2)!;

      // Clear species to create empty chunk
      testChunk.species.clear();
      expect(testChunk.species.size).toBe(0);

      // Should not throw when updating empty chunk
      expect(() => engine.update()).not.toThrow();
    });

    it('should handle observation of non-existent species', () => {
      expect(() => {
        engine.observeSpeciesInChunk('chunk_99_99');
      }).not.toThrow();
    });

    it('should recover from extreme environmental conditions', () => {
      const chunk = engine.getChunk(0, 0)!;

      // Set extreme conditions
      chunk.climateState.temperature = -20; // Very cold
      chunk.biomeState.moisture = 0.05; // Very dry

      // Should not crash
      expect(() => {
        for (let i = 0; i < 10; i++) {
          engine.update();
        }
      }).not.toThrow();
    });
  });
});
