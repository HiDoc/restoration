import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInterventionStore } from '@/stores/interventionStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import type { PlayerIntervention } from '@/simulation/SimulationEngine';

describe('Intervention Flow E2E', () => {
  let interventionStore: ReturnType<typeof useInterventionStore>;
  let goalsStore: ReturnType<typeof useGoalsStore>;
  let engine: SimulationEngine;

  beforeEach(() => {
    setActivePinia(createPinia());
    interventionStore = useInterventionStore();
    goalsStore = useGoalsStore();

    // Create realistic engine
    engine = new SimulationEngine({
      worldSize: { width: 5, height: 5 },
      chunkSize: 10,
      difficulty: 'normal',
      enableSeasons: true,
      enableHydrology: true
    });

    // Initialize stores
    interventionStore.initialize(engine, 'normal');
    goalsStore.initialize(engine, 'normal', engine.getResearchSystem());
  });

  describe('Complete Gameplay Loop', () => {
    it('should handle full intervention workflow', async () => {
      // 1. Start with initial resource points
      expect(interventionStore.resourcePoints).toBe(100);

      // 2. Select an intervention
      interventionStore.selectIntervention('plant');
      expect(interventionStore.selectedIntervention).toBe('plant');

      // 3. Apply intervention to a chunk
      const intervention: PlayerIntervention = {
        chunkId: 'chunk_2_2',
        x: 2,
        y: 2,
        type: 'plant',
        data: { speciesId: 'common_grass' }
      };

      const success = await interventionStore.executeIntervention(intervention);
      expect(success).toBe(true);

      // 4. Verify resource points were deducted
      expect(interventionStore.resourcePoints).toBe(80); // 100 - 20

      // 5. Verify cooldown was set
      expect(interventionStore.isOnCooldown('plant')).toBe(true);
      expect(interventionStore.remainingCooldown('plant')).toBe(10);

      // 6. Verify usage was recorded
      expect(interventionStore.usageHistory).toHaveLength(1);
      expect(interventionStore.usageHistory[0].type).toBe('plant');

      // 7. Intervention selection should be cleared
      expect(interventionStore.selectedIntervention).toBeNull();
    });

    it('should prevent using intervention without enough points', async () => {
      // Spend most points
      interventionStore.deductPoints(85); // Down to 15 points
      expect(interventionStore.resourcePoints).toBe(15);

      // Try to use plant (cost: 20)
      const intervention: PlayerIntervention = {
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'plant',
        data: { speciesId: 'common_grass' }
      };

      const success = await interventionStore.executeIntervention(intervention);
      expect(success).toBe(false);
      expect(interventionStore.resourcePoints).toBe(15); // No deduction
    });

    it('should prevent using intervention on cooldown', async () => {
      // Use irrigate intervention
      const intervention: PlayerIntervention = {
        chunkId: 'chunk_1_1',
        x: 1,
        y: 1,
        type: 'irrigate',
        data: {}
      };

      await interventionStore.executeIntervention(intervention);
      expect(interventionStore.resourcePoints).toBe(85); // 100 - 15

      // Try to use irrigate again immediately
      const secondAttempt = await interventionStore.executeIntervention(intervention);
      expect(secondAttempt).toBe(false);
      expect(interventionStore.resourcePoints).toBe(85); // No additional deduction
    });

    it('should allow reusing intervention after cooldown expires', async () => {
      // Use irrigate (cooldown: 5 ticks)
      const intervention: PlayerIntervention = {
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'irrigate',
        data: {}
      };

      await interventionStore.executeIntervention(intervention);
      expect(interventionStore.isOnCooldown('irrigate')).toBe(true);

      // Advance simulation by 5 ticks
      for (let i = 0; i < 5; i++) {
        engine.tick();
      }

      // Should be able to use again
      expect(interventionStore.isOnCooldown('irrigate')).toBe(false);

      const secondUse = await interventionStore.executeIntervention(intervention);
      expect(secondUse).toBe(true);
      expect(interventionStore.resourcePoints).toBe(70); // 100 - 15 - 15
    });
  });

  describe('Goals and Resource Point Integration', () => {
    it('should award points when goals are completed', () => {
      const initialPoints = interventionStore.resourcePoints;

      // Simulate goal completion by directly adding points
      const goalReward = 50;
      interventionStore.addPoints(goalReward);

      expect(interventionStore.resourcePoints).toBe(initialPoints + goalReward);
      expect(interventionStore.totalPointsEarned).toBe(goalReward);
    });

    it('should track goals and interventions together', async () => {
      // Use an intervention
      await interventionStore.executeIntervention({
        chunkId: 'chunk_2_2',
        x: 2,
        y: 2,
        type: 'plant',
        data: { speciesId: 'meadow_fescue' }
      });

      expect(interventionStore.resourcePoints).toBe(80);

      // Run simulation to progress toward goals
      for (let i = 0; i < 100; i++) {
        engine.tick();
        goalsStore.evaluateGoals(engine.getCurrentTick());
      }

      // Check if any goals were completed
      const completedGoals = goalsStore.completedGoals;

      // If goals completed, points should have been awarded
      if (completedGoals.length > 0) {
        const totalRewards = completedGoals.reduce((sum, cg) => sum + cg.goal.rewardPoints, 0);
        // In real integration, points would be added automatically
        // Here we verify the mechanism works
        interventionStore.addPoints(totalRewards);
        expect(interventionStore.resourcePoints).toBeGreaterThan(80);
      }
    });
  });

  describe('Multiple Intervention Types', () => {
    it('should handle different intervention types correctly', async () => {
      const interventions: Array<{ type: 'plant' | 'irrigate' | 'cleanse'; cost: number; cooldown: number }> = [
        { type: 'plant', cost: 20, cooldown: 10 },
        { type: 'irrigate', cost: 15, cooldown: 5 },
        { type: 'cleanse', cost: 25, cooldown: 8 }
      ];

      for (const { type, cost, cooldown } of interventions) {
        const startingPoints = interventionStore.resourcePoints;

        await interventionStore.executeIntervention({
          chunkId: 'chunk_0_0',
          x: 0,
          y: 0,
          type,
          data: type === 'plant' ? { speciesId: 'common_grass' } : {}
        });

        // Verify cost deduction
        expect(interventionStore.resourcePoints).toBe(startingPoints - cost);

        // Verify cooldown
        expect(interventionStore.isOnCooldown(type)).toBe(true);
        expect(interventionStore.remainingCooldown(type)).toBe(cooldown);

        // Advance past cooldown for next test
        for (let i = 0; i < cooldown; i++) {
          engine.tick();
        }
      }
    });

    it('should track cooldowns independently for each intervention type', async () => {
      // Use plant and irrigate at same time
      await interventionStore.executeIntervention({
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'plant',
        data: { speciesId: 'common_grass' }
      });

      await interventionStore.executeIntervention({
        chunkId: 'chunk_1_1',
        x: 1,
        y: 1,
        type: 'irrigate',
        data: {}
      });

      // Both should be on cooldown
      expect(interventionStore.isOnCooldown('plant')).toBe(true);
      expect(interventionStore.isOnCooldown('irrigate')).toBe(true);

      // Advance by 5 ticks (irrigate cooldown)
      for (let i = 0; i < 5; i++) {
        engine.tick();
      }

      // Irrigate should be ready, plant should still be on cooldown
      expect(interventionStore.isOnCooldown('irrigate')).toBe(false);
      expect(interventionStore.isOnCooldown('plant')).toBe(true);
      expect(interventionStore.remainingCooldown('plant')).toBe(5); // 10 - 5 = 5
    });
  });

  describe('Resource Management Strategy', () => {
    it('should support strategic resource spending', async () => {
      // Scenario: Player wants to save for expensive intervention (ritual: 100 pts)
      const startingPoints = interventionStore.resourcePoints;
      expect(startingPoints).toBe(100);

      // Can't afford ritual yet
      expect(interventionStore.canAfford('ritual')).toBe(false);

      // Use cheaper interventions efficiently
      await interventionStore.executeIntervention({
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'irrigate',
        data: {}
      });

      expect(interventionStore.resourcePoints).toBe(85); // 100 - 15

      // Earn points from goal completion (simulated)
      interventionStore.addPoints(50);
      expect(interventionStore.resourcePoints).toBe(135);

      // Now can afford ritual
      expect(interventionStore.canAfford('ritual')).toBe(true);

      await interventionStore.executeIntervention({
        chunkId: 'chunk_2_2',
        x: 2,
        y: 2,
        type: 'ritual',
        data: {}
      });

      expect(interventionStore.resourcePoints).toBe(35); // 135 - 100
    });

    it('should track spending and earning statistics', async () => {
      // Spend some points
      await interventionStore.executeIntervention({
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'plant',
        data: {}
      });

      await interventionStore.executeIntervention({
        chunkId: 'chunk_1_1',
        x: 1,
        y: 1,
        type: 'irrigate',
        data: {}
      });

      expect(interventionStore.totalPointsSpent).toBe(35); // 20 + 15

      // Earn some points
      interventionStore.addPoints(100);
      interventionStore.addPoints(75);

      expect(interventionStore.totalPointsEarned).toBe(175);

      // Net balance
      const netPoints = interventionStore.resourcePoints;
      expect(netPoints).toBe(100 - 35 + 175); // Starting - spent + earned = 240
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid intervention attempts', async () => {
      const intervention: PlayerIntervention = {
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'cleanse',
        data: {}
      };

      // First attempt should succeed
      const first = await interventionStore.executeIntervention(intervention);
      expect(first).toBe(true);

      // Rapid subsequent attempts should fail (cooldown)
      const second = await interventionStore.executeIntervention(intervention);
      const third = await interventionStore.executeIntervention(intervention);

      expect(second).toBe(false);
      expect(third).toBe(false);

      // Only one intervention should be recorded
      expect(interventionStore.usageHistory).toHaveLength(1);
    });

    it('should handle depletion of all resource points', async () => {
      // Spend all points
      interventionStore.deductPoints(100);
      expect(interventionStore.resourcePoints).toBe(0);

      // Should not be able to afford any intervention
      expect(interventionStore.canAfford('irrigate')).toBe(false); // Cheapest: 15
      expect(interventionStore.canAfford('plant')).toBe(false);
      expect(interventionStore.canAfford('cleanse')).toBe(false);

      // Attempts should fail
      const attempt = await interventionStore.executeIntervention({
        chunkId: 'chunk_0_0',
        x: 0,
        y: 0,
        type: 'irrigate',
        data: {}
      });

      expect(attempt).toBe(false);
      expect(interventionStore.resourcePoints).toBe(0); // Still 0
    });

    it('should recover from point depletion via goals', () => {
      // Deplete points
      interventionStore.deductPoints(100);
      expect(interventionStore.resourcePoints).toBe(0);

      // Complete a goal (simulated)
      interventionStore.addPoints(50);

      // Should be able to afford interventions again
      expect(interventionStore.resourcePoints).toBe(50);
      expect(interventionStore.canAfford('irrigate')).toBe(true);
      expect(interventionStore.canAfford('plant')).toBe(true);
    });
  });

  describe('Long-term Gameplay Session', () => {
    it('should maintain consistency over extended session', async () => {
      // Simulate 500 ticks of gameplay with periodic interventions
      let interventionCount = 0;

      for (let tick = 0; tick < 500; tick++) {
        engine.tick();

        // Every 20 ticks, try to use an intervention if affordable
        if (tick % 20 === 0 && interventionStore.canAfford('irrigate') && !interventionStore.isOnCooldown('irrigate')) {
          await interventionStore.executeIntervention({
            chunkId: `chunk_${tick % 5}_${tick % 5}`,
            x: tick % 5,
            y: tick % 5,
            type: 'irrigate',
            data: {}
          });
          interventionCount++;
        }

        // Evaluate goals every 50 ticks
        if (tick % 50 === 0) {
          const goalResults = goalsStore.evaluateGoals(tick);

          // Award points for completed goals
          goalResults.forEach(result => {
            if (result.completed && result.completedAtTick === tick) {
              interventionStore.addPoints(result.goal.rewardPoints);
            }
          });
        }
      }

      // Verify state consistency
      expect(interventionStore.usageHistory).toHaveLength(interventionCount);
      expect(interventionStore.totalInterventions).toBe(interventionCount);

      // Points should be balanced (some spent, potentially some earned)
      const netPoints = interventionStore.resourcePoints;
      const totalSpent = interventionStore.totalPointsSpent;
      const totalEarned = interventionStore.totalPointsEarned;

      expect(netPoints).toBe(100 - totalSpent + totalEarned);
    });
  });
});
