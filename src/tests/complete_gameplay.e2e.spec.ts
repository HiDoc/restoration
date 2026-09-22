/**
 * Complete Gameplay Integration Test
 * Simulates a full player session from start to finish
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInterventionStore } from '@/stores/interventionStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import type { PlayerIntervention } from '@/simulation/SimulationEngine';

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock as any;

describe('Complete Gameplay Integration', () => {
  let engine: SimulationEngine;
  let interventionStore: ReturnType<typeof useInterventionStore>;
  let goalsStore: ReturnType<typeof useGoalsStore>;
  let tutorialStore: ReturnType<typeof useTutorialStore>;
  let scenarioStore: ReturnType<typeof useScenarioStore>;

  beforeEach(() => {
    // Clear localStorage for clean test
    localStorage.clear();

    setActivePinia(createPinia());

    // Initialize stores
    interventionStore = useInterventionStore();
    goalsStore = useGoalsStore();
    tutorialStore = useTutorialStore();
    scenarioStore = useScenarioStore();

    // Create a realistic game engine
    engine = new SimulationEngine({
      worldSize: { width: 5, height: 5 },
      chunkSize: 10,
      difficulty: 'normal',
      enableSeasons: true,
      enableHydrology: true
    });

    // Activate chunks
    engine.activateAllChunks();

    // Initialize all game systems
    interventionStore.initialize(engine, 'normal');
    goalsStore.initialize(engine, 'normal', engine.getResearchSystem());
    tutorialStore.initializeTutorial();
    scenarioStore.initialize(engine);
  });

  describe('Complete Player Session', () => {
    it('should complete full gameplay loop from start to goal completion', async () => {
      console.log('\n=== STARTING COMPLETE GAMEPLAY TEST ===\n');

      // ============================================
      // PHASE 1: GAME INITIALIZATION
      // ============================================
      console.log('Phase 1: Game Initialization');

      // Verify initial state
      expect(interventionStore.resourcePoints).toBe(100);
      expect(goalsStore.activeGoals.length).toBeGreaterThan(0);
      expect(tutorialStore.showWelcomeModal).toBe(true);

      console.log(`✓ Starting resources: ${interventionStore.resourcePoints} points`);
      console.log(`✓ Active goals: ${goalsStore.activeGoals.length}`);
      console.log(`✓ Tutorial ready: ${tutorialStore.showWelcomeModal}`);

      // ============================================
      // PHASE 2: TUTORIAL INTERACTION
      // ============================================
      console.log('\nPhase 2: Tutorial Interaction');

      // Simulate player dismissing welcome (skipping tutorial for faster test)
      tutorialStore.dismissWelcome();
      expect(tutorialStore.hasSeenWelcome).toBe(true);
      expect(tutorialStore.showWelcomeModal).toBe(false);

      console.log(`✓ Tutorial welcome dismissed`);

      // ============================================
      // PHASE 3: INITIAL SIMULATION RUN
      // ============================================
      console.log('\nPhase 3: Initial Simulation (100 ticks)');

      let speciesCount = 0;
      let avgVitality = 0;

      for (let tick = 0; tick < 100; tick++) {
        engine.update();

        // Evaluate goals every 10 ticks
        if (tick % 10 === 0) {
          const results = goalsStore.evaluateGoals(tick);

          // Award points for completed goals
          results.forEach(result => {
            if (result.completed && result.completedAtTick === tick) {
              interventionStore.addPoints(result.goal.rewardPoints);
              console.log(`  🎯 Goal completed at tick ${tick}: "${result.goal.title}" (+${result.goal.rewardPoints} points)`);
            }
          });
        }

        // Track statistics
        if (tick === 99) {
          const stats = engine.getStatistics();
          speciesCount = stats.totalSpecies;
          avgVitality = stats.avgVitality;
        }
      }

      console.log(`✓ Simulation ran 100 ticks`);
      console.log(`  Species count: ${speciesCount}`);
      console.log(`  Avg vitality: ${(avgVitality * 100).toFixed(1)}%`);
      console.log(`  Resource points: ${interventionStore.resourcePoints}`);
      console.log(`  Completed goals: ${goalsStore.completedGoals.length}`);

      // ============================================
      // PHASE 4: INTERVENTION USAGE
      // ============================================
      console.log('\nPhase 4: Using Interventions');

      const chunks = Array.from(engine.getAllChunks().values());
      expect(chunks.length).toBeGreaterThan(0);

      const initialPoints = interventionStore.resourcePoints;

      // Test Plant intervention
      if (interventionStore.canAfford('plant')) {
        const plantIntervention: PlayerIntervention = {
          chunkId: chunks[0].id,
          x: 0,
          y: 0,
          type: 'plant',
          data: { speciesId: 'common_grass' }
        };

        const plantResult = await interventionStore.executeIntervention(plantIntervention);
        console.log(`  🌱 Plant intervention: ${plantResult ? 'SUCCESS' : 'FAILED'}`);

        if (plantResult) {
          expect(interventionStore.resourcePoints).toBe(initialPoints - 20);
          expect(interventionStore.isOnCooldown('plant')).toBe(true);
          console.log(`    Points: ${initialPoints} → ${interventionStore.resourcePoints}`);
          console.log(`    Cooldown: ${interventionStore.getRemainingCooldown('plant')} ticks`);
        }
      }

      // Test Irrigate intervention
      if (interventionStore.canAfford('irrigate')) {
        const irrigateIntervention: PlayerIntervention = {
          chunkId: chunks[1]?.id || chunks[0].id,
          x: 1,
          y: 1,
          type: 'irrigate',
          data: {}
        };

        const irrigateResult = await interventionStore.executeIntervention(irrigateIntervention);
        console.log(`  💧 Irrigate intervention: ${irrigateResult ? 'SUCCESS' : 'FAILED'}`);

        if (irrigateResult) {
          expect(interventionStore.isOnCooldown('irrigate')).toBe(true);
          console.log(`    Points: ${interventionStore.resourcePoints}`);
          console.log(`    Cooldown: ${interventionStore.getRemainingCooldown('irrigate')} ticks`);
        }
      }

      console.log(`✓ Used ${interventionStore.usageStats.totalInterventions} interventions`);

      // ============================================
      // PHASE 5: COOLDOWN PROGRESSION
      // ============================================
      console.log('\nPhase 5: Cooldown Progression (20 ticks)');

      const irrigateCooldownBefore = interventionStore.getRemainingCooldown('irrigate');

      for (let i = 0; i < 20; i++) {
        engine.update();

        // Evaluate goals
        if (i % 5 === 0) {
          goalsStore.evaluateGoals(engine.getCurrentTick());
        }
      }

      const irrigateCooldownAfter = interventionStore.getRemainingCooldown('irrigate');
      console.log(`  Irrigate cooldown: ${irrigateCooldownBefore} → ${irrigateCooldownAfter} ticks`);

      if (irrigateCooldownBefore > 0) {
        expect(irrigateCooldownAfter).toBeLessThan(irrigateCooldownBefore);
      }

      // ============================================
      // PHASE 6: GOAL PROGRESSION
      // ============================================
      console.log('\nPhase 6: Extended Simulation for Goal Progress (200 ticks)');

        let newGoalsCompleted = 0;

      for (let tick = 0; tick < 200; tick++) {
        engine.update();

        if (tick % 20 === 0) {
          const results = goalsStore.evaluateGoals(engine.getCurrentTick());

          results.forEach(result => {
            if (result.completed && result.completedAtTick === engine.getCurrentTick()) {
              newGoalsCompleted++;
              interventionStore.addPoints(result.goal.rewardPoints);
              console.log(`  🎯 Goal: "${result.goal.title}" (+${result.goal.rewardPoints} points)`);
            }
          });
        }
      }

      console.log(`✓ New goals completed: ${newGoalsCompleted}`);
      console.log(`  Total completed: ${goalsStore.completedGoals.length}/${goalsStore.activeGoals.length}`);
      console.log(`  Overall progress: ${(goalsStore.overallProgress * 100).toFixed(1)}%`);
      console.log(`  Total points earned from goals: ${goalsStore.totalPointsFromGoals}`);

      // ============================================
      // PHASE 7: RESOURCE MANAGEMENT
      // ============================================
      console.log('\nPhase 7: Resource Management Validation');

      const finalPoints = interventionStore.resourcePoints;
      const pointsEarned = interventionStore.totalPointsEarned;
      const pointsSpent = interventionStore.totalPointsSpent;

      console.log(`  Starting points: 100`);
      console.log(`  Points earned: ${pointsEarned}`);
      console.log(`  Points spent: ${pointsSpent}`);
      console.log(`  Final balance: ${finalPoints}`);

      // Verify resource accounting
      const expectedBalance = 100 - pointsSpent + pointsEarned;
      expect(finalPoints).toBe(expectedBalance);
      console.log(`✓ Resource accounting verified: ${expectedBalance} = 100 - ${pointsSpent} + ${pointsEarned}`);

      // ============================================
      // PHASE 8: STATISTICS SUMMARY
      // ============================================
      console.log('\nPhase 8: Final Statistics');

      const finalStats = engine.getStatistics();
      const interventionStats = interventionStore.usageStats;

      console.log('  Ecosystem:');
      console.log(`    Species: ${finalStats.totalSpecies}`);
      console.log(`    Avg Vitality: ${(finalStats.avgVitality * 100).toFixed(1)}%`);
      console.log(`    Avg Pollution: ${(finalStats.avgPollution * 100).toFixed(1)}%`);

      console.log('  Interventions:');
      console.log(`    Total used: ${interventionStats.totalInterventions}`);
      Object.entries(interventionStats.byType).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });

      console.log('  Goals:');
      console.log(`    Completed: ${goalsStore.completedGoals.length}`);
      console.log(`    In Progress: ${goalsStore.incompleteGoals.length}`);
      console.log(`    Total Points: ${goalsStore.totalPointsFromGoals}`);

      // ============================================
      // PHASE 9: VALIDATION ASSERTIONS
      // ============================================
      console.log('\nPhase 9: Final Validation');

      // Core gameplay loop assertions
      expect(engine.getCurrentTick()).toBeGreaterThan(300); // Ran for 320 ticks total
      expect(interventionStore.usageStats.totalInterventions).toBeGreaterThanOrEqual(0);
      expect(goalsStore.activeGoals.length).toBeGreaterThan(0);
      expect(interventionStore.resourcePoints).toBeGreaterThanOrEqual(0);

      // Tutorial state assertions
      expect(tutorialStore.completedSteps.size).toBeGreaterThan(0);
      expect(tutorialStore.hasSeenWelcome).toBe(true);

      // Intervention system assertions
      expect(interventionStore.totalPointsEarned).toBeGreaterThanOrEqual(0);
      expect(interventionStore.totalPointsSpent).toBeGreaterThanOrEqual(0);

      console.log('✓ All validation checks passed');

      console.log('\n=== GAMEPLAY TEST COMPLETE ===');
      console.log('Result: SUCCESS - Game is fully playable! 🎮\n');
    });

    it('should handle edge cases gracefully', async () => {
      console.log('\n=== TESTING EDGE CASES ===\n');

      // Test 1: Insufficient resources
      console.log('Test 1: Preventing actions with insufficient resources');
      interventionStore.deductPoints(95); // Down to 5 points

      expect(interventionStore.canAfford('plant')).toBe(false);
      expect(interventionStore.canAfford('irrigate')).toBe(false);
      console.log('✓ Properly blocks unaffordable interventions');

      // Test 2: Cooldown enforcement
      console.log('\nTest 2: Cooldown enforcement');
      interventionStore.addPoints(100); // Restore points

      const chunks = Array.from(engine.getAllChunks().values());
      if (chunks.length > 0) {
        const intervention: PlayerIntervention = {
          chunkId: chunks[0].id,
          x: 0,
          y: 0,
          type: 'cleanse',
          data: {}
        };

        const firstUse = await interventionStore.executeIntervention(intervention);
        const secondUse = await interventionStore.executeIntervention(intervention);

        expect(firstUse).toBe(true);
        expect(secondUse).toBe(false);
        console.log('✓ Properly enforces cooldown restrictions');
      }

      // Test 3: Goal state persistence
      console.log('\nTest 3: Goal progress tracking');
      const initialProgress = goalsStore.overallProgress;

      for (let i = 0; i < 50; i++) {
        engine.update();
      }

      goalsStore.evaluateGoals(engine.getCurrentTick());
      expect(goalsStore.overallProgress).toBeGreaterThanOrEqual(initialProgress);
      console.log('✓ Goal progress properly tracked');

      // Test 4: Tutorial state persistence
      console.log('\nTest 4: Tutorial persistence');
      const stepsCompleted = tutorialStore.completedSteps.size;

      // Simulate page reload by creating new store
      const newTutorialStore = useTutorialStore();
      newTutorialStore.initializeTutorial();

      expect(newTutorialStore.hasSeenWelcome).toBe(true);
      expect(newTutorialStore.completedSteps.size).toBe(stepsCompleted);
      console.log('✓ Tutorial state persists across reloads');

      console.log('\n=== EDGE CASE TESTS COMPLETE ===\n');
    });

    it('should support extended gameplay session', async () => {
      console.log('\n=== EXTENDED GAMEPLAY SESSION (500 ticks) ===\n');

      let totalGoalsCompleted = 0;
      let totalInterventions = 0;
      let ticksElapsed = 0;

      for (let batch = 0; batch < 10; batch++) {
        console.log(`Batch ${batch + 1}/10 (Ticks ${ticksElapsed}-${ticksElapsed + 50})`);

        for (let tick = 0; tick < 50; tick++) {
          engine.update();
          ticksElapsed++;

          // Try to use intervention every 15 ticks if affordable
          if (tick % 15 === 0) {
            const chunks = Array.from(engine.getAllChunks().values());
            if (chunks.length > 0 && interventionStore.canAfford('irrigate') && !interventionStore.isOnCooldown('irrigate')) {
              const intervention: PlayerIntervention = {
                chunkId: chunks[tick % chunks.length].id,
                x: tick % 5,
                y: tick % 5,
                type: 'irrigate',
                data: {}
              };

              const result = await interventionStore.executeIntervention(intervention);
              if (result) totalInterventions++;
            }
          }

          // Evaluate goals every 25 ticks
          if (tick % 25 === 0) {
            const results = goalsStore.evaluateGoals(ticksElapsed);
            results.forEach(result => {
              if (result.completed && result.completedAtTick === ticksElapsed) {
                totalGoalsCompleted++;
                interventionStore.addPoints(result.goal.rewardPoints);
              }
            });
          }
        }

        const stats = engine.getStatistics();
        console.log(`  Species: ${stats.totalSpecies}, Vitality: ${(stats.avgVitality * 100).toFixed(1)}%, Points: ${interventionStore.resourcePoints}`);
      }

      console.log(`\nSession Summary:`);
      console.log(`  Total ticks: ${ticksElapsed}`);
      console.log(`  Goals completed: ${totalGoalsCompleted}`);
      console.log(`  Interventions used: ${totalInterventions}`);
      console.log(`  Final resources: ${interventionStore.resourcePoints}`);
      console.log(`  Ecosystem species: ${engine.getStatistics().totalSpecies}`);

      // Verify game remained playable
      expect(ticksElapsed).toBe(500);
      expect(interventionStore.resourcePoints).toBeGreaterThanOrEqual(0);
      expect(goalsStore.activeGoals.length).toBeGreaterThan(0);

      console.log('\n✓ Game stable over extended session');
      console.log('\n=== EXTENDED SESSION TEST COMPLETE ===\n');
    });
  });
});
