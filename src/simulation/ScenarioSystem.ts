/**
 * ScenarioSystem - Defines challenge scenarios with initial conditions and win/loss criteria
 * Provides structured gameplay with specific goals and constraints
 */

import type { SimulationEngine } from './SimulationEngine';

export type ScenarioDifficulty = 'easy' | 'normal' | 'hard';

export interface BiomeConditions {
  temperature?: number;
  moisture?: number;
  light?: number;
  nutrients?: number;
  pollution?: number;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  initialConditions: {
    biomeStates?: BiomeConditions;
    startingPoints: number;
    weatherPattern?: string;
    initialSpecies?: string[];
  };
  goalIds: string[]; // References to GoalsSystem goals
  timeLimit?: number; // ticks
  rewardPoints: number;
  successMessage: string;
  failureMessage?: string;
}

export interface ScenarioEvaluation {
  success: boolean;
  failure: boolean;
  progress: number; // 0-1
  message?: string;
}

/**
 * Scenario definitions
 */
export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'meadow_recovery',
    name: 'Meadow Recovery',
    description: 'A degraded grassland needs restoration. Bring life back to this barren meadow by increasing moisture and establishing diverse plant species.',
    difficulty: 'easy',
    initialConditions: {
      biomeStates: {
        moisture: 0.2,
        pollution: 0.4,
        nutrients: 0.5
      },
      startingPoints: 200,
      initialSpecies: ['common_grass']
    },
    goalIds: ['diversity_5', 'health_60'],
    timeLimit: 500,
    rewardPoints: 150,
    successMessage: 'The meadow flourishes once again! Birds return and wildflowers bloom.',
    failureMessage: 'Time ran out before the ecosystem could recover.'
  },
  {
    id: 'pollution_cleanup',
    name: 'Toxic Cleanup',
    description: 'Industrial pollution has devastated this area. Cleanse the soil and rebuild a healthy ecosystem from the ashes.',
    difficulty: 'normal',
    initialConditions: {
      biomeStates: {
        pollution: 0.8,
        moisture: 0.3,
        nutrients: 0.2
      },
      startingPoints: 300,
      initialSpecies: ['common_grass']
    },
    goalIds: ['pollution_below_20', 'diversity_10', 'health_70'],
    timeLimit: 800,
    rewardPoints: 300,
    successMessage: 'The toxic wasteland transforms into thriving habitat. Nature reclaims the land.',
    failureMessage: 'Pollution levels remain too high for sustainable life.'
  },
  {
    id: 'drought_survival',
    name: 'Drought Survival',
    description: 'A severe drought threatens the ecosystem. Use your limited resources wisely to maintain biodiversity through harsh conditions.',
    difficulty: 'normal',
    initialConditions: {
      biomeStates: {
        moisture: 0.1,
        temperature: 30
      },
      startingPoints: 250,
      weatherPattern: 'drought',
      initialSpecies: ['common_grass', 'silver_birch', 'healing_fern']
    },
    goalIds: ['diversity_10', 'health_60'],
    timeLimit: 600,
    rewardPoints: 350,
    successMessage: 'Your careful management allows the ecosystem to endure the drought!',
    failureMessage: 'Too many species succumbed to the harsh conditions.'
  },
  {
    id: 'forest_succession',
    name: 'Forest Succession',
    description: 'Guide the natural progression from grassland to mature forest. Patience and strategic intervention required.',
    difficulty: 'hard',
    initialConditions: {
      biomeStates: {
        moisture: 0.6,
        nutrients: 0.7,
        light: 1.0
      },
      startingPoints: 400,
      initialSpecies: ['common_grass', 'silver_birch']
    },
    goalIds: ['diversity_15', 'forest_established', 'health_80'],
    timeLimit: 1500,
    rewardPoints: 500,
    successMessage: 'A magnificent forest stands where once was grassland. Succession complete!',
    failureMessage: 'The forest did not develop sufficient canopy layers.'
  },
  {
    id: 'biodiversity_challenge',
    name: 'Biodiversity Challenge',
    description: 'The ultimate test: maintain maximum biodiversity while keeping all species healthy. Balance is key.',
    difficulty: 'hard',
    initialConditions: {
      biomeStates: {
        moisture: 0.5,
        nutrients: 0.6,
        pollution: 0.1
      },
      startingPoints: 500,
      initialSpecies: ['common_grass', 'silver_birch', 'shadow_moss', 'healing_fern']
    },
    goalIds: ['diversity_20', 'health_90', 'pollution_below_10'],
    timeLimit: 2000,
    rewardPoints: 750,
    successMessage: 'An ecological masterpiece! Your ecosystem teems with life in perfect harmony.',
    failureMessage: 'Maintaining such high biodiversity proved too challenging.'
  },
  {
    id: 'quick_start',
    name: 'Quick Start',
    description: 'A short introductory scenario to learn the basics. Establish 2 different species in 300 days.',
    difficulty: 'easy',
    initialConditions: {
      biomeStates: {
        moisture: 0.5,
        nutrients: 0.6
      },
      startingPoints: 150,
      initialSpecies: ['common_grass']
    },
    goalIds: ['diversity_5'],
    timeLimit: 300,
    rewardPoints: 100,
    successMessage: 'Great start! You understand the basics of ecosystem management.',
    failureMessage: 'Keep trying! Use interventions to help species establish.'
  }
];

