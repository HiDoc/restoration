import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'
import { useInterventionStore } from '@/stores/interventionStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { plantStartingMeadow } from '@/game/startingMeadow'
import { crossBarrier, hybridName } from '@/game/hybrids'
import { codexEntries } from '@/game/codex'

const HYBRID = 'hybrid_spanish_bluebell__wild_bluebell'
const species = (id: string) => SpeciesRegistry.getInstance().getSpecies(id)

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
    expect(crossBarrier(species('wild_bluebell'), species('wild_bluebell'))).toMatch(/itself/)
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
    const cross = () => pouch.executeIntervention({ ...at, type: 'cross', data: { receiver: 'wild_bluebell', donor: 'spanish_bluebell' } })
    let crossed = false
    for (let day = 0; day < 90 && !crossed; day++) {
      engine.update()
      crossed = cross()
    }
    expect(crossed).toBe(true)
    expect(pouch.actionMessage).toBe('Bluebell carries Spanish Bluebell pollen. Collect its seed when it ripens.')

    for (let day = 0; day < 90 && !pouch.seeds[HYBRID]; day++) {
      engine.update()
      pouch.executeIntervention({ ...at, type: 'collect', data: {} })
    }
    expect(pouch.seeds[HYBRID]).toBeGreaterThan(0)
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
