import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { FixedStepLoop } from '@/core/FixedStepLoop';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { SCENARIOS } from '@/simulation/ScenarioSystem';
import { ALL_GOALS } from '@/simulation/GoalsSystem';
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useInterventionStore } from '@/stores/interventionStore';

function world() {
  return new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32, tickRate: 10,
    masterSeed: 12345, maxActiveChunks: 9, seasonLengthTicks: 2,
  });
}

describe('year-end and scenario workflows', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('stops at the year boundary and applies the chosen genome immediately exactly once', () => {
    const engine = world();
    for (let tick = 0; tick < 6; tick++) engine.update();
    let frame: ((timestamp: number) => void) | undefined;
    const loop = new FixedStepLoop(() => engine.update(), {
      scheduler: {
        now: () => 0,
        request(callback) { frame = callback; return 1; },
        cancel() { frame = undefined; },
      },
    });
    let completedYear = 0;
    engine.onYearEnd(year => { completedYear = year; loop.pause(); });
    loop.start();
    const scheduled = frame!;
    frame = undefined;
    scheduled(1000);
    expect(engine.getCurrentTick()).toBe(8);
    expect(completedYear).toBe(1);
    expect(loop.isRunning).toBe(false);
    expect(frame).toBeUndefined();

    const candidate = engine.getAvailableSeeds('common_grass')[0];
    expect(candidate).toBeDefined();
    candidate.instance.genetics!.generation = 12;
    expect(engine.selectSeedForNextYear('common_grass', candidate.instance.id)).toBe(true);
    expect(engine.getSelectedSeeds().size).toBe(1);
    engine.commitYearEndSelections();
    expect(engine.getMasterGenome('common_grass')!.generation).toBe(12);
    expect(engine.getSelectedSeeds().size).toBe(0);
    expect(engine.getChunk(1, 1)!.seedBank.filter(seed => seed.speciesId === 'common_grass').length).toBeGreaterThan(0);
    const committed = JSON.stringify(engine.exportState());
    engine.commitYearEndSelections();
    expect(JSON.stringify(engine.exportState())).toBe(committed);
    loop.step();
    expect(engine.getCurrentTick()).toBe(9);
    expect(completedYear).toBe(1);
  });

  it('references available species and canonical goals in every scenario', () => {
    const registry = SpeciesRegistry.getInstance();
    for (const scenario of SCENARIOS) {
      for (const species of scenario.initialConditions.initialSpecies ?? []) expect(registry.getSpecies(species)).toBeDefined();
      for (const goal of scenario.goalIds) expect(ALL_GOALS.some(entry => entry.id === goal)).toBe(true);
    }
  });

  it('preserves completed scenario progress and first-clear history across save/load', () => {
    const engine = world();
    const store = useScenarioStore();
    store.initialize(engine);
    expect(store.startScenario('quick_start')).toBe(true);
    const resources = useInterventionStore();
    expect(resources.resourcePoints).toBe(150);
    const required = store.activeScenario!.goalIds;
    expect(store.evaluateScenario(required).success).toBe(true);
    expect(resources.resourcePoints).toBe(250);
    expect(resources.totalPointsEarned).toBe(100);
    expect(store.scenarioProgress).toBe(1);
    expect(store.evaluateScenario([]).success).toBe(true);
    expect(resources.totalPointsEarned).toBe(100);
    expect(store.scenarioProgress).toBe(1);
    const saved = JSON.parse(JSON.stringify(store.exportState()));
    store.reset();
    store.initialize(engine);
    store.importState(saved);
    expect(store.scenarioSuccess).toBe(true);
    expect(store.evaluateScenario([]).progress).toBe(1);
    expect(store.completedScenarioIds).toEqual(['quick_start']);
    store.startScenario('quick_start');
    expect(store.completedScenarioIds).toContain('quick_start');
    store.evaluateScenario(required);
    expect(store.completedScenarioIds).toEqual(['quick_start']);
    expect(resources.totalPointsEarned).toBe(100);
    expect(resources.resourcePoints).toBe(150);
  });

  it('retains timeout failure and clears active scenarios when loading an empty slot', () => {
    const engine = world();
    const store = useScenarioStore();
    store.initialize(engine);
    const empty = JSON.parse(JSON.stringify(store.exportState()));
    store.startScenario('quick_start');
    const scenario = store.exportState();
    scenario.systemState!.startTick = -300;
    store.importState(JSON.parse(JSON.stringify(scenario)));
    expect(store.evaluateScenario([]).failure).toBe(true);
    expect(store.evaluateScenario(['diversity_5']).failure).toBe(true);
    store.importState(empty);
    expect(store.activeScenario).toBeNull();
    expect(store.system!.getActiveScenario()).toBeNull();
    expect(store.scenarioCompleted).toBe(false);
  });
});
