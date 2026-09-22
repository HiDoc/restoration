/**
 * GoalsSystem - Defines and evaluates ecosystem goals for player progression
 * Provides goal library with evaluators and completion tracking
 */

import type { SimulationEngine } from './SimulationEngine';
import type { ResearchSystem } from './ResearchSystem';

export type GoalCategory = 'biodiversity' | 'ecosystem_health' | 'research' | 'succession' | 'pollution';
export type GoalDifficulty = 'easy' | 'normal' | 'hard';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetValue: number;
  rewardPoints: number;
  difficulty: GoalDifficulty;
  evaluator: (engine: SimulationEngine, researchSystem?: ResearchSystem) => number;
}

export interface GoalProgress {
  goal: Goal;
  currentValue: number;
  progress: number; // 0-1
  completed: boolean;
  completedAtTick?: number;
}

/**
 * Biodiversity goals - species count and diversity
 */
const BIODIVERSITY_GOALS: Goal[] = [
  {
    id: 'diversity_5',
    title: 'Growing Diversity',
    description: 'Grow 2 different species in your ecosystem',
    category: 'biodiversity',
    targetValue: 2,
    rewardPoints: 50,
    difficulty: 'easy',
    evaluator: (engine) => engine.getStatistics().uniqueSpecies
  },
  {
    id: 'diversity_10',
    title: 'Thriving Ecosystem',
    description: 'Reach 3 different species coexisting',
    category: 'biodiversity',
    targetValue: 3,
    rewardPoints: 100,
    difficulty: 'easy',
    evaluator: (engine) => engine.getStatistics().uniqueSpecies
  },
  {
    id: 'diversity_15',
    title: 'Biodiversity Haven',
    description: 'Support 4 different species simultaneously',
    category: 'biodiversity',
    targetValue: 4,
    rewardPoints: 200,
    difficulty: 'normal',
    evaluator: (engine) => engine.getStatistics().uniqueSpecies
  },
  {
    id: 'diversity_20',
    title: 'Ecological Abundance',
    description: 'Maintain 5 different species in harmony',
    category: 'biodiversity',
    targetValue: 5,
    rewardPoints: 350,
    difficulty: 'hard',
    evaluator: (engine) => engine.getStatistics().uniqueSpecies
  }
];

/**
 * Ecosystem health goals - vitality and stability
 */
const ECOSYSTEM_HEALTH_GOALS: Goal[] = [
  {
    id: 'health_60',
    title: 'Healthy Start',
    description: 'Achieve 60% average ecosystem vitality',
    category: 'ecosystem_health',
    targetValue: 0.60,
    rewardPoints: 75,
    difficulty: 'easy',
    evaluator: (engine) => engine.getStatistics().avgVitality
  },
  {
    id: 'health_70',
    title: 'Flourishing Ecosystem',
    description: 'Reach 70% average vitality',
    category: 'ecosystem_health',
    targetValue: 0.70,
    rewardPoints: 125,
    difficulty: 'easy',
    evaluator: (engine) => engine.getStatistics().avgVitality
  },
  {
    id: 'health_80',
    title: 'Peak Vitality',
    description: 'Achieve 80% average ecosystem health',
    category: 'ecosystem_health',
    targetValue: 0.80,
    rewardPoints: 200,
    difficulty: 'normal',
    evaluator: (engine) => engine.getStatistics().avgVitality
  },
  {
    id: 'health_90',
    title: 'Optimal Ecosystem',
    description: 'Maintain 90% average vitality',
    category: 'ecosystem_health',
    targetValue: 0.90,
    rewardPoints: 400,
    difficulty: 'hard',
    evaluator: (engine) => engine.getStatistics().avgVitality
  }
];

/**
 * Research goals - species discovery and trait unlocking
 */
