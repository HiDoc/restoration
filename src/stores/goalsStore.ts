/**
 * Pinia store for goals system
 * Manages reactive state for ecosystem goals and player progression
 */

import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  GoalsSystem,
  ALL_GOALS,
  type Goal,
  type GoalProgress,
  type GoalDifficulty,
  type GoalCategory
} from '@/simulation/GoalsSystem';
import type { SimulationEngine } from '@/simulation/SimulationEngine';
import type { ResearchSystem } from '@/simulation/ResearchSystem';

/**
 * Goals store - single source of truth for goal state
 */
export const useGoalsStore = defineStore('goals', () => {
  // Core system instance
  const system: Ref<GoalsSystem | null> = ref(null);
  const engine: Ref<SimulationEngine | null> = ref(null);

  // State
  const activeGoalIds = ref<string[]>([]);
  const difficulty: Ref<GoalDifficulty> = ref('normal');
  const totalPointsAwarded = ref(0);
  const lastEvaluationTick = ref(0);

  // UI state
  const showGoalCompletionModal = ref(false);
  const latestCompletedGoal: Ref<Goal | null> = ref(null);

  // Computed getters
  const isInitialized = computed(() => system.value !== null);

  const activeGoals = computed((): GoalProgress[] => {
    if (!system.value) return [];
    return system.value.getActiveGoals();
  });

  const completedGoals = computed(() => {
    return activeGoals.value.filter(g => g.completed);
  });

  const incompleteGoals = computed(() => {
    return activeGoals.value.filter(g => !g.completed);
  });

  const overallProgress = computed(() => {
    const goals = activeGoals.value;
    if (goals.length === 0) return 0;

    const totalProgress = goals.reduce((sum, g) => sum + g.progress, 0);
    return totalProgress / goals.length;
  });

  const completionCount = computed(() => completedGoals.value.length);

  const totalGoalCount = computed(() => activeGoals.value.length);

  const completionPercentage = computed(() => {
    if (totalGoalCount.value === 0) return 0;
    return Math.round((completionCount.value / totalGoalCount.value) * 100);
  });

  /**
   * Get goals grouped by category
   */
  const goalsByCategory = computed(() => {
    const grouped: Record<GoalCategory, GoalProgress[]> = {
      biodiversity: [],
      ecosystem_health: [],
      research: [],
      succession: [],
      pollution: []
    };

    for (const goalProgress of activeGoals.value) {
      grouped[goalProgress.goal.category].push(goalProgress);
    }

    return grouped;
  });

  // Actions

  /**
   * Initialize the goals system
   */
  function initialize(
    simulationEngine: SimulationEngine,
    gameDifficulty: GoalDifficulty = 'normal',
    researchSystem?: ResearchSystem
  ) {
    engine.value = simulationEngine;
    difficulty.value = gameDifficulty;
    system.value = new GoalsSystem(simulationEngine, researchSystem);

    // Set starter goals
    const starterGoals = GoalsSystem.getStarterGoals();
    const goalIds = starterGoals.map(g => g.id);
    activeGoalIds.value = goalIds;
    system.value.setActiveGoals(goalIds);
  }

  /**
   * Evaluate all goals and check for completions
   */
  function evaluateGoals(currentTick: number): GoalProgress[] {
    if (!system.value) return [];

    const previousStates = new Map(
      activeGoals.value.map(g => [g.goal.id, g.completed])
    );

    const results = system.value.evaluateGoals(currentTick);
    lastEvaluationTick.value = currentTick;

    // Check for new completions
    for (const result of results) {
      const wasCompleted = previousStates.get(result.goal.id);
      if (result.completed && !wasCompleted) {
        onGoalCompleted(result.goal, result.goal.rewardPoints);
      }
    }

    return results;
  }

  /**
   * Handle goal completion
   */
  function onGoalCompleted(goal: Goal, points: number): void {
    totalPointsAwarded.value += points;
    latestCompletedGoal.value = goal;

    // Could trigger modal or notification
    console.log(`Goal completed: ${goal.title} (+${points} points)`);

    // Emit event for other systems (e.g., award points to intervention store)
  }

  /**
   * Add a new goal to active goals
   */
  function addGoal(goalId: string): boolean {
    if (!system.value) return false;

    const success = system.value.addGoal(goalId);
    if (success) {
      activeGoalIds.value.push(goalId);
    }
    return success;
  }

  /**
   * Set custom active goals
   */
  function setActiveGoals(goalIds: string[]): void {
    if (!system.value) return;

    activeGoalIds.value = goalIds;
    system.value.setActiveGoals(goalIds);
  }

  /**
   * Get available goals for difficulty
   */
  function getGoalsForDifficulty(diff: GoalDifficulty): Goal[] {
    return GoalsSystem.getGoalsForDifficulty(diff);
  }

  /**
   * Get all available goals
   */
  function getAllGoals(): Goal[] {
    return ALL_GOALS;
  }

  /**
   * Get goal by ID
   */
  function getGoalById(id: string): Goal | undefined {
    return ALL_GOALS.find(g => g.id === id);
  }

  /**
   * Check if a goal is completed
   */
  function isGoalCompleted(goalId: string): boolean {
    if (!system.value) return false;
    return system.value.isGoalCompleted(goalId);
  }

  /**
   * Get total points from completed goals
   */
  const totalPointsFromGoals = computed(() => {
    return completedGoals.value.reduce((sum, g) => sum + g.goal.rewardPoints, 0);
  });

  /**
   * Show goal completion modal
   */
  function showCompletionModal(goal: Goal): void {
    latestCompletedGoal.value = goal;
    showGoalCompletionModal.value = true;
  }

  /**
   * Dismiss goal completion modal
   */
  function dismissCompletionModal(): void {
    showGoalCompletionModal.value = false;
    latestCompletedGoal.value = null;
  }

  /**
   * Export state for persistence
   */
  function exportState() {
    return {
      activeGoalIds: activeGoalIds.value,
      difficulty: difficulty.value,
      totalPointsAwarded: totalPointsAwarded.value,
      lastEvaluationTick: lastEvaluationTick.value,
      systemState: system.value?.exportState()
    };
  }

  /**
   * Import state from persistence
   */
  function importState(state: any) {
    if (state.activeGoalIds) activeGoalIds.value = state.activeGoalIds;
    if (state.difficulty) difficulty.value = state.difficulty;
    if (state.totalPointsAwarded !== undefined) totalPointsAwarded.value = state.totalPointsAwarded;
    if (state.lastEvaluationTick !== undefined) lastEvaluationTick.value = state.lastEvaluationTick;
    latestCompletedGoal.value = null;
    showGoalCompletionModal.value = false;
    if (state.systemState && system.value) {
      system.value.importState(state.systemState);
    }
  }

  /**
   * Reset goals system
   */
  function reset() {
    activeGoalIds.value = [];
    totalPointsAwarded.value = 0;
    lastEvaluationTick.value = 0;
    showGoalCompletionModal.value = false;
    latestCompletedGoal.value = null;

    if (system.value && engine.value) {
      const starterGoals = GoalsSystem.getStarterGoals();
      const goalIds = starterGoals.map(g => g.id);
      activeGoalIds.value = goalIds;
      system.value.setActiveGoals(goalIds);
    }
  }

  return {
    // State
    system,
    engine,
    activeGoalIds,
    difficulty,
    totalPointsAwarded,
    lastEvaluationTick,
    showGoalCompletionModal,
    latestCompletedGoal,

    // Computed
    isInitialized,
    activeGoals,
    completedGoals,
    incompleteGoals,
    overallProgress,
    completionCount,
    totalGoalCount,
    completionPercentage,
    goalsByCategory,
    totalPointsFromGoals,

    // Methods
    initialize,
    evaluateGoals,
    onGoalCompleted,
    addGoal,
    setActiveGoals,
    getGoalsForDifficulty,
    getAllGoals,
    getGoalById,
    isGoalCompleted,
    showCompletionModal,
    dismissCompletionModal,
    exportState,
    importState,
    reset
  };
});
