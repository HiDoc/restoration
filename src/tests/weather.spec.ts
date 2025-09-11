import { describe, it, expect } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { WeatherSystem } from '@/simulation/WeatherSystem'
import { WorldChunk } from '@/simulation/WorldChunk'

function makeWorld(width: number, height: number, seedBase = 1000) {
  const chunks = new Map<string, WorldChunk>()
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const c = new WorldChunk(x, y, seedBase + x * 100 + y)
      chunks.set(c.id, c)
    }
  }
  return chunks
}

describe('WeatherSystem', () => {
  it('applies seasonal/day-night patterns and keeps climate in sane bounds', () => {
    RNGManager.initialize(42)
    const chunks = makeWorld(3, 3)
    const system = new WeatherSystem()

    system.update(1234, chunks)

    for (const chunk of chunks.values()) {
      expect(chunk.climateState.temperature).toBeGreaterThanOrEqual(-20)
      expect(chunk.climateState.temperature).toBeLessThanOrEqual(60)
      expect(chunk.climateState.wind).toBeGreaterThanOrEqual(0)
      expect(chunk.climateState.wind).toBeLessThanOrEqual(1)
      expect(chunk.climateState.rainLikelihood).toBeGreaterThanOrEqual(0)
      expect(chunk.climateState.rainLikelihood).toBeLessThanOrEqual(1)
      expect(chunk.climateState.light).toBeGreaterThanOrEqual(0)
      expect(chunk.climateState.light).toBeLessThanOrEqual(1)
    }

    const season0 = system.getCurrentSeason()
    expect(['spring','summer','autumn','winter']).toContain(season0.season)

    const forecast = system.getForecast(1, 1, 5)
    expect(forecast.temperature.length).toBe(5)
    expect(forecast.wind.length).toBe(5)
    expect(forecast.light.length).toBe(5)
  })
})