const RESEARCH_GOALS: Goal[] = [
  {
    id: 'discover_10',
    title: 'Field Researcher',
    description: 'Discover 2 different species',
    category: 'research',
    targetValue: 2,
    rewardPoints: 100,
    difficulty: 'easy',
    evaluator: (_engine, researchSystem) => researchSystem?.getDiscoveredSpecies().length || 0
  },
  {
    id: 'discover_25',
    title: 'Naturalist',
    description: 'Discover 3 different species',
    category: 'research',
    targetValue: 3,
    rewardPoints: 250,
    difficulty: 'normal',
    evaluator: (_engine, researchSystem) => researchSystem?.getDiscoveredSpecies().length || 0
  },
  {
    id: 'discover_50',
    title: 'Master Ecologist',
    description: 'Discover 5 different species',
    category: 'research',
    targetValue: 5,
    rewardPoints: 500,
    difficulty: 'hard',
    evaluator: (_engine, researchSystem) => researchSystem?.getDiscoveredSpecies().length || 0
  },
  {
    id: 'research_complete_3',
    title: 'Deep Understanding',
    description: 'Fully research 3 species (unlock all traits)',
    category: 'research',
    targetValue: 3,
    rewardPoints: 150,
    difficulty: 'normal',
    evaluator: (_engine, researchSystem) => {
      if (!researchSystem) return 0;
      const discovered = researchSystem.getDiscoveredSpecies();
      return discovered.filter(id => researchSystem.getResearchProgress(id) === 1.0).length;
    }
  },
  {
    id: 'observations_500',
    title: 'Dedicated Observer',
    description: 'Record 500 total species observations',
    category: 'research',
    targetValue: 500,
    rewardPoints: 100,
    difficulty: 'normal',
    evaluator: (_engine, researchSystem) => researchSystem?.getState().totalObservations || 0
  }
];

/**
 * Pollution control goals
 */
const POLLUTION_GOALS: Goal[] = [
  {
    id: 'pollution_below_20',
    title: 'Clean Environment',
    description: 'Reduce average pollution below 20%',
    category: 'pollution',
    targetValue: 0.20,
    rewardPoints: 100,
    difficulty: 'normal',
    evaluator: (engine) => {
      // Return inverted value since we want pollution BELOW threshold
      const pollution = engine.getStatistics().avgPollution;
      return pollution <= 0.20 ? 1.0 : pollution;
    }
  },
  {
    id: 'pollution_below_10',
    title: 'Pristine Ecosystem',
    description: 'Maintain pollution below 10%',
    category: 'pollution',
    targetValue: 0.10,
    rewardPoints: 200,
    difficulty: 'hard',
    evaluator: (engine) => {
      const pollution = engine.getStatistics().avgPollution;
      return pollution <= 0.10 ? 1.0 : pollution;
    }
  }
];

/**
 * Succession goals - ecosystem development
 */
const SUCCESSION_GOALS: Goal[] = [
  {
    id: 'forest_established',
    title: 'Forest Pioneer',
    description: 'Establish a forest ecosystem with canopy layer',
    category: 'succession',
    targetValue: 1.0,
    rewardPoints: 300,
    difficulty: 'normal',
    evaluator: (engine) => {
      // Check if any chunks have significant canopy
      const chunks = Array.from(engine.getAllChunks().values());
      const forestChunks = chunks.filter(chunk =>
        chunk.biomeState.canopy > 0.5
      );
      return forestChunks.length >= 3 ? 1.0 : forestChunks.length / 3;
    }
  },
  {
    id: 'stability_5_years',
    title: 'Long-term Stability',
    description: 'Maintain ecosystem for 5 years (1800 ticks)',
    category: 'succession',
    targetValue: 1800,
    rewardPoints: 250,
    difficulty: 'normal',
    evaluator: (engine) => engine.getCurrentTick()
  }
];

/**
 * All available goals
 */
export const ALL_GOALS: Goal[] = [
  ...BIODIVERSITY_GOALS,
  ...ECOSYSTEM_HEALTH_GOALS,
  ...RESEARCH_GOALS,
  ...POLLUTION_GOALS,
  ...SUCCESSION_GOALS
];

/**
 * GoalsSystem class - manages goal evaluation and progression
 */
export class GoalsSystem {
  private engine: SimulationEngine;
  private researchSystem?: ResearchSystem;
  private activeGoals: Map<string, GoalProgress> = new Map();
  private completedGoals: Set<string> = new Set();

  constructor(engine: SimulationEngine, researchSystem?: ResearchSystem) {
    this.engine = engine;
    this.researchSystem = researchSystem;
  }

  /**
   * Set active goals for current session
   */
  setActiveGoals(goalIds: string[]): void {
    this.activeGoals.clear();
    for (const id of goalIds) {
      const goal = ALL_GOALS.find(g => g.id === id);
      if (goal) {
        this.activeGoals.set(id, {
          goal,
          currentValue: 0,
          progress: 0,
          completed: this.completedGoals.has(id)
        });
      }
    }
  }