/**
 * ScenarioSystem class - manages scenario state and evaluation
 */
export class ScenarioSystem {
  private engine: SimulationEngine;
  private activeScenario: ScenarioConfig | null = null;
  private startTick = 0;
  private completedScenarios: Set<string> = new Set();

  constructor(engine: SimulationEngine) {
    this.engine = engine;
  }

  /**
   * Start a scenario
   */
  startScenario(scenarioId: string): boolean {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      console.error(`Scenario ${scenarioId} not found`);
      return false;
    }

    this.activeScenario = scenario;
    this.startTick = this.engine.getCurrentTick();

    // Apply initial conditions
    this.applyInitialConditions(scenario);

    return true;
  }

  /**
   * Apply scenario initial conditions to the engine
   */
  private applyInitialConditions(scenario: ScenarioConfig): void {
    // Use the engine's built-in method for applying conditions
    this.engine.applyScenarioConditions({
      biomeStates: scenario.initialConditions.biomeStates,
      clearSpecies: false,
      initialSpecies: scenario.initialConditions.initialSpecies
    });
  }

  /**
   * Evaluate scenario progress and completion
   */
  evaluateScenario(goalsCompleted: string[]): ScenarioEvaluation {
    if (!this.activeScenario) {
      return { success: false, failure: false, progress: 0 };
    }

    const scenario = this.activeScenario;
    const currentTick = this.engine.getCurrentTick();
    const ticksElapsed = currentTick - this.startTick;

    // Check time limit failure
    if (scenario.timeLimit && ticksElapsed >= scenario.timeLimit) {
      const allGoalsComplete = scenario.goalIds.every(id => goalsCompleted.includes(id));
      if (!allGoalsComplete) {
        return {
          success: false,
          failure: true,
          progress: 1.0,
          message: scenario.failureMessage || 'Time limit exceeded'
        };
      }
    }

    // Check success (all goals completed)
    const completedCount = scenario.goalIds.filter(id => goalsCompleted.includes(id)).length;
    const allComplete = completedCount === scenario.goalIds.length;

    if (allComplete) {
      return {
        success: true,
        failure: false,
        progress: 1.0,
        message: scenario.successMessage
      };
    }

    // Calculate progress
    const progress = scenario.goalIds.length > 0
      ? completedCount / scenario.goalIds.length
      : 0;

    return {
      success: false,
      failure: false,
      progress
    };
  }

  /**
   * Complete the active scenario
   */
  completeScenario(success: boolean): void {
    if (this.activeScenario && success) {
      this.completedScenarios.add(this.activeScenario.id);
    }
    this.activeScenario = null;
    this.startTick = 0;
  }

  /**
   * Get active scenario
   */
  getActiveScenario(): ScenarioConfig | null {
    return this.activeScenario;
  }

  /**
   * Get all scenarios
   */
  static getAllScenarios(): ScenarioConfig[] {
    return SCENARIOS;
  }

  /**
   * Get scenarios by difficulty
   */
  static getScenariosByDifficulty(difficulty: ScenarioDifficulty): ScenarioConfig[] {
    return SCENARIOS.filter(s => s.difficulty === difficulty);
  }

  /**
   * Get scenario by ID
   */
  static getScenarioById(id: string): ScenarioConfig | undefined {
    return SCENARIOS.find(s => s.id === id);
  }

  /**
   * Get completed scenario IDs
   */
  getCompletedScenarios(): string[] {
    return Array.from(this.completedScenarios);
  }

  /**
   * Check if scenario is completed
   */
  isScenarioCompleted(scenarioId: string): boolean {
    return this.completedScenarios.has(scenarioId);
  }

  /**
   * Get time remaining for active scenario
   */
  getTimeRemaining(): number | null {
    if (!this.activeScenario || !this.activeScenario.timeLimit) {
      return null;
    }

    const ticksElapsed = this.engine.getCurrentTick() - this.startTick;
    return Math.max(0, this.activeScenario.timeLimit - ticksElapsed);
  }

  /**
   * Get scenario progress (0-1)
   */
  getTimeProgress(): number {
    if (!this.activeScenario || !this.activeScenario.timeLimit) {
      return 0;
    }

    const ticksElapsed = this.engine.getCurrentTick() - this.startTick;
    return Math.min(1.0, ticksElapsed / this.activeScenario.timeLimit);
  }

  /**
   * Export state
   */
  exportState() {
    return {
      activeScenario: this.activeScenario,
      startTick: this.startTick,
      completedScenarios: Array.from(this.completedScenarios)
    };
  }

  /**
   * Import state
   */
  importState(state: any) {
    if (state.activeScenario !== undefined) this.activeScenario = state.activeScenario;
    if (state.startTick !== undefined) this.startTick = state.startTick;
    if (state.completedScenarios) this.completedScenarios = new Set(state.completedScenarios);
  }
}
