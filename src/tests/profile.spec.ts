import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SimulationEngine } from '@/simulation/SimulationEngine'
import { useProfileStore } from '@/stores/profileStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { SITES, STABLE, type SiteSurvey } from '@/game/sites'

const [meadow, woodland] = SITES
const thriving: SiteSurvey = { hexes: 36, coveredHexes: 36, plantKinds: 20, pollinatorKinds: 5, birdKinds: 5 }

function world(seed: number) {
  const engine = new SimulationEngine({
    worldWidth: 3, worldHeight: 3, chunkSize: 32, tickRate: 10, masterSeed: seed, maxActiveChunks: 9,
    seasonLengthTicks: 90, timePerTickMinutes: 1440,
  })
  engine.activateAllChunks()
  return engine
}

describe('player profile', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('founds a site once, restores it through the seasons and opens the next', () => {
    const profile = useProfileStore()
    expect(profile.arrive(meadow.id)).toBe(true)
    expect(profile.arrive(meadow.id)).toBe(false)
    expect(profile.unlocked).toEqual([meadow.id])
    expect(profile.update(thriving, 0).reached).toBe('Birds')
    let news = {}
    for (let season = 1; season <= 4; season++) news = profile.update(thriving, season)
    expect(news).toEqual({ reached: 'Stable', restored: true, unlocked: woodland.id })
    expect(profile.siteProgress.stage).toBe(STABLE)
    expect(profile.unlocked).toEqual([meadow.id, woodland.id])
  })

  it('keeps the Codex and site progress across sessions', () => {
    const profile = useProfileStore()
    const knowledge = useKnowledgeStore()
    profile.arrive(woodland.id)
    profile.update(thriving, 0)
    knowledge.knowledge.species.english_oak = { firstSeen: 3, flowering: ['spring'], fruiting: [], spreads: false }
    profile.save()

    setActivePinia(createPinia())
    const restored = useProfileStore()
    expect(restored.load()).toBe(true)
    expect(restored.currentSite).toBe(woodland.id)
    expect(restored.founded).toEqual([woodland.id])
    expect(restored.siteProgress.stage).toBe(STABLE - 1)
    expect(useKnowledgeStore().knowledge.species.english_oak?.flowering).toEqual(['spring'])
  })
})

describe('travelling with the pouch', () => {
  it('carries each seed, genetics included, into another site’s world', () => {
    const here = world(1)
    here.addSeeds({ white_clover: 2 })
    const pouch = here.exportPouch()
    const there = world(2)
    there.importPouch(pouch)
    expect(there.getInventory()).toEqual({ white_clover: 2 })
    expect(there.exportPouch()).toEqual(pouch)
  })
})
