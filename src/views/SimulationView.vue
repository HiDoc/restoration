<template>
  <div class="grid grid-cols-[1fr_300px] min-h-full max-h-full">


    <main class="p-3 flex gap-3 flex-col relative max-h-screen overflow-y-auto">

      <PopulationGraph 
        :current-tick="stats.currentTick"
        :total-species="stats.totalSpecies"
        :chunks="engine?.getAllChunks()"
      />

      <div class="grid grid-cols-[1fr_280px] gap-3 items-start">
        <ChunkGrid
          :chunk-grid="chunkGrid"
          :width="width"
          :show-labels="options.showLabels"
          :viz-mode="options.vizMode"
          :engine="engine"
          :selected="selected"
          @select="onSelectChunk"
        />

        <div v-if="selectedChunk" class="flex flex-col gap-1.5">
          <TileInspector :chunk="selectedChunk" @close="clearSelection" />
        </div>
        <EventLog v-else :events="events" />
      </div>

      <LegendOverlay
        :overlay-legend="options.overlayLegend"
        :viz-mode="options.vizMode"
      />
    </main>

        <aside class="p-3 sci-divider-r flex gap-3 flex-col overflow-y-auto max-h-screen">
      <section class="sci-panel p-2.5" v-if="!props.gameMode">
        <div class="sci-header flex items-center justify-between font-semibold -m-1 p-1 mb-2" v-dropdown>
          <span>Controls</span>
          <span class="sci-collapse-toggle">−</span>
        </div>
        <div class="mt-1.5">
          <SimulationControls
            :tick-ms="options.tickMs"
            :step-count="options.stepCount"
            :is-running="isRunning"
            @start="start"
            @pause="pause"
            @step="step"
            @multi-step="multiStep"
            @update:tick-ms="updateTickMs"
            @update:step-count="options.stepCount = $event"
          />
          <div class="flex gap-2 flex-wrap mb-1.5">
            <button class="sci-btn" @click="applyActiveRadius" title="Activate chunks around center">🟩 Apply Active Radius</button>
            <button class="sci-btn" @click="recreate" title="Recreate world with current size">🔁 Recreate World</button>
          </div>
          <div class="flex gap-2 flex-wrap mb-1.5">
            <button class="sci-btn" @click="plantCenter" title="Plant selected species at world center">🌱 Plant Center</button>
            <button class="sci-btn" @click="plantRandom" title="Plant selected species randomly">🎲 Plant Random</button>
          </div>
          <div class="flex gap-2 flex-wrap mb-1.5">
            <button class="sci-btn" @click="irrigateCenter" :title="`Add moisture +${options.irrigateAmount.toFixed(2)} at center`">💧 Irrigate Center</button>
            <button class="sci-btn" @click="cleanseCenter" :title="`Reduce pollution -${options.cleanseAmount.toFixed(2)} at center`">🧹 Cleanse Center</button>
          </div>
        </div>
      </section>

      <section class="sci-panel p-2.5">
        <div class="sci-header flex items-center justify-between font-semibold -m-1 p-1 mb-2" v-dropdown>
          <span>Time</span>
          <span class="sci-collapse-toggle">−</span>
        </div>
        <div class="mt-1.5">
          <div class="flex justify-between">
            <span>Season&nbsp;</span><b>{{ (stats as any).seasonName }} ({{ Math.round(((stats as any).seasonProgress || 0)*100) }}%)</b>
          </div>
          <div class="flex justify-between">
            <span>Year</span><b>{{ currentYear }}</b>
          </div>
          <div class="flex flex-col gap-1 mb-1.5">
            <span>Year Progress</span>
            <div class="sci-progress">
              <div class="sci-progress-bar eco-bar-vitality transition-all duration-300 ease-in-out" :style="{ width: (yearProgress * 100) + '%' }"></div>
            </div>
            <span class="text-xs text-center">{{ Math.round(yearProgress * 100) }}%</span>
          </div>
        </div>
      </section>

      <section class="sci-panel p-2.5">
        <div class="sci-header flex items-center justify-between font-semibold -m-1 p-1 mb-2" v-dropdown>
          <span>Time Control</span>
          <span class="sci-collapse-toggle">−</span>
        </div>
        <div class="mt-1.5">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <button
                class="sci-btn-primary w-full justify-center flex"
                @click="start"
                :disabled="isRunning"
                title="Start the simulation"
              >
                ▶ Start
              </button>
              <button
                class="sci-btn w-full justify-center flex"
                @click="pause"
                :disabled="!isRunning"
                title="Pause the simulation"
              >
                ⏸ Pause
              </button>
              <button class="sci-btn w-full justify-center flex" @click="step" title="Advance one tick">
                ⏭ Step
              </button>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-xs flex flex-col gap-1.5">
                Speed
                <input
                  class="w-full m-0"
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  v-model.number="options.tickMs"
                  @input="updateTickMs(options.tickMs)"
                />
              </label>
            </div>
            
            <div class="flex flex-col gap-2">
              <span class="text-xs">Time Scale</span>
              <div class="flex gap-1">
                <button class="sci-btn sci-btn-sm flex-1 text-xs" :class="{'outline outline-2 outline-primary-400 outline-offset-[-2px]': options.timeScale==='minute'}" @click="setTimeScale('minute')" title="1 minute per tick">1m</button>
                <button class="sci-btn sci-btn-sm flex-1 text-xs" :class="{'outline outline-2 outline-primary-400 outline-offset-[-2px]': options.timeScale==='hour'}" @click="setTimeScale('hour')" title="1 hour per tick">1h</button>
                <button class="sci-btn sci-btn-sm flex-1 text-xs" :class="{'outline outline-2 outline-primary-400 outline-offset-[-2px]': options.timeScale==='day'}" @click="setTimeScale('day')" title="1 day per tick">1d</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="sci-panel p-2.5">
        <div class="sci-header flex items-center justify-between font-semibold -m-1 p-1 mb-2" v-dropdown>
          <span>Seed Selection</span>
          <span class="sci-collapse-toggle">−</span>
        </div>
        <div class="mt-1.5">
          <SeedSelection :engine="engine" />
        </div>
      </section>

      <section class="sci-panel p-2.5">
        <div class="sci-header flex items-center justify-between font-semibold -m-1 p-1 mb-2" v-dropdown>
          <span>Persistence</span>
          <span class="sci-collapse-toggle">−</span>
        </div>
        <div class="mt-1.5">
          <SimulationPersistence
            :auto-save="persist.autoSave"
            :interval="persist.interval"
            :last-saved-tick="persist.lastSavedTick"
            :backend="persist.backend"
            @update:auto-save="persist.autoSave = $event"
            @update:interval="persist.interval = $event"
            @update:backend="switchBackend($event)"
            @save-now="saveSnapshot"
            @load-latest="loadLatestSnapshot"
            @clear-saves="clearSaves"
          />
        </div>
      </section>
      <section class="sci-panel p-2.5">
        <div class="sci-header flex items-center justify-between font-semibold -m-1 p-1 mb-2" v-dropdown>
          <span>Appearance</span>
          <span class="sci-collapse-toggle">−</span>
        </div>
        <div class="mt-1.5">
          <ThemeSwitcher />
        </div>
      </section>
    </aside>

    <!-- Year-end seed selection modal -->
    <YearEndSeedSelection
      :show="showYearEndModal"
      :year="completedYear"
      :engine="engine"
      :total-species="stats.totalSpecies"
      :avg-vitality="stats.avgVitality"
      @close="showYearEndModal = false"
      @confirm="onYearEndConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  reactive,
  ref,
  computed,
  watch,
} from "vue";
import {
  SimulationEngine,
  type SimulationConfig,
} from "@/simulation/SimulationEngine";
import { WeatherSystem } from "@/simulation/WeatherSystem";
import { HydrologySystem } from "@/simulation/HydrologySystem";
import { CanopySystem } from "@/simulation/CanopySystem";
import { PollinatorSystem } from "@/simulation/PollinatorSystem";
import { BirdsSystem } from "@/simulation/BirdsSystem";
import { VegetationSystem } from "@/simulation/VegetationSystem";
import { SpeciesRegistry } from "@/simulation/SpeciesRegistry";