  /**
   * Add an active goal
   */
  addGoal(goalId: string): boolean {
    const goal = ALL_GOALS.find(g => g.id === goalId);
    if (!goal || this.activeGoals.has(goalId)) {
      return false;
    }

    this.activeGoals.set(goalId, {
      goal,
      currentValue: 0,
      progress: 0,
      completed: this.completedGoals.has(goalId)
    });
    return true;
  }

  /**
   * Evaluate all active goals
   */
  evaluateGoals(currentTick: number): GoalProgress[] {
    const results: GoalProgress[] = [];

    for (const [id, goalProgress] of this.activeGoals.entries()) {
      if (goalProgress.completed) {
        results.push(goalProgress);
        continue;
      }

      const { goal } = goalProgress;
      const currentValue = goal.evaluator(this.engine, this.researchSystem);
      const progress = this.calculateProgress(currentValue, goal.targetValue, goal.category);

      // Check completion
      const completed = progress >= 1.0;

      const updated: GoalProgress = {
        goal,
        currentValue,
        progress,
        completed,
        completedAtTick: completed && !goalProgress.completed ? currentTick : goalProgress.completedAtTick
      };

      this.activeGoals.set(id, updated);
      results.push(updated);

      // Mark as completed globally
      if (completed && !this.completedGoals.has(id)) {
        this.completedGoals.add(id);
      }
    }

    return results;
  }

  /**
   * Calculate progress (0-1) based on current value and target
   */
  private calculateProgress(currentValue: number, targetValue: number, category: GoalCategory): number {
    // Special handling for pollution goals (inverted)
    if (category === 'pollution') {
      return currentValue >= 1.0 ? 1.0 : 0;
    }

    // Normal progress calculation
    if (targetValue === 0) return currentValue > 0 ? 1.0 : 0;
    return Math.min(1.0, currentValue / targetValue);
  }

  /**
   * Get goals by difficulty
   */
  static getGoalsForDifficulty(difficulty: GoalDifficulty): Goal[] {
    return ALL_GOALS.filter(g => g.difficulty === difficulty);
  }

  /**
   * Get goals by category
   */
  static getGoalsByCategory(category: GoalCategory): Goal[] {
    return ALL_GOALS.filter(g => g.category === category);
  }

  /**
   * Get starter goal set (balanced mix)
   */
  static getStarterGoals(): Goal[] {
    return [
      'diversity_5',
      'health_60',
      'discover_10',
      'pollution_below_20'
    ].map(id => ALL_GOALS.find(g => g.id === id)!).filter(Boolean);
  }

  /**
   * Get active goals
   */
  getActiveGoals(): GoalProgress[] {
    return Array.from(this.activeGoals.values());
  }

  /**
   * Get completed goal IDs
   */
  getCompletedGoalIds(): string[] {
    return Array.from(this.completedGoals);
  }

  /**
   * Check if a goal is completed
   */
  isGoalCompleted(goalId: string): boolean {
    return this.completedGoals.has(goalId);
  }

  /**
   * Export state
   */
  exportState() {
    return {
      activeGoals: Array.from(this.activeGoals, ([id, progress]) => [id, {
        goalId: id,
        currentValue: progress.currentValue,
        progress: progress.progress,
        completed: progress.completed,
        completedAtTick: progress.completedAtTick,
      }]),
      completedGoals: Array.from(this.completedGoals)
    };
  }

  /**
   * Import state
   */
  importState(state: any) {
    if (state.activeGoals) {
      this.activeGoals.clear();
      for (const [id, saved] of state.activeGoals) {
        // Reattach current definitions: legacy snapshots may contain a stripped goal object.
        const goal = ALL_GOALS.find(candidate => candidate.id === (saved.goalId ?? saved.goal?.id ?? id));
        if (!goal) continue;
        this.activeGoals.set(goal.id, {
          goal,
          currentValue: saved.currentValue ?? 0,
          progress: saved.progress ?? 0,
          completed: saved.completed ?? false,
          completedAtTick: saved.completedAtTick,
        });
      }
    }
    if (state.completedGoals) {
      this.completedGoals = new Set(state.completedGoals);
    }
  }
}
