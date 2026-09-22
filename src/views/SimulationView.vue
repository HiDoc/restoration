<template>
  <div class="flex h-screen flex-col text-slate-100 overflow-hidden" :class="viewMode === 'contemplative' ? 'bg-transparent' : 'bg-slate-950/95'">
    <div v-if="isInitializing || initializationError || !engine" class="m-auto max-w-md px-6 text-center" role="status" aria-live="polite">
      <p class="text-lg font-semibold">{{ initializationError ? 'The ecosystem could not load' : 'Preparing your ecosystem…' }}</p>
      <p v-if="initializationError" class="mt-3 text-sm text-slate-300">Check your connection, then try again.</p>
      <button v-if="initializationError" type="button" class="sci-btn mt-5 px-4 py-2" @click="init">Try again</button>
    </div>
    <template v-else>
    <div v-if="runtimeError" class="border-b border-rose-400/30 bg-slate-950 px-4 py-3 text-sm text-rose-100" role="alert">
      The simulation stopped unexpectedly. Load a saved ecosystem or restart to continue.
      <button type="button" class="sci-btn ml-3 px-3 py-1" @click="loadLatestSnapshot">Load</button>
      <button type="button" class="sci-btn ml-2 px-3 py-1" @click="restartAfterExtinction">Restart</button>
    </div>
    <!-- Contemplative View -->
    <template v-if="viewMode === 'contemplative'">
      <!-- Floating Controls -->
      <FloatingControls
        :is-running="isRunning"
        :season-name="(stats as any).seasonName ?? 'Season'"
        :current-year="currentYear"
        :speed="options.tickMs"
        :year-progress="yearProgress"
        :blocked="showYearEndModal || extinction.triggered || !!runtimeError"
        :saving="isSaving"
        :loading="isLoadingSnapshot"
        :view-mode="viewMode"
        @toggle-play="toggleRunState"
        @decrease-speed="decreaseSpeed"
        @increase-speed="increaseSpeed"
        @step="stepOnce"
        @save="saveSnapshot"
        @load="loadLatestSnapshot"
        @scenarios="scenarioStore.openScenarioSelector()"
        @toggle-view-mode="toggleViewMode"
      />

      <!-- Fullscreen Ecosystem Canvas -->
      <main class="flex-1 flex items-center justify-center overflow-hidden contemplative-canvas">
        <ChunkGrid
          :chunk-grid="displayChunkGrid"
          :width="width"
          :show-labels="false"
          :viz-mode="'rgb'"
          :engine="engine"
          :selected="selected"
          :season-name="(stats as any).seasonName ?? 'Season'"
          :contemplative="true"
          @select="onSelectChunk"
        />
      </main>
    </template>

    <!-- Analytical View (Original Layout) -->
    <template v-else>
      <!-- Fixed Header - Compact -->
      <header class="flex-shrink-0 flex items-center justify-between gap-4 border-b border-sky-400/25 bg-slate-900/70 px-4 py-2 shadow-lg">
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-200/80">
            <span>{{ (stats as any).seasonName ?? 'Season' }}</span>
            <span class="text-xs font-normal text-sky-300/70">Y{{ currentYear }}</span>
          </div>
          <div class="flex items-center gap-2 min-w-[120px]">
            <div class="h-1.5 flex-1 rounded-full bg-slate-800">
              <div
                class="h-1.5 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-400 transition-all"
                :style="{ width: `${Math.round((yearProgress ?? 0) * 100)}%` }"
              ></div>
            </div>
            <span class="text-xs text-slate-300/80 whitespace-nowrap">{{ Math.round((yearProgress ?? 0) * 100) }}%</span>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <span class="text-xs text-slate-300/80">T{{ stats.currentTick }}</span>
          <button type="button" class="sci-btn px-2 py-1 text-xs" :disabled="options.tickMs >= 1000" aria-label="Slower simulation" @click="decreaseSpeed">−</button>
          <span class="text-xs tabular-nums">×{{ Number((100 / options.tickMs).toFixed(2)) }}</span>
          <button type="button" class="sci-btn px-2 py-1 text-xs" :disabled="options.tickMs <= 10" aria-label="Faster simulation" @click="increaseSpeed">+</button>
          <button type="button" class="sci-btn px-3 py-1.5 text-xs" :disabled="isRunning || showYearEndModal || extinction.triggered || !!runtimeError" @click="stepOnce">Step one day</button>
          <button type="button" class="sci-btn px-3 py-1.5 text-xs" :disabled="isSaving" @click="saveSnapshot">{{ isSaving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="sci-btn px-3 py-1.5 text-xs" :disabled="isLoadingSnapshot" @click="loadLatestSnapshot">{{ isLoadingSnapshot ? 'Loading…' : 'Load' }}</button>
          <button type="button" class="sci-btn px-3 py-1.5 text-xs" @click="scenarioStore.openScenarioSelector()">Scenarios</button>
          <button
            type="button"
            :disabled="showYearEndModal || extinction.triggered || !!runtimeError"
            class="sci-btn flex items-center gap-2 border border-sky-400/60 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-300 hover:bg-sky-900/40"
            @click="toggleRunState"
          >
            <span>{{ isRunning ? '⏸' : '▶' }}</span>
            {{ isRunning ? 'Pause' : 'Play' }}
          </button>
          <button
            type="button"
            class="sci-btn flex items-center gap-2 border border-amber-400/60 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-300 hover:bg-amber-900/40"
            @click="toggleViewMode"
            title="Switch to Contemplative View"
          >
            <span>🌿</span>
          </button>
        </div>
      </header>

    <!-- Extinction Alert - Positioned Above Content -->
    <div
      v-if="extinction.triggered"
      class="flex-shrink-0 flex items-center justify-between gap-3 border-b border-rose-400/30 bg-gradient-to-r from-rose-900/70 via-amber-900/20 to-transparent px-4 py-2 text-rose-100"
      role="status"
    >
      <span class="text-sm font-semibold">💀 All species collapsed at tick {{ extinction.sinceTick }}</span>
      <div class="flex items-center gap-2">
        <button
          class="sci-btn text-xs border border-rose-300/60 bg-rose-900/60 text-rose-100 px-3 py-1 transition-colors hover:border-rose-200 hover:bg-rose-700/60"
          @click="restartAfterExtinction"
        >
          🔄 Restart
        </button>
        <button
          class="sci-btn text-xs border border-rose-300/40 bg-rose-900/50 text-rose-100 px-3 py-1 transition-colors hover:border-rose-200 hover:bg-rose-700/50"
          @click="loadLatestSnapshot"
        >
          📥 Load
        </button>
      </div>
    </div>

    <!-- Main Content - Fixed Height Grid with new panels -->
    <main class="flex-1 grid grid-cols-[1fr_300px_280px_280px_280px] gap-3 px-3 py-3 overflow-hidden">
      <!-- Chunk Grid - Takes remaining space -->
      <section class="sci-panel flex flex-col border border-emerald-400/25 bg-gradient-to-br from-emerald-950/75 via-slate-950/65 to-slate-950/80 p-3 shadow-xl overflow-hidden chunk-grid-container">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-emerald-100 mb-2 flex-shrink-0">Chunk Grid</h2>
        <div class="flex-1 overflow-hidden">
          <ChunkGrid
            :chunk-grid="displayChunkGrid"
            :width="width"
            :show-labels="options.showLabels"
            :viz-mode="options.vizMode"
            :engine="engine"
            :selected="selected"
            @select="onSelectChunk"
          />
        </div>
      </section>

      <!-- Goals + Event Feed - Stacked in one column -->
      <aside class="flex flex-col gap-3 overflow-hidden event-log-container">
        <!-- Goals Panel -->
        <div class="flex-1 overflow-hidden goals-panel">
          <GoalsPanel />
        </div>

        <!-- Event Feed - Compact -->
        <div class="sci-panel flex flex-col border border-sky-400/25 bg-gradient-to-br from-slate-950/70 via-slate-950/60 to-slate-950/75 p-3 shadow-lg overflow-hidden" style="max-height: 300px;">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-sky-200 mb-2 flex-shrink-0">Events</h2>
          <div class="flex-1 overflow-y-auto overflow-x-hidden">
            <EventLog :events="events" />
          </div>
        </div>
      </aside>

      <!-- Research Panel - Fixed width, scrollable content -->
      <aside class="sci-panel overflow-hidden research-panel">
        <ResearchPanel
          @open-field-guide="researchStore.openFieldGuide()"
          @select-question="(q) => console.log('Selected question:', q)"
        />
      </aside>

      <!-- Hybridization Panel - Fixed width, scrollable content -->
      <aside class="sci-panel overflow-hidden">
        <HybridizationPanel
          :lineages="hybridizationLineages"
          :stats="hybridizationStats"
          @open-tree="showHybridizationTree = true"
          @view-hybrid="viewHybrid"
        />
      </aside>

      <!-- Intervention Panel - NEW! Fixed width, scrollable content -->
      <aside class="sci-panel overflow-hidden intervention-panel">
        <InterventionPanel :engine="engine" />
      </aside>
    </main>

    <!-- Hybridization Tree Modal (for analytical view) -->
    <div
      v-if="showHybridizationTree"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      @click.self="showHybridizationTree = false"
    >
      <div class="w-[90vw] h-[90vh] overflow-auto">
        <div class="flex justify-end mb-2">
          <button
            class="sci-btn text-xs py-1 px-3"
            @click="showHybridizationTree = false"
          >
            ✕ Close
          </button>
        </div>
        <HybridizationTree
          :lineages="hybridizationLineages"
          :stats="hybridizationStats"
        />
      </div>
    </div>
    </template>

    <!-- Common modals for both views -->
    <YearEndSeedSelection
      :show="showYearEndModal"
      :year="completedYear"
      :engine="engine"
      :total-species="stats.totalSpecies"
      :avg-vitality="stats.avgVitality"
      @close="showYearEndModal = false"
      @confirm="onYearEndConfirm"
    />

    <SpeciesDiscoveryModal
      :show="researchStore.showDiscoveryModal"
      :discovery="researchStore.latestDiscovery"
      :species-name="researchStore.latestDiscovery ? getSpeciesName(researchStore.latestDiscovery.speciesId) : ''"
      @close="researchStore.closeDiscoveryModal()"
      @open-field-guide="researchStore.closeDiscoveryAndOpenFieldGuide()"
    />

    <FieldGuidePanel
      :show="researchStore.showFieldGuide"
      :total-species="SpeciesRegistry.getInstance().getAllSpecies().length"
      @close="researchStore.closeFieldGuide()"
    />

    <!-- NEW GAMEPLAY MODALS -->

    <!-- Tutorial Welcome Modal -->
    <WelcomeModal
      :show="tutorialStore.showWelcomeModal"
      @close="tutorialStore.dismissWelcome()"
      @start-tutorial="startTutorial"
      @skip="skipTutorial"
    />

    <!-- Tutorial Tooltip Overlay -->
    <TooltipOverlay
      :show="tutorialStore.showTooltip && tutorialStore.activeTooltip !== null"
      :target-selector="tutorialStore.activeTooltip?.targetElement"
      :title="tutorialStore.activeTooltip?.title || ''"
      :content="tutorialStore.activeTooltip?.content || ''"
      :placement="tutorialStore.activeTooltip?.placement"
      @next="tutorialStore.completeCurrentStep()"
      @skip="tutorialStore.skipTutorial()"
    />

    <!-- Scenario Selector Modal -->
    <ScenarioSelector
      :show="scenarioStore.showScenarioSelector"
      :scenarios="scenarioStore.availableScenarios"
      :completed-scenario-ids="scenarioStore.completedScenarioIds"
      @close="scenarioStore.closeScenarioSelector()"
      @select="startScenario"
    />

    <!-- Scenario Progress HUD -->
    <ScenarioProgress
      v-if="scenarioStore.hasActiveScenario"
      :scenario="scenarioStore.activeScenario"
      :time-remaining="scenarioStore.timeRemaining"
      :time-progress="scenarioStore.timeProgress"
      :scenario-progress="scenarioStore.scenarioProgress"
      :completed-goals-count="goalsStore.completionCount"
    />

    <!-- Chunk Inspector -->
    <ChunkInspector
      :show="showChunkInspector"
      :chunk="selectedChunkForInspection"
      @close="showChunkInspector = false"
      @apply-intervention="applyInterventionFromInspector"
    />
    <p v-if="saveNotice" class="fixed bottom-6 left-6 z-[110] max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm text-slate-100 shadow-lg" role="status">{{ saveNotice }}</p>
    <div v-if="extinction.triggered && viewMode === 'contemplative'" class="fixed bottom-6 left-6 z-[110] rounded-lg bg-slate-950 px-4 py-3 text-sm" role="status">
      No living plants or viable seeds remain.
      <button type="button" class="sci-btn ml-3 px-3 py-1" @click="restartAfterExtinction">Restart</button>
      <button type="button" class="sci-btn ml-2 px-3 py-1" @click="loadLatestSnapshot">Load</button>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, computed, watch, type Ref } from "vue";
import {
  SimulationEngine,
  type SimulationConfig,
} from "@/simulation/SimulationEngine";
import { FixedStepLoop } from "@/core/FixedStepLoop";
import { advanceDailyIncome } from "@/simulation/GameplayEconomy";
import { initializeSimulationRuntime } from "@/simulation/rust/SimulationRuntime";
import { SpeciesRegistry } from "@/simulation/SpeciesRegistry";

// Components
import YearEndSeedSelection from "@/components/simulation/YearEndSeedSelection.vue";
import ChunkGrid from "@/components/simulation/ChunkGrid.vue";
import EventLog from "@/components/simulation/EventLog.vue";
import SpeciesDiscoveryModal from "@/components/simulation/SpeciesDiscoveryModal.vue";
import FieldGuidePanel from "@/components/simulation/FieldGuidePanel.vue";
import ResearchPanel from "@/components/simulation/ResearchPanel.vue";
import HybridizationPanel from "@/components/simulation/HybridizationPanel.vue";
import HybridizationTree from "@/components/simulation/HybridizationTree.vue";
import FloatingControls from "@/components/simulation/FloatingControls.vue";

// New gameplay components
import InterventionPanel from "@/components/simulation/InterventionPanel.vue";
import GoalsPanel from "@/components/simulation/GoalsPanel.vue";
import WelcomeModal from "@/components/simulation/WelcomeModal.vue";
import TooltipOverlay from "@/components/simulation/TooltipOverlay.vue";
import ScenarioSelector from "@/components/simulation/ScenarioSelector.vue";
import ScenarioProgress from "@/components/simulation/ScenarioProgress.vue";
import ChunkInspector from "@/components/simulation/ChunkInspector.vue";

// Stores and utilities
import { SimDB } from "@/persistence/SimDB";
import { useResearchStore } from "@/stores/researchStore";
import { useInterventionStore } from "@/stores/interventionStore";
import { useGoalsStore } from "@/stores/goalsStore";
import { useTutorialStore } from "@/stores/tutorialStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { DiscoveryMethod } from "@/simulation/ResearchSystem";
import type { VizMode } from "@/components/simulation/types";
import type { HybridLineage } from "@/simulation/HybridizationSystem";
import type { PlayerIntervention } from "@/simulation/SimulationEngine";

const engine: Ref<SimulationEngine | null> = ref(null);
const isInitializing = ref(true);
const initializationError = ref<string | null>(null);
const runtimeError = ref<string | null>(null);
const isSaving = ref(false);
const isLoadingSnapshot = ref(false);
const saveNotice = ref('');
let unmounted = false;
let initializationVersion = 0;

const width = ref(6);
const height = ref(6);
type SimulationEventEntry = { id: number; message: string; timeLabel: string; tick: number };
const events = ref<SimulationEventEntry[]>([]);
let eventCounter = 0;
const selected = ref<{ x: number; y: number } | null>(null);

// Year-end seed selection
const showYearEndModal = ref(false);
const completedYear = ref(0);
const currentYear = ref(0);
const yearProgress = ref(0);

const persist = reactive({
  autoSave: false,
  interval: 50,
  lastSavedTick: null as number | null,
});
let db: SimDB | null = null;

const options = reactive({
  worldWidth: 6,
  worldHeight: 6,
  tickMs: 100,
  vizMode: "rgb" as VizMode,
  showLabels: true,
});

const isRunning = ref(false);
const loop = new FixedStepLoop(updateOnce, {
  stepMs: options.tickMs,
  maxCatchUpSteps: 5,
  onError(error) {
    isRunning.value = false;
    runtimeError.value = error instanceof Error ? error.message : String(error);
    console.error('Simulation update failed:', error);
  },
});

// View mode state (contemplative/analytical)
const viewMode = ref<'contemplative' | 'analytical'>('contemplative');

const stats = reactive({
  currentTick: 0,
  activeChunks: 0,
  totalChunks: 0,
  totalSpecies: 0,
  avgVitality: 0,
  avgPollution: 0,
});

// Stores
const researchStore = useResearchStore();
const interventionStore = useInterventionStore();
const goalsStore = useGoalsStore();
const tutorialStore = useTutorialStore();
const scenarioStore = useScenarioStore();

const extinction = reactive({ triggered: false, sinceTick: 0 });
let extinctionGraceUntilTick = 50;
let resumeAfterYearEnd = false;

// Hybridization system
const showHybridizationTree = ref(false);
const hybridizationLineages = ref<Map<string, HybridLineage>>(new Map());
const hybridizationStats = ref({
  totalHybrids: 0,
  totalEvents: 0,
  successfulEvents: 0,
  averageGeneration: 0,
  maxGeneration: 0
});

// Lightweight gameplay state
const gameplay = reactive({
  points: 0,
  difficulty: 'normal' as 'easy'|'normal'|'hard',
  lastDayCounted: 0,
})

// Chunk inspector state
const showChunkInspector = ref(false);
const selectedChunkForInspection = ref<any>(null);

const chunkGrid = computed(() => {
  if (!engine.value) return [] as any[];
  const chunks = engine.value.getChunksInArea(
    0,
    0,
    width.value - 1,
    height.value - 1
  );
  return chunks.sort((a, b) => a.y - b.y || a.x - b.x);
});

type HistoryFrame = { tick: number; capturedAt: string; grid: any[] };
const historyConfig = { captureEvery: 12, maxFrames: 24 };
const historyFrames = ref<HistoryFrame[]>([]);
const selectedHistoryIndex = ref<number>(-1);

const displayChunkGrid = computed(() => {
  if (selectedHistoryIndex.value === -1) return chunkGrid.value;
  const frame = historyFrames.value[selectedHistoryIndex.value];
  return frame?.grid || chunkGrid.value;
});

// Species change detection helpers
const prevSpecies: Map<string, Map<string, string>> = new Map();
const seenWeather: Set<string> = new Set();

async function init() {
  const version = ++initializationVersion;
  pause();
  isInitializing.value = true;
  initializationError.value = null;
  runtimeError.value = null;
  try {
    await initializeSimulationRuntime();
    if (unmounted || version !== initializationVersion) return;
    initializeWorld();
  } catch (error) {
    initializationError.value = error instanceof Error ? error.message : String(error);
    console.error('Ecosystem initialization failed:', error);
  } finally {
    if (!unmounted && version === initializationVersion) isInitializing.value = false;
  }
}

function initializeWorld() {
  const config: SimulationConfig = {
    worldWidth: options.worldWidth,
    worldHeight: options.worldHeight,
    chunkSize: 32,
    tickRate: 10,
    masterSeed: 12345,
    maxActiveChunks: options.worldWidth * options.worldHeight,
    seasonLengthTicks: 90,
    timePerTickMinutes: 1440,
  };
  engine.value = new SimulationEngine(config);

  historyFrames.value = [];
  selectedHistoryIndex.value = -1;

  // Activate all chunks for EcoSim view
  engine.value.activateAllChunks();

  events.value = [];
  eventCounter = 0;
  showYearEndModal.value = false;
  showChunkInspector.value = false;
  selectedChunkForInspection.value = null;
  selected.value = null;
  gameplay.points = 0;
  gameplay.lastDayCounted = 0;
  extinctionGraceUntilTick = 50;
  extinction.triggered = false;
  updateStats();
  initSpeciesSnapshot(engine.value.getAllChunks());
  seenWeather.clear();
  if (!db && typeof indexedDB !== "undefined") db = new SimDB();

  // Initialize research system
  const researchSystem = engine.value.getResearchSystem();
  if (researchSystem) {
    researchStore.reset();
    researchStore.initialize(engine.value.getEventJournal(), 0);
    engine.value.setResearchSystem(researchStore.system as any);

    // Manually discover starting species
    researchStore.manualDiscovery('common_grass', 0, DiscoveryMethod.INITIAL);

    // Set up periodic observation every 10 ticks
    engine.value.onTick((tick: number) => {
      if (tick % 10 === 0) {
        engine.value?.observeAllActiveSpecies();
      }
    });
  }

  // Initialize intervention system
  interventionStore.reset();
  interventionStore.initialize(engine.value, gameplay.difficulty);

  // Initialize goals system
  goalsStore.reset();
  goalsStore.initialize(engine.value, gameplay.difficulty, engine.value.getResearchSystem());

  // Initialize tutorial system
  tutorialStore.initializeTutorial();

  // Initialize scenario system
  scenarioStore.reset();
  scenarioStore.initialize(engine.value);

  // Set up goal evaluation callback (every tick)
  engine.value.onTick((tick: number) => {
    // Evaluate goals
    const alreadyCompleted = new Set(goalsStore.completedGoals.map(goal => goal.goal.id));
    const goalResults = goalsStore.evaluateGoals(tick);

    // Check for newly completed goals and award points
    goalResults.forEach(result => {
      if (result.completed && !alreadyCompleted.has(result.goal.id)) {
        // Award points to intervention store
        interventionStore.addPoints(result.goal.rewardPoints);
      }
    });

    // Evaluate scenario if active
    if (scenarioStore.hasActiveScenario) {
      const completedGoalIds = goalsStore.completedGoals.map(g => g.goal.id);
      scenarioStore.evaluateScenario(completedGoalIds);
    }

    // Update tutorial tooltips based on tick
    tutorialStore.triggerByTick(tick);
  });

  // Register year-end callback
  engine.value.onYearEnd(onYearEnd);

  // Initialize year progress
  updateYearProgress();
  captureHistory(stats.currentTick);
  updateHybridizationData();
  loop.setStepMs(options.tickMs);
  loop.setSuspended(document.hidden);
}

function updateOnce() {
  if (!engine.value || showYearEndModal.value || runtimeError.value) return;

  // Rust owns the full ecology schedule. Vue only observes the completed tick.
  engine.value.update();
  const chunks = engine.value.getAllChunks();
  updateStats();
  detectSpeciesChanges(chunks);
  detectWeatherEvents();
  updateHybridizationData();
  captureHistory(stats.currentTick);
  // Auto save
  if (
    persist.autoSave &&
    db &&
    stats.currentTick % Math.max(1, persist.interval) === 0
  ) {
    saveSnapshot();
  }
}

function updateStats() {
  if (!engine.value) return;
  const s = engine.value.getStatistics();
  stats.currentTick = s.currentTick;
  stats.activeChunks = s.activeChunks;
  stats.totalChunks = s.totalChunks;
  stats.totalSpecies = s.totalSpecies;
  stats.avgVitality = s.avgVitality;
  stats.avgPollution = s.avgPollution;
  (stats as any).seasonName = s.seasonName;
  (stats as any).seasonProgress = s.seasonProgress;
  (stats as any).dayFraction = s.dayFraction;
  (stats as any).simDays = (s as any).simDays ?? 0;
  const income = advanceDailyIncome(gameplay.lastDayCounted, s, gameplay.difficulty);
  gameplay.lastDayCounted = income.lastDayCounted;
  gameplay.points += income.points;
  if (income.points > 0) interventionStore.addPoints(income.points);
  
  // Update year progress
  updateYearProgress();

  if (stats.currentTick >= extinctionGraceUntilTick) {
    const hasViableSeeds = Array.from(engine.value.getAllChunks().values()).some(chunk =>
      chunk.seedBank.some(seed => seed.viability > 0)
    );
    if (stats.totalSpecies <= 0 && !hasViableSeeds) {
      if (!extinction.triggered) {
        pause();
        extinction.triggered = true;
        extinction.sinceTick = stats.currentTick;
        pushEvent('💀 All species have gone extinct. Simulation paused.');
      }
    } else if (extinction.triggered) {
      extinction.triggered = false;
    }
  }
}

function captureHistory(tick: number) {
  if (!engine.value || historyConfig.captureEvery <= 0) return;
  if (tick % historyConfig.captureEvery !== 0) return;

  const frame: HistoryFrame = {
    tick,
    capturedAt: new Date().toISOString(),
    grid: chunkGrid.value.map((chunk: any) => snapshotChunk(chunk)),
  };

  const viewingLatest = selectedHistoryIndex.value !== -1 && selectedHistoryIndex.value === historyFrames.value.length - 1;
  historyFrames.value.push(frame);
  if (historyFrames.value.length > historyConfig.maxFrames) {
    historyFrames.value.shift();
    if (selectedHistoryIndex.value !== -1) {
      selectedHistoryIndex.value = Math.max(0, selectedHistoryIndex.value - 1);
    }
  }
  if (selectedHistoryIndex.value !== -1) {
    if (!historyFrames.value.length) {
      selectedHistoryIndex.value = -1;
    } else if (viewingLatest) {
      selectedHistoryIndex.value = historyFrames.value.length - 1;
    } else {
      selectedHistoryIndex.value = Math.min(selectedHistoryIndex.value, historyFrames.value.length - 1);
    }
  }
}

function snapshotChunk(chunk: any) {
  const biomeState = chunk?.biomeState ? { ...chunk.biomeState } : {};
  const birds = (chunk as any).birds ? { ...((chunk as any).birds as Record<string, number>) } : undefined;
  const speciesLabel = makeSpeciesLabel(chunk);
  const base: any = {
    id: chunk.id,
    x: chunk.x,
    y: chunk.y,
    biomeState,
    pollinatorDensity: (chunk as any).pollinatorDensity ?? 0,
    birdsActivity: (chunk as any).birdsActivity ?? 0,
    seedBankCount: ((chunk as any).seedBank?.length) || 0,
  };
  if (birds) base.birds = birds;
  if (speciesLabel) base.speciesLabel = speciesLabel;
  return base;
}

function makeSpeciesLabel(chunk: any): string | undefined {
  try {
    const reg = SpeciesRegistry.getInstance();
    const speciesMap: Map<string, any[]> | undefined = chunk.species as Map<string, any[]> | undefined;
    if (!speciesMap || speciesMap.size === 0) return undefined;
    const counts = new Map<string, number>();
    speciesMap.forEach((instances, sid) => {
      counts.set(sid, (counts.get(sid) || 0) + (instances?.length || 0));
    });
    if (!counts.size) return undefined;
    const labels = Array.from(counts.keys())
      .slice(0, 3)
      .map((id) => abbreviate(reg.getSpecies(id)?.name || id));
    return `${labels.join(',')} (${counts.size})`;
  } catch {
    return undefined;
  }
}

function abbreviate(name: string): string {
  if (!name) return '';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const clean = name.replace(/[^a-zA-Z]/g, '');
  return clean.slice(0, 3).toUpperCase();
}

function getSpeciesName(speciesId: string): string {
  return speciesId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function updateHybridizationData() {
  if (!engine.value) return;
  const report = engine.value.getHybridizationStatistics();
  hybridizationStats.value = {
    totalHybrids: report.totalHybrids,
    totalEvents: report.hybridizationEvents,
    successfulEvents: report.hybridizationEvents,
    averageGeneration: 0,
    maxGeneration: 0,
  };
}

function viewHybrid(speciesId: string) {
  // Open the field guide to show hybrid details
  researchStore.openFieldGuide(speciesId);
}

function pushEvent(msg: string) {
  const entry: SimulationEventEntry = {
    id: ++eventCounter,
    message: msg,
    timeLabel: `T${stats.currentTick}`,
    tick: stats.currentTick,
  };
  events.value.push(entry);
  if (events.value.length > 200) {
    events.value.splice(0, events.value.length - 200);
  }
}

function start() {
  if (!engine.value || isInitializing.value || showYearEndModal.value || extinction.triggered || runtimeError.value) return;
  loop.start();
  isRunning.value = true;
}

function pause() {
  loop.pause();
  isRunning.value = false;
}

function stepOnce() {
  if (!engine.value || isInitializing.value || showYearEndModal.value || extinction.triggered || runtimeError.value) return;
  loop.step();
}

function onSelectChunk(payload: { x: number; y: number }) {
  selected.value = payload;

  // If an intervention is selected, apply it
  if (interventionStore.selectedIntervention && engine.value) {
    const chunkId = `chunk_${payload.x}_${payload.y}`;
    const intervention: PlayerIntervention = {
      chunkId,
      x: 0.5,
      y: 0.5,
      type: interventionStore.selectedIntervention,
      data: interventionStore.selectedIntervention === 'plant' ? { speciesId: interventionStore.selectedPlantSpecies } : {}
    };

    // Execute through store (handles cost/cooldown)
    void interventionStore.executeIntervention(intervention).then(success => {
      if (success) {
        updateStats();
        detectSpeciesChanges(engine.value!.getAllChunks());
      }
    });
  } else {
    // Open chunk inspector for detailed view
    const chunk = engine.value?.getChunk(payload.x, payload.y);
    if (chunk) {
      selectedChunkForInspection.value = chunk;
      showChunkInspector.value = true;
    }
  }
}

// Handler for tutorial
function startTutorial() {
  tutorialStore.startTutorial();
}

function skipTutorial() {
  tutorialStore.skipTutorial();
}

function startScenario(id: string) {
  pause();
  if (scenarioStore.startScenario(id)) {
    goalsStore.setActiveGoals(scenarioStore.activeScenario?.goalIds ?? []);
    updateStats();
    pushEvent(`Started scenario: ${scenarioStore.activeScenario?.name}. Press Play when ready.`);
  }
}

// Handler for applying intervention from inspector
function applyInterventionFromInspector(action: string) {
  if (!selectedChunkForInspection.value) return;

  interventionStore.selectIntervention(action as any);
  showChunkInspector.value = false;
}

async function saveSnapshot() {
  if (!engine.value || isSaving.value) return;
  if (!db) {
    saveNotice.value = 'Saving is unavailable in this browser.';
    return;
  }
  isSaving.value = true;
  const tick = engine.value.getCurrentTick();
  try {
    // Store data only: Vue proxies and goal evaluator functions cannot be cloned by IndexedDB.
    const state = JSON.parse(JSON.stringify({
      format: 'ecosim-game-v2',
      engine: engine.value.exportState(),
      research: researchStore.exportState(),
      interventions: interventionStore.exportState(),
      goals: goalsStore.exportState(),
      scenario: scenarioStore.exportState(),
      tutorial: tutorialStore.exportState(),
      gameplay: { ...gameplay },
      options: { ...options },
      yearEnd: { show: showYearEndModal.value, completedYear: completedYear.value, resume: resumeAfterYearEnd },
      extinctionGraceUntilTick,
    }));
    const id = await db.saveSnapshot({ createdAt: Date.now(), tick, state });
    persist.lastSavedTick = tick;
    saveNotice.value = `Ecosystem saved at day ${tick}.`;
    pushEvent(`💾 Saved snapshot #${id} @ tick ${tick}`);
  } catch (error) {
    saveNotice.value = 'The ecosystem could not be saved. Check available browser storage and try again.';
    console.error('Snapshot save failed:', error);
  } finally {
    isSaving.value = false;
  }
}

async function loadLatestSnapshot() {
  if (!engine.value || isLoadingSnapshot.value) return;
  if (!db) {
    saveNotice.value = 'Saved ecosystems are unavailable in this browser.';
    return;
  }
  pause();
  isLoadingSnapshot.value = true;
  try {
    const snap = await db.loadLatest();
    if (!snap) {
      saveNotice.value = 'No saved ecosystem yet. Use Save to create one.';
      return;
    }
    const legacy = snap.state?.format !== 'ecosim-game-v2';
    const state = snap.state;
    engine.value.importState(legacy ? state : state.engine);
    if (legacy) {
      researchStore.reset();
      researchStore.initialize(engine.value.getEventJournal(), engine.value.getCurrentTick());
      engine.value.setResearchSystem(researchStore.system as any);
      researchStore.manualDiscovery('common_grass', engine.value.getCurrentTick(), DiscoveryMethod.INITIAL);
      interventionStore.reset();
      interventionStore.initialize(engine.value, gameplay.difficulty);
      goalsStore.reset();
      goalsStore.initialize(engine.value, gameplay.difficulty, engine.value.getResearchSystem());
      scenarioStore.reset();
      scenarioStore.initialize(engine.value);
      gameplay.points = 0;
      gameplay.lastDayCounted = Math.floor(engine.value.getStatistics().simDays);
    } else {
      researchStore.importState(state.research);
      engine.value.setResearchSystem(researchStore.system as any);
      interventionStore.importState(state.interventions);
      goalsStore.importState(state.goals);
      scenarioStore.importState(state.scenario);
      tutorialStore.importState(state.tutorial);
      Object.assign(gameplay, state.gameplay);
      applySavedOptions(state.options);
    }
    const config = engine.value.getConfig();
    width.value = options.worldWidth = config.worldWidth;
    height.value = options.worldHeight = config.worldHeight;
    showYearEndModal.value = legacy ? false : state.yearEnd.show;
    completedYear.value = legacy ? engine.value.getCurrentYear() : state.yearEnd.completedYear;
    resumeAfterYearEnd = legacy ? false : state.yearEnd.resume;
    extinctionGraceUntilTick = legacy ? engine.value.getCurrentTick() + 50 : state.extinctionGraceUntilTick;
    extinction.triggered = false;
    runtimeError.value = null;
    showChunkInspector.value = false;
    selectedChunkForInspection.value = null;
    selected.value = null;
    historyFrames.value = [];
    selectedHistoryIndex.value = -1;
    events.value = [];
    seenWeather.clear();
    updateStats();
    initSpeciesSnapshot(engine.value.getAllChunks());
    updateHybridizationData();
    captureHistory(stats.currentTick);
    saveNotice.value = legacy
      ? `Legacy ecosystem converted at day ${snap.tick}; player progression starts fresh. Press Play when ready.`
      : `Ecosystem loaded at day ${snap.tick}. Press Play when ready.`;
    pushEvent(`📥 Loaded snapshot #${snap.id} @ tick ${snap.tick}`);
  } catch (error) {
    saveNotice.value = 'The saved ecosystem could not be loaded. Your simulation is paused.';
    console.error('Snapshot load failed:', error);
  } finally {
    isLoadingSnapshot.value = false;
  }
}

// Year-end seed selection functions
function onYearEnd(year: number) {
  resumeAfterYearEnd = isRunning.value;
  completedYear.value = year;
  showYearEndModal.value = true;
  // Pause simulation for seed selection
  if (isRunning.value) {
    pause();
  }
}

function onYearEndConfirm(seedInstanceId: string | null) {
  engine.value?.commitYearEndSelections();
  showYearEndModal.value = false;
  
  // Show notification
  const message = seedInstanceId 
    ? `✅ Selected specimen for Year ${completedYear.value + 1}` 
    : `⏭️ Using default genetics for Year ${completedYear.value + 1}`;
  pushEvent(message);
  
  // Resume simulation
  if (resumeAfterYearEnd) {
    start();
  }
}

function updateYearProgress() {
  if (engine.value?.getCurrentYear && engine.value?.getYearProgress) {
    currentYear.value = engine.value.getCurrentYear();
    yearProgress.value = engine.value.getYearProgress();
  }
}

function toggleRunState() {
  if (isRunning.value) {
    pause();
  } else {
    start();
  }
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'contemplative' ? 'analytical' : 'contemplative';
  saveViewModePreference();
}

function decreaseSpeed() {
  const speeds = [10, 50, 100, 200, 500, 1000];
  options.tickMs = speeds.find(speed => speed > options.tickMs) ?? speeds[speeds.length - 1];
}

function increaseSpeed() {
  const speeds = [10, 50, 100, 200, 500, 1000];
  options.tickMs = [...speeds].reverse().find(speed => speed < options.tickMs) ?? speeds[0];
}

function saveViewModePreference() {
  try {
    localStorage.setItem('ecosim-view-mode', viewMode.value);
  } catch {}
}

function loadViewModePreference() {
  try {
    const saved = localStorage.getItem('ecosim-view-mode');
    if (saved === 'contemplative' || saved === 'analytical') {
      viewMode.value = saved;
    }
  } catch {}
}

async function restartAfterExtinction() {
  gameplay.points = 0;
  pause();
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  extinction.triggered = false;
  await init();
  pushEvent('🌱 Simulation restarted after extinction.');
}

function initSpeciesSnapshot(chunks: Map<string, any>) {
  prevSpecies.clear();
  chunks.forEach((chunk, id) => {
    const m = new Map<string, string>();
    (chunk.species as Map<string, any>).forEach((inst, sid) => {
      m.set(sid, inst.speciesId);
    });
    prevSpecies.set(id, m);
  });
}

function detectSpeciesChanges(chunks: Map<string, any>) {
  const reg = SpeciesRegistry.getInstance();
  chunks.forEach((chunk, id) => {
    const oldMap = prevSpecies.get(id) || new Map<string, string>();
    const currentMap = new Map<string, string>();
    (chunk.species as Map<string, any>).forEach((inst, sid) =>
      currentMap.set(sid, inst.speciesId)
    );

    // births
    currentMap.forEach((spId, sid) => {
      if (!oldMap.has(sid)) {
        const name = reg.getSpecies(spId)?.name || spId;
        // Check if this is a hybrid (species ID starts with 'hybrid_')
        if (spId.startsWith('hybrid_')) {
          pushEvent(`🧬 HYBRID created: ${name} in chunk (${chunk.x},${chunk.y})`);
        } else {
          pushEvent(`🆕 ${name} spawned in chunk (${chunk.x},${chunk.y})`);
        }
      }
    });

    // deaths
    oldMap.forEach((spId, sid) => {
      if (!currentMap.has(sid)) {
        const name = reg.getSpecies(spId)?.name || spId;
        pushEvent(`☠️ ${name} died in chunk (${chunk.x},${chunk.y})`);
      }
    });

    prevSpecies.set(id, currentMap);
  });
}

function detectWeatherEvents() {
  if (!engine.value) return;
  const list = engine.value.getActiveWeatherEvents();
  list.forEach((ev) => {
    const key = `${ev.type}-${ev.centerX}-${ev.centerY}-${ev.startTick}`;
    if (!seenWeather.has(key)) {
      seenWeather.add(key);
      const emoji =
        ev.type === "storm"
          ? "⛈️"
          : ev.type === "drought"
          ? "☀️"
          : ev.type === "heat_wave"
          ? "🔥"
          : ev.type === "cold_snap"
          ? "❄️"
          : ev.type === "wind_storm"
          ? "🌬️"
          : ev.type === "fog"
          ? "🌫️"
          : "⛅";
      pushEvent(
        `${emoji} ${ev.type.replace(/_/g, " ")} near (${ev.centerX},${
          ev.centerY
        })`
      );
    }
  });
}

// Persist options to localStorage
const STORAGE_KEY = "simOptionsV1";
function loadOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    applySavedOptions(saved);
  } catch {}
}

