import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInterventionStore } from '@/stores/interventionStore';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import type { PlayerIntervention } from '@/simulation/SimulationEngine';

describe('InterventionStore', () => {
  let interventionStore: ReturnType<typeof useInterventionStore>;
  let engine: SimulationEngine;

  // Helper to get a valid chunk ID for testing
  function getTestChunkId(x: number = 0, y: number = 0): string {
    // Try to get from engine first
    const chunks = engine.getAllChunks();
    if (chunks.size > 0) {
      const chunk = Array.from(chunks.values())[0];
      return chunk.id;
    }
    // Fallback to constructed ID
    return `chunk_${x}_${y}`;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    interventionStore = useInterventionStore();

    // Create minimal engine for testing
    engine = new SimulationEngine({
      worldSize: { width: 3, height: 3 },
      chunkSize: 5,
      difficulty: 'normal',
      enableSeasons: false,
      enableHydrology: false
    });

    // Activate all chunks so they're available for tests
    engine.activateAllChunks();

    interventionStore.initialize(engine, 'normal');
  });

  describe('Initialization', () => {
    it('should start with 100 resource points on normal difficulty', () => {
      expect(interventionStore.resourcePoints).toBe(100);
    });

    it('should start with no selected intervention', () => {
      expect(interventionStore.selectedIntervention).toBeNull();
    });

    it('should have no cooldowns initially', () => {
      expect(interventionStore.isOnCooldown('plant')).toBe(false);
      expect(interventionStore.isOnCooldown('irrigate')).toBe(false);
    });

    it('should have empty usage stats', () => {
      expect(interventionStore.usageStats.totalInterventions).toBe(0);
    });
  });

  describe('Resource Point Management', () => {
    it('should add points correctly', () => {
      interventionStore.addPoints(50);
      expect(interventionStore.resourcePoints).toBe(150);
    });

    it('should deduct points correctly', () => {
      interventionStore.deductPoints(30);
      expect(interventionStore.resourcePoints).toBe(70);
    });

    it('should not allow negative resource points', () => {
      interventionStore.deductPoints(150);
      expect(interventionStore.resourcePoints).toBe(0);
    });

    it('should track total points earned', () => {
      interventionStore.addPoints(50);
      interventionStore.addPoints(30);
      expect(interventionStore.totalPointsEarned).toBe(80);
    });

    it('should not track deducted points as spent (only intervention costs)', () => {
      interventionStore.deductPoints(20);
      interventionStore.deductPoints(15);
      expect(interventionStore.totalPointsSpent).toBe(0); // deductPoints doesn't count as spending
    });
  });

  describe('Intervention Affordability', () => {
    it('should determine when intervention is affordable', () => {
      expect(interventionStore.canAfford('plant')).toBe(true); // cost: 20
      expect(interventionStore.canAfford('irrigate')).toBe(true); // cost: 15
      expect(interventionStore.canAfford('cleanse')).toBe(true); // cost: 25
    });

    it('should determine when intervention is not affordable', () => {
      interventionStore.deductPoints(85); // Down to 15 points
      expect(interventionStore.canAfford('plant')).toBe(false); // cost: 20
      expect(interventionStore.canAfford('irrigate')).toBe(true); // cost: 15
      expect(interventionStore.canAfford('cleanse')).toBe(false); // cost: 25
    });

    it('should handle ritual intervention cost', () => {
      expect(interventionStore.canAfford('ritual')).toBe(true); // cost: 100, we have 100
      interventionStore.deductPoints(1);
      expect(interventionStore.canAfford('ritual')).toBe(false); // cost: 100, we have 99
    });
  });

  describe('Cooldown Tracking', () => {
    it('should not have cooldown before first use', () => {
      expect(interventionStore.isOnCooldown('plant')).toBe(false);
      expect(interventionStore.getRemainingCooldown('plant')).toBe(0);
    });

    it('should set cooldown after intervention use', async () => {
      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'irrigate',
        data: {}
      };

      await interventionStore.executeIntervention(intervention);

      expect(interventionStore.isOnCooldown('irrigate')).toBe(true);
      expect(interventionStore.getRemainingCooldown('irrigate')).toBe(5); // irrigate cooldown: 5 ticks
    });

    it('should decrease cooldown over time', async () => {
      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'plant',
        data: { speciesId: 'common_grass' }
      };

      await interventionStore.executeIntervention(intervention);

      // Advance simulation by 5 ticks
      for (let i = 0; i < 5; i++) {
        engine.step();
      }

      expect(interventionStore.getRemainingCooldown('plant')).toBe(5); // 10 - 5 = 5 ticks remaining
    });

    it('should clear cooldown after full duration', async () => {
      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'irrigate',
        data: {}
      };

      await interventionStore.executeIntervention(intervention);

      // Advance simulation by 5 ticks (full cooldown)
      for (let i = 0; i < 5; i++) {
        engine.step();
      }

      expect(interventionStore.isOnCooldown('irrigate')).toBe(false);
      expect(interventionStore.getRemainingCooldown('irrigate')).toBe(0);
    });
  });

  describe('Intervention Execution', () => {
    it('should successfully execute affordable intervention', async () => {
      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'irrigate',
        data: {}
      };

      const result = await interventionStore.executeIntervention(intervention);

      expect(result).toBe(true);
      expect(interventionStore.resourcePoints).toBe(85); // 100 - 15
      expect(interventionStore.usageStats.totalInterventions).toBe(1);
    });

    it('should fail to execute unaffordable intervention', async () => {
      interventionStore.deductPoints(90); // Down to 10 points

      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'plant',
        data: { speciesId: 'common_grass' }
      };

      const result = await interventionStore.executeIntervention(intervention);

      expect(result).toBe(false);
      expect(interventionStore.resourcePoints).toBe(10); // No deduction
      expect(interventionStore.usageStats.totalInterventions).toBe(0);
    });

    it('should fail to execute intervention on cooldown', async () => {
      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'cleanse',
        data: {}
      };

      // First execution should succeed
      await interventionStore.executeIntervention(intervention);
      expect(interventionStore.resourcePoints).toBe(75); // 100 - 25

      // Second execution should fail (on cooldown)
      const result = await interventionStore.executeIntervention(intervention);

      expect(result).toBe(false);
      expect(interventionStore.resourcePoints).toBe(75); // No additional deduction
      expect(interventionStore.usageStats.totalInterventions).toBe(1); // Only one successful use
    });

    it('should record intervention in usage stats', async () => {
      const intervention: PlayerIntervention = {
        chunkId: getTestChunkId(1, 1),
        x: 1,
        y: 1,
        type: 'plant',
        data: { speciesId: 'meadow_fescue' }
      };

      await interventionStore.executeIntervention(intervention);

      expect(interventionStore.usageStats.totalInterventions).toBe(1);
      expect(interventionStore.usageStats.byType['plant']).toBe(1);
      expect(interventionStore.totalPointsSpent).toBe(20);
    });
  });

  describe('Intervention Selection', () => {
    it('should select intervention', () => {
      interventionStore.selectIntervention('plant');
      expect(interventionStore.selectedIntervention).toBe('plant');
    });

    it('should deselect intervention', () => {
      interventionStore.selectIntervention('plant');
      interventionStore.selectIntervention(null);
      expect(interventionStore.selectedIntervention).toBeNull();
    });

    it('should change intervention selection', () => {
      interventionStore.selectIntervention('irrigate');
      expect(interventionStore.selectedIntervention).toBe('irrigate');

      interventionStore.selectIntervention('plant');
      expect(interventionStore.selectedIntervention).toBe('plant');
    });
  });

  describe('Statistics', () => {
    it('should track intervention usage counts', async () => {
      await interventionStore.executeIntervention({
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'plant',
        data: { speciesId: 'common_grass' }
      });

      // Advance past cooldown
      for (let i = 0; i < 10; i++) {
        engine.step();
      }

      await interventionStore.executeIntervention({
        chunkId: getTestChunkId(1, 1),
        x: 1,
        y: 1,
        type: 'plant',
        data: { speciesId: 'meadow_fescue' }
      });

      expect(interventionStore.usageStats.byType['plant']).toBe(2);
      expect(interventionStore.usageStats.byType['irrigate'] || 0).toBe(0);
    });

    it('should calculate total interventions used', async () => {
      await interventionStore.executeIntervention({
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'plant',
        data: {}
      });

      await interventionStore.executeIntervention({
        chunkId: getTestChunkId(1, 1),
        x: 1,
        y: 1,
        type: 'irrigate',
        data: {}
      });

      expect(interventionStore.usageStats.totalInterventions).toBe(2);
    });
  });

  describe('Reset', () => {
    it('should reset all intervention state', async () => {
      // Use some interventions
      await interventionStore.executeIntervention({
        chunkId: getTestChunkId(0, 0),
        x: 0,
        y: 0,
        type: 'plant',
        data: {}
      });

      interventionStore.addPoints(50);
      interventionStore.selectIntervention('irrigate');

      // Reset
      interventionStore.reset();

      expect(interventionStore.resourcePoints).toBe(100);
      expect(interventionStore.selectedIntervention).toBeNull();
      expect(interventionStore.usageStats.totalInterventions).toBe(0);
      expect(interventionStore.totalPointsEarned).toBe(0);
      expect(interventionStore.totalPointsSpent).toBe(0);
    });
  });
});