// Components
import SimulationControls from "@/components/simulation/SimulationControls.vue";
import InterventionControls from "@/components/simulation/InterventionControls.vue";
import SeedSelection from "@/components/simulation/SeedSelection.vue";
import YearEndSeedSelection from "@/components/simulation/YearEndSeedSelection.vue";
import ChunkGrid from "@/components/simulation/ChunkGrid.vue";
import EventLog from "@/components/simulation/EventLog.vue";
import LegendOverlay from "@/components/simulation/LegendOverlay.vue";
import SimulationPersistence from "@/components/simulation/SimulationPersistence.vue";
import TileInspector from "@/components/simulation/TileInspector.vue";
import PopulationGraph from "@/components/simulation/PopulationGraph.vue";
import ThemeSwitcher from "@/components/simulation/ThemeSwitcher.vue";
import { SimDB } from "@/persistence/SimDB";
import { SqliteSimDB } from "@/persistence/SqliteSimDB";
import { dropdown as vDropdown } from "@/utils/dropdown";
// Register local directive for collapsible sections
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - defineOptions macro provided by Vue
defineOptions({ directives: { dropdown: vDropdown } })

// Props
const props = withDefaults(defineProps<{
  gameMode?: boolean
}>(), {
  gameMode: false
})

const engine = ref<SimulationEngine | null>(null);
const weather = ref<WeatherSystem | null>(null);
const hydro = ref<HydrologySystem | null>(null);
const canopy = ref<CanopySystem | null>(null);
const vegetation = ref<VegetationSystem | null>(null);
const pollinators = ref<PollinatorSystem | null>(null);
const birds = ref<BirdsSystem | null>(null);

