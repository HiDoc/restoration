import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'
import { useInterventionStore } from '@/stores/interventionStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { plantStartingMeadow } from '@/game/startingMeadow'
import { crossBarrier, hybridName } from '@/game/hybrids'
import { codexEntries } from '@/game/codex'
import { isRipe } from '@/game/traits'

const HYBRID = 'hybrid_spanish_bluebell__wild_bluebell'
const species = (id: string) => SpeciesRegistry.getInstance().getSpecies(id)


/** Ids of the plants in a hex with seed at least this ripe. */
function ripeIn(engine: SimulationEngine, chunkId: string, least?: number): string[] {
  const ids: string[] = []
  engine.readChunks().get(chunkId)?.species.forEach((plant: any) => { if (isRipe(plant, least)) ids.push(plant.id) })
  return ids
}
describe('hybrid names and barriers', () => {
  it('names a hybrid the same way every time, after the kind of plant it is', () => {
    const name = hybridName(HYBRID, ['Spanish Bluebell', 'Bluebell'])
    expect(name).toBe(hybridName(HYBRID, ['Spanish Bluebell', 'Bluebell']))
    expect(name).toMatch(/^\w+ Bluebell$/)
  })

  it('lets only different species of one genus cross', () => {
    expect(crossBarrier(species('wild_bluebell'), species('spanish_bluebell'))).toBeNull()
    expect(crossBarrier(species('hawthorn'), species('midland_hawthorn'))).toBeNull()
    expect(crossBarrier(species('wild_bluebell'), species('white_clover'))).toMatch(/Too distant/)
    expect(crossBarrier(species('wild_bluebell'), species('wild_bluebell'))).toBeNull()
  })
})

describe('breeding a hybrid bluebell in the starting meadow', () => {
  let engine: SimulationEngine
  let pouch: ReturnType<typeof useInterventionStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    engine = new SimulationEngine({
      worldWidth: 3, worldHeight: 3, chunkSize: 32, tickRate: 10, masterSeed: 42, maxActiveChunks: 9,
      seasonLengthTicks: 90, timePerTickMinutes: 1440,
    })
    engine.activateAllChunks()
    plantStartingMeadow(engine)
    pouch = useInterventionStore()
    pouch.initialize(engine)
  })

  it('crosses two bluebells, collects the hybrid seed and records it in the Codex under the player’s name', () => {
    const at = { chunkId: 'chunk_1_1', x: 0.5, y: 0.5 }
    // The first open bluebell flower here, with pollen from a flowering Spanish bluebell.
    const cross = () => {
      const plants: any[] = []
      engine.readChunks().get(at.chunkId)?.species.forEach((plant: any) => plants.push(plant))
      const open = (species: string) => plants.find(p => p.speciesId === species && p.phenologyStage === 'flowering' && !p.pollen)?.id
      const [mother, father] = [open('wild_bluebell'), open('spanish_bluebell')]
      return !!mother && !!father && pouch.executeIntervention({ ...at, type: 'cross', data: { mother, father, prediction: { drought_tolerance: 'between' } } })
    }
    let crossed = false
    for (let day = 0; day < 90 && !crossed; day++) {
      engine.update()
      crossed = cross()
    }
    expect(crossed).toBe(true)
    expect(pouch.actionMessage).toMatch(/^Bluebell carries Spanish Bluebell pollen\./)
    expect(engine.getCrosses()[0].prediction).toEqual({ drought_tolerance: 'between' })

    for (let day = 0; day < 90 && !pouch.seeds[HYBRID]; day++) {
      engine.update()
      // Fully ripe, so the seed is sure to come up when sown.
      pouch.executeIntervention({ ...at, type: 'collect', data: { instanceIds: ripeIn(engine, at.chunkId, 0.9) } })
    }
    expect(pouch.seeds[HYBRID]).toBeGreaterThan(0)
    // Bred seed travels to another site's world, which learns the hybrid from the registry.
    const elsewhere = new SimulationEngine({ worldWidth: 2, worldHeight: 2, chunkSize: 32, tickRate: 10, masterSeed: 7, maxActiveChunks: 4 })
    elsewhere.importPouch(engine.exportPouch())
    expect(elsewhere.getInventory()[HYBRID]).toBe(pouch.seeds[HYBRID])
    const hybrid = species(HYBRID)!
    expect(hybrid.hybridOf).toEqual(['spanish_bluebell', 'wild_bluebell'])

    // Seen once it grows on the map; then the player names it.
    expect(pouch.executeIntervention({ ...at, type: 'plant', data: { speciesId: HYBRID } })).toBe(true)
    const knowledge = useKnowledgeStore()
    knowledge.observe(engine)
    const entry = codexEntries(knowledge.knowledge).find(e => e.id === HYBRID)!
    expect(entry.pedigree).toBe('Spanish Bluebell × Bluebell')
    expect(entry.partners.map(p => p.id)).toEqual(['buff_tailed_bumblebee'])
    knowledge.rename(HYBRID, 'Garden Ghost')
    expect(species(HYBRID)!.name).toBe('Garden Ghost')
    const saved = JSON.parse(JSON.stringify(knowledge.exportState()))
    knowledge.reset()
    knowledge.importState(saved)
    expect(codexEntries(knowledge.knowledge).find(e => e.id === HYBRID)?.name).toBe('Garden Ghost')
    // A new game forgets the player's name; the registry outlives games, so it must not keep it.
    knowledge.reset()
    expect(species(HYBRID)!.name).toBe(hybridName(HYBRID, ['Spanish Bluebell', 'Bluebell']))
  })
})
