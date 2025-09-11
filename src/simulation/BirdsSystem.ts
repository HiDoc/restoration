/**
 * Birds system simulating three bird species with distinct behaviors.
 * Densities are continuous [0..1] per species per chunk.
 *
 * Species:
 * - SWIFT: diurnal, prefers open/light, low canopy; fast movers (aerial insectivores)
 * - ROBIN: diurnal, prefers moderate canopy/edges; generalist
 * - OWL: nocturnal, prefers higher canopy; roosts by day
 */

import { SeededRNG, RNGManager } from './SeededRNG'
import { WorldChunk } from './WorldChunk'

export enum BirdSpecies {
  SWIFT = 'swift',
  ROBIN = 'robin',
  OWL = 'owl',
}

export interface BirdsConfig {
  diffusionRate: number
  noiseSigma: number
  maxMoveRate: number
}

export class BirdsSystem {
  private rng: SeededRNG
  private config: BirdsConfig
  private densities: Map<string, Record<BirdSpecies, number>> = new Map()

  constructor(config?: Partial<BirdsConfig>) {
    this.rng = RNGManager.getInstance().getRNG('birds')
    this.config = {
      diffusionRate: 0.04,
      noiseSigma: 0.003,
      maxMoveRate: 0.05,
      ...config,
    }
  }

  initialize(chunks: Map<string, WorldChunk>): void {
    this.densities.clear()
    chunks.forEach((chunk, id) => {
      const light = chunk.climateState.light
      const canopy = chunk.biomeState.canopy
      const swift = this.clamp(light * (1 - canopy) + this.rng.nextGaussian(0, 0.05))
      const robin = this.clamp(0.6 - Math.abs(canopy - 0.4) + this.rng.nextGaussian(0, 0.05))
      const owl = this.clamp(canopy * 0.8 + this.rng.nextGaussian(0, 0.05))
      const rec: Record<BirdSpecies, number> = {
        [BirdSpecies.SWIFT]: swift,
        [BirdSpecies.ROBIN]: Math.max(0, robin),
        [BirdSpecies.OWL]: owl,
      }
      this.densities.set(id, rec)
      ;(chunk as any).birds = rec
      ;(chunk as any).birdsTotal = swift + Math.max(0, robin) + owl
      ;(chunk as any).birdsActivity = this.activityFactor(rec, /*midday*/ this.getTimeOfDay(0))
    })
  }

