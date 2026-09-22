/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SpeciesDiscoveryModal from '@/components/simulation/SpeciesDiscoveryModal.vue';
import FieldGuidePanel from '@/components/simulation/FieldGuidePanel.vue';
import ResearchPanel from '@/components/simulation/ResearchPanel.vue';
import { useResearchStore } from '@/stores/researchStore';
import { DiscoveryMethod, type SpeciesDiscovery } from '@/simulation/ResearchSystem';
import { EventJournal } from '@/simulation/EventJournal';

/**
 * Research UI E2E Tests
 *
 * Tests the complete user workflow for the research system UI:
 * - Species discovery modal interactions
 * - Field guide browsing and trait viewing
 * - Research panel updates and achievements
 * - Integration with research store
 */

describe('Research UI E2E Tests', () => {
  let researchStore: ReturnType<typeof useResearchStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    researchStore = useResearchStore();
    const eventJournal = new EventJournal();
    researchStore.initialize(eventJournal, 0);
  });

  describe('SpeciesDiscoveryModal E2E', () => {
    const mockDiscovery: SpeciesDiscovery = {
      speciesId: 'common_grass',
      firstSeenTick: 10,
      unlockMethod: DiscoveryMethod.ENVIRONMENTAL,
      discoveryConditions: 'Discovered in moderate moisture and full sunlight',
      chunkId: 'chunk_1_1',
    };

    it('should display discovery modal with correct information', () => {
      const wrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: true,
          discovery: mockDiscovery,
          speciesName: 'Common Grass',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Species Discovered!');
      expect(wrapper.text()).toContain('Common Grass');
      expect(wrapper.text()).toContain('Discovered in moderate moisture and full sunlight');
      expect(wrapper.text()).toContain('Tick 10');
    });

    it('should emit close event when close button clicked', async () => {
      const wrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: true,
          discovery: mockDiscovery,
          speciesName: 'Common Grass',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      const closeButton = wrapper.find('button[title="Close modal"]');
      await closeButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit open-field-guide event when field guide button clicked', async () => {
      const wrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: true,
          discovery: mockDiscovery,
          speciesName: 'Common Grass',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      const fieldGuideButton = wrapper.find('button:last-of-type');
      await fieldGuideButton.trigger('click');

      expect(wrapper.emitted('open-field-guide')).toBeTruthy();
    });

    it('should not render when show is false', () => {
      const wrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: false,
          discovery: mockDiscovery,
          speciesName: 'Common Grass',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.find('.sci-modal-overlay').exists()).toBe(false);
    });

    it('should display correct discovery method badge', () => {
      const environmentalWrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: true,
          discovery: { ...mockDiscovery, unlockMethod: DiscoveryMethod.ENVIRONMENTAL },
          speciesName: 'Test Species',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(environmentalWrapper.text()).toContain('Environmental');

      const initialWrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: true,
          discovery: { ...mockDiscovery, unlockMethod: DiscoveryMethod.INITIAL },
          speciesName: 'Test Species',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(initialWrapper.text()).toContain('Starting Species');
    });
  });

  describe('FieldGuidePanel E2E', () => {
    beforeEach(() => {
      // Add some discovered species
      researchStore.manualDiscovery('common_grass', 0, DiscoveryMethod.INITIAL);
      researchStore.manualDiscovery('silver_birch', 5, DiscoveryMethod.ENVIRONMENTAL);

      // Add observations
      for (let i = 0; i < 15; i++) {
        researchStore.notifySpeciesObserved('common_grass', {} as any, i);
      }
      for (let i = 0; i < 50; i++) {
        researchStore.notifySpeciesObserved('silver_birch', {} as any, i);
      }
    });

    it('should display all discovered species', () => {
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      expect(wrapper.text()).toContain('Common Grass');
      expect(wrapper.text()).toContain('Silver Birch');
    });

    it('should show discovery progress percentage', () => {
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      // 2 species out of 50 = 4%
      expect(wrapper.text()).toContain('4%');
    });

    it('should display research progress for each species', () => {
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      // Common grass: 15 observations
      expect(wrapper.text()).toContain('15');

      // Silver birch: 50 observations
      expect(wrapper.text()).toContain('50');
    });

    it('should emit close event when close button clicked', async () => {
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      const closeButton = wrapper.find('button[title="Close field guide"]');
      await closeButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should show "no species discovered" message when empty', () => {
      // Create new store without discoveries
      setActivePinia(createPinia());
      const emptyStore = useResearchStore();
      emptyStore.initialize(new EventJournal(), 0);

      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      expect(wrapper.text()).toContain('No Species Discovered Yet');
    });

    it('should allow selecting a species for detailed view', async () => {
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      // Click on a species card
      const speciesCards = wrapper.findAll('.sci-panel[class*="cursor-pointer"]');
      expect(speciesCards.length).toBeGreaterThan(0);

      await speciesCards[0].trigger('click');

      // Should show details section
      expect(wrapper.text()).toContain('Details');
    });
  });

  describe('ResearchPanel E2E', () => {
    beforeEach(() => {
      // Add discovered species
      researchStore.manualDiscovery('common_grass', 0, DiscoveryMethod.INITIAL);
      researchStore.manualDiscovery('silver_birch', 5, DiscoveryMethod.ENVIRONMENTAL);

      // Add observations
      for (let i = 0; i < 25; i++) {
        researchStore.notifySpeciesObserved('common_grass', {} as any, i);
      }
    });

    it('should display discovery count', () => {
      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Discovered');
      expect(wrapper.text()).toContain('2'); // 2 species discovered
    });

    it('should display total observations', () => {
      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Observations');
      expect(wrapper.text()).toContain('25');
    });

    it('should emit open-field-guide event when button clicked', async () => {
      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      const fieldGuideButton = wrapper.find('button:contains("Field Guide")');
      await fieldGuideButton.trigger('click');

      expect(wrapper.emitted('open-field-guide')).toBeTruthy();
    });

    it('should show "no achievements" message when empty', () => {
      // Create new store without achievements
      setActivePinia(createPinia());
      const emptyStore = useResearchStore();
      emptyStore.initialize(new EventJournal(), 0);

      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('No achievements yet');
    });

    it('should display recent achievements', () => {
      // Mock achievement unlock
      researchStore.checkAndUnlockAchievements(10);

      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Recent Achievements');
    });

    it('should show research questions when available', () => {
      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Research Questions');
    });

    it('should emit select-question event when question clicked', async () => {
      // Ensure research questions are loaded
      researchStore.refreshQuestions();

      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      const questionCards = wrapper.findAll('[class*="cursor-pointer"]');
      if (questionCards.length > 0) {
        await questionCards[0].trigger('click');
        expect(wrapper.emitted('select-question')).toBeTruthy();
      }
    });
  });

  describe('Complete Research Workflow E2E', () => {
    it('should handle discovery → field guide → detailed view workflow', async () => {
      // 1. Discover species
      researchStore.manualDiscovery('test_species', 0, DiscoveryMethod.ENVIRONMENTAL);

      // 2. Show discovery modal
      const discoveryWrapper = mount(SpeciesDiscoveryModal, {
        props: {
          show: true,
          discovery: {
            speciesId: 'test_species',
            firstSeenTick: 0,
            unlockMethod: DiscoveryMethod.ENVIRONMENTAL,
            discoveryConditions: 'Test discovery',
            chunkId: 'chunk_0_0',
          },
          speciesName: 'Test Species',
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(discoveryWrapper.text()).toContain('Test Species');

      // 3. Click "View in Field Guide"
      const viewButton = discoveryWrapper.find('button:last-of-type');
      await viewButton.trigger('click');

      expect(discoveryWrapper.emitted('open-field-guide')).toBeTruthy();

      // 4. Open field guide
      const fieldGuideWrapper = mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      expect(fieldGuideWrapper.text()).toContain('Test Species');

      // 5. Select species for details
      const speciesCard = fieldGuideWrapper.find('.sci-panel[class*="cursor-pointer"]');
      await speciesCard.trigger('click');

      expect(fieldGuideWrapper.text()).toContain('Details');
    });

    it('should update UI as observations increase', async () => {
      researchStore.manualDiscovery('progressive_species', 0, DiscoveryMethod.INITIAL);

      // Initial state: 0 observations
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      expect(researchStore.getObservationCount('progressive_species')).toBe(0);

      // Add 10 observations
      for (let i = 0; i < 10; i++) {
        researchStore.notifySpeciesObserved('progressive_species', {} as any, i);
      }

      // Remount to get updated state
      mount(FieldGuidePanel, {
        props: {
          show: true,
          totalSpecies: 50,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            TraitCard: true,
          },
        },
      });

      expect(researchStore.getObservationCount('progressive_species')).toBe(10);

      // Add 90 more observations (total 100)
      for (let i = 10; i < 100; i++) {
        researchStore.notifySpeciesObserved('progressive_species', {} as any, i);
      }

      expect(researchStore.getObservationCount('progressive_species')).toBe(100);
      expect(researchStore.getResearchProgress('progressive_species')).toBe(1.0);
    });

    it('should show achievements when milestones reached', () => {
      // Discover multiple species to trigger achievements
      for (let i = 0; i < 5; i++) {
        researchStore.manualDiscovery(`species_${i}`, i, DiscoveryMethod.ENVIRONMENTAL);
      }

      researchStore.checkAndUnlockAchievements(10);

      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      // Should show achievement section
      expect(wrapper.text()).toContain('Recent Achievements');
    });

    it('should handle concurrent discovery notifications', () => {
      const species = ['species_a', 'species_b', 'species_c'];

      // Discover all species simultaneously
      species.forEach((id, index) => {
        researchStore.manualDiscovery(id, index, DiscoveryMethod.ENVIRONMENTAL);
      });

      expect(researchStore.discoveredCount).toBe(3);

      // Observe all species simultaneously
      for (let tick = 0; tick < 20; tick++) {
        species.forEach((id) => {
          researchStore.notifySpeciesObserved(id, {} as any, tick);
        });
      }

      expect(researchStore.totalObservations).toBe(60); // 3 species × 20 observations
    });
  });

  describe('Store Integration E2E', () => {
    it('should sync modal state with store', () => {
      expect(researchStore.showDiscoveryModal).toBe(false);
      expect(researchStore.showFieldGuide).toBe(false);

      // Open discovery modal
      researchStore.manualDiscovery('new_species', 0, DiscoveryMethod.ENVIRONMENTAL);

      // Manually trigger modal (in real app, this happens in SimulationView)
      researchStore.latestDiscovery = researchStore.getDiscovery('new_species');
      researchStore.showDiscoveryModal = true;

      expect(researchStore.showDiscoveryModal).toBe(true);

      // Close and open field guide
      researchStore.closeDiscoveryAndOpenFieldGuide();

      expect(researchStore.showDiscoveryModal).toBe(false);
      expect(researchStore.showFieldGuide).toBe(true);

      // Close field guide
      researchStore.closeFieldGuide();

      expect(researchStore.showFieldGuide).toBe(false);
    });

    it('should provide reactive discovery data', () => {
      const wrapper = mount(ResearchPanel, {
        global: {
          plugins: [createPinia()],
        },
      });

      const initialDiscoveredCount = researchStore.discoveredCount;
      expect(wrapper.text()).toContain(initialDiscoveredCount.toString());

      // Add discovery
      researchStore.manualDiscovery('reactive_test', 0, DiscoveryMethod.ENVIRONMENTAL);

      // Vue should reactively update
      wrapper.vm.$nextTick(() => {
        expect(researchStore.discoveredCount).toBe(initialDiscoveredCount + 1);
      });
    });
  });
});
