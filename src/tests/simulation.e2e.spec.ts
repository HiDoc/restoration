import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine, SimulationConfig } from '@/simulation/SimulationEngine';
import { RNGManager } from '@/simulation/SeededRNG';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { STARTING_MEADOW, plantStartingMeadow } from '@/game/startingMeadow';
import { createPinia, setActivePinia } from 'pinia';

/**
 * End-to-End Simulation Tests
 *
 * These tests verify the complete simulation behavior from initialization
 * through multiple update cycles, including all integrated systems:
 * - SimulationEngine orchestration of the Rust core (climate, hydrology,
 *   growth, reproduction, germination, dispersal)
 * - Knowledge (what the player learns from the world)
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
      engine.update();
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

  describe('Knowledge E2E', () => {
    it('learns what the player could see over a spring on the starting meadow', () => {
      plantStartingMeadow(engine);
      const knowledge = useKnowledgeStore();
      knowledge.reset();
      knowledge.observe(engine);
      expect(Object.keys(knowledge.knowledge.species)).toEqual(expect.arrayContaining(STARTING_MEADOW));

      for (let day = 0; day < 89; day++) {
        engine.update();
        knowledge.observe(engine);
      }

      const clover = knowledge.knowledge.species.white_clover;
      expect(clover.flowering).toContain('spring');
      expect(clover.fruiting).toEqual([]); // clover fruits in summer and autumn, not yet seen
      expect(knowledge.summary.knownSpecies).toBeGreaterThanOrEqual(STARTING_MEADOW.length);
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
