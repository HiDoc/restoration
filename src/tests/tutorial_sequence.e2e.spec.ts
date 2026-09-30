import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HINTS, useTutorialStore } from '@/stores/tutorialStore'
import { announcements } from '@/game/announce'

const saved = () => JSON.parse(localStorage.getItem('ecosim-tutorial-state') ?? 'null')

describe('the first hour', () => {
  let store: ReturnType<typeof useTutorialStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    store = useTutorialStore()
    store.initializeTutorial()
  })
  afterEach(() => localStorage.clear())

  it('welcomes a new player once', () => {
    expect(store.showWelcomeModal).toBe(true)
    store.startTutorial()
    expect(saved()).toMatchObject({ hasSeenWelcome: true, enabled: true })
    setActivePinia(createPinia())
    const again = useTutorialStore()
    again.initializeTutorial()
    expect(again.showWelcomeModal).toBe(false)
  })

  it('offers each hint once, when its moment comes, one at a time', () => {
    store.consider({ start: true })
    expect(store.activeTooltip).toBeNull() // not over the welcome
    store.startTutorial()
    store.consider({ start: true, seedsInPouch: true })
    expect(store.activeTooltip?.id).toBe('open_hex')
    store.consider({ start: true, seedsInPouch: true })
    expect(store.activeTooltip?.id).toBe('open_hex') // one at a time
    // Opening a hex is what it asked for: it goes by itself, and the next moment's hint follows.
    store.consider({ start: true, seedsInPouch: true, hexOpened: true })
    expect(store.activeTooltip?.id).toBe('hex_card')
    store.completeCurrentStep()
    store.consider({ start: true, hexOpened: true })
    store.completeCurrentStep()
    store.consider({ start: true, hexOpened: true })
    expect(store.activeTooltip).toBeNull() // nothing new has happened
    store.consider({ start: true, fungi: true })
    expect(store.activeTooltip?.id).toBe('fungi')
    expect(saved().shown).toEqual(['open_hex', 'hex_card'])
  })

  it('stops for good when the player asks for no more hints', () => {
    store.startTutorial()
    store.consider({ start: true })
    store.skipTutorial()
    expect(store.activeTooltip).toBeNull()
    store.consider({ start: true, ripe: true })
    expect(store.activeTooltip).toBeNull()
    expect(saved().enabled).toBe(false)
  })

  it('points every hint at a control or the map, in plain words', () => {
    for (const hint of HINTS) expect(hint.content.length).toBeLessThan(160)
  })
})

describe('grouped announcements', () => {
  it('say several discoveries of a kind in one line', () => {
    const lines = announcements([
      { kind: 'species', id: 'white_clover' },
      { kind: 'species', id: 'hawthorn' },
      { kind: 'species', id: 'wild_bluebell' },
      { kind: 'species', id: 'yarrow' },
      { kind: 'interaction', animal: 'buff_tailed_bumblebee', plant: 'white_clover' },
      { kind: 'heard', id: 'greenfinch' },
    ])
    expect(lines.map(line => line.text)).toEqual([
      '4 new in your Codex: White Clover, Common Hawthorn, Bluebell and 1 more',
      'Heard, not yet seen: European Greenfinch',
      'New interaction: Buff-tailed Bumblebee ↔ White Clover',
    ])
    expect(lines[0].opens).toBe('plant')
  })
})
