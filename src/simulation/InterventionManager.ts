/**
 * InterventionManager - Manages player interventions with cost and cooldown mechanics
 * Provides validation, cost calculation, and usage tracking for ecosystem interventions
 */

export type InterventionType = 'plant' | 'irrigate' | 'cleanse' | 'hybridize' | 'ritual';

export interface InterventionDefinition {
  id: InterventionType;
  name: string;
  description: string;
  baseCost: number;
  cooldownTicks: number;
  icon: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  cost?: number;
}

export interface InterventionUsage {
  type: InterventionType;
  tick: number;
  chunkId: string;
  cost: number;
}

/**
 * Intervention definitions with base costs and cooldowns
 */
export const INTERVENTION_DEFINITIONS: Record<InterventionType, InterventionDefinition> = {
  plant: {
    id: 'plant',
    name: 'Plant Species',
    description: 'Introduce a new species instance to the selected chunk',
    baseCost: 20,
    cooldownTicks: 10,
    icon: '🌱'
  },
  irrigate: {
    id: 'irrigate',
    name: 'Irrigate',
    description: 'Increase moisture level in the selected chunk',
    baseCost: 15,
    cooldownTicks: 5,
    icon: '💧'
  },
  cleanse: {
    id: 'cleanse',
    name: 'Cleanse Pollution',
    description: 'Reduce pollution level in the selected chunk',
    baseCost: 25,
    cooldownTicks: 8,
    icon: '🧹'
  },
  hybridize: {
    id: 'hybridize',
    name: 'Force Hybridization',
    description: 'Attempt to create a hybrid between two species',
    baseCost: 50,
    cooldownTicks: 20,
    icon: '🧬'
  },
  ritual: {
    id: 'ritual',
    name: 'Ecological Ritual',
    description: 'Advanced intervention with special effects',
    baseCost: 100,
    cooldownTicks: 50,
    icon: '✨'
  }
};

export class InterventionManager {
  private usageHistory: InterventionUsage[] = [];
  private lastUsedTick: Map<InterventionType, number> = new Map();
  private difficulty: 'easy' | 'normal' | 'hard';

  constructor(difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    this.difficulty = difficulty;
  }

  /**
   * Validate if an intervention can be executed
   */
  validateIntervention(
    type: InterventionType,
    resourcePoints: number,
    currentTick: number
  ): ValidationResult {
    const definition = INTERVENTION_DEFINITIONS[type];
    if (!definition) {
      return { valid: false, reason: 'Unknown intervention type' };
    }

    // Check cost
    const cost = this.calculateCost(type);
    if (resourcePoints < cost) {
      return {
        valid: false,
        reason: `Insufficient points (need ${cost}, have ${resourcePoints})`
      };
    }

    // Check cooldown
    const lastUsed = this.lastUsedTick.get(type);
    if (lastUsed !== undefined) {
      const ticksSinceLastUse = currentTick - lastUsed;
      if (ticksSinceLastUse < definition.cooldownTicks) {
        const remaining = definition.cooldownTicks - ticksSinceLastUse;
        return {
          valid: false,
          reason: `On cooldown (${remaining} ticks remaining)`
        };
      }
    }

    return { valid: true, cost };
  }

  /**
   * Calculate intervention cost based on difficulty
   */
  calculateCost(type: InterventionType): number {
    const definition = INTERVENTION_DEFINITIONS[type];
    const baseCost = definition.baseCost;

    switch (this.difficulty) {
      case 'easy':
        return Math.floor(baseCost * 0.75); // 25% discount
      case 'hard':
        return Math.floor(baseCost * 1.5); // 50% premium
      default:
        return baseCost;
    }
  }

  /**
   * Record intervention usage
   */
  recordUsage(type: InterventionType, tick: number, chunkId: string, cost: number): void {
    this.lastUsedTick.set(type, tick);
    this.usageHistory.push({ type, tick, chunkId, cost });
  }

  /**
   * Get remaining cooldown ticks for an intervention
   */
  getRemainingCooldown(type: InterventionType, currentTick: number): number {
    const definition = INTERVENTION_DEFINITIONS[type];
    const lastUsed = this.lastUsedTick.get(type);

    if (lastUsed === undefined) {
      return 0; // Never used
    }

    const ticksSinceLastUse = currentTick - lastUsed;
    const remaining = definition.cooldownTicks - ticksSinceLastUse;
    return Math.max(0, remaining);
  }

  /**
   * Check if intervention is on cooldown
   */
  isOnCooldown(type: InterventionType, currentTick: number): boolean {
    return this.getRemainingCooldown(type, currentTick) > 0;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalInterventions: number;
    totalCost: number;
    byType: Record<InterventionType, number>;
  } {
    const byType: Record<string, number> = {};
    let totalCost = 0;

    for (const usage of this.usageHistory) {
      byType[usage.type] = (byType[usage.type] || 0) + 1;
      totalCost += usage.cost;
    }

    return {
      totalInterventions: this.usageHistory.length,
      totalCost,
      byType: byType as Record<InterventionType, number>
    };
  }

  /**
   * Get all intervention definitions
   */
  getAllDefinitions(): InterventionDefinition[] {
    return Object.values(INTERVENTION_DEFINITIONS);
  }

  /**
   * Get specific intervention definition
   */
  getDefinition(type: InterventionType): InterventionDefinition | undefined {
    return INTERVENTION_DEFINITIONS[type];
  }

  /**
   * Export state for save/load
   */
  exportState() {
    return {
      usageHistory: this.usageHistory,
      lastUsedTick: Array.from(this.lastUsedTick.entries()),
      difficulty: this.difficulty
    };
  }

  /**
   * Import state from save
   */
  importState(state: any) {
    this.usageHistory = state.usageHistory || [];
    this.lastUsedTick = new Map(state.lastUsedTick || []);
    this.difficulty = state.difficulty || 'normal';
  }
}
