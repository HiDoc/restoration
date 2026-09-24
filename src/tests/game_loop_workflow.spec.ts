import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { FixedStepLoop } from '@/core/FixedStepLoop';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry';

function world() {
  return new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32, tickRate: 10,
    masterSeed: 12345, maxActiveChunks: 9, seasonLengthTicks: 2,
  });
}

describe('year-end workflow', () => {
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
});
