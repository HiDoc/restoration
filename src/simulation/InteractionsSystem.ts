/**
 * InteractionsSystem
 * Applies species-to-species interaction effects inside chunks using DB-backed data.
 */

import type { SpeciesInstance, WorldChunk } from './WorldChunk'
import { mapDbBirdIdToGroup } from './BirdMapping'
import { BirdSpecies } from './BirdsSystem'

export interface InteractionRecord {
  targetSpeciesId: string
  targetType: 'vegetal' | 'bird'
  interactionType: 'pollination' | 'seed_dispersal' | 'nesting' | 'feeding' | 'competition' | 'facilitation' | 'neutral'
  strength: number
}

export class InteractionsSystem {
  private interactionMap: Map<string, InteractionRecord[]> = new Map()
  private birdTraits: Map<string, any> = new Map()

  private constructor() {}

  static async create(adapter: any): Promise<InteractionsSystem> {
    const sys = new InteractionsSystem()
    try {
      const all = adapter.getAllVegetalSpecies?.() || []
      // Preload interactions for all known species synchronously via awaiting per species
      for (const s of all) {
        try {
          // adapter.getSpeciesInteractions returns { targetSpeciesId, interactionType, strength }
          const inter = await adapter.getSpeciesInteractions(s.id)
          sys.interactionMap.set(s.id, inter as InteractionRecord[])
        } catch {
          sys.interactionMap.set(s.id, [])
        }
      }
    } catch {
      // If adapter fails, keep empty
    }
    // Load bird traits for pest control / diet checks
    try {
      const birds = adapter.getAllBirdSpecies?.() || []
      for (const b of birds) sys.birdTraits.set(b.id, b)
    } catch {}
    return sys
  }

  /** Apply interaction effects to all species within a chunk. */
  update(chunk: WorldChunk): void {
    if (chunk.species.size === 0) return

    // Reset per-chunk interaction boosts
    const boosts = { pollination: new Map<string, number>(), seedDispersal: new Map<string, number>() }
    ;(chunk as any).__interactionBoost = boosts

    // Presence counts by speciesId within the chunk
    const presence = new Map<string, number>()
    chunk.species.forEach((inst) => {
      presence.set(inst.speciesId, (presence.get(inst.speciesId) || 0) + 1)
    })

    // For each species instance, compute net effects from present target species
    chunk.species.forEach((inst) => {
      const interactions = this.interactionMap.get(inst.speciesId) || []
      if (interactions.length === 0) return

      let healthDelta = 0
      let reproductionBoost = 0

      for (const it of interactions) {
        const count = presence.get(it.targetSpeciesId) || 0
        if (count <= 0) continue
        const densityFactor = Math.min(1, count / 5)
        switch (it.interactionType) {
          case 'competition':
            healthDelta -= 0.005 * it.strength * densityFactor
            break
          case 'facilitation':
            healthDelta += 0.005 * it.strength * densityFactor
            break
          case 'feeding': {
            // If target is a bird, infer pest control benefit vs herbivory
            if (it.targetType === 'bird') {
              const bird = this.birdTraits.get(it.targetSpeciesId)
              const group = mapDbBirdIdToGroup(it.targetSpeciesId)
              const density = (chunk as any).birds?.[group as BirdSpecies] ?? ((chunk as any).birdsActivity ?? 0.5)
              const pestEff = (bird?.pest_control_effectiveness ?? 0)
              const diet = String(bird?.diet_type || '')
              const isPestController = pestEff >= 0.4 || /insectivore|omnivore/.test(diet)
              const mag = 0.003 * it.strength * Math.max(0, Math.min(1, density))
              healthDelta += isPestController ? +mag : -mag
            } else {
              // Plant-on-plant herbivory not modeled; treat as mild competition
              healthDelta -= 0.002 * it.strength * densityFactor
            }
            break
          }
          case 'pollination': {
            if (it.targetType === 'bird') {
              const group = mapDbBirdIdToGroup(it.targetSpeciesId)
              const activity = ((chunk as any).birds?.[group as BirdSpecies] as number | undefined) ?? ((chunk as any).birdsActivity ?? 0.5)
              const boostVal = 0.6 * it.strength * Math.max(0, Math.min(1, activity))
              const prev = boosts.pollination.get(inst.speciesId) || 0
              boosts.pollination.set(inst.speciesId, prev + boostVal)
            } else {
              reproductionBoost += 0.03 * it.strength * densityFactor
            }
            break
          }
          case 'seed_dispersal': {
            if (it.targetType === 'bird') {
              const group = mapDbBirdIdToGroup(it.targetSpeciesId)
              const density = ((chunk as any).birds?.[group as BirdSpecies] as number | undefined) ?? ((chunk as any).birdsTotal ?? 0.5)
              const boostVal = 0.4 * it.strength * Math.max(0, Math.min(1, density))
              const prev = boosts.seedDispersal.get(inst.speciesId) || 0
              boosts.seedDispersal.set(inst.speciesId, prev + boostVal)
            } else {
              reproductionBoost += 0.02 * it.strength * densityFactor
            }
            break
          }
          case 'nesting':
          case 'neutral':
            // No direct physiological effect in this simple model
            break
        }
      }

      if (healthDelta !== 0 || reproductionBoost !== 0) {
        this.applyEffects(inst, healthDelta, reproductionBoost)
      }
    })
  }

  private applyEffects(inst: SpeciesInstance, healthDelta: number, reproductionBoost: number): void {
    if (healthDelta !== 0) {
      inst.health = Math.max(0, Math.min(1, inst.health + healthDelta))
    }
    if (reproductionBoost > 0) {
      inst.reproductiveOutput += reproductionBoost
    }
  }
}
