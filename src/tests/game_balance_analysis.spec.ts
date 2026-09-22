/**
 * Game Balance Analysis - 1000 Simulation Test
 * Analyzes gameplay balance, resource economy, and difficulty scaling
 */

import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInterventionStore } from '@/stores/interventionStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { SimulationEngine } from '@/simulation/SimulationEngine';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock as any;

interface SimulationResult {
  runId: number;
  difficulty: 'easy' | 'normal' | 'hard';
  finalTick: number;
  goalsCompleted: number;
  totalGoals: number;
  goalCompletionRate: number;
  resourcePointsEarned: number;
  resourcePointsSpent: number;
  finalResourceBalance: number;
  interventionsUsed: number;
  interventionsByType: Record<string, number>;
  avgSpeciesCount: number;
  avgVitality: number;
  avgPollution: number;
  firstGoalCompletedAt: number | null;
  timeToFirstGoal: number | null;
}

interface BalanceAnalysis {
  totalRuns: number;
  difficulty: 'easy' | 'normal' | 'hard';

  // Goal completion metrics
  avgGoalsCompleted: number;
  goalCompletionRate: number;
  avgTimeToFirstGoal: number;

  // Resource metrics
  avgResourcesEarned: number;
  avgResourcesSpent: number;
  avgFinalBalance: number;
  resourceDeficitRuns: number; // Runs that ended with 0 points

  // Intervention metrics
  avgInterventionsUsed: number;
  interventionUsageRate: Record<string, number>;
  mostUsedIntervention: string;
  leastUsedIntervention: string;

  // Ecosystem metrics
  avgSpeciesCount: number;
  avgVitality: number;
  avgPollution: number;

  // Distribution data
  goalCompletionDistribution: number[];
  resourceBalanceDistribution: number[];
}

