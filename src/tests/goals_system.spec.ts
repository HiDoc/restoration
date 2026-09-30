import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ALL_GOALS, GOAL_CHAINS, GoalsSystem } from '@/simulation/GoalsSystem';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { useGoalsStore } from '@/stores/goalsStore';
import { useInterventionStore } from '@/stores/interventionStore';

function world() {
  return new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32,
    tickRate: 10, masterSeed: 4321, maxActiveChunks: 9,
  });
}


describe('ecosystem goals', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('start with the first goal of four chains, each asking for something the player does', () => {
    expect(GoalsSystem.getStarterGoals().map(goal => goal.id)).toEqual(['sample_1', 'interactions_3', 'planted_3', 'tagged_3']);
    // A fresh world meets none of them.
    const engine = world();
    const goals = new GoalsSystem(engine);
    goals.setActiveGoals(GoalsSystem.getStarterGoals().map(goal => goal.id));
    expect(goals.evaluateGoals(1).some(goal => goal.completed)).toBe(false);
  });

  it('follow a completed goal with the next in its chain, then with a chain not yet begun', () => {
    const taken = (...ids: string[]) => new Set(ids);
    expect(GoalsSystem.successor('sample_1', taken('sample_1'))?.id).toBe('sample_5');
    const chainsStarted = ['sample_5', 'interactions_3', 'planted_3', 'tagged_3'];
    expect(GoalsSystem.successor('sample_5', taken(...chainsStarted))?.id).toBe('cross_1');
    const everyChain = GOAL_CHAINS.map(chain => chain[chain.length - 1].id);
    expect(GoalsSystem.successor('sample_5', taken(...everyChain))).toBeUndefined();
    expect(ALL_GOALS.every(goal => goal.description.length > 0)).toBe(true);
  });

  it('replaces a completed goal once, and keeps it done across save and load', () => {
    const engine = world();
    const store = useGoalsStore();
    const pouch = useInterventionStore();
    store.initialize(engine);
    pouch.initialize(engine);
    pouch.executeIntervention({ chunkId: 'chunk_1_1', type: 'sample', x: 0.5, y: 0.5, data: {} });
    const done = store.evaluateGoals(1).filter(result => result.completed).map(result => result.goal.id);
    expect(done).toEqual(['sample_1']);
    expect(store.activeGoalIds).toEqual(['sample_5', 'interactions_3', 'planted_3', 'tagged_3']);
    expect(store.evaluateGoals(2).some(result => result.completed)).toBe(false);
    const saved = JSON.parse(JSON.stringify(store.exportState()));
    expect(JSON.stringify(saved)).not.toContain('evaluator');
    store.initialize(engine);
    store.importState(saved);
    expect(store.activeGoalIds).toContain('sample_5');
    expect(typeof store.activeGoals.find(goal => goal.goal.id === 'sample_5')?.goal.evaluator).toBe('function');
  });

  it('begins the chains afresh for a save from before them', () => {
    const store = useGoalsStore();
    store.initialize(world());
    store.importState({ activeGoalIds: ['diversity_5', 'health_60'] });
    expect(store.activeGoalIds).toEqual(GoalsSystem.getStarterGoals().map(goal => goal.id));
  });

  it('refreshes intervention cooldowns from authoritative ticks and restores them on load', () => {
    const engine = world();
    const store = useInterventionStore();
    store.initialize(engine);
    expect(store.executeIntervention({ chunkId: 'chunk_1_1', type: 'irrigate', x: 0.5, y: 0.5, data: {} })).toBe(true);
    const cooldown = store.getRemainingCooldown('irrigate');
    expect(cooldown).toBeGreaterThan(0);
    const saved = JSON.parse(JSON.stringify(store.exportState()));
    engine.update();
    expect(store.getRemainingCooldown('irrigate')).toBe(cooldown - 1);
    store.initialize(engine);
    store.importState(saved);
    expect(store.getRemainingCooldown('irrigate')).toBe(cooldown - 1);
  });
});
