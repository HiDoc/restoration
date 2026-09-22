/**
 * Pinia store for research and discovery system
 * Manages reactive state for UI components
 */

import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  ResearchSystem,
  TraitCategory,
  DiscoveryMethod,
  type SpeciesDiscovery,
  type ResearchQuestion,
} from '@/simulation/ResearchSystem';
import type { WorldChunk, SpeciesInstance } from '@/simulation/WorldChunk';
import type { EventJournal } from '@/simulation/EventJournal';

/**
 * Research store - single source of truth for discovery state
 */
export const useResearchStore = defineStore('research', () => {
  // Core system instance
  const system: Ref<ResearchSystem | null> = ref(null);

  // UI state
  const selectedSpecies: Ref<string | null> = ref(null);
  const showFieldGuide = ref(false);
  const showDiscoveryModal = ref(false);
  const latestDiscovery: Ref<SpeciesDiscovery | null> = ref(null);
  const activeResearchQuestion: Ref<ResearchQuestion | null> = ref(null);

  // Computed getters
  const isInitialized = computed(() => system.value !== null);

  const discoveredSpeciesIds = computed(() => {
    if (!system.value) return [];
    return system.value.getDiscoveredSpecies();
  });

  const discoveredCount = computed(() => discoveredSpeciesIds.value.length);

  const totalObservations = computed(() => {
    if (!system.value) return 0;
    return system.value.getState().totalObservations;
  });

  const fullyResearchedSpecies = computed(() => {
    if (!system.value) return [];
    return discoveredSpeciesIds.value.filter(
      id => system.value!.getResearchProgress(id) === 1.0
    );
  });

  const activeQuestions = computed(() => {
    if (!system.value) return [];
    return system.value.getState().activeQuestions.filter(q => q.active);
  });

  const achievements = computed(() => {
    if (!system.value) return [];
    return Array.from(system.value.getState().achievements.values());
  });

  const unlockedAchievements = computed(() => {
    return achievements.value.filter(a => a.unlocked);
  });

  // Actions
  function initialize(eventJournal: EventJournal, startTick: number = 0) {
    system.value = new ResearchSystem(eventJournal, startTick);
  }

  function notifySpeciesObserved(
    speciesId: string,
    chunk: WorldChunk,
    currentTick: number,
    instance?: SpeciesInstance
  ) {
    if (!system.value) return;

    const wasDiscovered = system.value.getState().discoveredSpecies.has(speciesId);

    system.value.observeSpecies(speciesId, chunk, currentTick, instance);

    // Show discovery modal for new species
    if (!wasDiscovered) {
      const discovery = system.value.getDiscovery(speciesId);
      if (discovery) {
        latestDiscovery.value = discovery;
        showDiscoveryModal.value = true;
      }
    }
  }

  function manualDiscovery(
    speciesId: string,
    tick: number,
    method: DiscoveryMethod = DiscoveryMethod.INITIAL
  ) {
    if (!system.value) return;
    system.value.manualDiscovery(speciesId, tick, method);
  }

  function getResearchProgress(speciesId: string): number {
    if (!system.value) return 0;
    return system.value.getResearchProgress(speciesId);
  }

  function hasUnlockedTrait(speciesId: string, category: TraitCategory): boolean {
    if (!system.value) return false;
    return system.value.hasUnlockedTrait(speciesId, category);
  }

  function getObservationCount(speciesId: string): number {
    if (!system.value) return 0;
    return system.value.getObservationCount(speciesId);
  }

  function getDiscovery(speciesId: string): SpeciesDiscovery | undefined {
    if (!system.value) return undefined;
    return system.value.getDiscovery(speciesId);
  }

  function addResearchNote(speciesId: string, note: string) {
    if (!system.value) return;
    system.value.addResearchNote(speciesId, note);
  }

  function openFieldGuide(speciesId?: string) {
    if (speciesId) {
      selectedSpecies.value = speciesId;
    }
    showFieldGuide.value = true;
  }

  function closeFieldGuide() {
    showFieldGuide.value = false;
    selectedSpecies.value = null;
  }

  function closeDiscoveryModal() {
    showDiscoveryModal.value = false;
    latestDiscovery.value = null;
  }

  function closeDiscoveryAndOpenFieldGuide() {
    const speciesId = latestDiscovery.value?.speciesId;
    closeDiscoveryModal();
    if (speciesId) {
      openFieldGuide(speciesId);
    }
  }

  function selectResearchQuestion(question: ResearchQuestion) {
    activeResearchQuestion.value = question;
  }

  function clearResearchQuestion() {
    activeResearchQuestion.value = null;
  }

  function exportState() {
    if (!system.value) return null;
    return system.value.exportState();
  }

  function importState(serializedState: any) {
    if (!system.value) return;
    system.value.importState(serializedState);
  }

  function checkAndUnlockAchievements(_currentTick: number) {
    if (!system.value) return;
    // Achievement checking is currently handled by the database system
    // This method is a no-op for now but keeps API compatibility
  }

  function refreshQuestions() {
    if (!system.value) return;
    // Research questions are automatically managed by the system
    // This method is a no-op for now but keeps API compatibility
  }

  function reset() {
    system.value = null;
    selectedSpecies.value = null;
    showFieldGuide.value = false;
    showDiscoveryModal.value = false;
    latestDiscovery.value = null;
    activeResearchQuestion.value = null;
  }

  return {
    // State
    system,
    selectedSpecies,
    showFieldGuide,
    showDiscoveryModal,
    latestDiscovery,
    activeResearchQuestion,

    // Computed
    isInitialized,
    discoveredSpeciesIds,
    discoveredCount,
    totalObservations,
    fullyResearchedSpecies,
    activeQuestions,
    achievements,
    unlockedAchievements,

    // Actions
    initialize,
    notifySpeciesObserved,
    manualDiscovery,
    getResearchProgress,
    hasUnlockedTrait,
    getObservationCount,
    getDiscovery,
    addResearchNote,
    openFieldGuide,
    closeFieldGuide,
    closeDiscoveryModal,
    closeDiscoveryAndOpenFieldGuide,
    selectResearchQuestion,
    clearResearchQuestion,
    checkAndUnlockAchievements,
    refreshQuestions,
    exportState,
    importState,
    reset,
  };
});
