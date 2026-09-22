import { describe, it, expect, beforeEach } from 'vitest';
import { ResearchSystem, TraitCategory, DiscoveryMethod } from '@/simulation/ResearchSystem';
import { EventJournal } from '@/simulation/EventJournal';
import { WorldChunk } from '@/simulation/WorldChunk';
import { RNGManager } from '@/simulation/SeededRNG';

describe('ResearchSystem', () => {
  let eventJournal: EventJournal;
  let researchSystem: ResearchSystem;
  let testChunk: WorldChunk;

  beforeEach(() => {
    RNGManager.initialize(12345);
    eventJournal = new EventJournal();
    researchSystem = new ResearchSystem(eventJournal, 0);
    testChunk = new WorldChunk(0, 0, 1);

    // Setup favorable environmental conditions
    testChunk.climateState.temperature = 20;
    testChunk.climateState.light = 0.8;
    testChunk.biomeState.moisture = 0.6;
    testChunk.biomeState.succession = 0.5;
  });

  describe('Species Discovery', () => {
    it('should discover a species on first observation', () => {
      const speciesId = 'common_grass';

      expect(researchSystem.getState().discoveredSpecies.size).toBe(0);

      researchSystem.observeSpecies(speciesId, testChunk, 0);

      expect(researchSystem.getState().discoveredSpecies.has(speciesId)).toBe(true);
      expect(researchSystem.getState().discoveredSpecies.size).toBe(1);
    });

    it('should not duplicate discoveries', () => {
      const speciesId = 'silver_birch';

      researchSystem.observeSpecies(speciesId, testChunk, 0);
      researchSystem.observeSpecies(speciesId, testChunk, 1);
      researchSystem.observeSpecies(speciesId, testChunk, 2);

      expect(researchSystem.getState().discoveredSpecies.size).toBe(1);
      expect(researchSystem.getState().discoveries.size).toBe(1);
    });

    it('should record discovery context', () => {
      const speciesId = 'healing_fern';

      researchSystem.observeSpecies(speciesId, testChunk, 10);

      const discovery = researchSystem.getDiscovery(speciesId);
      expect(discovery).toBeDefined();
      expect(discovery?.speciesId).toBe(speciesId);
      expect(discovery?.firstSeenTick).toBe(10);
      expect(discovery?.discoveryConditions).toContain('Found in');
    });

    it('should generate environmental discovery context', () => {
      testChunk.biomeState.moisture = 0.9; // high moisture
      testChunk.climateState.temperature = 5; // cool
      testChunk.climateState.light = 0.9; // full sun

      researchSystem.observeSpecies('test_species', testChunk, 0);

      const discovery = researchSystem.getDiscovery('test_species');
      expect(discovery?.discoveryConditions).toContain('high moisture');
      expect(discovery?.discoveryConditions).toContain('cool temperatures');
      expect(discovery?.discoveryConditions).toContain('full sun');
    });
  });

  describe('Observation Tracking', () => {
    it('should increment observation count', () => {
      const speciesId = 'common_grass';

      expect(researchSystem.getObservationCount(speciesId)).toBe(0);

      researchSystem.observeSpecies(speciesId, testChunk, 0);
      expect(researchSystem.getObservationCount(speciesId)).toBe(1);

      researchSystem.observeSpecies(speciesId, testChunk, 1);
      expect(researchSystem.getObservationCount(speciesId)).toBe(2);

      researchSystem.observeSpecies(speciesId, testChunk, 2);
      expect(researchSystem.getObservationCount(speciesId)).toBe(3);
    });

    it('should track total observations across all species', () => {
      researchSystem.observeSpecies('species_a', testChunk, 0);
      researchSystem.observeSpecies('species_b', testChunk, 1);
      researchSystem.observeSpecies('species_a', testChunk, 2);
      researchSystem.observeSpecies('species_c', testChunk, 3);

      expect(researchSystem.getState().totalObservations).toBe(4);
    });
  });

  describe('Trait Unlocking', () => {
    it('should unlock BASIC traits immediately upon discovery', () => {
      const speciesId = 'common_grass';

      researchSystem.observeSpecies(speciesId, testChunk, 0);

      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.BASIC)).toBe(true);
    });

    it('should unlock ENVIRONMENTAL traits after 10 observations', () => {
      const speciesId = 'silver_birch';

      // Observe 9 times
      for (let i = 0; i < 9; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.ENVIRONMENTAL)).toBe(false);

      // 10th observation should unlock
      researchSystem.observeSpecies(speciesId, testChunk, 10);
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.ENVIRONMENTAL)).toBe(true);
    });

    it('should unlock REPRODUCTIVE traits after 25 observations', () => {
      const speciesId = 'healing_fern';

      for (let i = 0; i < 24; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.REPRODUCTIVE)).toBe(false);

      researchSystem.observeSpecies(speciesId, testChunk, 25);
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.REPRODUCTIVE)).toBe(true);
    });

    it('should unlock ECOLOGICAL traits after 50 observations', () => {
      const speciesId = 'crimson_oak';

      for (let i = 0; i < 49; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.ECOLOGICAL)).toBe(false);

      researchSystem.observeSpecies(speciesId, testChunk, 50);
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.ECOLOGICAL)).toBe(true);
    });

    it('should unlock GENETIC traits after 100 observations', () => {
      const speciesId = 'shadow_moss';

      for (let i = 0; i < 99; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.GENETIC)).toBe(false);

      researchSystem.observeSpecies(speciesId, testChunk, 100);
      expect(researchSystem.hasUnlockedTrait(speciesId, TraitCategory.GENETIC)).toBe(true);
    });
  });

  describe('Research Progress', () => {
    it('should calculate research progress correctly', () => {
      const speciesId = 'test_species';
      const totalCategories = Object.keys(TraitCategory).length; // 5 categories

      // Initial: only BASIC unlocked
      researchSystem.observeSpecies(speciesId, testChunk, 0);
      expect(researchSystem.getResearchProgress(speciesId)).toBe(1 / totalCategories);

      // After 10: BASIC + ENVIRONMENTAL
      for (let i = 1; i < 10; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.getResearchProgress(speciesId)).toBe(2 / totalCategories);

      // After 25: BASIC + ENVIRONMENTAL + REPRODUCTIVE
      for (let i = 10; i < 25; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.getResearchProgress(speciesId)).toBe(3 / totalCategories);

      // After 50: All but GENETIC
      for (let i = 25; i < 50; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.getResearchProgress(speciesId)).toBe(4 / totalCategories);

      // After 100: All unlocked
      for (let i = 50; i < 100; i++) {
        researchSystem.observeSpecies(speciesId, testChunk, i);
      }
      expect(researchSystem.getResearchProgress(speciesId)).toBe(1.0);
    });

    it('should return 0 progress for undiscovered species', () => {
      expect(researchSystem.getResearchProgress('nonexistent')).toBe(0);
    });
  });

  describe('Manual Discovery', () => {
    it('should allow manual discovery of initial species', () => {
      const speciesId = 'starter_species';

      researchSystem.manualDiscovery(speciesId, 0, DiscoveryMethod.INITIAL);

      expect(researchSystem.getState().discoveredSpecies.has(speciesId)).toBe(true);
      const discovery = researchSystem.getDiscovery(speciesId);
      expect(discovery?.unlockMethod).toBe(DiscoveryMethod.INITIAL);
      expect(discovery?.discoveryConditions).toBe('Starting species');
    });

    it('should allow manual discovery for interventions', () => {
      const speciesId = 'introduced_species';

      researchSystem.manualDiscovery(speciesId, 50, DiscoveryMethod.INTERVENTION);

      const discovery = researchSystem.getDiscovery(speciesId);
      expect(discovery?.unlockMethod).toBe(DiscoveryMethod.INTERVENTION);
      expect(discovery?.discoveryConditions).toBe('Manually introduced');
    });

    it('should not duplicate manual discoveries', () => {
      const speciesId = 'test_species';

      researchSystem.manualDiscovery(speciesId, 0, DiscoveryMethod.INITIAL);
      researchSystem.manualDiscovery(speciesId, 10, DiscoveryMethod.INTERVENTION);

      expect(researchSystem.getState().discoveredSpecies.size).toBe(1);
    });
  });

  describe('Research Notes', () => {
    it('should add research notes for species', () => {
      const speciesId = 'common_grass';

      researchSystem.manualDiscovery(speciesId, 0);
      researchSystem.addResearchNote(speciesId, 'Thrives in full sun');
      researchSystem.addResearchNote(speciesId, 'Reproduces quickly in spring');

      const notes = researchSystem.getState().researchNotes.get(speciesId);
      expect(notes).toHaveLength(2);
      expect(notes).toContain('Thrives in full sun');
      expect(notes).toContain('Reproduces quickly in spring');
    });
  });

  describe('State Persistence', () => {
    it('should export and import state correctly', () => {
      // Setup initial state
      researchSystem.observeSpecies('species_a', testChunk, 0);
      researchSystem.observeSpecies('species_b', testChunk, 1);

      for (let i = 2; i < 12; i++) {
        researchSystem.observeSpecies('species_a', testChunk, i);
      }

      researchSystem.addResearchNote('species_a', 'Test note');

      // Export state
      const exported = researchSystem.exportState();

      // Create new system and import
      const newSystem = new ResearchSystem(eventJournal, 0);
      newSystem.importState(exported);

      // Verify state matches
      expect(newSystem.getState().discoveredSpecies.size).toBe(2);
      expect(newSystem.getObservationCount('species_a')).toBe(11);
      expect(newSystem.getObservationCount('species_b')).toBe(1);
      expect(newSystem.hasUnlockedTrait('species_a', TraitCategory.ENVIRONMENTAL)).toBe(true);
      expect(newSystem.getState().researchNotes.get('species_a')).toContain('Test note');
    });
  });

  describe('Multiple Species Tracking', () => {
    it('should track multiple species independently', () => {
      const species = ['common_grass', 'silver_birch', 'healing_fern', 'crimson_oak'];

      // Observe each species different numbers of times
      for (let i = 0; i < 5; i++) researchSystem.observeSpecies(species[0], testChunk, i);
      for (let i = 0; i < 15; i++) researchSystem.observeSpecies(species[1], testChunk, i);
      for (let i = 0; i < 30; i++) researchSystem.observeSpecies(species[2], testChunk, i);
      for (let i = 0; i < 60; i++) researchSystem.observeSpecies(species[3], testChunk, i);

      expect(researchSystem.getObservationCount(species[0])).toBe(5);
      expect(researchSystem.getObservationCount(species[1])).toBe(15);
      expect(researchSystem.getObservationCount(species[2])).toBe(30);
      expect(researchSystem.getObservationCount(species[3])).toBe(60);

      expect(researchSystem.hasUnlockedTrait(species[1], TraitCategory.ENVIRONMENTAL)).toBe(true);
      expect(researchSystem.hasUnlockedTrait(species[2], TraitCategory.REPRODUCTIVE)).toBe(true);
      expect(researchSystem.hasUnlockedTrait(species[3], TraitCategory.ECOLOGICAL)).toBe(true);
    });
  });

  describe('Discovery Context Generation', () => {
    it('should generate appropriate context for dry conditions', () => {
      testChunk.biomeState.moisture = 0.2;
      testChunk.biomeState.succession = 0.1;

      researchSystem.observeSpecies('drought_species', testChunk, 0);

      const discovery = researchSystem.getDiscovery('drought_species');
      expect(discovery?.discoveryConditions).toContain('dry conditions');
      expect(discovery?.discoveryConditions).toContain('pioneer habitat');
    });

    it('should generate appropriate context for shaded environments', () => {
      testChunk.climateState.light = 0.2;
      testChunk.biomeState.succession = 0.8;

      researchSystem.observeSpecies('shade_species', testChunk, 0);

      const discovery = researchSystem.getDiscovery('shade_species');
      expect(discovery?.discoveryConditions).toContain('shade');
      expect(discovery?.discoveryConditions).toContain('mature ecosystem');
    });
  });
});
