import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { advance, siteById, SITES, STABLE, STAGES, type SiteProgress, type SiteSurvey } from '@/game/sites'
import { useKnowledgeStore } from './knowledgeStore'

const STORAGE_KEY = 'ecosim-profile'
const FIRST_SITE = SITES[0].id
const fresh = (): SiteProgress => ({ stage: 0, heldSeasons: 0 })

/** What happened at a site since the last check, for the player to hear about. */
export interface SiteNews { reached?: string; restored?: boolean; unlocked?: string }

/**
 * The player's journey across sites: where they are, how far each site has come, and the Codex, which
 * belongs to the player rather than to any one map. Kept in localStorage; each site's world is saved apart.
 */
export const useProfileStore = defineStore('profile', () => {
  const currentSite = ref(FIRST_SITE)
  const progress = ref<Record<string, SiteProgress>>({})
  /** Sites the player has arrived at before (they got their starter seeds). */
  const founded = ref<string[]>([])
  // The season index each site was last checked in, to notice a season turning.
  const seasonSeen: Record<string, number> = {}

  const site = computed(() => siteById(currentSite.value) ?? SITES[0])
  const siteProgress = computed(() => progress.value[currentSite.value] ?? fresh())
  const unlocked = computed(() =>
    SITES.filter(s => s.id === FIRST_SITE || SITES.some(prev => prev.unlocks === s.id && progress.value[prev.id]?.stage === STABLE)).map(s => s.id)
  )

  /** Fold a survey of the current site into its progress and report what is new. */
  function update(survey: SiteSurvey, seasonIndex: number): SiteNews {
    const id = currentSite.value
    const turned = seasonSeen[id] !== undefined && seasonIndex > seasonSeen[id]
    seasonSeen[id] = seasonIndex
    const before = siteProgress.value
    const after = advance(before, survey, site.value.targets, turned)
    progress.value = { ...progress.value, [id]: after }
    if (after.stage === before.stage) return {}
    const restored = after.stage === STABLE
    return { reached: STAGES[after.stage].title, restored, unlocked: restored ? site.value.unlocks : undefined }
  }

  /** Arrive at a site; true the first time, when it should be founded with its starter seeds. */
  function arrive(id: string): boolean {
    currentSite.value = id
    delete seasonSeen[id]
    if (founded.value.includes(id)) return false
    founded.value = [...founded.value, id]
    return true
  }

  function save() {
    try {
      const knowledge = useKnowledgeStore().exportState().knowledge
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentSite: currentSite.value, progress: progress.value, founded: founded.value, knowledge }))
    } catch {
      // Private windows and full storage: the profile lasts for this session only.
    }
  }

  /** Restore the saved profile; false if there is none. */
  function load(): boolean {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (!saved) return false
      currentSite.value = siteById(saved.currentSite) ? saved.currentSite : FIRST_SITE
      progress.value = saved.progress ?? {}
      founded.value = saved.founded ?? []
      useKnowledgeStore().importState({ knowledge: saved.knowledge, lastTick: -1 })
      return true
    } catch {
      return false
    }
  }

  return { currentSite, progress, founded, site, siteProgress, unlocked, update, arrive, save, load }
})
