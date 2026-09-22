import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine, SimulationConfig } from '@/simulation/SimulationEngine';
import { ResearchSystem, TraitCategory, DiscoveryMethod } from '@/simulation/ResearchSystem';
import { PhenologyStage } from '@/simulation/WorldChunk';
import { RNGManager } from '@/simulation/SeededRNG';

describe('ResearchSystem + SimulationEngine Integration', () => {
  let engine: SimulationEngine;
  let config: SimulationConfig;

  beforeEach(() => {
    RNGManager.initialize(42424);

    config = {
      worldWidth: 3,
      worldHeight: 3,
      chunkSize: 10,
      tickRate: 1,
      masterSeed: 42424,
      maxActiveChunks: 9,
      seasonLengthTicks: 90,
      timePerTickMinutes: 1440,
    };

    engine = new SimulationEngine(config);
  });

  describe('System Integration', () => {
    it('should have ResearchSystem initialized by default', () => {
      const researchSystem = engine.getResearchSystem();

      expect(researchSystem).toBeDefined();
      expect(researchSystem).toBeInstanceOf(ResearchSystem);
    });

    it('should allow replacing ResearchSystem', () => {
      const researchSystem = engine.getResearchSystem()!;
      const eventJournal = (researchSystem as any).eventJournal; // Access private field for testing
      const customResearch = new ResearchSystem(eventJournal, 0);

      engine.setResearchSystem(customResearch);

      expect(engine.getResearchSystem()).toBe(customResearch);
    });
  });

  describe('Species Observation in Chunks', () => {
    it('should observe species in a specific chunk', () => {
      const researchSystem = engine.getResearchSystem()!;
      const chunk = engine.getChunk(1, 1)!;

      // Add a species to the chunk
      chunk.addSpecies({
        id: 'plant_1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      expect(researchSystem.getState().discoveredSpecies.size).toBe(0);

      engine.observeSpeciesInChunk('chunk_1_1');

      expect(researchSystem.getState().discoveredSpecies.size).toBe(1);
      expect(researchSystem.getState().discoveredSpecies.has('common_grass')).toBe(true);
    });

    it('should observe multiple species in same chunk', () => {
      const researchSystem = engine.getResearchSystem()!;
      const chunk = engine.getChunk(0, 0)!;

      chunk.addSpecies({
        id: 'plant_1',
        speciesId: 'common_grass',
        x: 0.3,
        y: 0.3,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      chunk.addSpecies({
        id: 'plant_2',
        speciesId: 'silver_birch',
        x: 0.7,
        y: 0.7,
        biomass: 1.5,
        age: 100,
        phenologyStage: PhenologyStage.FLOWERING,
        health: 0.9,
        reproductiveOutput: 0,
      });

      engine.observeSpeciesInChunk('chunk_0_0');

      expect(researchSystem.getState().discoveredSpecies.size).toBe(2);
      expect(researchSystem.getObservationCount('common_grass')).toBe(1);
      expect(researchSystem.getObservationCount('silver_birch')).toBe(1);
    });

    it('should handle observing empty chunks gracefully', () => {
      const researchSystem = engine.getResearchSystem()!;

      engine.observeSpeciesInChunk('chunk_2_2');

      expect(researchSystem.getState().discoveredSpecies.size).toBe(0);
    });

    it('should handle invalid chunk IDs gracefully', () => {
      expect(() => {
        engine.observeSpeciesInChunk('invalid_chunk_id');
      }).not.toThrow();
    });
  });

  describe('Observing All Active Chunks', () => {
    it('should observe species across all active chunks', () => {
      const researchSystem = engine.getResearchSystem()!;

      // Add species to multiple chunks
      const chunk1 = engine.getChunk(0, 0)!;
      const chunk2 = engine.getChunk(1, 1)!;
      const chunk3 = engine.getChunk(2, 2)!;

      chunk1.addSpecies({
        id: 'p1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      chunk2.addSpecies({
        id: 'p2',
        speciesId: 'silver_birch',
        x: 0.5,
        y: 0.5,
        biomass: 2.0,
        age: 200,
        phenologyStage: PhenologyStage.FLOWERING,
        health: 1.0,
        reproductiveOutput: 0,
      });

      chunk3.addSpecies({
        id: 'p3',
        speciesId: 'healing_fern',
        x: 0.5,
        y: 0.5,
        biomass: 0.8,
        age: 50,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      // Activate all chunks
      engine.activateAllChunks();

      // Observe all
      engine.observeAllActiveSpecies();

      expect(researchSystem.getState().discoveredSpecies.size).toBe(3);
      expect(researchSystem.getObservationCount('common_grass')).toBe(1);
      expect(researchSystem.getObservationCount('silver_birch')).toBe(1);
      expect(researchSystem.getObservationCount('healing_fern')).toBe(1);
    });

    it('should increment observation counts on repeated observations', () => {
      const researchSystem = engine.getResearchSystem()!;
      const chunk = engine.getChunk(1, 1)!;

      chunk.addSpecies({
        id: 'p1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      engine.activateChunk('chunk_1_1');

      // Observe 5 times
      for (let i = 0; i < 5; i++) {
        engine.observeAllActiveSpecies();
      }

      expect(researchSystem.getObservationCount('common_grass')).toBe(5);
    });
  });

  describe('Research During Simulation', () => {
    it('should discover species during simulation run', () => {
      const researchSystem = engine.getResearchSystem()!;

      // Manually discover starting species
      researchSystem.manualDiscovery('common_grass', 0, DiscoveryMethod.INITIAL);

      // Activate all chunks (simulation seeds them on init)
      engine.activateAllChunks();

      // Run simulation and observe periodically
      for (let i = 0; i < 50; i++) {
        engine.advance(1);

        // Observe every 10 ticks
        if (i % 10 === 0) {
          engine.observeAllActiveSpecies();
        }
      }

      // Should have discovered at least the seeded species
      expect(researchSystem.getState().discoveredSpecies.size).toBeGreaterThanOrEqual(1);
      expect(researchSystem.getObservationCount('common_grass')).toBeGreaterThan(0);
    });

    it('should unlock traits through repeated observations', () => {
      const researchSystem = engine.getResearchSystem()!;
      const chunk = engine.getChunk(1, 1)!;

      chunk.addSpecies({
        id: 'p1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      engine.activateChunk('chunk_1_1');

      // Observe enough times to unlock ENVIRONMENTAL traits
      for (let i = 0; i < 15; i++) {
        engine.observeAllActiveSpecies();
      }

      expect(researchSystem.hasUnlockedTrait('common_grass', TraitCategory.BASIC)).toBe(true);
      expect(researchSystem.hasUnlockedTrait('common_grass', TraitCategory.ENVIRONMENTAL)).toBe(true);
      expect(researchSystem.hasUnlockedTrait('common_grass', TraitCategory.REPRODUCTIVE)).toBe(false);
    });
  });

  describe('EventJournal Integration', () => {
    it('should log discoveries to EventJournal', () => {
      const chunk = engine.getChunk(0, 0)!;

      chunk.addSpecies({
        id: 'p1',
        speciesId: 'shadow_moss',
        x: 0.5,
        y: 0.5,
        biomass: 0.1,
        age: 5,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      const researchSystemState = engine.getResearchSystem()!.getState();
      const beforeDiscovery = researchSystemState.discoveredSpecies.size;

      engine.observeSpeciesInChunk('chunk_0_0');

      const afterDiscovery = engine.getResearchSystem()!.getState().discoveredSpecies.size;

      // Should have discovered the species
      expect(afterDiscovery).toBeGreaterThan(beforeDiscovery);
    });
  });

  describe('Tick-Based Auto-Observation', () => {
    it('should support tick callbacks for periodic observation', () => {
      const researchSystem = engine.getResearchSystem()!;
      const chunk = engine.getChunk(1, 1)!;

      chunk.addSpecies({
        id: 'p1',
        speciesId: 'crimson_oak',
        x: 0.5,
        y: 0.5,
        biomass: 5.0,
        age: 1000,
        phenologyStage: PhenologyStage.FRUITING,
        health: 1.0,
        reproductiveOutput: 0,
      });

      engine.activateChunk('chunk_1_1');

      // Register tick callback for observation
      let observationCount = 0;
      engine.onTick((tick) => {
        if (tick % 5 === 0) {
          engine.observeAllActiveSpecies();
          observationCount++;
        }
      });

      // Run simulation
      for (let i = 0; i < 25; i++) {
        engine.advance(1);
      }

      // Should have observed 5 times (ticks 0, 5, 10, 15, 20)
      expect(observationCount).toBeGreaterThanOrEqual(5);
      expect(researchSystem.getObservationCount('crimson_oak')).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Multi-Chunk Discovery Context', () => {
    it('should generate different contexts for different environmental conditions', () => {
      const researchSystem = engine.getResearchSystem()!;

      const chunk1 = engine.getChunk(0, 0)!;
      const chunk2 = engine.getChunk(2, 2)!;

      // Setup different environmental conditions
      chunk1.biomeState.moisture = 0.9; // wet
      chunk1.climateState.temperature = 5; // cool

      chunk2.biomeState.moisture = 0.2; // dry
      chunk2.climateState.temperature = 30; // hot

      chunk1.addSpecies({
        id: 'p1',
        speciesId: 'species_wet',
        x: 0.5,
        y: 0.5,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      chunk2.addSpecies({
        id: 'p2',
        speciesId: 'species_dry',
        x: 0.5,
        y: 0.5,
        biomass: 0.2,
        age: 10,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });

      engine.observeSpeciesInChunk('chunk_0_0');
      engine.observeSpeciesInChunk('chunk_2_2');

      const discoveryWet = researchSystem.getDiscovery('species_wet');
      const discoveryDry = researchSystem.getDiscovery('species_dry');

      expect(discoveryWet?.discoveryConditions).toContain('high moisture');
      expect(discoveryWet?.discoveryConditions).toContain('cool temperatures');

      expect(discoveryDry?.discoveryConditions).toContain('dry conditions');
      expect(discoveryDry?.discoveryConditions).toContain('warm temperatures');
    });
  });

  describe('Performance with Many Species', () => {
    it('should handle observing many species efficiently', () => {
      const chunk = engine.getChunk(1, 1)!;

      // Add 50 species instances
      for (let i = 0; i < 50; i++) {
        chunk.addSpecies({
          id: `plant_${i}`,
          speciesId: i % 2 === 0 ? 'common_grass' : 'silver_birch',
          x: Math.random(),
          y: Math.random(),
          biomass: 0.2,
          age: 10,
          phenologyStage: PhenologyStage.VEGETATIVE,
          health: 1.0,
          reproductiveOutput: 0,
        });
      }

      const startTime = performance.now();
      engine.observeSpeciesInChunk('chunk_1_1');
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Should complete in under 10ms
      expect(duration).toBeLessThan(10);
    });
  });
});