describe('Game Balance Analysis - 1000 Simulations', () => {
  const SIMULATION_COUNT = 1000;
  const SIMULATION_TICKS = 500;

  const results: SimulationResult[] = [];

  /**
   * Run a single simulation and collect statistics
   */
  async function runSimulation(
    runId: number,
    difficulty: 'easy' | 'normal' | 'hard'
  ): Promise<SimulationResult> {
    // Create fresh store instance
    setActivePinia(createPinia());
    const interventionStore = useInterventionStore();
    const goalsStore = useGoalsStore();

    // Create engine
    const engine = new SimulationEngine({
      worldSize: { width: 5, height: 5 },
      chunkSize: 10,
      difficulty,
      enableSeasons: true,
      enableHydrology: true
    });

    engine.activateAllChunks();

    // Initialize stores
    interventionStore.initialize(engine, difficulty);
    goalsStore.initialize(engine, difficulty, engine.getResearchSystem());

    let firstGoalCompletedAt: number | null = null;
    let speciesCountSum = 0;
    let vitalitySum = 0;
    let pollutionSum = 0;
    let sampleCount = 0;

    // Run simulation
    for (let tick = 0; tick < SIMULATION_TICKS; tick++) {
      engine.update();

      // Evaluate goals every 20 ticks
      if (tick % 20 === 0) {
        const goalResults = goalsStore.evaluateGoals(tick);

        goalResults.forEach(result => {
          if (result.completed && result.completedAtTick === tick) {
            interventionStore.addPoints(result.goal.rewardPoints);

            if (firstGoalCompletedAt === null) {
              firstGoalCompletedAt = tick;
            }
          }
        });
      }

      // Use interventions strategically every 25 ticks
      if (tick % 25 === 0) {
        const chunks = Array.from(engine.getAllChunks().values());

        if (chunks.length > 0) {
          // Prioritize irrigate (cheap, useful)
          if (interventionStore.canAfford('irrigate') && !interventionStore.isOnCooldown('irrigate')) {
            await interventionStore.executeIntervention({
              chunkId: chunks[tick % chunks.length]?.id || chunks[0].id,
              x: tick % 5,
              y: tick % 5,
              type: 'irrigate',
              data: {}
            });
          }
          // Use plant when affordable
          else if (interventionStore.canAfford('plant') && !interventionStore.isOnCooldown('plant')) {
            await interventionStore.executeIntervention({
              chunkId: chunks[tick % chunks.length]?.id || chunks[0].id,
              x: tick % 5,
              y: tick % 5,
              type: 'plant',
              data: { speciesId: 'common_grass' }
            });
          }
        }
      }

      // Sample ecosystem state every 50 ticks
      if (tick % 50 === 0) {
        const stats = engine.getStatistics();
        speciesCountSum += stats.totalSpecies;
        vitalitySum += stats.avgVitality || 0;
        pollutionSum += stats.avgPollution || 0;
        sampleCount++;
      }
    }

    // Collect final statistics
    const completedGoals = goalsStore.completedGoals;
    const activeGoals = goalsStore.activeGoals;

    return {
      runId,
      difficulty,
      finalTick: SIMULATION_TICKS,
      goalsCompleted: completedGoals.length,
      totalGoals: activeGoals.length,
      goalCompletionRate: activeGoals.length > 0 ? completedGoals.length / activeGoals.length : 0,
      resourcePointsEarned: interventionStore.totalPointsEarned,
      resourcePointsSpent: interventionStore.totalPointsSpent,
      finalResourceBalance: interventionStore.resourcePoints,
      interventionsUsed: interventionStore.usageStats.totalInterventions,
      interventionsByType: { ...interventionStore.usageStats.byType },
      avgSpeciesCount: sampleCount > 0 ? speciesCountSum / sampleCount : 0,
      avgVitality: sampleCount > 0 ? vitalitySum / sampleCount : 0,
      avgPollution: sampleCount > 0 ? pollutionSum / sampleCount : 0,
      firstGoalCompletedAt,
      timeToFirstGoal: firstGoalCompletedAt
    };
  }

  /**
   * Analyze results and generate balance report
   */
  function analyzeResults(results: SimulationResult[], difficulty: 'easy' | 'normal' | 'hard'): BalanceAnalysis {
    const filteredResults = results.filter(r => r.difficulty === difficulty);
    const count = filteredResults.length;

    if (count === 0) {
      throw new Error(`No results for difficulty: ${difficulty}`);
    }

    // Goal metrics
    const totalGoalsCompleted = filteredResults.reduce((sum, r) => sum + r.goalsCompleted, 0);
    const avgGoalsCompleted = totalGoalsCompleted / count;
    const avgGoalCompletionRate = filteredResults.reduce((sum, r) => sum + r.goalCompletionRate, 0) / count;

    const completedFirstGoal = filteredResults.filter(r => r.firstGoalCompletedAt !== null);
    const avgTimeToFirstGoal = completedFirstGoal.length > 0
      ? completedFirstGoal.reduce((sum, r) => sum + (r.timeToFirstGoal || 0), 0) / completedFirstGoal.length
      : 0;

    // Resource metrics
    const avgResourcesEarned = filteredResults.reduce((sum, r) => sum + r.resourcePointsEarned, 0) / count;
    const avgResourcesSpent = filteredResults.reduce((sum, r) => sum + r.resourcePointsSpent, 0) / count;
    const avgFinalBalance = filteredResults.reduce((sum, r) => sum + r.finalResourceBalance, 0) / count;
    const resourceDeficitRuns = filteredResults.filter(r => r.finalResourceBalance === 0).length;

    // Intervention metrics
    const avgInterventionsUsed = filteredResults.reduce((sum, r) => sum + r.interventionsUsed, 0) / count;

    const interventionTotals: Record<string, number> = {};
    filteredResults.forEach(r => {
      Object.entries(r.interventionsByType).forEach(([type, count]) => {
        interventionTotals[type] = (interventionTotals[type] || 0) + count;
      });
    });

    const interventionUsageRate: Record<string, number> = {};
    Object.entries(interventionTotals).forEach(([type, total]) => {
      interventionUsageRate[type] = total / count;
    });

    const sortedInterventions = Object.entries(interventionUsageRate).sort((a, b) => b[1] - a[1]);
    const mostUsedIntervention = sortedInterventions[0]?.[0] || 'none';
    const leastUsedIntervention = sortedInterventions[sortedInterventions.length - 1]?.[0] || 'none';

    // Ecosystem metrics
    const avgSpeciesCount = filteredResults.reduce((sum, r) => sum + r.avgSpeciesCount, 0) / count;
    const avgVitality = filteredResults.reduce((sum, r) => sum + r.avgVitality, 0) / count;
    const avgPollution = filteredResults.reduce((sum, r) => sum + r.avgPollution, 0) / count;

    // Distribution data
    const goalCompletionDistribution = Array(10).fill(0);
    const resourceBalanceDistribution = Array(10).fill(0);

    filteredResults.forEach(r => {
      // Goal completion buckets (0-10%, 10-20%, ..., 90-100%)
      const goalBucket = Math.min(Math.floor(r.goalCompletionRate * 10), 9);
      goalCompletionDistribution[goalBucket]++;

      // Resource balance buckets (0-100, 100-200, ..., 900+)
      const resourceBucket = Math.min(Math.floor(r.finalResourceBalance / 100), 9);
      resourceBalanceDistribution[resourceBucket]++;
    });

    return {
      totalRuns: count,
      difficulty,
      avgGoalsCompleted,
      goalCompletionRate: avgGoalCompletionRate,
      avgTimeToFirstGoal,
      avgResourcesEarned,
      avgResourcesSpent,
      avgFinalBalance,
      resourceDeficitRuns,
      avgInterventionsUsed,
      interventionUsageRate,
      mostUsedIntervention,
      leastUsedIntervention,
      avgSpeciesCount,
      avgVitality,
      avgPollution,
      goalCompletionDistribution,
      resourceBalanceDistribution
    };
  }

  /**
   * Print detailed balance report
   */
  function printBalanceReport(analysis: BalanceAnalysis) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`BALANCE ANALYSIS - ${analysis.difficulty.toUpperCase()} DIFFICULTY`);
    console.log(`Total Simulations: ${analysis.totalRuns}`);
    console.log(`${'='.repeat(80)}\n`);

    // Goal Completion
    console.log('📊 GOAL COMPLETION METRICS');
    console.log(`  Average Goals Completed: ${analysis.avgGoalsCompleted.toFixed(2)}`);
    console.log(`  Goal Completion Rate: ${(analysis.goalCompletionRate * 100).toFixed(1)}%`);
    console.log(`  Avg Time to First Goal: ${analysis.avgTimeToFirstGoal.toFixed(0)} ticks`);

    console.log('\n  Goal Completion Distribution:');
    analysis.goalCompletionDistribution.forEach((count, i) => {
      const percent = (count / analysis.totalRuns * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / analysis.totalRuns * 50));
      console.log(`    ${i * 10}-${(i + 1) * 10}%: ${bar} ${percent}% (${count} runs)`);
    });

    // Resource Economy
    console.log('\n💰 RESOURCE ECONOMY');
    console.log(`  Avg Points Earned: ${analysis.avgResourcesEarned.toFixed(1)}`);
    console.log(`  Avg Points Spent: ${analysis.avgResourcesSpent.toFixed(1)}`);
    console.log(`  Avg Final Balance: ${analysis.avgFinalBalance.toFixed(1)}`);
    console.log(`  Resource Deficit Runs: ${analysis.resourceDeficitRuns} (${(analysis.resourceDeficitRuns / analysis.totalRuns * 100).toFixed(1)}%)`);
    console.log(`  Net Resource Flow: ${(analysis.avgResourcesEarned - analysis.avgResourcesSpent).toFixed(1)}`);

    console.log('\n  Resource Balance Distribution:');
    analysis.resourceBalanceDistribution.forEach((count, i) => {
      const percent = (count / analysis.totalRuns * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / analysis.totalRuns * 50));
      const range = i === 9 ? '900+' : `${i * 100}-${(i + 1) * 100}`;
      console.log(`    ${range}: ${bar} ${percent}% (${count} runs)`);
    });

    // Intervention Usage
    console.log('\n🔧 INTERVENTION USAGE');
    console.log(`  Avg Interventions Used: ${analysis.avgInterventionsUsed.toFixed(2)}`);
    console.log(`  Most Used: ${analysis.mostUsedIntervention}`);
    console.log(`  Least Used: ${analysis.leastUsedIntervention}`);

    console.log('\n  Usage Rates by Type:');
    Object.entries(analysis.interventionUsageRate)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, rate]) => {
        const bar = '█'.repeat(Math.floor(rate / 2));
        console.log(`    ${type.padEnd(12)}: ${bar} ${rate.toFixed(2)} per run`);
      });

    // Ecosystem Health
    console.log('\n🌍 ECOSYSTEM METRICS');
    console.log(`  Avg Species Count: ${analysis.avgSpeciesCount.toFixed(2)}`);
    console.log(`  Avg Vitality: ${(analysis.avgVitality * 100).toFixed(1)}%`);
    console.log(`  Avg Pollution: ${(analysis.avgPollution * 100).toFixed(1)}%`);

    // Balance Recommendations
    console.log('\n💡 BALANCE RECOMMENDATIONS');

    if (analysis.goalCompletionRate < 0.2) {
      console.log('  ⚠️  LOW GOAL COMPLETION - Goals may be too difficult or require more time');
    } else if (analysis.goalCompletionRate > 0.8) {
      console.log('  ⚠️  HIGH GOAL COMPLETION - Goals may be too easy, consider increasing difficulty');
    } else {
      console.log('  ✓ Goal completion rate is well balanced');
    }

    if (analysis.avgFinalBalance < 50) {
      console.log('  ⚠️  LOW RESOURCE BALANCE - Players may struggle with resource scarcity');
    } else if (analysis.avgFinalBalance > 300) {
      console.log('  ⚠️  HIGH RESOURCE SURPLUS - Resource costs may be too low or rewards too high');
    } else {
      console.log('  ✓ Resource economy is well balanced');
    }

    if (analysis.resourceDeficitRuns > analysis.totalRuns * 0.3) {
      console.log('  ⚠️  HIGH DEFICIT RATE - Consider increasing point rewards or reducing costs');
    }

    const usageValues = Object.values(analysis.interventionUsageRate);
    const maxUsage = Math.max(...usageValues);
    const minUsage = Math.min(...usageValues.filter(v => v > 0));

    if (maxUsage / minUsage > 5) {
      console.log('  ⚠️  INTERVENTION IMBALANCE - Some interventions rarely used, consider rebalancing costs');
    } else {
      console.log('  ✓ Intervention usage is relatively balanced');
    }

    console.log(`\n${'='.repeat(80)}\n`);
  }

  /**
   * Generate comparative report across difficulties
   */
  function printComparativeReport(
    easyAnalysis: BalanceAnalysis,
    normalAnalysis: BalanceAnalysis,
    hardAnalysis: BalanceAnalysis
  ) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('COMPARATIVE ANALYSIS - ALL DIFFICULTIES');
    console.log(`${'='.repeat(80)}\n`);

    console.log('Goal Completion Rate:');
    console.log(`  Easy:   ${(easyAnalysis.goalCompletionRate * 100).toFixed(1)}%`);
    console.log(`  Normal: ${(normalAnalysis.goalCompletionRate * 100).toFixed(1)}%`);
    console.log(`  Hard:   ${(hardAnalysis.goalCompletionRate * 100).toFixed(1)}%`);

    console.log('\nAverage Final Resource Balance:');
    console.log(`  Easy:   ${easyAnalysis.avgFinalBalance.toFixed(1)} points`);
    console.log(`  Normal: ${normalAnalysis.avgFinalBalance.toFixed(1)} points`);
    console.log(`  Hard:   ${hardAnalysis.avgFinalBalance.toFixed(1)} points`);

    console.log('\nAverage Interventions Used:');
    console.log(`  Easy:   ${easyAnalysis.avgInterventionsUsed.toFixed(2)}`);
    console.log(`  Normal: ${normalAnalysis.avgInterventionsUsed.toFixed(2)}`);
    console.log(`  Hard:   ${hardAnalysis.avgInterventionsUsed.toFixed(2)}`);

    console.log('\nTime to First Goal:');
    console.log(`  Easy:   ${easyAnalysis.avgTimeToFirstGoal.toFixed(0)} ticks`);
    console.log(`  Normal: ${normalAnalysis.avgTimeToFirstGoal.toFixed(0)} ticks`);
    console.log(`  Hard:   ${hardAnalysis.avgTimeToFirstGoal.toFixed(0)} ticks`);

    console.log(`\n${'='.repeat(80)}\n`);
  }

  it('should run 1000 simulations and analyze game balance', async () => {
    console.log('\n🎮 STARTING 1000 SIMULATION BALANCE TEST\n');
    console.log('This will take a few minutes...\n');

    const startTime = Date.now();

    // Run simulations across all difficulties
    const difficultiesPerRun = Math.floor(SIMULATION_COUNT / 3);

    for (let i = 0; i < SIMULATION_COUNT; i++) {
      let difficulty: 'easy' | 'normal' | 'hard';

      if (i < difficultiesPerRun) {
        difficulty = 'easy';
      } else if (i < difficultiesPerRun * 2) {
        difficulty = 'normal';
      } else {
        difficulty = 'hard';
      }

      const result = await runSimulation(i, difficulty);
      results.push(result);

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = ((i + 1) / (Date.now() - startTime) * 1000).toFixed(2);
        console.log(`  Progress: ${i + 1}/${SIMULATION_COUNT} (${rate} sims/sec, ${elapsed}s elapsed)`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✓ Completed ${SIMULATION_COUNT} simulations in ${totalTime}s\n`);

    // Analyze results by difficulty
    const easyAnalysis = analyzeResults(results, 'easy');
    const normalAnalysis = analyzeResults(results, 'normal');
    const hardAnalysis = analyzeResults(results, 'hard');

    // Print reports
    printBalanceReport(easyAnalysis);
    printBalanceReport(normalAnalysis);
    printBalanceReport(hardAnalysis);
    printComparativeReport(easyAnalysis, normalAnalysis, hardAnalysis);

    // Assertions for sanity checks
    expect(results.length).toBe(SIMULATION_COUNT);
    expect(easyAnalysis.totalRuns).toBeGreaterThan(0);
    expect(normalAnalysis.totalRuns).toBeGreaterThan(0);
    expect(hardAnalysis.totalRuns).toBeGreaterThan(0);

    console.log('✅ Balance analysis complete!\n');
  }, 600000); // 10 minute timeout for 1000 simulations
});
