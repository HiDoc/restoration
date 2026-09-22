/**
 * Pinia store for tutorial system
 * Manages reactive state for onboarding and contextual tooltips
 */

import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type TooltipTrigger = 'manual' | 'event' | 'tick';

export interface TooltipStep {
  id: string;
  title: string;
  content: string;
  targetElement?: string; // CSS selector for positioning
  placement: TooltipPlacement;
  trigger: TooltipTrigger;
  triggerCondition?: string; // EventType or tick number
}

/**
 * Tutorial tooltip sequence
 */
const TUTORIAL_STEPS: TooltipStep[] = [
  {
    id: 'chunk_grid_intro',
    title: 'Ecosystem Grid',
    content: 'This hexagonal grid represents your ecosystem. Each hex is a chunk where species live and interact.',
    targetElement: '.chunk-grid-container',
    placement: 'right',
    trigger: 'manual'
  },
  {
    id: 'event_log_intro',
    title: 'Event Log',
    content: 'Watch species births, deaths, and ecological events unfold in real-time here.',
    targetElement: '.event-log-container',
    placement: 'left',
    trigger: 'event'
  },
  {
    id: 'goals_intro',
    title: 'Your Goals',
    content: 'Complete these goals to earn points and unlock new capabilities. Track your progress here.',
    targetElement: '.goals-panel',
    placement: 'left',
    trigger: 'tick'
  },
  {
    id: 'interventions_intro',
    title: 'Interventions',
    content: 'Use these tools to shape your ecosystem. Each intervention costs points and has a cooldown period.',
    targetElement: '.intervention-panel',
    placement: 'left',
    trigger: 'manual'
  },
  {
    id: 'research_intro',
    title: 'Research & Discovery',
    content: 'Discover new species through observation. Unlock detailed traits as you study them.',
    targetElement: '.research-panel',
    placement: 'left',
    trigger: 'event'
  }
];

/**
 * Tutorial store - single source of truth for tutorial state
 */
