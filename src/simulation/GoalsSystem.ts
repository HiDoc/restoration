/**
 * GoalsSystem - Defines and evaluates ecosystem goals for player progression
 * Provides goal library with evaluators and completion tracking
 */

import type { SimulationEngine } from './SimulationEngine';
import type { KnowledgeSummary } from '@/game/codex';
import { speciesInfo } from '@/game/speciesInfo';

const NO_KNOWLEDGE = (): KnowledgeSummary => ({ knownSpecies: 0, completeEntries: 0, interactions: 0, noted: 0 });

export type GoalCategory = 'explore' | 'discover' | 'plant' | 'observe' | 'hybridize' | 'restore';
export type GoalDifficulty = 'easy' | 'normal' | 'hard';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetValue: number;
  difficulty: GoalDifficulty;
  evaluator: (engine: SimulationEngine, knowledge: KnowledgeSummary) => number;
}

export interface GoalProgress {
  goal: Goal;
  currentValue: number;
  progress: number; // 0-1
  completed: boolean;
  completedAtTick?: number;
}

/** A goal, briefly: the chain it belongs to, what it asks, and how far the world is towards it. */
const goal = (
  category: GoalCategory,
  id: string,
  title: string,
  description: string,
  targetValue: number,
  evaluator: Goal['evaluator'],
): Goal => ({ id, title, description, category, targetValue, difficulty: 'normal', evaluator });

const tags = (engine: SimulationEngine) => Object.values(engine.getTags());
const sampled = (engine: SimulationEngine) => [...engine.readChunks().values()].filter(chunk => (chunk as any).sample).length;
const animalKinds = (engine: SimulationEngine, bird: boolean) => {
  const kinds = new Set<string>();
  for (const chunk of engine.readChunks().values()) {
    for (const [id, count] of Object.entries(((chunk as any).fauna ?? {}) as Record<string, number>)) {
      if (count >= 1 && (speciesInfo(id).kind === 'bird') === bird) kinds.add(id);
    }
  }
  return kinds.size;
};

/**
 * The goals, as chains that follow the workflow (Explore → Discover → Plant → Observe → Hybridize → Restore). Four
 * are active at a time; a completed goal gives way to the next in its chain, and a finished chain to the next
 * chain not yet begun. Each asks for something the player does, not something the map starts with.
 */
export const GOAL_CHAINS: Goal[][] = [
  [
    goal('explore', 'sample_1', 'First Sample', 'Take a soil and water sample', 1, sampled),
    goal('explore', 'sample_5', 'Soil Surveyor', 'Sample 5 hexes', 5, sampled),
  ],
  [
    goal('discover', 'interactions_3', 'Field Researcher', 'Witness 3 plant–animal interactions (follow, photograph, inspect)', 3, (_, k) => k.interactions),
    goal('discover', 'interactions_10', 'Web Watcher', 'Witness 10 interactions', 10, (_, k) => k.interactions),
    goal('discover', 'interactions_25', 'Naturalist', 'Witness 25 interactions', 25, (_, k) => k.interactions),
  ],
  [
    goal('plant', 'planted_3', 'Green Fingers', 'Plant 3 seeds that come up', 3, engine => tags(engine).filter(tag => tag.reason === 'planted').length),
    goal('plant', 'kinds_12', 'Growing Diversity', 'Grow 12 kinds of plant', 12, engine => engine.getStatistics().uniqueSpecies),
    goal('plant', 'kinds_18', 'Biodiversity Haven', 'Grow 18 kinds of plant', 18, engine => engine.getStatistics().uniqueSpecies),
  ],
  [
    goal('observe', 'tagged_3', 'Following Lives', 'Follow 3 plants in your Journal', 3, engine => tags(engine).length),
    goal('observe', 'noted_5', 'Phenologist', 'Note 5 firsts in your calendar', 5, (_, k) => k.noted),
    goal('observe', 'complete_3', 'Deep Understanding', 'Complete 3 Codex entries (every fact and partner seen)', 3, (_, k) => k.completeEntries),
  ],
  [
    goal('hybridize', 'cross_1', 'Pollen Carrier', 'Make a cross between two plants in flower', 1, engine => engine.getCrosses().length),
    goal('hybridize', 'seedling_1', 'New Blood', 'Raise a seedling from one of your crosses', 1, engine => tags(engine).filter(tag => tag.reason === 'hybrid' || tag.reason === 'crossed').length),
  ],
  [
    goal('restore', 'pollinators_3', 'Buzzing', 'Have 3 kinds of pollinator visiting at once', 3, engine => animalKinds(engine, false)),
    goal('restore', 'birds_3', 'Birdsong', 'Have 3 kinds of bird living here at once', 3, engine => animalKinds(engine, true)),
    goal('restore', 'health_70', 'Flourishing', 'Raise average vitality to 70%', 0.7, engine => engine.getStatistics().avgVitality),
  ],
];

/** All goals, in chain order. */
export const ALL_GOALS: Goal[] = GOAL_CHAINS.flat();

/** Goals active at once. */
const ACTIVE = 4;

/**
 * GoalsSystem class - manages goal evaluation and progression
 */
export class GoalsSystem {
  private engine: SimulationEngine;
  private knowledge: () => KnowledgeSummary;
  private activeGoals: Map<string, GoalProgress> = new Map();
  private completedGoals: Set<string> = new Set();

  constructor(engine: SimulationEngine, knowledge: () => KnowledgeSummary = NO_KNOWLEDGE) {
    this.engine = engine;
    this.knowledge = knowledge;
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
      const currentValue = goal.evaluator(this.engine, this.knowledge());
      const progress = this.calculateProgress(currentValue, goal.targetValue);

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
  private calculateProgress(currentValue: number, targetValue: number): number {
    return targetValue === 0 ? (currentValue > 0 ? 1 : 0) : Math.min(1, currentValue / targetValue);
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
  /** The first goal of each of the first chains. */
  static getStarterGoals(): Goal[] {
    return GOAL_CHAINS.slice(0, ACTIVE).map(chain => chain[0]);
  }

  /**
   * What follows a completed goal: the next in its chain, or else the first goal of the next chain no active or
   * completed goal belongs to. Undefined once every chain is under way.
   */
  static successor(completedId: string, taken: ReadonlySet<string>): Goal | undefined {
    const chain = GOAL_CHAINS.find(c => c.some(g => g.id === completedId));
    const next = chain?.[chain.findIndex(g => g.id === completedId) + 1];
    if (next) return next;
    return GOAL_CHAINS.find(c => !c.some(g => taken.has(g.id)))?.[0];
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
