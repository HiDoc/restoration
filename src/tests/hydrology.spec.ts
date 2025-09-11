import { describe, it, expect } from 'vitest'
import { RNGManager } from '@/simulation/SeededRNG'
import { HydrologySystem } from '@/simulation/HydrologySystem'
import { WorldChunk } from '@/simulation/WorldChunk'

function makeWorld(width: number, height: number, seedBase = 2000) {
  const chunks = new Map<string, WorldChunk>()
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const c = new WorldChunk(x, y, seedBase + x * 100 + y)
      chunks.set(c.id, c)
    }
  }
  return chunks
}

describe('HydrologySystem', () => {
  it('evaporates, infiltrates, and diffuses moisture between chunks', () => {
    RNGManager.initialize(7)
    const chunks = makeWorld(3, 3)
    const active = new Set<string>(Array.from(chunks.keys()))
    const center = chunks.get('chunk_1_1')!

    // Set climate to promote evaporation and ensure it can rain
    for (const c of chunks.values()) {
      c.climateState.temperature = 30
      c.climateState.wind = 0.8
      c.climateState.light = 1
      c.climateState.rainLikelihood = 1 // force precipitation branch
      c.biomeState.moisture = 0.1
    }
    center.biomeState.moisture = 0.9 // source of diffusion/runoff

    const hydro = new HydrologySystem({ diffusionRate: 0.2 })
    hydro.initializeElevation(chunks)

    hydro.update(chunks, active)

    // Center should generally decrease due to evaporation/outflows
    expect(center.biomeState.moisture).toBeLessThanOrEqual(0.9)

    // Some neighbor should gain moisture via inflow
    const neighbors = ['chunk_0_1','chunk_2_1','chunk_1_0','chunk_1_2']
    const gained = neighbors.some(id => (chunks.get(id)!.biomeState.moisture > 0.1))
    expect(gained).toBe(true)
  })
})

