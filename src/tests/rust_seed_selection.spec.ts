import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { EventType } from '@/simulation/EventJournal';

function createEngine() {
  return new SimulationEngine({ worldWidth: 1, worldHeight: 1, chunkSize: 32, tickRate: 10, masterSeed: 42, maxActiveChunks: 1, seasonLengthTicks: 2 });
}

describe('Rust seed selection and genetic saves', () => {
  it('journals complete player commands when scheduled actions execute', () => {
    const engine = createEngine();
    const command = { type: 'irrigate' as const, chunkId: 'chunk_0_0', x: 0.2, y: 0.3, data: { amount: 0.15 }, playerId: 'gardener', tick: 2 };
    expect(engine.executeIntervention(command)).toBe(true);
    expect(engine.getEventJournal().getPlayerEvents()).toHaveLength(0);
    engine.advance(2);
    const [event] = engine.getEventJournal().getPlayerEvents('gardener');
    expect(event.type).toBe(EventType.PLAYER_IRRIGATE);
    expect(event.tick).toBe(2);
    expect(event.data).toEqual(command);
  });

  it('preserves pending genetic trait Maps across JSON saves and produces selected seedlings in Rust', () => {
    const original = createEngine();
    const parent = original.getAvailableSeeds('common_grass')[0].instance;
    const profile = parent.genetics!;
    profile.traits.get('drought_tolerance')!.value = 0.77;
    profile.generation = 7;
    const beforeSelection = original.getDeterministicStateHash();
    original.selectSeedForNextYear('common_grass', parent.id);
    expect(original.getDeterministicStateHash()).not.toBe(beforeSelection);
    const restored = createEngine();
    restored.importState(JSON.parse(JSON.stringify(original.exportState())));
    original.advance(8);
    restored.advance(8);
    expect(restored.getDeterministicStateHash()).toBe(original.getDeterministicStateHash());
    expect(restored.getMasterGenome('common_grass')!.traits.get('drought_tolerance')!.value).toBe(0.77);
    const chunk = restored.getChunk(0, 0)!;
    expect(chunk.seedBank.every(seed => seed.genetics?.traits instanceof Map)).toBe(true);
    chunk.species.clear();
    chunk.biomeState.moisture = 0.7;
    restored.advance(16);
    expect(Array.from(chunk.species.values()).some(instance => instance.genetics?.generation === 7 && instance.genetics.traits.get('drought_tolerance')?.value === 0.77)).toBe(true);
  });

  it('commits a paused year-end choice immediately without another year-end event', () => {
    const engine = createEngine();
    engine.advance(8);
    const eventsBefore = engine.getEventJournal().getEventsByType(EventType.YEAR_END).length;
    expect(eventsBefore).toBe(1);
    const parent = engine.getAvailableSeeds('common_grass')[0].instance;
    expect(engine.selectSeedForNextYear('common_grass', parent.id)).toBe(true);
    engine.commitYearEndSelections();
    expect(engine.getMasterGenome('common_grass')).toBeDefined();
    expect(engine.getSelectedSeeds().size).toBe(0);
    expect(engine.getEventJournal().getEventsByType(EventType.YEAR_END)).toHaveLength(eventsBefore);
  });
});
