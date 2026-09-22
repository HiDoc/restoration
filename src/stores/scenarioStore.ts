/**
 * Pinia store for scenario system
 * Manages reactive state for challenge scenarios and progression
 */

import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  ScenarioSystem,
  SCENARIOS,
  type ScenarioConfig,
  type ScenarioEvaluation,
  type ScenarioDifficulty
} from '@/simulation/ScenarioSystem';
import type { SimulationEngine } from '@/simulation/SimulationEngine';
import { useInterventionStore } from '@/stores/interventionStore';

/**
 * Scenario store - single source of truth for scenario state
 */
export const useScenarioStore = defineStore('scenario', () => {
  // Core system instance
  const system: Ref<ScenarioSystem | null> = ref(null);
  const engine: Ref<SimulationEngine | null> = ref(null);

  // State
  const activeScenario: Ref<ScenarioConfig | null> = ref(null);
  const scenarioStartTick = ref(0);
  const lastEvaluation: Ref<ScenarioEvaluation | null> = ref(null);

  // Completion state
  const scenarioCompleted = ref(false);
  const scenarioFailed = ref(false);
  const scenarioSuccess = ref(false);

  // UI state
  const showScenarioSelector = ref(false);
  const showCompletionModal = ref(false);

  // Computed
  const isInitialized = computed(() => system.value !== null);

  const hasActiveScenario = computed(() => activeScenario.value !== null);

  const availableScenarios = computed((): ScenarioConfig[] => {
    return SCENARIOS;
  });

  const completedScenarioIds = computed(() => {
    if (!system.value) return [];
    return system.value.getCompletedScenarios();
  });

  const timeRemaining = computed(() => {
    if (!system.value) return null;
    return system.value.getTimeRemaining();
  });

  const timeProgress = computed(() => {
    if (!system.value) return 0;
    return system.value.getTimeProgress();
  });

  const scenarioProgress = computed(() => {
    return lastEvaluation.value?.progress || 0;
  });

  const completionPercentage = computed(() => {
    if (availableScenarios.value.length === 0) return 0;
    return Math.round((completedScenarioIds.value.length / availableScenarios.value.length) * 100);
  });

  // Actions

  /**
   * Initialize scenario system
   */
  function initialize(simulationEngine: SimulationEngine) {
    engine.value = simulationEngine;
    system.value = new ScenarioSystem(simulationEngine);
  }

  /**
   * Start a scenario
   */
  function startScenario(scenarioId: string): boolean {
    if (!system.value) {
      console.error('Scenario system not initialized');
      return false;
    }

    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      console.error(`Scenario ${scenarioId} not found`);
      return false;
    }

    const success = system.value.startScenario(scenarioId);
    if (success) {
      useInterventionStore().resourcePoints = scenario.initialConditions.startingPoints;
      activeScenario.value = scenario;
      scenarioStartTick.value = engine.value?.getCurrentTick() || 0;
      scenarioCompleted.value = false;
      scenarioFailed.value = false;
      scenarioSuccess.value = false;
      lastEvaluation.value = null;
      showScenarioSelector.value = false;
    }

    return success;
  }

  /**
   * Evaluate scenario progress
   */
  function evaluateScenario(completedGoalIds: string[]): ScenarioEvaluation {
    if (!system.value || !activeScenario.value) {
      return { success: false, failure: false, progress: 0 };
    }
    if (scenarioCompleted.value || scenarioFailed.value) {
      return lastEvaluation.value ?? {
        success: scenarioSuccess.value,
        failure: scenarioFailed.value,
        progress: 1,
      };
    }

    const evaluation = system.value.evaluateScenario(completedGoalIds);
    lastEvaluation.value = evaluation;

    // Check for completion or failure
    if (evaluation.success && !scenarioCompleted.value) {
      onScenarioSuccess(activeScenario.value);
    } else if (evaluation.failure && !scenarioFailed.value) {
      onScenarioFailure(activeScenario.value);
    }

    return evaluation;
  }

  /**
   * Handle scenario success
   */
  function onScenarioSuccess(scenario: ScenarioConfig): void {
    const firstClear = !system.value?.isScenarioCompleted(scenario.id);
    scenarioSuccess.value = true;
    scenarioCompleted.value = true;
    showCompletionModal.value = true;

    console.log(`Scenario completed: ${scenario.name} (+${scenario.rewardPoints} points)`);

    // Mark as completed in system
    if (system.value) {
      system.value.completeScenario(true);
    }
    if (firstClear) useInterventionStore().addPoints(scenario.rewardPoints);
  }

  /**
   * Handle scenario failure
   */
  function onScenarioFailure(scenario: ScenarioConfig): void {
    scenarioFailed.value = true;
    scenarioCompleted.value = true;
    showCompletionModal.value = true;

    console.log(`Scenario failed: ${scenario.name}`);

    // Mark as incomplete in system
    if (system.value) {
      system.value.completeScenario(false);
    }
  }

  /**
   * End current scenario
   */
  function endScenario(): void {
    if (system.value) {
      system.value.completeScenario(scenarioSuccess.value);
    }

    activeScenario.value = null;
    scenarioStartTick.value = 0;
    lastEvaluation.value = null;
    scenarioCompleted.value = false;
    scenarioFailed.value = false;
    scenarioSuccess.value = false;
  }

  /**
   * Abandon current scenario
   */
  function abandonScenario(): void {
    if (system.value) {
      system.value.completeScenario(false);
    }
    endScenario();
  }

  /**
   * Show scenario selector
   */
  function openScenarioSelector(): void {
    showScenarioSelector.value = true;
  }

  /**
   * Hide scenario selector
   */
  function closeScenarioSelector(): void {
    showScenarioSelector.value = false;
  }

  /**
   * Dismiss completion modal
   */
  function dismissCompletionModal(): void {
    showCompletionModal.value = false;
  }

  /**
   * Get scenarios by difficulty
   */
  function getScenariosByDifficulty(difficulty: ScenarioDifficulty): ScenarioConfig[] {
    return ScenarioSystem.getScenariosByDifficulty(difficulty);
  }

  /**
   * Get scenario by ID
   */
  function getScenarioById(id: string): ScenarioConfig | undefined {
    return ScenarioSystem.getScenarioById(id);
  }

  /**
   * Check if scenario is completed
   */
  function isScenarioCompleted(scenarioId: string): boolean {
    if (!system.value) return false;
    return system.value.isScenarioCompleted(scenarioId);
  }

  /**
   * Get total points from completed scenarios
   */
  const totalPointsFromScenarios = computed(() => {
    return completedScenarioIds.value.reduce((sum, id) => {
      const scenario = SCENARIOS.find(s => s.id === id);
      return sum + (scenario?.rewardPoints || 0);
    }, 0);
  });

  /**
   * Export state for persistence
   */
  function exportState() {
    return {
      activeScenario: activeScenario.value,
      scenarioStartTick: scenarioStartTick.value,
      scenarioCompleted: scenarioCompleted.value,
      scenarioFailed: scenarioFailed.value,
      scenarioSuccess: scenarioSuccess.value,
      lastEvaluation: lastEvaluation.value,
      systemState: system.value?.exportState()
    };
  }

  /**
   * Import state from persistence
   */
  function importState(state: any) {
    if (state.activeScenario !== undefined) activeScenario.value = state.activeScenario;
    lastEvaluation.value = state.lastEvaluation ?? null;
    showCompletionModal.value = false;
    if (state.scenarioStartTick !== undefined) scenarioStartTick.value = state.scenarioStartTick;
    if (state.scenarioCompleted !== undefined) scenarioCompleted.value = state.scenarioCompleted;
    if (state.scenarioFailed !== undefined) scenarioFailed.value = state.scenarioFailed;
    if (state.scenarioSuccess !== undefined) scenarioSuccess.value = state.scenarioSuccess;
    if (state.systemState && system.value) {
      system.value.importState(state.systemState);
    }
  }

  /**
   * Reset scenario system
   */
  function reset() {
    activeScenario.value = null;
    scenarioStartTick.value = 0;
    lastEvaluation.value = null;
    scenarioCompleted.value = false;
    scenarioFailed.value = false;
    scenarioSuccess.value = false;
    showScenarioSelector.value = false;
    showCompletionModal.value = false;
  }

  return {
    // State
    system,
    engine,
    activeScenario,
    scenarioStartTick,
    lastEvaluation,
    scenarioCompleted,
    scenarioFailed,
    scenarioSuccess,
    showScenarioSelector,
    showCompletionModal,

    // Computed
    isInitialized,
    hasActiveScenario,
    availableScenarios,
    completedScenarioIds,
    timeRemaining,
    timeProgress,
    scenarioProgress,
    completionPercentage,
    totalPointsFromScenarios,

    // Methods
    initialize,
    startScenario,
    evaluateScenario,
    onScenarioSuccess,
    onScenarioFailure,
    endScenario,
    abandonScenario,
    openScenarioSelector,
    closeScenarioSelector,
    dismissCompletionModal,
    getScenariosByDifficulty,
    getScenarioById,
    isScenarioCompleted,
    exportState,
    importState,
    reset
  };
});
