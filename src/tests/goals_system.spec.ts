import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ALL_GOALS, GoalsSystem } from '@/simulation/GoalsSystem';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { useGoalsStore } from '@/stores/goalsStore';
import { useInterventionStore } from '@/stores/interventionStore';
import { PhenologyStage } from '@/simulation/WorldChunk';

function world() {
  return new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32,
    tickRate: 10, masterSeed: 4321, maxActiveChunks: 9,
  });
}

function addSpecies(engine: SimulationEngine, speciesId: string, id = speciesId) {
  engine.getChunk(1, 1)!.addSpecies({
    id, speciesId, x: 0.5, y: 0.5, biomass: 0.8, age: 20,
    health: 0.9, phenologyStage: PhenologyStage.VEGETATIVE, reproductiveOutput: 0,
  });
}

describe('ecosystem goals', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('offers reachable, distinct-species progression while retaining saved goal IDs', () => {
    const goals = GoalsSystem.getGoalsByCategory('biodiversity');
    expect(goals.map(goal => [goal.id, goal.targetValue])).toEqual([
      ['diversity_5', 2], ['diversity_10', 3], ['diversity_15', 4], ['diversity_20', 5],
    ]);
    goals.forEach(goal => expect(goal.description).toContain(String(goal.targetValue)));
    expect(GoalsSystem.getStarterGoals().map(goal => goal.id)).toContain('diversity_5');
    const discoveries = ALL_GOALS.filter(goal => goal.id.startsWith('discover_'));
    expect(discoveries.map(goal => goal.targetValue)).toEqual([2, 3, 5]);
  });

  it('does not mistake a large grass population for biodiversity', () => {
    const engine = world();
    const goals = new GoalsSystem(engine);
    goals.setActiveGoals(['diversity_5']);
    for (let i = 0; i < 30; i++) addSpecies(engine, 'common_grass', `grass_${i}`);
    expect(engine.getStatistics().totalSpecies).toBeGreaterThan(5);
    expect(goals.evaluateGoals(1)[0]).toMatchObject({ currentValue: 1, completed: false, progress: 0.5 });
    addSpecies(engine, 'silver_birch');
    expect(goals.evaluateGoals(2)[0]).toMatchObject({ currentValue: 2, completed: true, completedAtTick: 2 });
    expect(goals.evaluateGoals(3)[0].completedAtTick).toBe(2);
  });

  it('uses normalized health and actual canopy for ecosystem goals', () => {
    const engine = world();
    engine.getAllChunks().forEach(chunk => {
      chunk.biomeState.vitality = 0.8;
      chunk.biomeState.canopy = 0.7;
    });
    const goals = new GoalsSystem(engine);
    goals.setActiveGoals(['health_60', 'forest_established']);
    expect(goals.getActiveGoals()).toHaveLength(2);
    expect(goals.evaluateGoals(5).every(goal => goal.completed)).toBe(true);
  });

  it('exports cloneable data and restores canonical evaluators after JSON persistence', () => {
    const engine = world();
    const original = new GoalsSystem(engine);
    original.setActiveGoals(['diversity_5', 'health_90']);
    original.evaluateGoals(1);
    const data = structuredClone(original.exportState());
    expect(JSON.stringify(data)).not.toContain('evaluator');
    const restored = new GoalsSystem(engine);
    restored.importState(JSON.parse(JSON.stringify(data)));
    addSpecies(engine, 'silver_birch');
    expect(restored.evaluateGoals(2).find(goal => goal.goal.id === 'diversity_5')?.completed).toBe(true);
    expect(restored.getActiveGoals()[0].goal).toBe(ALL_GOALS.find(goal => goal.id === 'diversity_5'));
  });

  it('migrates legacy serialized goal objects without trusting their definitions', () => {
    const engine = world();
    const goals = new GoalsSystem(engine);
    goals.importState({
      activeGoals: [['diversity_5', {
        goal: { id: 'diversity_5', targetValue: 99 }, currentValue: 1, progress: 0.2, completed: false,
      }]],
      completedGoals: [],
    });
    expect(goals.evaluateGoals(3)[0]).toMatchObject({ currentValue: 1, progress: 0.5 });
    expect(goals.getActiveGoals()[0].goal.targetValue).toBe(2);
  });

  it('awards a completed goal once across reevaluation and save/load', () => {
    const engine = world();
    const store = useGoalsStore();
    store.initialize(engine);
    store.setActiveGoals(['diversity_5']);
    addSpecies(engine, 'silver_birch');
    store.evaluateGoals(1);
    expect(store.totalPointsAwarded).toBe(50);
    store.evaluateGoals(1);
    store.evaluateGoals(2);
    expect(store.totalPointsAwarded).toBe(50);
    const saved = JSON.parse(JSON.stringify(store.exportState()));
    store.initialize(engine);
    store.importState(saved);
    store.evaluateGoals(3);
    expect(store.totalPointsAwarded).toBe(50);
    store.importState({ ...saved, totalPointsAwarded: 0, lastEvaluationTick: 0 });
    expect(store.totalPointsAwarded).toBe(0);
    expect(store.lastEvaluationTick).toBe(0);
  });

  it('refreshes intervention cooldowns from authoritative ticks and restores spent points', async () => {
    const engine = world();
    const store = useInterventionStore();
    store.initialize(engine);
    expect(await store.executeIntervention({
      chunkId: 'chunk_1_1', type: 'plant', x: 0.5, y: 0.5, data: { speciesId: 'silver_birch' },
    })).toBe(true);
    const cooldown = store.getRemainingCooldown('plant');
    expect(cooldown).toBeGreaterThan(0);
    const points = store.resourcePoints;
    const saved = JSON.parse(JSON.stringify(store.exportState()));
    engine.update();
    expect(store.currentTick).toBe(1);
    expect(store.getRemainingCooldown('plant')).toBe(cooldown - 1);
    store.addPoints(100);
    store.importState(saved);
    expect(store.resourcePoints).toBe(points);
    expect(store.getRemainingCooldown('plant')).toBe(cooldown - 1);
  });
});
