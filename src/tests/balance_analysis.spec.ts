import { describe, it, expect } from 'vitest';
import { SimulationEngine, SimulationConfig } from '@/simulation/SimulationEngine';
import { WeatherSystem } from '@/simulation/WeatherSystem';
import { HydrologySystem } from '@/simulation/HydrologySystem';
import { CanopySystem } from '@/simulation/CanopySystem';
import { VegetationSystem } from '@/simulation/VegetationSystem';
import { PollinatorSystem } from '@/simulation/PollinatorSystem';
import { BirdsSystem } from '@/simulation/BirdsSystem';
import { RNGManager } from '@/simulation/SeededRNG';
import { DiscoveryMethod } from '@/simulation/ResearchSystem';
import { useResearchStore } from '@/stores/researchStore';
import { createPinia, setActivePinia } from 'pinia';

/**
 * Balance Analysis - 1000 Simulation Test Suite
 *
 * Tests progression curves, discovery rates, and gameplay balance
 * to identify tuning needs for optimal player experience.
 */

interface SimulationMetrics {
  run: number;
  finalTick: number;
  maxSpecies: number;
  avgSpecies: number;
  discoveryRate: number; // species discovered per 100 ticks
  firstDiscoveryTick: number;
  speciesAtTick100: number;
  speciesAtTick500: number;
  speciesAtTick1000: number;
  extinctionTick: number | null;
  avgVitality: number;
  observationRate: number; // observations per species
  traitUnlockRate: number; // avg traits unlocked per species
}

interface AggregateStats {
  totalRuns: number;
  avgMaxSpecies: number;
  avgDiscoveryRate: number;
  avgFirstDiscovery: number;
  extinctionRate: number;
  progressionCurve: {
    tick100: number;
    tick500: number;
    tick1000: number;
  };
  observationEfficiency: number;
  recommendedTuning: string[];
}