function applySavedOptions(saved: Partial<typeof options> | null) {
  if (!saved || typeof saved !== 'object') return;
  for (const dimension of ['worldWidth', 'worldHeight'] as const) {
    const value = Number(saved[dimension]);
    if (Number.isInteger(value) && value >= 1 && value <= 20) options[dimension] = value;
  }
  const tickMs = Number(saved.tickMs);
  if (Number.isFinite(tickMs)) options.tickMs = Math.max(10, Math.min(1000, tickMs));
  if (typeof saved.showLabels === 'boolean') options.showLabels = saved.showLabels;
}

watch(() => options.tickMs, value => loop.setStepMs(value), { flush: 'sync' });

function onVisibilityChange() {
  loop.setSuspended(document.hidden);
}

watch(
  options,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch {}
  },
  { deep: true }
);

// Expose methods for parent components
defineExpose({
  getSimulationStats: () => ({
    currentTick: stats.currentTick,
    activeChunks: stats.activeChunks,
    totalChunks: stats.totalChunks,
    totalSpecies: stats.totalSpecies,
    avgVitality: stats.avgVitality,
    avgPollution: stats.avgPollution,
    biodiversity: stats.totalSpecies / Math.max(1, stats.activeChunks),
    ecosystemHealth: Math.max(0, stats.avgVitality - stats.avgPollution)
  }),
  getEngine: () => engine.value,
  step: stepOnce,
  pause,
  play: start,
  executeIntervention: (intervention: any) => engine.value?.executeIntervention(intervention)
});

onMounted(() => {
  loadOptions();
  loadViewModePreference();
  // Ensure grid reflects saved/current world size before creating engine
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  document.addEventListener('visibilitychange', onVisibilityChange);
  void init();
});

onBeforeUnmount(() => {
  unmounted = true;
  initializationVersion += 1;
  pause();
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<style scoped>
.contemplative-canvas {
  background: linear-gradient(to bottom, #2c3e50 0%, #4a5568 50%, #6b7280 100%);
  transition: background 1200ms ease;
}

/* Smooth view mode transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 600ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