  update(chunks: Map<string, WorldChunk>, currentTick: number): void {
    if (this.densities.size === 0) this.initialize(chunks)
    const next = new Map<string, Record<BirdSpecies, number>>()

    const tod = this.getTimeOfDay(currentTick) // 0..1 fraction of day

    // Habitat suitability per chunk
    const suitability = new Map<string, Record<BirdSpecies, number>>()
    chunks.forEach((chunk, id) => {
      const light = this.clamp(chunk.climateState.light)
      const canopy = this.clamp(chunk.biomeState.canopy)
      const wind = this.clamp(chunk.climateState.wind)
      const rain = this.clamp(chunk.climateState.rainLikelihood)

      const diurnal = (x: number) => x * this.dayFactor(tod)
      const nocturnal = (x: number) => x * (1 - this.dayFactor(tod))

      const swiftSuit = diurnal(light * (1 - canopy)) * (1 - 0.3 * wind) * (1 - 0.2 * rain)
      const robinSuit = diurnal(1 - Math.abs(canopy - 0.5)) * (1 - 0.15 * wind) * (1 - 0.15 * rain)
      const owlSuit = nocturnal(0.6 * canopy + 0.2 * (1 - light)) * (1 - 0.1 * wind)
      suitability.set(id, {
        [BirdSpecies.SWIFT]: this.clamp(swiftSuit),
        [BirdSpecies.ROBIN]: this.clamp(robinSuit),
        [BirdSpecies.OWL]: this.clamp(owlSuit),
      })
    })

    // Movement towards better suitability and diffusion
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
    const add: Map<string, Record<BirdSpecies, number>> = new Map()

    const ensureRec = (map: Map<string, Record<BirdSpecies, number>>, id: string) => {
      let r = map.get(id)
      if (!r) { r = { [BirdSpecies.SWIFT]: 0, [BirdSpecies.ROBIN]: 0, [BirdSpecies.OWL]: 0 }; map.set(id, r) }
      return r
    }

    chunks.forEach((chunk, id) => {
      const den = this.densities.get(id)!
      const suit = suitability.get(id)!
      // small random fluctuation
      const jitter = (s: BirdSpecies) => den[s] + this.rng.nextGaussian(0, this.config.noiseSigma)
      const local: Record<BirdSpecies, number> = {
        [BirdSpecies.SWIFT]: this.clamp(jitter(BirdSpecies.SWIFT)),
        [BirdSpecies.ROBIN]: this.clamp(jitter(BirdSpecies.ROBIN)),
        [BirdSpecies.OWL]: this.clamp(jitter(BirdSpecies.OWL)),
      }
      next.set(id, { ...local })

      // move a fraction toward neighbors with higher suitability
      for (const [dx, dy] of dirs) {
        const nid = `chunk_${chunk.x + dx}_${chunk.y + dy}`
        const nsuit = suitability.get(nid)
        if (!nsuit) continue
        ;([BirdSpecies.SWIFT, BirdSpecies.ROBIN, BirdSpecies.OWL] as BirdSpecies[]).forEach(sp => {
          const grad = nsuit[sp] - suit[sp]
          if (grad > 0) {
            const flow = Math.min(this.config.maxMoveRate * grad, local[sp] * 0.25)
            ensureRec(add, nid)[sp] = (ensureRec(add, nid)[sp] || 0) + flow
            ensureRec(add, id)[sp] = (ensureRec(add, id)[sp] || 0) - flow
          }
        })
      }
    })

    // Diffusion mix
    add.forEach((delta, id) => {
      const r = next.get(id) || { [BirdSpecies.SWIFT]: 0, [BirdSpecies.ROBIN]: 0, [BirdSpecies.OWL]: 0 }
      ;([BirdSpecies.SWIFT, BirdSpecies.ROBIN, BirdSpecies.OWL] as BirdSpecies[]).forEach(sp => {
        r[sp] = this.clamp((r[sp] || 0) + delta[sp] * this.config.diffusionRate)
      })
      next.set(id, r)
    })

    // Commit and update chunk annotations
    next.forEach((rec, id) => {
      this.densities.set(id, rec)
      const chunk = chunks.get(id)
      if (chunk) {
        ;(chunk as any).birds = rec
        ;(chunk as any).birdsTotal = rec[BirdSpecies.SWIFT] + rec[BirdSpecies.ROBIN] + rec[BirdSpecies.OWL]
        ;(chunk as any).birdsActivity = this.activityFactor(rec, tod)
      }
    })
  }

  private clamp(n: number) { return Math.max(0, Math.min(1, n)) }

  private dayFactor(tod: number) {
    // Simple daylight curve: peak at midday (tod=0.5), 0 at midnight
    return Math.max(0, Math.sin(tod * Math.PI))
  }

  private activityFactor(rec: Record<BirdSpecies, number>, tod: number) {
    // Weighted by species' active periods
    const diurnal = this.dayFactor(tod)
    const nocturnal = 1 - diurnal
    return this.clamp(rec[BirdSpecies.SWIFT] * diurnal + rec[BirdSpecies.ROBIN] * diurnal + rec[BirdSpecies.OWL] * nocturnal)
  }

  private getTimeOfDay(currentTick: number) {
    const totalDayTicks = 24 * 60 // keep consistent with WeatherSystem
    return (currentTick % totalDayTicks) / totalDayTicks
  }
}
