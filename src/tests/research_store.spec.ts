import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useResearchStore } from '@/stores/researchStore';
import { EventJournal } from '@/simulation/EventJournal';
import { WorldChunk } from '@/simulation/WorldChunk';
import { RNGManager } from '@/simulation/SeededRNG';
import { TraitCategory, DiscoveryMethod } from '@/simulation/ResearchSystem';

describe('ResearchStore (Pinia)', () => {
  let store: ReturnType<typeof useResearchStore>;
  let eventJournal: EventJournal;
  let testChunk: WorldChunk;

  beforeEach(() => {
    // Setup Pinia
    setActivePinia(createPinia());
    store = useResearchStore();

    // Setup test environment
    RNGManager.initialize(99999);
    eventJournal = new EventJournal();
    testChunk = new WorldChunk(0, 0, 1);

    // Favorable conditions
    testChunk.climateState.temperature = 20;
    testChunk.climateState.light = 0.8;
    testChunk.biomeState.moisture = 0.6;
  });

  describe('Initialization', () => {
    it('should start uninitialized', () => {
      expect(store.isInitialized).toBe(false);
      expect(store.system).toBeNull();
    });

    it('should initialize with EventJournal', () => {
      store.initialize(eventJournal, 0);

      expect(store.isInitialized).toBe(true);
      expect(store.system).not.toBeNull();
    });

    it('should start with zero discovered species', () => {
      store.initialize(eventJournal, 0);

      expect(store.discoveredCount).toBe(0);
      expect(store.discoveredSpeciesIds).toEqual([]);
    });
  });

  describe('Species Observation', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should track species observations', () => {
      const speciesId = 'common_grass';

      store.notifySpeciesObserved(speciesId, testChunk, 0);

      expect(store.discoveredCount).toBe(1);
      expect(store.discoveredSpeciesIds).toContain(speciesId);
    });

    it('should show discovery modal for new species', () => {
      const speciesId = 'silver_birch';

      expect(store.showDiscoveryModal).toBe(false);

      store.notifySpeciesObserved(speciesId, testChunk, 0);

      expect(store.showDiscoveryModal).toBe(true);
      expect(store.latestDiscovery).not.toBeNull();
      expect(store.latestDiscovery?.speciesId).toBe(speciesId);
    });

    it('should not show modal for repeat observations', () => {
      const speciesId = 'healing_fern';

      store.notifySpeciesObserved(speciesId, testChunk, 0);
      store.closeDiscoveryModal();

      expect(store.showDiscoveryModal).toBe(false);

      store.notifySpeciesObserved(speciesId, testChunk, 1);

      expect(store.showDiscoveryModal).toBe(false);
    });
  });

  describe('Manual Discovery', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should allow manual species discovery', () => {
      store.manualDiscovery('starter_species', 0, DiscoveryMethod.INITIAL);

      expect(store.discoveredCount).toBe(1);
      expect(store.discoveredSpeciesIds).toContain('starter_species');
    });
  });

  describe('Research Progress', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should calculate research progress correctly', () => {
      const speciesId = 'test_species';

      store.notifySpeciesObserved(speciesId, testChunk, 0);
      expect(store.getResearchProgress(speciesId)).toBeGreaterThan(0);

      // Observe multiple times to unlock traits
      for (let i = 1; i < 15; i++) {
        store.notifySpeciesObserved(speciesId, testChunk, i);
      }

      const progress = store.getResearchProgress(speciesId);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(1.0);
    });

    it('should track trait unlocking', () => {
      const speciesId = 'test_species';

      store.notifySpeciesObserved(speciesId, testChunk, 0);
      expect(store.hasUnlockedTrait(speciesId, TraitCategory.BASIC)).toBe(true);

      for (let i = 1; i < 10; i++) {
        store.notifySpeciesObserved(speciesId, testChunk, i);
      }

      expect(store.hasUnlockedTrait(speciesId, TraitCategory.ENVIRONMENTAL)).toBe(true);
    });

    it('should return 0 progress for undiscovered species', () => {
      expect(store.getResearchProgress('nonexistent')).toBe(0);
    });
  });

  describe('Observation Counts', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should track observation counts per species', () => {
      const speciesId = 'common_grass';

      expect(store.getObservationCount(speciesId)).toBe(0);

      store.notifySpeciesObserved(speciesId, testChunk, 0);
      expect(store.getObservationCount(speciesId)).toBe(1);

      store.notifySpeciesObserved(speciesId, testChunk, 1);
      expect(store.getObservationCount(speciesId)).toBe(2);
    });

    it('should track total observations across all species', () => {
      store.notifySpeciesObserved('species_a', testChunk, 0);
      store.notifySpeciesObserved('species_b', testChunk, 1);
      store.notifySpeciesObserved('species_a', testChunk, 2);

      expect(store.totalObservations).toBe(3);
    });
  });

  describe('Fully Researched Species', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should identify fully researched species', () => {
      const speciesId = 'test_species';

      // Observe 100+ times to unlock all traits
      for (let i = 0; i < 101; i++) {
        store.notifySpeciesObserved(speciesId, testChunk, i);
      }

      expect(store.getResearchProgress(speciesId)).toBe(1.0);
      expect(store.fullyResearchedSpecies).toContain(speciesId);
    });

    it('should not include partially researched species', () => {
      const speciesId = 'partial_species';

      for (let i = 0; i < 25; i++) {
        store.notifySpeciesObserved(speciesId, testChunk, i);
      }

      expect(store.getResearchProgress(speciesId)).toBeLessThan(1.0);
      expect(store.fullyResearchedSpecies).not.toContain(speciesId);
    });
  });

  describe('Field Guide UI', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should open field guide', () => {
      expect(store.showFieldGuide).toBe(false);

      store.openFieldGuide();

      expect(store.showFieldGuide).toBe(true);
    });

    it('should open field guide with selected species', () => {
      const speciesId = 'common_grass';

      store.openFieldGuide(speciesId);

      expect(store.showFieldGuide).toBe(true);
      expect(store.selectedSpecies).toBe(speciesId);
    });

    it('should close field guide', () => {
      store.openFieldGuide('test_species');
      expect(store.showFieldGuide).toBe(true);
      expect(store.selectedSpecies).toBe('test_species');

      store.closeFieldGuide();

      expect(store.showFieldGuide).toBe(false);
      expect(store.selectedSpecies).toBeNull();
    });
  });

  describe('Discovery Modal', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should close discovery modal', () => {
      store.notifySpeciesObserved('test_species', testChunk, 0);
      expect(store.showDiscoveryModal).toBe(true);

      store.closeDiscoveryModal();

      expect(store.showDiscoveryModal).toBe(false);
      expect(store.latestDiscovery).toBeNull();
    });

    it('should close modal and open field guide', () => {
      const speciesId = 'healing_fern';

      store.notifySpeciesObserved(speciesId, testChunk, 0);
      expect(store.showDiscoveryModal).toBe(true);

      store.closeDiscoveryAndOpenFieldGuide();

      expect(store.showDiscoveryModal).toBe(false);
      expect(store.showFieldGuide).toBe(true);
      expect(store.selectedSpecies).toBe(speciesId);
    });
  });

  describe('Research Notes', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should add research notes for species', () => {
      const speciesId = 'common_grass';

      store.manualDiscovery(speciesId, 0);
      store.addResearchNote(speciesId, 'Thrives in full sunlight');

      const state = store.system?.getState();
      const notes = state?.researchNotes.get(speciesId);

      expect(notes).toBeDefined();
      expect(notes).toContain('Thrives in full sunlight');
    });
  });

  describe('Discovery Details', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should retrieve discovery details', () => {
      const speciesId = 'silver_birch';

      store.notifySpeciesObserved(speciesId, testChunk, 10);

      const discovery = store.getDiscovery(speciesId);

      expect(discovery).toBeDefined();
      expect(discovery?.speciesId).toBe(speciesId);
      expect(discovery?.firstSeenTick).toBe(10);
    });

    it('should return undefined for undiscovered species', () => {
      const discovery = store.getDiscovery('nonexistent');

      expect(discovery).toBeUndefined();
    });
  });

  describe('State Persistence', () => {
    beforeEach(() => {
      store.initialize(eventJournal, 0);
    });

    it('should export state', () => {
      store.notifySpeciesObserved('species_a', testChunk, 0);
      store.notifySpeciesObserved('species_b', testChunk, 1);

      const exported = store.exportState();

      expect(exported).not.toBeNull();
      expect(exported?.discoveredSpecies).toHaveLength(2);
    });

    it('should import state', () => {
      // Setup initial state
      store.notifySpeciesObserved('species_a', testChunk, 0);
      for (let i = 1; i < 15; i++) {
        store.notifySpeciesObserved('species_a', testChunk, i);
      }

      const exported = store.exportState();

      // Reset and import
      store.reset();
      store.initialize(eventJournal, 0);
      store.importState(exported);

      expect(store.discoveredCount).toBe(1);
      expect(store.getObservationCount('species_a')).toBe(15);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      store.initialize(eventJournal, 0);
      store.notifySpeciesObserved('test_species', testChunk, 0);
      store.openFieldGuide('test_species');

      store.reset();

      expect(store.isInitialized).toBe(false);
      expect(store.system).toBeNull();
      expect(store.showFieldGuide).toBe(false);
      expect(store.selectedSpecies).toBeNull();
    });
  });
});
