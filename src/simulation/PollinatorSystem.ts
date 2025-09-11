/**
 * Pollinator system simulating pollinator density across chunks.
 * Density is a scalar [0..1] influenced by diversity, light, weather, and diffusion.
 */

import { RNGManager, SeededRNG } from './SeededRNG'
import { WorldChunk } from './WorldChunk'

export interface PollinatorConfig {
  initBase: number
  initDiversityWeight: number
  initLightWeight: number
  initNoiseSigma: number
  diversityWeight: number
  lightWeight: number
  canopyWeight: number
  tempWeight: number
  windPenalty: number
  rainPenalty: number
  noiseSigma: number
  diffusionRate: number
}

export class PollinatorSystem {
  private rng: SeededRNG
  // Internal map of densities for fast iteration (also written back to chunk)
  private density: Map<string, number> = new Map()
  private config: PollinatorConfig

  constructor(config?: Partial<PollinatorConfig>) {
    this.rng = RNGManager.getInstance().getRNG('pollinators')
    this.config = {
      initBase: 0.2,
      initDiversityWeight: 0.5,
      initLightWeight: 0.3,
      initNoiseSigma: 0.05,
      diversityWeight: 0.02,
      lightWeight: 0.015,
      canopyWeight: 0.005,
      tempWeight: 0.01,
      windPenalty: 0.02,
      rainPenalty: 0.015,
      noiseSigma: 0.003,
      diffusionRate: 0.02,
      ...config,
    }
  }

  setConfig(update: Partial<PollinatorConfig>): void {
    this.config = { ...this.config, ...update }
  }

  /**
   * Initialize densities for all chunks based on initial diversity and light.
   */
  initialize(chunks: Map<string, WorldChunk>): void {
    this.density.clear()
    chunks.forEach((chunk, id) => {
      const base = this.config.initBase
      const diversity = chunk.biomeState.diversity || 0
      const light = chunk.climateState.light || 0
      const d = Math.max(
        0,
        Math.min(
          1,
          base
            + this.config.initDiversityWeight * diversity
            + this.config.initLightWeight * light
            + this.rng.nextGaussian(0, this.config.initNoiseSigma)
        )
      )
      this.density.set(id, d)
      ;(chunk as any).pollinatorDensity = d
    })
  }

  /**
   * Update pollinator densities per tick.
   * - Positive drivers: diversity, light, canopy (moderate), temperature (mild).
   * - Negative drivers: high wind, rain likelihood.
   * - Spatial diffusion: gentle mixing with neighbors.
   */
  update(chunks: Map<string, WorldChunk>): void {
    if (this.density.size === 0) this.initialize(chunks)

    const next = new Map<string, number>()

    chunks.forEach((chunk, id) => {
      const d = this.density.get(id) ?? 0.2
      const b = chunk.biomeState
      const c = chunk.climateState

      // Environmental adjustment
      let delta = 0
      delta += (b.diversity || 0) * this.config.diversityWeight
      delta += Math.max(0, Math.min(1, c.light)) * this.config.lightWeight
      delta += Math.max(0, Math.min(1, b.canopy)) * this.config.canopyWeight // canopy structure supports pollinators
      // mild temperature preference around 15-30C
      const temp = c.temperature
      const tempPref = Math.max(0, 1 - Math.abs((temp - 22) / 15))
      delta += tempPref * this.config.tempWeight
      // negative weather pressures
      delta -= Math.max(0, Math.min(1, c.wind)) * this.config.windPenalty
      delta -= Math.max(0, Math.min(1, c.rainLikelihood)) * this.config.rainPenalty

      // Random fluctuation
      delta += this.rng.nextGaussian(0, this.config.noiseSigma)

      let nd = d + delta
      nd = Math.max(0, Math.min(1, nd))
      next.set(id, nd)
    })

    // Simple diffusion between Von Neumann neighbors
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
    const add: Map<string, number> = new Map()
    const worldSizeCache: Map<string, [number, number]> = new Map()

    const getXY = (chunkId: string): [number, number] => {
      let v = worldSizeCache.get(chunkId)
      if (v) return v
      const parts = chunkId.split('_').slice(1).map(Number)
      v = [parts[0], parts[1]]
      worldSizeCache.set(chunkId, v)
      return v
    }

    const exists = (x: number, y: number) => chunks.has(`chunk_${x}_${y}`)

    next.forEach((val, id) => {
      const [x, y] = getXY(id)
      let transferTotal = 0
      const diffusionRate = this.config.diffusionRate
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy
        const nid = `chunk_${nx}_${ny}`
        if (exists(nx, ny)) {
          const nv = next.get(nid) ?? 0
          const grad = val - nv
          const flow = grad * diffusionRate * 0.25 // spread across neighbors
          transferTotal -= flow
          add.set(nid, (add.get(nid) || 0) + flow)
        }
      }
      add.set(id, (add.get(id) || 0) + transferTotal)
    })

    // Apply diffusion
    add.forEach((dv, id) => {
      next.set(id, Math.max(0, Math.min(1, (next.get(id) ?? 0) + dv)))
    })

    // Commit back to chunks
    next.forEach((val, id) => {
      this.density.set(id, val)
      const chunk = chunks.get(id)
      if (chunk) (chunk as any).pollinatorDensity = val
    })
  }
}
