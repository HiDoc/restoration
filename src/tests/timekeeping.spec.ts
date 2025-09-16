import { describe, it, expect, beforeEach } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { SimulationEngine } from '@/simulation/SimulationEngine'

describe('Year and season timekeeping', () => {
  beforeEach(() => RNGManager.initialize(42))

  it('season names advance every seasonLengthTicks days', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 7,
      maxActiveChunks: 1,
      seasonLengthTicks: 5,
    })

    const stats0 = engine.getStatistics()
    expect(stats0.seasonName).toBe('spring')

    for (let i = 0; i < 5; i++) engine.update()
    expect(engine.getStatistics().seasonName).toBe('summer')

    for (let i = 0; i < 5; i++) engine.update()
    expect(engine.getStatistics().seasonName).toBe('autumn')

    for (let i = 0; i < 5; i++) engine.update()
    expect(engine.getStatistics().seasonName).toBe('winter')

    for (let i = 0; i < 5; i++) engine.update()
    expect(engine.getStatistics().seasonName).toBe('spring')
  })

  it('year index and progress reflect sim time', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 7,
      maxActiveChunks: 1,
      seasonLengthTicks: 5, // year = 20 days
    })

    expect(engine.getCurrentYear()).toBe(0)
    expect(engine.getYearProgress()).toBeCloseTo(0, 5)
    for (let i = 0; i < 10; i++) engine.update()
    expect(engine.getYearProgress()).toBeCloseTo(0.5, 2)
    for (let i = 0; i < 10; i++) engine.update()
    expect(engine.getCurrentYear()).toBe(1)
    expect(engine.getYearProgress()).toBeCloseTo(0, 5)
  })

  it('dayFraction tracks partial day ticks via timePerTickMinutes', () => {
    const engine = new SimulationEngine({
      worldWidth: 1,
      worldHeight: 1,
      chunkSize: 32,
      tickRate: 60,
      masterSeed: 7,
      maxActiveChunks: 1,
      seasonLengthTicks: 5,
      timePerTickMinutes: 720, // half day per tick
    })

    // After init, no time advanced
    expect(engine.getStatistics().dayFraction).toBeCloseTo(0, 5)
    engine.update()
    expect(engine.getStatistics().dayFraction).toBeCloseTo(0.5, 5)
    engine.update()
    expect(engine.getStatistics().dayFraction).toBeCloseTo(0, 5)
  })
})