const width = ref(6);
const height = ref(6);
const tickHandle = ref<number | null>(null);
const events = ref<string[]>([]);
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
  backend: "indexeddb" as "indexeddb" | "sqlite",
});
let db: SimDB | SqliteSimDB | null = null;

const options = reactive({
  worldWidth: 6,
  worldHeight: 6,
  tickMs: 100,
  stepCount: 10,
  vizMode: "rgb" as
    | "rgb"
    | "vitality"
    | "moisture"
    | "pollution"
    | "diversity"
    | "succession",
  timeScale: 'day' as 'minute'|'hour'|'day',
  showLabels: true,
  speciesId: "common_grass",
  irrigateAmount: 0.2,
  cleanseAmount: 0.2,
  overlayLegend: true,
});

const isRunning = ref(false);

const stats = reactive({
  currentTick: 0,
  activeChunks: 0,
  totalChunks: 0,
  totalSpecies: 0,
  avgVitality: 0,
  avgPollution: 0,
});

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

// Species change detection helpers
const prevSpecies: Map<string, Map<string, string>> = new Map();
const seenWeather: Set<string> = new Set();

function init() {
  const config: SimulationConfig = {
    worldWidth: options.worldWidth,
    worldHeight: options.worldHeight,
    chunkSize: 32,
    tickRate: 1000 / Math.max(10, options.tickMs),
    masterSeed: 12345,
    maxActiveChunks: 36,
  };
  engine.value = new SimulationEngine(config);

  // Activate all chunks for EcoSim view
  engine.value.activateAllChunks();

  weather.value = new WeatherSystem();
  // Align weather seasons with engine
  try {
    (weather.value as any).seasonLength =
      engine.value.getConfig().seasonLengthTicks;
  } catch {}
  hydro.value = new HydrologySystem();
  canopy.value = new CanopySystem();
  vegetation.value = new VegetationSystem(engine.value);

  hydro.value.initializeElevation(engine.value.getAllChunks());

  pollinators.value = new PollinatorSystem();
  pollinators.value.initialize(engine.value.getAllChunks());

  birds.value = new BirdsSystem();
  birds.value.initialize(engine.value.getAllChunks());

  updateStats();
  initSpeciesSnapshot(engine.value.getAllChunks());
  seenWeather.clear();
  if (typeof indexedDB !== "undefined") db = new SimDB();
  
  // Register year-end callback
  engine.value.onYearEnd(onYearEnd);
  
  // Initialize year progress
  updateYearProgress();
}