export const useTutorialStore = defineStore('tutorial', () => {
  // Persistence key
  const STORAGE_KEY = 'ecosim-tutorial-state';

  // State
  const hasSeenWelcome = ref(false);
  const showWelcomeModal = ref(false);
  const tutorialEnabled = ref(true);
  const completedSteps = ref<Set<string>>(new Set());
  const currentStepIndex = ref(0);

  // UI state
  const activeTooltip: Ref<TooltipStep | null> = ref(null);
  const showTooltip = ref(false);

  // Computed
  const tutorialProgress = computed(() => {
    if (TUTORIAL_STEPS.length === 0) return 1;
    return completedSteps.value.size / TUTORIAL_STEPS.length;
  });

  const tutorialComplete = computed(() => {
    return completedSteps.value.size >= TUTORIAL_STEPS.length;
  });

  const nextStep = computed((): TooltipStep | null => {
    for (const step of TUTORIAL_STEPS) {
      if (!completedSteps.value.has(step.id)) {
        return step;
      }
    }
    return null;
  });

  // Actions

  /**
   * Initialize tutorial system
   */
  function initializeTutorial() {
    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state = JSON.parse(stored);
        hasSeenWelcome.value = state.hasSeenWelcome || false;
        tutorialEnabled.value = state.tutorialEnabled !== undefined ? state.tutorialEnabled : true;
        completedSteps.value = new Set(state.completedSteps || []);
        currentStepIndex.value = state.currentStepIndex || 0;
      } catch (e) {
        console.error('Failed to load tutorial state:', e);
      }
    }

    // Show welcome modal if first time
    if (!hasSeenWelcome.value && tutorialEnabled.value) {
      showWelcomeModal.value = true;
    }
  }

  /**
   * Show welcome modal
   */
  function showWelcome() {
    showWelcomeModal.value = true;
  }

  /**
   * Dismiss welcome modal and start tutorial
   */
  function startTutorial() {
    showWelcomeModal.value = false;
    hasSeenWelcome.value = true;
    tutorialEnabled.value = true;
    saveTutorialState();

    // Show first tooltip after a delay
    setTimeout(() => {
      if (nextStep.value) {
        showTooltipStep(nextStep.value);
      }
    }, 1000);
  }

  /**
   * Skip tutorial entirely
   */
  function skipTutorial() {
    showWelcomeModal.value = false;
    hasSeenWelcome.value = true;
    tutorialEnabled.value = false;
    showTooltip.value = false;
    activeTooltip.value = null;
    saveTutorialState();
  }

  /**
   * Dismiss welcome modal without starting tutorial
   */
  function dismissWelcome() {
    showWelcomeModal.value = false;
    hasSeenWelcome.value = true;
    saveTutorialState();
  }

  /**
   * Show a specific tooltip step
   */
  function showTooltipStep(step: TooltipStep) {
    if (!tutorialEnabled.value) return;

    activeTooltip.value = step;
    showTooltip.value = true;
  }

  /**
   * Show next tooltip in sequence
   */
  function showNextTooltip() {
    const next = nextStep.value;
    if (next) {
      showTooltipStep(next);
    } else {
      hideTooltip();
    }
  }

  /**
   * Hide current tooltip
   */
  function hideTooltip() {
    showTooltip.value = false;
    activeTooltip.value = null;
  }

  /**
   * Mark a step as completed
   */
  function markStepComplete(stepId: string) {
    completedSteps.value.add(stepId);
    saveTutorialState();

    // Auto-show next tooltip after completing current
    if (tutorialEnabled.value) {
      setTimeout(() => {
        showNextTooltip();
      }, 500);
    }
  }

  /**
   * Complete current tooltip step
   */
  function completeCurrentStep() {
    if (activeTooltip.value) {
      markStepComplete(activeTooltip.value.id);
      hideTooltip();
    }
  }

  /**
   * Reset tutorial progress
   */
  function resetTutorial() {
    hasSeenWelcome.value = false;
    completedSteps.value.clear();
    currentStepIndex.value = 0;
    tutorialEnabled.value = true;
    showWelcomeModal.value = false;
    showTooltip.value = false;
    activeTooltip.value = null;
    saveTutorialState();
  }

  /**
   * Disable tutorial
   */
  function disableTutorial() {
    tutorialEnabled.value = false;
    showTooltip.value = false;
    activeTooltip.value = null;
    saveTutorialState();
  }

  /**
   * Enable tutorial
   */
  function enableTutorial() {
    tutorialEnabled.value = true;
    saveTutorialState();
  }

  /**
   * Get all tutorial steps
   */
  function getAllSteps(): TooltipStep[] {
    return TUTORIAL_STEPS;
  }

  /**
   * Get step by ID
   */
  function getStepById(id: string): TooltipStep | undefined {
    return TUTORIAL_STEPS.find(s => s.id === id);
  }

  /**
   * Trigger tooltip by event condition
   */
  function triggerByEvent(eventType: string) {
    if (!tutorialEnabled.value) return;

    const step = TUTORIAL_STEPS.find(
      s => s.trigger === 'event' &&
           s.triggerCondition === eventType &&
           !completedSteps.value.has(s.id)
    );

    if (step) {
      showTooltipStep(step);
    }
  }

  /**
   * Trigger tooltip by tick number
   */
  function triggerByTick(currentTick: number) {
    if (!tutorialEnabled.value) return;

    const step = TUTORIAL_STEPS.find(
      s => s.trigger === 'tick' &&
           s.triggerCondition &&
           currentTick >= parseInt(s.triggerCondition) &&
           !completedSteps.value.has(s.id)
    );

    if (step) {
      showTooltipStep(step);
    }
  }

  /**
   * Save tutorial state to localStorage
   */
  function saveTutorialState() {
    const state = {
      hasSeenWelcome: hasSeenWelcome.value,
      tutorialEnabled: tutorialEnabled.value,
      completedSteps: Array.from(completedSteps.value),
      currentStepIndex: currentStepIndex.value
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save tutorial state:', e);
    }
  }

  /**
   * Export state for persistence
   */
  function exportState() {
    return {
      hasSeenWelcome: hasSeenWelcome.value,
      tutorialEnabled: tutorialEnabled.value,
      completedSteps: Array.from(completedSteps.value),
      currentStepIndex: currentStepIndex.value
    };
  }

  /**
   * Import state from persistence
   */
  function importState(state: any) {
    if (state.hasSeenWelcome !== undefined) hasSeenWelcome.value = state.hasSeenWelcome;
    if (state.tutorialEnabled !== undefined) tutorialEnabled.value = state.tutorialEnabled;
    if (state.completedSteps) completedSteps.value = new Set(state.completedSteps);
    if (state.currentStepIndex !== undefined) currentStepIndex.value = state.currentStepIndex;
  }

  return {
    // State
    hasSeenWelcome,
    showWelcomeModal,
    tutorialEnabled,
    completedSteps,
    currentStepIndex,
    activeTooltip,
    showTooltip,

    // Computed
    tutorialProgress,
    tutorialComplete,
    nextStep,

    // Methods
    initializeTutorial,
    showWelcome,
    startTutorial,
    skipTutorial,
    dismissWelcome,
    showTooltipStep,
    showNextTooltip,
    hideTooltip,
    markStepComplete,
    completeCurrentStep,
    resetTutorial,
    disableTutorial,
    enableTutorial,
    getAllSteps,
    getStepById,
    triggerByEvent,
    triggerByTick,
    saveTutorialState,
    exportState,
    importState
  };
});
