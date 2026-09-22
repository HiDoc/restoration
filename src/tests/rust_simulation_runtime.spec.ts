import { describe, expect, it } from 'vitest'
import { SimulationEngine, type SimulationConfig } from '@/simulation/SimulationEngine'

const config: SimulationConfig = {
  worldWidth: 3,
  worldHeight: 3,
  chunkSize: 32,
  tickRate: 10,
  masterSeed: 73019,
  maxActiveChunks: 9,
  seasonLengthTicks: 20,
  timePerTickMinutes: 720,
}

function create(overrides: Partial<SimulationConfig> = {}) {
  const engine = new SimulationEngine({ ...config, ...overrides })
  engine.activateAllChunks()
  return engine
}

function advance(engine: SimulationEngine, ticks: number) {
  for (let tick = 0; tick < ticks; tick++) engine.update()
}

function plant(engine: SimulationEngine, tick?: number) {
  return engine.executeIntervention({
    chunkId: 'chunk_1_1',
    type: 'plant',
    x: 0.4,
    y: 0.6,
    data: { speciesId: 'common_grass' },
    tick,
  })
}

describe('Rust ECS simulation through the browser adapter', () => {
  it('isolates RNG streams across interleaved engines and replays ordered inputs', () => {
    const first = create()
    const second = create()
    const unrelated = create({ masterSeed: 42 })
    for (let tick = 0; tick < 50; tick++) {
      if (tick === 4 || tick === 31) {
        expect(plant(first)).toBe(true)
        expect(plant(second)).toBe(true)
      }
      first.update()
      advance(unrelated, 2)
      second.update()
      expect(first.getDeterministicStateHash()).toBe(second.getDeterministicStateHash())
    }
    expect(first.getDeterministicStateHash()).not.toBe(unrelated.getDeterministicStateHash())
  })

  it('continues identically after a real JSON save roundtrip, including queued commands', () => {
    const original = create({ seasonLengthTicks: 10 })
    advance(original, 37)
    expect(plant(original, 45)).toBe(true)
    const saved = JSON.parse(JSON.stringify(original.exportState()))
    expect(saved.schemaVersion).toBe(2)
    expect(saved.backend).toBe('rust-ecs')
    expect(saved.rustState).toBeDefined()

    const restored = create({ masterSeed: 999 })
    restored.importState(saved)
    expect(restored.getDeterministicStateHash()).toBe(original.getDeterministicStateHash())
    for (let tick = 0; tick < 60; tick++) {
      original.update()
      restored.update()
      expect(restored.getDeterministicStateHash()).toBe(original.getDeterministicStateHash())
    }
    expect(restored.exportState().eventJournal).toBe(original.exportState().eventJournal)
  })

  it('resets to the same seeded world and deterministic future', () => {
    const engine = create()
    const fresh = create()
    advance(engine, 55)
    plant(engine)
    engine.reset()
    expect(engine.getDeterministicStateHash()).toBe(fresh.getDeterministicStateHash())
    advance(engine, 30)
    advance(fresh, 30)
    expect(engine.getDeterministicStateHash()).toBe(fresh.getDeterministicStateHash())
  })

  it('advances every chunk even when legacy wall-clock update budgets are configured', () => {
    const normal = create()
    const limited = create({ updateBudgetMs: 0.001, chunksPerTick: 1 })
    advance(normal, 40)
    advance(limited, 40)
    const normalState = normal.exportState()
    const limitedState = limited.exportState()
    expect(limitedState.chunks).toEqual(normalState.chunks)
    expect(limited.getStatistics().simDays).toBe(20)
  })

  it('keeps half-day ticks and year boundaries exact', () => {
    const engine = create({ seasonLengthTicks: 2 })
    engine.update()
    expect(engine.getStatistics().dayFraction).toBe(0.5)
    advance(engine, 3)
    expect(engine.getStatistics().seasonName).toBe('summer')
    advance(engine, 12)
    expect(engine.getCurrentYear()).toBe(1)
    expect(engine.getYearProgress()).toBe(0)
  })

  it('applies irrigation and cleansing through Rust immediately and persists their effects', () => {
    const engine = create()
    const chunk = engine.getChunk(1, 1)!
    chunk.biomeState.moisture = 0.2
    chunk.biomeState.pollution = 0.5
    expect(engine.executeIntervention({ chunkId: chunk.id, type: 'irrigate', x: 0.5, y: 0.5, data: { amount: 0.3 } })).toBe(true)
    expect(engine.executeIntervention({ chunkId: chunk.id, type: 'cleanse', x: 0.5, y: 0.5, data: { amount: 0.2 } })).toBe(true)
    expect(chunk.biomeState.moisture).toBeCloseTo(0.5)
    expect(chunk.biomeState.pollution).toBeCloseTo(0.3)
    const restored = create()
    restored.importState(JSON.parse(JSON.stringify(engine.exportState())))
    expect(restored.getChunk(1, 1)!.biomeState).toEqual(chunk.biomeState)
  })

  it('imports unversioned legacy worlds into Rust and rejects unknown save versions', () => {
    const source = create()
    advance(source, 7)
    const legacy = JSON.parse(JSON.stringify(source.exportState()))
    delete legacy.schemaVersion
    delete legacy.backend
    delete legacy.rustState
    const engine = create()
    engine.importState(legacy)
    expect(engine.getStatistics().currentTick).toBe(7)
    expect(() => engine.update()).not.toThrow()
    expect(engine.exportState().backend).toBe('rust-ecs')
    expect(() => engine.importState({ ...legacy, schemaVersion: 999 })).toThrow('Unsupported simulation save version')
  })

  it('leaves the live ecosystem intact when a corrupted Rust save is rejected', () => {
    const engine = create()
    advance(engine, 9)
    const before = engine.getDeterministicStateHash()
    const corrupted = JSON.parse(JSON.stringify(engine.exportState()))
    corrupted.rustState.version = 999
    expect(() => engine.importState(corrupted)).toThrow('Unsupported Rust simulation save version')
    expect(engine.getStatistics().currentTick).toBe(9)
    expect(engine.getDeterministicStateHash()).toBe(before)
    expect(() => engine.update()).not.toThrow()
  })
})
