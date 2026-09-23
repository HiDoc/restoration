/**
 * InterventionManager - cooldowns for player interventions.
 * Planting and collecting are limited by seeds in hand instead; the environmental interventions by cooldown.
 */

export type InterventionType = 'plant' | 'collect' | 'irrigate' | 'cleanse' | 'hybridize' | 'ritual';

export interface InterventionDefinition {
  id: InterventionType;
  name: string;
  description: string;
  cooldownTicks: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface InterventionUsage {
  type: InterventionType;
  tick: number;
  chunkId: string;
}

export const INTERVENTION_DEFINITIONS: Record<InterventionType, InterventionDefinition> = {
  plant: { id: 'plant', name: 'Plant', description: 'Sow a seed from your pouch in the selected hex', cooldownTicks: 0 },
  collect: { id: 'collect', name: 'Collect seeds', description: 'Gather seed from ripe plants in the selected hex', cooldownTicks: 0 },
  irrigate: { id: 'irrigate', name: 'Irrigate', description: 'Increase moisture level in the selected chunk', cooldownTicks: 5 },
  cleanse: { id: 'cleanse', name: 'Cleanse Pollution', description: 'Reduce pollution level in the selected chunk', cooldownTicks: 8 },
  hybridize: { id: 'hybridize', name: 'Force Hybridization', description: 'Attempt to create a hybrid between two species', cooldownTicks: 20 },
  ritual: { id: 'ritual', name: 'Ecological Ritual', description: 'Advanced intervention with special effects', cooldownTicks: 50 },
};

export class InterventionManager {
  private usageHistory: InterventionUsage[] = [];
  private lastUsedTick = new Map<InterventionType, number>();

  validateIntervention(type: InterventionType, currentTick: number): ValidationResult {
    if (!INTERVENTION_DEFINITIONS[type]) return { valid: false, reason: 'Unknown intervention type' };
    const remaining = this.getRemainingCooldown(type, currentTick);
    return remaining > 0 ? { valid: false, reason: `Ready again in ${remaining} days` } : { valid: true };
  }

  recordUsage(type: InterventionType, tick: number, chunkId: string): void {
    this.lastUsedTick.set(type, tick);
    this.usageHistory.push({ type, tick, chunkId });
  }

  getRemainingCooldown(type: InterventionType, currentTick: number): number {
    const lastUsed = this.lastUsedTick.get(type);
    return lastUsed === undefined ? 0 : Math.max(0, INTERVENTION_DEFINITIONS[type].cooldownTicks - (currentTick - lastUsed));
  }

  isOnCooldown(type: InterventionType, currentTick: number): boolean {
    return this.getRemainingCooldown(type, currentTick) > 0;
  }

  getUsageStats(): { totalInterventions: number; byType: Partial<Record<InterventionType, number>> } {
    const byType: Partial<Record<InterventionType, number>> = {};
    for (const usage of this.usageHistory) byType[usage.type] = (byType[usage.type] ?? 0) + 1;
    return { totalInterventions: this.usageHistory.length, byType };
  }

  getDefinition(type: InterventionType): InterventionDefinition | undefined {
    return INTERVENTION_DEFINITIONS[type];
  }

  exportState() {
    return { usageHistory: this.usageHistory, lastUsedTick: Array.from(this.lastUsedTick.entries()) };
  }

  importState(state: any) {
    this.usageHistory = state.usageHistory || [];
    this.lastUsedTick = new Map(state.lastUsedTick || []);
  }
}
