import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '@/simulation/SimulationEngine';
import { EventType } from '@/simulation/EventJournal';

function createEngine() {
  return new SimulationEngine({ worldWidth: 1, worldHeight: 1, chunkSize: 32, tickRate: 10, masterSeed: 42, maxActiveChunks: 1, seasonLengthTicks: 2 });
}

describe('Scheduled player commands', () => {
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
});
