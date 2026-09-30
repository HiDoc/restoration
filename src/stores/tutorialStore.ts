/**
 * The welcome and the hints of the first hour. A hint appears once, centred on screen, when its moment first comes in
 * play (the first hex opened, the first seeds in the pouch, the first pollinator, …).
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** Moments in play a hint waits for. */
export type HintSignal = 'start' | 'hexOpened' | 'seedsInPouch' | 'pollinator' | 'ripe' | 'fungi' | 'goalDone'

export interface Hint {
  id: string
  title: string
  content: string
  when: HintSignal
  /** Once this happens the hint has done its work and goes by itself. */
  doneWhen?: HintSignal
}

/** In the order they are offered when several moments have come. */
export const HINTS: Hint[] = [
  { id: 'open_hex', when: 'start', doneWhen: 'hexOpened', title: 'Open a hex', content: 'Tap a hex to see what grows and visits there.' },
  {
    id: 'hex_card',
    when: 'hexOpened',
    title: 'What lives here',
    content: 'The plants, animals and ground of this hex. The buttons below act here: listen for birds, sample the soil, trace where the water runs.',
  },
  {
    id: 'sow',
    when: 'seedsInPouch',
    title: 'Seeds in your pouch',
    content: 'Choose Plant, then a hex: the card says how the seed would fare before you sow it.',
  },
  {
    id: 'pollinator',
    when: 'pollinator',
    title: 'A visitor',
    content: 'Insects have come to the flowers. Open their hex and use ⋯ beside one to follow or photograph it: watching shows who feeds on what.',
  },
  { id: 'ripe', when: 'ripe', title: 'Seed is ripening', content: 'Plants are in fruit. Open a hex with fruiting plants and choose Collect to take seed from the ripest.' },
  { id: 'fungi', when: 'fungi', title: 'Mushrooms', content: 'Fungi are fruiting. In their hex, choose Fungi to look closely and learn which trees they live with.' },
  {
    id: 'goals',
    when: 'goalDone',
    title: 'Goals bring seed',
    content: 'Each goal done sends seed of a plant this site lacks, and the next goal takes its place.',
  },
]

const STORAGE_KEY = 'ecosim-tutorial-state'

export const useTutorialStore = defineStore('tutorial', () => {
  const hasSeenWelcome = ref(false)
  const showWelcomeModal = ref(false)
  /** Hints on, until the player asks for no more. */
  const enabled = ref(true)
  const shown = ref(new Set<string>())
  const activeTooltip = ref<Hint | null>(null)
  const showTooltip = computed(() => activeTooltip.value !== null)

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exportState()))
    } catch {}
  }

  function initializeTutorial() {
    try {
      importState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    } catch {}
    showWelcomeModal.value = !hasSeenWelcome.value
  }

  /** Offer the first hint whose moment has come and that has not been shown, one at a time. */
  function consider(signals: Partial<Record<HintSignal, boolean>>) {
    const done = activeTooltip.value?.doneWhen
    if (done && signals[done]) completeCurrentStep()
    if (!enabled.value || activeTooltip.value || showWelcomeModal.value) return
    activeTooltip.value = HINTS.find(hint => !shown.value.has(hint.id) && signals[hint.when]) ?? null
  }

  /** "Got it": this hint is done. */
  function completeCurrentStep() {
    if (!activeTooltip.value) return
    shown.value.add(activeTooltip.value.id)
    activeTooltip.value = null
    save()
  }

  function welcomed(hints: boolean) {
    showWelcomeModal.value = false
    hasSeenWelcome.value = true
    enabled.value = hints
    if (!hints) activeTooltip.value = null
    save()
  }
  /** From the welcome: show me around. */
  const startTutorial = () => welcomed(true)
  /** "No more hints", from the welcome or a hint. */
  const skipTutorial = () => welcomed(false)
  const dismissWelcome = () => welcomed(enabled.value)

  function exportState() {
    return { hasSeenWelcome: hasSeenWelcome.value, enabled: enabled.value, shown: [...shown.value] }
  }
  function importState(state: Partial<ReturnType<typeof exportState>> | null | undefined) {
    if (!state) return
    hasSeenWelcome.value = state.hasSeenWelcome ?? hasSeenWelcome.value
    enabled.value = state.enabled ?? enabled.value
    shown.value = new Set(state.shown ?? [])
    activeTooltip.value = null
  }

  return { hasSeenWelcome, showWelcomeModal, enabled, shown, activeTooltip, showTooltip, initializeTutorial, consider, completeCurrentStep, startTutorial, skipTutorial, dismissWelcome, exportState, importState }
})
