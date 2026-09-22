/**
 * Pinia store for intervention system
 * Manages reactive state for player interventions, resource points, and cooldowns
 */

import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import {
  InterventionManager,
  type InterventionType
} from '@/simulation/InterventionManager';
import type { SimulationEngine } from '@/simulation/SimulationEngine';
import type { PlayerIntervention } from '@/simulation/SimulationEngine';

/**
 * Intervention store - single source of truth for intervention state
 */
export const useInterventionStore = defineStore('intervention', () => {
  // Core system instance
  const manager: Ref<InterventionManager | null> = ref(null);
  const engine: Ref<SimulationEngine | null> = ref(null);

  // Resource state
  const resourcePoints = ref(100); // Starting points
  const totalPointsEarned = ref(0);
  const totalPointsSpent = ref(0);

  // UI state
  const selectedIntervention: Ref<InterventionType | null> = ref(null);
  const selectedPlantSpecies = ref('common_grass');
  const actionMessage = ref('');
  const observedTick = ref(0);
  let engineVersion = 0;
  const pendingIntervention: Ref<{ type: InterventionType; chunkId: string } | null> = ref(null);

  // Computed getters
  const isInitialized = computed(() => manager.value !== null && engine.value !== null);

  const currentTick = computed(() => observedTick.value);

  const availableInterventions = computed(() => {
    if (!manager.value) return [];
    return manager.value.getAllDefinitions();
  });

  /**
   * Check if player can afford an intervention
   */
  function canAfford(type: InterventionType): boolean {
    if (!manager.value) return false;
    const cost = manager.value.calculateCost(type);
    return resourcePoints.value >= cost;
  }

  /**
   * Check if intervention is on cooldown
   */
  function isOnCooldown(type: InterventionType): boolean {
    if (!manager.value) return false;
    return manager.value.isOnCooldown(type, currentTick.value);
  }

  /**
   * Get remaining cooldown ticks
   */
  function getRemainingCooldown(type: InterventionType): number {
    if (!manager.value) return 0;
    return manager.value.getRemainingCooldown(type, currentTick.value);
  }

  /**
   * Get intervention cost
   */
  function getCost(type: InterventionType): number {
    if (!manager.value) return 0;
    return manager.value.calculateCost(type);
  }

  /**
   * Check if intervention can be executed
   */
  function canExecute(type: InterventionType): boolean {
    if (!manager.value) return false;
    const validation = manager.value.validateIntervention(
      type,
      resourcePoints.value,
      currentTick.value
    );
    return validation.valid;
  }

  /**
   * Get validation result with reason
   */
  function getValidation(type: InterventionType) {
    if (!manager.value) {
      return { valid: false, reason: 'System not initialized' };
    }
    return manager.value.validateIntervention(
      type,
      resourcePoints.value,
      currentTick.value
    );
  }

  // Actions

  /**
   * Initialize the intervention system
   */
  function initialize(simulationEngine: SimulationEngine, difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    const version = ++engineVersion;
    engine.value = simulationEngine;
    observedTick.value = simulationEngine.getCurrentTick();
    simulationEngine.onTick(tick => {
      if (version === engineVersion) observedTick.value = tick;
    });
    manager.value = new InterventionManager(difficulty);

    // Set intervention manager on engine
    simulationEngine.interventionManager = manager.value;
  }

  /**
   * Execute an intervention
   */
  async function executeIntervention(intervention: PlayerIntervention): Promise<boolean> {
    if (!manager.value || !engine.value) {
      console.error('Intervention system not initialized');
      return false;
    }

    // Validate intervention
    const validation = manager.value.validateIntervention(
      intervention.type,
      resourcePoints.value,
      currentTick.value
    );

    if (!validation.valid) {
      actionMessage.value = validation.reason || 'This intervention is not available yet.';
      console.warn('Intervention validation failed:', validation.reason);
      return false;
    }

    // Execute through engine
    const success = engine.value.executeIntervention(intervention);

    if (success && validation.cost !== undefined) {
      // Deduct cost
      resourcePoints.value -= validation.cost;
      totalPointsSpent.value += validation.cost;

      // Record usage
      manager.value.recordUsage(
        intervention.type,
        currentTick.value,
        intervention.chunkId,
        validation.cost
      );

      // Clear selection
      selectedIntervention.value = null;
      pendingIntervention.value = null;
      actionMessage.value = `${manager.value.getDefinition(intervention.type)?.name ?? 'Intervention'} applied. ${validation.cost} points used.`;
    } else if (!success) {
      actionMessage.value = 'This intervention could not be applied to that chunk. Choose another location.';
    }

    return success;
  }

  /**
   * Add resource points (from goal completion, etc.)
   */
  function addPoints(amount: number): void {
    resourcePoints.value += amount;
    totalPointsEarned.value += amount;
  }

  /**
   * Deduct resource points
   */
  function deductPoints(amount: number): void {
    resourcePoints.value = Math.max(0, resourcePoints.value - amount);
  }

  /**
   * Select an intervention for targeting
   */
  function selectIntervention(type: InterventionType | null): void {
    selectedIntervention.value = type;
  }

  /**
   * Set pending intervention with target chunk
   */
  function setPendingIntervention(type: InterventionType, chunkId: string): void {
    pendingIntervention.value = { type, chunkId };
  }

  /**
   * Clear pending intervention
   */
  function clearPendingIntervention(): void {
    pendingIntervention.value = null;
  }

  /**
   * Get usage statistics
   */
  const usageStats = computed(() => {
    if (!manager.value) {
      return {
        totalInterventions: 0,
        totalCost: 0,
        byType: {} as Record<InterventionType, number>
      };
    }
    return manager.value.getUsageStats();
  });

  /**
   * Export state for persistence
   */
  function exportState() {
    return {
      resourcePoints: resourcePoints.value,
      totalPointsEarned: totalPointsEarned.value,
      totalPointsSpent: totalPointsSpent.value,
      selectedPlantSpecies: selectedPlantSpecies.value,
      managerState: manager.value?.exportState()
    };
  }

  /**
   * Import state from persistence
   */
  function importState(state: any) {
    observedTick.value = engine.value?.getCurrentTick() ?? 0;
    selectedIntervention.value = null;
    pendingIntervention.value = null;
    actionMessage.value = '';
    if (state.resourcePoints !== undefined) resourcePoints.value = state.resourcePoints;
    if (state.totalPointsEarned !== undefined) totalPointsEarned.value = state.totalPointsEarned;
    if (state.totalPointsSpent !== undefined) totalPointsSpent.value = state.totalPointsSpent;
    if (state.selectedPlantSpecies) selectedPlantSpecies.value = state.selectedPlantSpecies;
    if (state.managerState && manager.value) {
      manager.value.importState(state.managerState);
    }
  }

  /**
   * Reset intervention system
   */
  function reset() {
    resourcePoints.value = 100;
    totalPointsEarned.value = 0;
    totalPointsSpent.value = 0;
    selectedIntervention.value = null;
    selectedPlantSpecies.value = 'common_grass';
    actionMessage.value = '';
    pendingIntervention.value = null;
    if (manager.value) {
      manager.value = new InterventionManager();
    }
  }

  return {
    // State
    manager,
    engine,
    resourcePoints,
    totalPointsEarned,
    totalPointsSpent,
    selectedIntervention,
    selectedPlantSpecies,
    actionMessage,
    pendingIntervention,

    // Computed
    isInitialized,
    currentTick,
    availableInterventions,
    usageStats,

    // Methods
    canAfford,
    isOnCooldown,
    getRemainingCooldown,
    getCost,
    canExecute,
    getValidation,
    initialize,
    executeIntervention,
    addPoints,
    deductPoints,
    selectIntervention,
    setPendingIntervention,
    clearPendingIntervention,
    exportState,
    importState,
    reset
  };
});