function updateOnce() {
  if (!engine.value || !weather.value || !hydro.value || !canopy.value) return;

  engine.value.update();

  const tick = engine.value.getCurrentTick();
  const chunks = engine.value.getAllChunks();
  const active = engine.value.getActiveChunkIds();

  // Annotate chunks with season info for systems that read from chunk
  const seasonStats: any = engine.value.getStatistics();
  chunks.forEach((c) => {
    (c as any).seasonName = seasonStats.seasonName;
    (c as any).seasonProgress = seasonStats.seasonProgress;
  });

  weather.value.update(tick, chunks);
  hydro.value.update(chunks, active);

  active.forEach((id) => {
    const c = chunks.get(id);
    if (c) {
      canopy.value!.update(c);
      // Run vegetation system to handle reproduction, dispersal, germination
      // Obtain days per tick from engine time scale
      const daysPerTick = (engine.value as any)?.getDaysPerTick?.() ?? 1
      vegetation.value!.update(c, daysPerTick);
    }
  });

  pollinators.value?.update(chunks);
  birds.value?.update(chunks, tick);

  detectSpeciesChanges(chunks);
  detectWeatherEvents();

  updateStats();
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
  
  // Update year progress
  updateYearProgress();
}

function pushEvent(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  events.value.push(`[${timestamp}] ${msg}`);
  if (events.value.length > 200)
    events.value.splice(0, events.value.length - 200);
}

function start() {
  if (tickHandle.value != null) return;
  isRunning.value = true;
  tickHandle.value = window.setInterval(
    updateOnce,
    Math.max(10, options.tickMs)
  );
}

function pause() {
  if (tickHandle.value != null) {
    clearInterval(tickHandle.value);
    tickHandle.value = null;
  }
  isRunning.value = false;
}

function step() {
  updateOnce();
}

function multiStep() {
  for (let i = 0; i < Math.max(1, options.stepCount); i++) updateOnce();
}

function updateTickMs(value: number) {
  options.tickMs = value;
  if (tickHandle.value != null) {
    pause();
    start();
  }
  if (engine.value) {
    engine.value.setTickRate(1000 / Math.max(10, options.tickMs));
  }
}

function onSelectChunk(payload: { x: number; y: number }) {
  selected.value = payload;
}

const selectedChunk = computed(() => {
  if (!selected.value || !engine.value) return null;
  return engine.value.getChunk(selected.value.x, selected.value.y);
});

async function switchBackend(backend: "indexeddb" | "sqlite") {
  persist.backend = backend;
  db = null;
  if (backend === "indexeddb") {
    if (typeof indexedDB !== "undefined") db = new SimDB();
    else pushEvent("⚠️ IndexedDB not available");
  } else {
    const sqlite = new SqliteSimDB();
    const ok = await sqlite.init();
    if (ok) db = sqlite;
    else pushEvent("⚠️ SQLite (sql.js) not available");
  }
}

async function saveSnapshot() {
  if (!db || !engine.value) return;
  const id = await db.saveSnapshot({
    createdAt: Date.now(),
    tick: stats.currentTick,
    state: engine.value.exportState(),
  });
  persist.lastSavedTick = stats.currentTick;
  pushEvent(`💾 Saved snapshot #${id} @ tick ${stats.currentTick}`);
}

async function loadLatestSnapshot() {
  if (!db || !engine.value) return;
  const snap = await db.loadLatest();
  if (!snap) {
    pushEvent("ℹ️ No snapshots found");
    return;
  }
  engine.value.importState(snap.state);
  updateStats();
  pushEvent(`📥 Loaded snapshot #${snap.id} @ tick ${snap.tick}`);
}

async function clearSaves() {
  if (db) {
    await db.clearAll();
    pushEvent("🗑️ Cleared all snapshots");
  }
}

function plantCenter() {
  if (!engine.value) return;
  const cx = Math.floor(options.worldWidth / 2);
  const cy = Math.floor(options.worldHeight / 2);
  const chunk = engine.value.getChunk(cx, cy);
  if (!chunk) return;
  engine.value.executeIntervention({
    chunkId: chunk.id,
    x: 0.5,
    y: 0.5,
    type: "plant",
    data: { speciesId: options.speciesId },
  });
  updateStats();
  pushEvent(`🌱 Planted ${options.speciesId} at center (${cx},${cy})`);
}

