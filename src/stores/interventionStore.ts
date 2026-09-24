/**
 * Pinia store for player interventions: the seed pouch, the armed intervention and cooldowns.
 */

import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { InterventionManager, type InterventionType } from '@/simulation/InterventionManager';
import type { SimulationEngine, PlayerIntervention } from '@/simulation/SimulationEngine';
import { speciesInfo } from '@/game/speciesInfo';

export const useInterventionStore = defineStore('intervention', () => {
  const manager: Ref<InterventionManager | null> = ref(null);
  const engine: Ref<SimulationEngine | null> = ref(null);

  /** Seeds in hand per species, mirrored from the engine after every change. */
  const seeds = ref<Record<string, number>>({});
  const selectedIntervention: Ref<InterventionType | null> = ref(null);
  const selectedPlantSpecies = ref('');
  const actionMessage = ref('');
  const observedTick = ref(0);
  let engineVersion = 0;

  function refreshSeeds() {
    seeds.value = { ...(engine.value?.getInventory() ?? {}) };
    if (!seeds.value[selectedPlantSpecies.value]) selectedPlantSpecies.value = Object.keys(seeds.value)[0] ?? '';
  }

  function isOnCooldown(type: InterventionType): boolean {
    return manager.value?.isOnCooldown(type, observedTick.value) ?? false;
  }

  function getRemainingCooldown(type: InterventionType): number {
    return manager.value?.getRemainingCooldown(type, observedTick.value) ?? 0;
  }

  function initialize(simulationEngine: SimulationEngine) {
    const version = ++engineVersion;
    engine.value = simulationEngine;
    observedTick.value = simulationEngine.getCurrentTick();
    simulationEngine.onTick(tick => {
      if (version === engineVersion) observedTick.value = tick;
    });
    manager.value = new InterventionManager();
    simulationEngine.interventionManager = manager.value;
    refreshSeeds();
  }

  /** The pouch the player carried in from another site replaces this world's. */
  function carryPouch(pouch: unknown[]) {
    engine.value?.importPouch(pouch);
    refreshSeeds();
  }

  /** Seeds for the pouch: the starter packet and rewards. */
  function addSeeds(counts: Record<string, number>) {
    engine.value?.addSeeds(counts);
    refreshSeeds();
  }

  function collectedMessage(before: Record<string, number>): string {
    const gained = Object.entries(seeds.value)
      .filter(([id, count]) => count > (before[id] ?? 0))
      .map(([id, count]) => `${count - (before[id] ?? 0)} ${speciesInfo(id).name}`);
    return `Collected ${gained.join(', ')} seed.`;
  }

  /** Why an intervention the engine accepted in principle did not take in that hex. */
  function failureMessage(intervention: PlayerIntervention): string {
    if (intervention.type === 'collect') return 'Nothing ripe to collect here yet.';
    if (intervention.type === 'cross') return 'No open flower of that plant is left to pollinate here.';
    if (intervention.type === 'plant') {
      return seeds.value[intervention.data?.speciesId] ? 'There is no room for another plant here.' : 'You have no seeds of that species.';
    }
    return 'This intervention could not be applied there. Choose another hex.';
  }

  function executeIntervention(intervention: PlayerIntervention): boolean {
    if (!manager.value || !engine.value) return false;
    const validation = manager.value.validateIntervention(intervention.type, observedTick.value);
    if (!validation.valid) {
      actionMessage.value = validation.reason ?? 'This intervention is not available yet.';
      return false;
    }
    const before = seeds.value;
    const success = engine.value.executeIntervention(intervention);
    refreshSeeds();
    if (!success) {
      actionMessage.value = failureMessage(intervention);
      return false;
    }
    manager.value.recordUsage(intervention.type, observedTick.value, intervention.chunkId);
    if (intervention.type !== 'plant' || !seeds.value[intervention.data?.speciesId]) selectedIntervention.value = null;
    actionMessage.value =
      intervention.type === 'collect' ? collectedMessage(before)
      : intervention.type === 'plant' ? `Planted ${speciesInfo(intervention.data.speciesId).name}.`
      : intervention.type === 'cross'
        ? `${speciesInfo(intervention.data.receiver).name} carries ${speciesInfo(intervention.data.donor).name} pollen. Collect its seed when it ripens.`
      : `${manager.value.getDefinition(intervention.type)?.name ?? 'Intervention'} applied.`;
    return true;
  }

  function selectIntervention(type: InterventionType | null): void {
    selectedIntervention.value = type;
  }

  function exportState() {
    return { selectedPlantSpecies: selectedPlantSpecies.value, managerState: manager.value?.exportState() };
  }

  /** The pouch itself is saved with the Rust world; this restores cooldowns and the chosen species. */
  function importState(state: any) {
    observedTick.value = engine.value?.getCurrentTick() ?? 0;
    selectedIntervention.value = null;
    actionMessage.value = '';
    if (state?.selectedPlantSpecies) selectedPlantSpecies.value = state.selectedPlantSpecies;
    if (state?.managerState && manager.value) manager.value.importState(state.managerState);
    refreshSeeds();
  }

  function reset() {
    seeds.value = {};
    selectedIntervention.value = null;
    selectedPlantSpecies.value = '';
    actionMessage.value = '';
  }

  return {
    manager,
    engine,
    seeds,
    selectedIntervention,
    selectedPlantSpecies,
    actionMessage,
    isOnCooldown,
    getRemainingCooldown,
    initialize,
    addSeeds,
    carryPouch,
    executeIntervention,
    selectIntervention,
    exportState,
    importState,
    reset,
  };
});