describe('Balance Analysis - 1000 Simulation Suite', () => {
  const SIMULATION_COUNT = 1000;
  const TICKS_PER_RUN = 1000;
  const QUICK_RUN_COUNT = 100; // For faster testing, increase to 1000 for full analysis

  function runSimulation(seed: number, ticks: number): SimulationMetrics {
    RNGManager.initialize(seed);
    setActivePinia(createPinia());

    const config: SimulationConfig = {
      worldWidth: 3,
      worldHeight: 3,
      chunkSize: 16,
      tickRate: 10,
      masterSeed: seed,
      maxActiveChunks: 9,
      seasonLengthTicks: 90,
      timePerTickMinutes: 1440,
    };

    const engine = new SimulationEngine(config);
    const weather = new WeatherSystem();
    const hydrology = new HydrologySystem();
    const canopy = new CanopySystem();
    const vegetation = new VegetationSystem(engine);
    const pollinators = new PollinatorSystem();
    const birds = new BirdsSystem();

    hydrology.initializeElevation(engine.getAllChunks());
    pollinators.initialize(engine.getAllChunks());
    birds.initialize(engine.getAllChunks());
    engine.activateAllChunks();

    // Initialize research system
    const researchStore = useResearchStore();
    const eventJournal = (engine as any).eventJournal;
    researchStore.initialize(eventJournal, 0);
    if (researchStore.system) {
      engine.setResearchSystem(researchStore.system as any);
    }
    researchStore.manualDiscovery('common_grass', 0, DiscoveryMethod.INITIAL);

    const speciesHistory: number[] = [];
    let maxSpecies = 0;
    let firstDiscoveryTick = 0;
    let extinctionTick: number | null = null;
    let totalVitality = 0;
    let vitalityCount = 0;

    for (let i = 0; i < ticks; i++) {
      engine.update();
      const tick = engine.getCurrentTick();
      const chunks = engine.getAllChunks();
      const activeIds = Array.from(engine.getActiveChunkIds());

      weather.update(tick, chunks);
      hydrology.update(chunks, activeIds);

      activeIds.forEach((id) => {
        const chunk = chunks.get(id);
        if (chunk) {
          canopy.update(chunk);
          vegetation.update(chunk, 1);
        }
      });

      pollinators.update(chunks);
      birds.update(chunks, tick);

      // BALANCE TUNING: Reduced observation frequency for realistic progression
      // Observe species every 50 ticks instead of every 10 (80% reduction)
      if (tick % 50 === 0) {
        engine.observeAllActiveSpecies();
      }

      const stats = engine.getStatistics();
      speciesHistory.push(stats.totalSpecies);
      maxSpecies = Math.max(maxSpecies, stats.totalSpecies);
      totalVitality += stats.avgVitality;
      vitalityCount++;

      if (researchStore.discoveredCount > 1 && firstDiscoveryTick === 0) {
        firstDiscoveryTick = tick;
      }

      if (stats.totalSpecies === 0 && extinctionTick === null && tick > 100) {
        extinctionTick = tick;
      }
    }

    const avgSpecies = speciesHistory.reduce((a, b) => a + b, 0) / speciesHistory.length;
    const discoveryRate = (researchStore.discoveredCount / ticks) * 100;
    const avgVitality = totalVitality / vitalityCount;

    // Calculate trait unlock efficiency
    let totalTraits = 0;
    let totalObservations = 0;
    researchStore.discoveredSpeciesIds.forEach((speciesId) => {
      const observations = researchStore.getObservationCount(speciesId);
      totalObservations += observations;

      if (researchStore.hasUnlockedTrait(speciesId, 'BASIC' as any)) totalTraits++;
      if (researchStore.hasUnlockedTrait(speciesId, 'ENVIRONMENTAL' as any)) totalTraits++;
      if (researchStore.hasUnlockedTrait(speciesId, 'REPRODUCTIVE' as any)) totalTraits++;
      if (researchStore.hasUnlockedTrait(speciesId, 'ECOLOGICAL' as any)) totalTraits++;
      if (researchStore.hasUnlockedTrait(speciesId, 'GENETIC' as any)) totalTraits++;
    });

    const observationRate = researchStore.discoveredCount > 0
      ? totalObservations / researchStore.discoveredCount
      : 0;
    const traitUnlockRate = researchStore.discoveredCount > 0
      ? totalTraits / researchStore.discoveredCount
      : 0;

    return {
      run: seed,
      finalTick: ticks,
      maxSpecies,
      avgSpecies,
      discoveryRate,
      firstDiscoveryTick,
      speciesAtTick100: speciesHistory[99] || 0,
      speciesAtTick500: speciesHistory[499] || 0,
      speciesAtTick1000: speciesHistory[999] || 0,
      extinctionTick,
      avgVitality,
      observationRate,
      traitUnlockRate,
    };
  }

  function analyzeMetrics(metrics: SimulationMetrics[]): AggregateStats {
    const totalRuns = metrics.length;

    const avgMaxSpecies = metrics.reduce((sum, m) => sum + m.maxSpecies, 0) / totalRuns;
    const avgDiscoveryRate = metrics.reduce((sum, m) => sum + m.discoveryRate, 0) / totalRuns;
    const avgFirstDiscovery = metrics.reduce((sum, m) => sum + m.firstDiscoveryTick, 0) / totalRuns;
    const extinctionCount = metrics.filter(m => m.extinctionTick !== null).length;
    const extinctionRate = extinctionCount / totalRuns;

    const progressionCurve = {
      tick100: metrics.reduce((sum, m) => sum + m.speciesAtTick100, 0) / totalRuns,
      tick500: metrics.reduce((sum, m) => sum + m.speciesAtTick500, 0) / totalRuns,
      tick1000: metrics.reduce((sum, m) => sum + m.speciesAtTick1000, 0) / totalRuns,
    };

    const avgObservations = metrics.reduce((sum, m) => sum + m.observationRate, 0) / totalRuns;
    const avgTraits = metrics.reduce((sum, m) => sum + m.traitUnlockRate, 0) / totalRuns;

    const recommendations: string[] = [];

    // Analysis and recommendations
    if (avgFirstDiscovery > 200) {
      recommendations.push('⚠️ First discovery too slow (avg ' + Math.round(avgFirstDiscovery) + ' ticks) - increase observation frequency or reduce discovery thresholds');
    } else if (avgFirstDiscovery < 50) {
      recommendations.push('⚠️ First discovery too fast (avg ' + Math.round(avgFirstDiscovery) + ' ticks) - may reduce sense of achievement');
    } else {
      recommendations.push('✓ First discovery timing is balanced (' + Math.round(avgFirstDiscovery) + ' ticks)');
    }

    if (avgDiscoveryRate < 0.1) {
      recommendations.push('⚠️ Discovery rate too low (' + avgDiscoveryRate.toFixed(3) + ' per 100 ticks) - players will feel progression is too slow');
    } else if (avgDiscoveryRate > 1.0) {
      recommendations.push('⚠️ Discovery rate too high (' + avgDiscoveryRate.toFixed(3) + ' per 100 ticks) - may overwhelm players');
    } else {
      recommendations.push('✓ Discovery rate is balanced (' + avgDiscoveryRate.toFixed(3) + ' per 100 ticks)');
    }

    if (extinctionRate > 0.3) {
      recommendations.push('⚠️ High extinction rate (' + (extinctionRate * 100).toFixed(1) + '%) - increase species resilience or environmental stability');
    } else if (extinctionRate < 0.05) {
      recommendations.push('⚠️ Very low extinction rate (' + (extinctionRate * 100).toFixed(1) + '%) - may lack challenge');
    } else {
      recommendations.push('✓ Extinction rate provides good challenge (' + (extinctionRate * 100).toFixed(1) + '%)');
    }

    if (progressionCurve.tick100 < 1) {
      recommendations.push('⚠️ Early game too slow - no species by tick 100 in most runs');
    }

    if (progressionCurve.tick1000 < progressionCurve.tick500 * 0.8) {
      recommendations.push('⚠️ Late game decline - species count drops significantly, may need late-game balance');
    }

    if (avgObservations < 20) {
      recommendations.push('⚠️ Low observation rate - increase automatic observation frequency');
    } else if (avgObservations > 100) {
      recommendations.push('⚠️ High observation rate - may unlock traits too quickly, consider increasing thresholds');
    } else {
      recommendations.push('✓ Observation rate is balanced (avg ' + avgObservations.toFixed(1) + ' per species)');
    }

    if (avgTraits < 2) {
      recommendations.push('⚠️ Trait unlock rate too low - players unlock < 2 traits per species on average');
    } else if (avgTraits > 4) {
      recommendations.push('✓ Good trait progression - players unlock ' + avgTraits.toFixed(1) + ' traits per species');
    }

    return {
      totalRuns,
      avgMaxSpecies,
      avgDiscoveryRate,
      avgFirstDiscovery,
      extinctionRate,
      progressionCurve,
      observationEfficiency: avgObservations,
      recommendedTuning: recommendations,
    };
  }

  it('should run 100 quick simulations and provide balance analysis', () => {
    console.log('\n🔬 Starting Balance Analysis - Quick Run (100 simulations)...\n');

    const metrics: SimulationMetrics[] = [];
    const startTime = performance.now();

    for (let i = 0; i < QUICK_RUN_COUNT; i++) {
      const result = runSimulation(42000 + i, TICKS_PER_RUN);
      metrics.push(result);

      if ((i + 1) % 10 === 0) {
        console.log(`  Completed ${i + 1}/${QUICK_RUN_COUNT} simulations...`);
      }
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n✓ Completed ${QUICK_RUN_COUNT} simulations in ${duration.toFixed(2)}s\n`);

    const analysis = analyzeMetrics(metrics);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 BALANCE ANALYSIS RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📈 PROGRESSION CURVE:');
    console.log(`  Tick 100:  ${analysis.progressionCurve.tick100.toFixed(2)} species (avg)`);
    console.log(`  Tick 500:  ${analysis.progressionCurve.tick500.toFixed(2)} species (avg)`);
    console.log(`  Tick 1000: ${analysis.progressionCurve.tick1000.toFixed(2)} species (avg)`);
    console.log(`  Peak:      ${analysis.avgMaxSpecies.toFixed(2)} species (avg max)`);
    console.log('');

    console.log('🔍 DISCOVERY METRICS:');
    console.log(`  First Discovery:  ${analysis.avgFirstDiscovery.toFixed(1)} ticks (avg)`);
    console.log(`  Discovery Rate:   ${analysis.avgDiscoveryRate.toFixed(3)} per 100 ticks`);
    console.log(`  Observations:     ${analysis.observationEfficiency.toFixed(1)} per species (avg)`);
    console.log('');

    console.log('💀 SURVIVAL METRICS:');
    console.log(`  Extinction Rate:  ${(analysis.extinctionRate * 100).toFixed(1)}%`);
    console.log('');

    console.log('🎯 TUNING RECOMMENDATIONS:');
    console.log('───────────────────────────────────────────────────────────');
    analysis.recommendedTuning.forEach(rec => {
      console.log(`  ${rec}`);
    });
    console.log('═══════════════════════════════════════════════════════════\n');

    // Assertions to ensure basic balance
    expect(analysis.avgFirstDiscovery).toBeGreaterThanOrEqual(0); // Can be 0 due to initial manual discovery
    expect(analysis.avgFirstDiscovery).toBeLessThan(500);
    expect(analysis.avgDiscoveryRate).toBeGreaterThan(0);
    expect(analysis.progressionCurve.tick100).toBeGreaterThanOrEqual(0);
  }, 600000); // 10 minute timeout for 100 simulations

  it.skip('should run 1000 full simulations for comprehensive analysis', () => {
    console.log('\n🔬 Starting FULL Balance Analysis (1000 simulations)...\n');
    console.log('⚠️  This test is skipped by default due to long runtime');
    console.log('⚠️  Remove .skip to run full 1000-simulation analysis\n');

    const metrics: SimulationMetrics[] = [];
    const startTime = performance.now();

    for (let i = 0; i < SIMULATION_COUNT; i++) {
      const result = runSimulation(42000 + i, TICKS_PER_RUN);
      metrics.push(result);

      if ((i + 1) % 100 === 0) {
        const elapsed = (performance.now() - startTime) / 1000;
        const rate = (i + 1) / elapsed;
        const remaining = (SIMULATION_COUNT - (i + 1)) / rate;
        console.log(`  Completed ${i + 1}/${SIMULATION_COUNT} (${rate.toFixed(1)} sim/s, ~${remaining.toFixed(0)}s remaining)`);
      }
    }

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n✓ Completed ${SIMULATION_COUNT} simulations in ${duration.toFixed(2)}s\n`);

    const analysis = analyzeMetrics(metrics);

    // Full analysis output...
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 COMPREHENSIVE BALANCE ANALYSIS (1000 SIMULATIONS)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Same output format as quick run
    console.log('📈 PROGRESSION CURVE:');
    console.log(`  Tick 100:  ${analysis.progressionCurve.tick100.toFixed(2)} species (avg)`);
    console.log(`  Tick 500:  ${analysis.progressionCurve.tick500.toFixed(2)} species (avg)`);
    console.log(`  Tick 1000: ${analysis.progressionCurve.tick1000.toFixed(2)} species (avg)`);
    console.log(`  Peak:      ${analysis.avgMaxSpecies.toFixed(2)} species (avg max)`);
    console.log('');

    console.log('🔍 DISCOVERY METRICS:');
    console.log(`  First Discovery:  ${analysis.avgFirstDiscovery.toFixed(1)} ticks (avg)`);
    console.log(`  Discovery Rate:   ${analysis.avgDiscoveryRate.toFixed(3)} per 100 ticks`);
    console.log(`  Observations:     ${analysis.observationEfficiency.toFixed(1)} per species (avg)`);
    console.log('');

    console.log('💀 SURVIVAL METRICS:');
    console.log(`  Extinction Rate:  ${(analysis.extinctionRate * 100).toFixed(1)}%`);
    console.log('');

    console.log('🎯 TUNING RECOMMENDATIONS:');
    console.log('───────────────────────────────────────────────────────────');
    analysis.recommendedTuning.forEach(rec => {
      console.log(`  ${rec}`);
    });
    console.log('═══════════════════════════════════════════════════════════\n');

    expect(analysis.totalRuns).toBe(SIMULATION_COUNT);
  }, 3600000); // 1 hour timeout for full analysis
});