function plantRandom() {
  if (!engine.value) return;
  const rx = Math.floor(Math.random() * options.worldWidth);
  const ry = Math.floor(Math.random() * options.worldHeight);
  const chunk = engine.value.getChunk(rx, ry);
  if (!chunk) return;
  engine.value.executeIntervention({
    chunkId: chunk.id,
    x: Math.random(),
    y: Math.random(),
    type: "plant",
    data: { speciesId: options.speciesId },
  });
  updateStats();
  pushEvent(`🌱 Planted ${options.speciesId} at random (${rx},${ry})`);
}

function irrigateCenter() {
  if (!engine.value) return;
  const cx = Math.floor(options.worldWidth / 2);
  const cy = Math.floor(options.worldHeight / 2);
  const chunk = engine.value.getChunk(cx, cy);
  if (!chunk) return;
  engine.value.executeIntervention({
    chunkId: chunk.id,
    x: 0.5,
    y: 0.5,
    type: "irrigate",
    data: { amount: options.irrigateAmount },
  });
  updateStats();
  pushEvent(`💧 Irrigated +${options.irrigateAmount.toFixed(2)} at center`);
}

function cleanseCenter() {
  if (!engine.value) return;
  const cx = Math.floor(options.worldWidth / 2);
  const cy = Math.floor(options.worldHeight / 2);
  const chunk = engine.value.getChunk(cx, cy);
  if (!chunk) return;
  engine.value.executeIntervention({
    chunkId: chunk.id,
    x: 0.5,
    y: 0.5,
    type: "cleanse",
    data: { amount: options.cleanseAmount },
  });
  updateStats();
  pushEvent(
    `🧹 Cleansed -${options.cleanseAmount.toFixed(2)} pollution at center`
  );
}

function applyActiveRadius() {
  if (!engine.value) return;
  engine.value.activateChunksAroundPoint(
    Math.floor(options.worldWidth / 2),
    Math.floor(options.worldHeight / 2),
    1
  );
}

function recreate() {
  pause();
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  init();
}


function clearSelection() {
  selected.value = null;
}

// Year-end seed selection functions
function onYearEnd(year: number) {
  console.log(`Year ${year} completed!`);
  completedYear.value = year;
  showYearEndModal.value = true;
  // Pause simulation for seed selection
  if (isRunning.value) {
    pause();
  }
}

function onYearEndConfirm(seedInstanceId: string | null) {
  console.log('Year-end seed selection:', seedInstanceId);
  showYearEndModal.value = false;
  
  // Show notification
  const message = seedInstanceId 
    ? `✅ Selected specimen for Year ${completedYear.value + 1}` 
    : `⏭️ Using default genetics for Year ${completedYear.value + 1}`;
  pushEvent(message);
  
  // Resume simulation
  if (!isRunning.value) {
    start();
  }
}

function updateYearProgress() {
  if (engine.value?.getCurrentYear && engine.value?.getYearProgress) {
    currentYear.value = engine.value.getCurrentYear();
    yearProgress.value = engine.value.getYearProgress();
  }
}

function setTimeScale(scale: 'minute'|'hour'|'day') {
  (options as any).timeScale = scale
  const minutes = scale === 'minute' ? 1 : scale === 'hour' ? 60 : 1440
  ;(engine.value as any)?.setTimePerTickMinutes?.(minutes)
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
        pushEvent(`🆕 ${name} spawned in chunk (${chunk.x},${chunk.y})`);
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
  if (!weather.value) return;
  const list = weather.value.getActiveWeatherEvents();
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
    Object.assign(options, saved);
  } catch {}
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
    ecosystemHealth: Math.max(0, (stats.avgVitality - stats.avgPollution)) / 100
  }),
  getEngine: () => engine.value,
  executeIntervention: (intervention: any) => engine.value?.executeIntervention(intervention)
});

onMounted(() => {
  loadOptions();
  // Ensure grid reflects saved/current world size before creating engine
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  init();
});

onBeforeUnmount(() => pause());
</script>

<!-- All styles have been converted to Tailwind CSS classes -->
