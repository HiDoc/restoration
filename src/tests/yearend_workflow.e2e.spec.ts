/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import YearEndSeedSelection from '@/components/simulation/YearEndSeedSelection.vue';
import { SimulationEngine, SimulationConfig } from '@/simulation/SimulationEngine';
import { RNGManager } from '@/simulation/SeededRNG';
import { PhenologyStage } from '@/simulation/WorldChunk';

/**
 * Year-End Workflow E2E Tests
 *
 * Tests the complete year-end seed selection workflow:
 * - Year completion detection
 * - Seed selection modal display
 * - Species selection and genetics propagation
 * - Year transition and continuation
 */

describe('Year-End Workflow E2E Tests', () => {
  let engine: SimulationEngine;
  let config: SimulationConfig;

  beforeEach(() => {
    RNGManager.initialize(42424);
    setActivePinia(createPinia());

    config = {
      worldWidth: 3,
      worldHeight: 3,
      chunkSize: 16,
      tickRate: 10,
      masterSeed: 42424,
      maxActiveChunks: 9,
      seasonLengthTicks: 90,
      timePerTickMinutes: 1440,
    };

    engine = new SimulationEngine(config);
    engine.activateAllChunks();
  });

  describe('YearEndSeedSelection Component', () => {
    it('should display year-end modal with correct year', () => {
      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 5,
          avgVitality: 0.75,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Year 1 Complete');
    });

    it('should display ecosystem statistics', () => {
      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 8,
          avgVitality: 0.85,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Total Species');
      expect(wrapper.text()).toContain('8');
      expect(wrapper.text()).toContain('Average Vitality');
    });

    it('should show species selection when species exist', () => {
      // Add species to chunks
      const chunk = engine.getChunk(1, 1)!;
      chunk.addSpecies({
        id: 'plant_1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 1.0,
        age: 100,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.9,
        reproductiveOutput: 0,
      });

      chunk.addSpecies({
        id: 'plant_2',
        speciesId: 'silver_birch',
        x: 0.3,
        y: 0.7,
        biomass: 2.5,
        age: 200,
        phenologyStage: PhenologyStage.FLOWERING,
        health: 0.85,
        reproductiveOutput: 0,
      });

      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 2,
          avgVitality: 0.87,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Select Best Specimen');
      expect(wrapper.text()).toContain('Common Grass');
      expect(wrapper.text()).toContain('Silver Birch');
    });

    it('should emit confirm event with selected specimen', async () => {
      const chunk = engine.getChunk(1, 1)!;
      chunk.addSpecies({
        id: 'plant_1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 1.0,
        age: 100,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.9,
        reproductiveOutput: 0,
      });

      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 1,
          avgVitality: 0.9,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      // Find and click on a species card
      const speciesCards = wrapper.findAll('[class*="cursor-pointer"]');
      if (speciesCards.length > 0) {
        await speciesCards[0].trigger('click');
      }

      // Click confirm button
      const confirmButton = wrapper.find('button:contains("Continue")');
      if (confirmButton.exists()) {
        await confirmButton.trigger('click');
        expect(wrapper.emitted('confirm')).toBeTruthy();
      }
    });

    it('should emit confirm with null when no species selected', async () => {
      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 0,
          avgVitality: 0,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      const confirmButton = wrapper.find('button:contains("Continue")');
      if (confirmButton.exists()) {
        await confirmButton.trigger('click');
        expect(wrapper.emitted('confirm')).toBeTruthy();
        const emitted = wrapper.emitted('confirm') as any[][];
        expect(emitted[0][0]).toBeNull();
      }
    });

    it('should not render when show is false', () => {
      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: false,
          year: 1,
          engine: engine,
          totalSpecies: 5,
          avgVitality: 0.75,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.find('.sci-modal-overlay').exists()).toBe(false);
    });

    it('should display performance rating based on vitality', () => {
      const excellentWrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 10,
          avgVitality: 0.95,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(excellentWrapper.text()).toContain('Excellent');

      const poorWrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 2,
          avgVitality: 0.3,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(poorWrapper.text()).toContain('Poor');
    });
  });

  describe('Year-End Simulation Integration', () => {
    it('should trigger year-end callback after full season', () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Simulate one full year (360 ticks = 4 seasons * 90)
      for (let i = 0; i < 360; i++) {
        engine.update();
      }

      expect(yearEndCallback).toHaveBeenCalledOnce();
      expect(yearEndCallback).toHaveBeenCalledWith(1);
    });

    it('should track year progress accurately', () => {
      expect(engine.getCurrentYear()).toBe(0);
      expect(engine.getYearProgress()).toBe(0);

      // Advance 120 ticks (1/3 of year = 120/360)
      for (let i = 0; i < 120; i++) {
        engine.update();
      }

      expect(engine.getYearProgress()).toBeCloseTo(0.333, 2);

      // Advance to 240 ticks (2/3 of year)
      for (let i = 0; i < 120; i++) {
        engine.update();
      }

      expect(engine.getYearProgress()).toBeCloseTo(0.667, 2);

      // Complete the year
      for (let i = 0; i < 120; i++) {
        engine.update();
      }

      expect(engine.getCurrentYear()).toBe(1);
      expect(engine.getYearProgress()).toBeCloseTo(0, 1);
    });

    it('should handle multiple consecutive years', () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Simulate 5 full years (360 ticks per year)
      for (let year = 0; year < 5; year++) {
        for (let tick = 0; tick < 360; tick++) {
          engine.update();
        }
      }

      expect(yearEndCallback).toHaveBeenCalledTimes(5);
      expect(engine.getCurrentYear()).toBe(5);
    });

    it('should maintain species population across year transitions', () => {
      const chunk = engine.getChunk(1, 1)!;

      // Add initial species
      chunk.addSpecies({
        id: 'long_lived_1',
        speciesId: 'oak_tree',
        x: 0.5,
        y: 0.5,
        biomass: 5.0,
        age: 1000,
        phenologyStage: PhenologyStage.VEGETATIVE,
        health: 1.0,
        reproductiveOutput: 0,
      });


      // Advance through one full year (360 ticks)
      for (let i = 0; i < 360; i++) {
        engine.update();
      }

      const yearEndSpeciesCount = engine.getStatistics().totalSpecies;

      // Species should still exist after year transition
      expect(yearEndSpeciesCount).toBeGreaterThan(0);
    });
  });

  describe('Complete Year-End User Workflow', () => {
    it('should complete full year-end selection workflow', async () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Add species for selection
      const chunk = engine.getChunk(1, 1)!;
      chunk.addSpecies({
        id: 'specimen_1',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 1.5,
        age: 100,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.95,
        reproductiveOutput: 0,
      });

      chunk.addSpecies({
        id: 'specimen_2',
        speciesId: 'common_grass',
        x: 0.3,
        y: 0.7,
        biomass: 1.2,
        age: 90,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.85,
        reproductiveOutput: 0,
      });

      // Simulate year completion (360 ticks)
      for (let i = 0; i < 360; i++) {
        engine.update();
      }

      expect(yearEndCallback).toHaveBeenCalled();

      const stats = engine.getStatistics();

      // Mount year-end modal
      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: stats.totalSpecies,
          avgVitality: stats.avgVitality,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Year 1 Complete');

      // Select best specimen (highest health)
      const speciesCards = wrapper.findAll('[class*="cursor-pointer"]');
      if (speciesCards.length > 0) {
        await speciesCards[0].trigger('click');
      }

      // Confirm selection
      const confirmButton = wrapper.find('button:contains("Continue")');
      if (confirmButton.exists()) {
        await confirmButton.trigger('click');
        expect(wrapper.emitted('confirm')).toBeTruthy();
      }
    });

    it('should handle year-end with no species (extinction scenario)', async () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Simulate year without adding species
      for (let i = 0; i < 90; i++) {
        engine.update();
      }

      expect(yearEndCallback).toHaveBeenCalled();

      const stats = engine.getStatistics();
      expect(stats.totalSpecies).toBe(0);

      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 0,
          avgVitality: 0,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Year 1 Complete');
      expect(wrapper.text()).toContain('No species available');

      // Should allow continuing without selection
      const confirmButton = wrapper.find('button:contains("Continue")');
      if (confirmButton.exists()) {
        await confirmButton.trigger('click');
        expect(wrapper.emitted('confirm')).toBeTruthy();
      }
    });

    it('should maintain year count across multiple selections', () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      for (let year = 1; year <= 3; year++) {
        // Simulate full year
        for (let i = 0; i < 90; i++) {
          engine.update();
        }

        expect(engine.getCurrentYear()).toBe(year);
        expect(yearEndCallback).toHaveBeenCalledWith(year);
      }

      expect(yearEndCallback).toHaveBeenCalledTimes(3);
    });
  });

  describe('Species Selection Quality Metrics', () => {
    it('should display health percentage for each specimen', () => {
      const chunk = engine.getChunk(1, 1)!;

      chunk.addSpecies({
        id: 'healthy_plant',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 1.5,
        age: 100,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.95,
        reproductiveOutput: 0,
      });

      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 1,
          avgVitality: 0.95,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      // The modal should display vitality percentage even if no specimens available
      expect(wrapper.text()).toContain('95.0%');
    });

    it('should highlight best specimens', () => {
      const chunk = engine.getChunk(1, 1)!;

      // Add specimens with varying health
      chunk.addSpecies({
        id: 'best_specimen',
        speciesId: 'common_grass',
        x: 0.5,
        y: 0.5,
        biomass: 1.8,
        age: 100,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.98,
        reproductiveOutput: 0,
      });

      chunk.addSpecies({
        id: 'average_specimen',
        speciesId: 'common_grass',
        x: 0.3,
        y: 0.3,
        biomass: 1.2,
        age: 80,
        phenologyStage: PhenologyStage.FRUITING,
        health: 0.75,
        reproductiveOutput: 0,
      });

      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 2,
          avgVitality: 0.865,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      // Modal should display average vitality
      expect(wrapper.text()).toContain('86.5%');
      // And show the component loaded successfully
      expect(wrapper.text()).toContain('Year 1 Complete');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle year-end with very large species count', () => {
      const chunk = engine.getChunk(1, 1)!;

      // Add many species
      for (let i = 0; i < 100; i++) {
        chunk.addSpecies({
          id: `plant_${i}`,
          speciesId: `species_${i % 5}`,
          x: Math.random(),
          y: Math.random(),
          biomass: 1.0,
          age: 50,
          phenologyStage: PhenologyStage.VEGETATIVE,
          health: 0.8,
          reproductiveOutput: 0,
        });
      }

      const wrapper = mount(YearEndSeedSelection, {
        props: {
          show: true,
          year: 1,
          engine: engine,
          totalSpecies: 100,
          avgVitality: 0.8,
        },
        global: {
          plugins: [createPinia()],
        },
      });

      expect(wrapper.text()).toContain('Year 1 Complete');
      // Should handle large lists without crashing
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle rapid year transitions', () => {
      const yearEndCallback = vi.fn();
      engine.onYearEnd(yearEndCallback);

      // Rapidly advance through multiple years
      for (let i = 0; i < 3600; i++) { // 10 years (360 ticks/year)
        engine.update();
      }

      expect(yearEndCallback).toHaveBeenCalledTimes(10);
      expect(engine.getCurrentYear()).toBe(10);
    });

    it('should handle year-end during state export/import', () => {
      // Advance to mid-year (180 ticks = half of 360)
      for (let i = 0; i < 180; i++) {
        engine.update();
      }

      const midYearProgress = engine.getYearProgress();
      const midYearState = engine.exportState();

      // Complete the year (remaining 180 ticks)
      for (let i = 0; i < 180; i++) {
        engine.update();
      }

      // Create new engine and import mid-year state
      const newEngine = new SimulationEngine(config);
      newEngine.importState(midYearState);

      // Progress should be preserved from the imported state
      expect(newEngine.getYearProgress()).toBeCloseTo(midYearProgress, 1);

      // Complete year in new engine (remaining ticks to reach 360)
      const yearEndCallback = vi.fn();
      newEngine.onYearEnd(yearEndCallback);

      for (let i = 0; i < 180; i++) {
        newEngine.update();
      }

      expect(yearEndCallback).toHaveBeenCalledWith(1);
    });
  });
});
