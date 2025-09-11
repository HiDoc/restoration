<template>
  <div class="sim-layout">
    <aside class="sidebar">
      <section class="card" v-if="!props.gameMode">
        <div class="section-header" v-dropdown>
          <span>Controls</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
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
          <div class="qa-row">
            <button
              class="btn"
              @click="applyActiveRadius"
              title="Activate chunks around center"
            >
              🟩 Apply Active Radius
            </button>
            <button
              class="btn"
              @click="recreate"
              title="Recreate world with current size"
            >
              🔁 Recreate World
            </button>
          </div>
          <div class="qa-row">
            <button
              class="btn"
              @click="plantCenter"
              title="Plant selected species at world center"
            >
              🌱 Plant Center
            </button>
            <button
              class="btn"
              @click="plantRandom"
              title="Plant selected species randomly"
            >
              🎲 Plant Random
            </button>
          </div>
          <div class="qa-row">
            <button
              class="btn"
              @click="irrigateCenter"
              :title="`Add moisture +${options.irrigateAmount.toFixed(
                2
              )} at center`"
            >
              💧 Irrigate Center
            </button>
            <button
              class="btn"
              @click="cleanseCenter"
              :title="`Reduce pollution -${options.cleanseAmount.toFixed(
                2
              )} at center`"
            >
              🧹 Cleanse Center
            </button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>Time</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body time-card">
          <div class="row">
            <label>Scale</label>
            <div class="btn-group">
              <button class="btn" :class="{active: options.timeScale==='minute'}" @click="setTimeScale('minute')">1 min/tick</button>
              <button class="btn" :class="{active: options.timeScale==='hour'}" @click="setTimeScale('hour')">1 hr/tick</button>
              <button class="btn" :class="{active: options.timeScale==='day'}" @click="setTimeScale('day')">1 day/tick</button>
            </div>
          </div>
          <div class="kv">
            <span>Day</span><b>{{ Math.floor((stats as any).simDays || 0) }}</b>
          </div>
          <div class="kv">
            <span>Season</span><b>{{ (stats as any).seasonName }} ({{ Math.round(((stats as any).seasonProgress || 0)*100) }}%)</b>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>World Configuration</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
          <WorldConfiguration
            :world-width="options.worldWidth"
            :world-height="options.worldHeight"
            :seed="options.seed"
            :active-radius="options.activeRadius"
            :max-active="options.maxActive"
            @update:world-width="options.worldWidth = $event"
            @update:world-height="options.worldHeight = $event"
            @update:seed="options.seed = $event"
            @update:active-radius="options.activeRadius = $event"
            @update:max-active="options.maxActive = $event"
            @apply-active-radius="applyActiveRadius"
            @recreate="recreate"
          />
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>Visualization</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
          <VisualizationSettings
            :viz-mode="options.vizMode"
            :show-labels="options.showLabels"
            :overlay-legend="options.overlayLegend"
            @update:viz-mode="options.vizMode = $event"
            @update:show-labels="options.showLabels = $event"
            @update:overlay-legend="options.overlayLegend = $event"
          />
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>Pollinators</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
          <PollinatorControls
            :show-bees="options.pollinators.showBees"
            :show-arrows="options.pollinators.showArrows"
            :diffusion-rate="options.pollinators.diffusionRate"
            :diversity-weight="options.pollinators.diversityWeight"
            :light-weight="options.pollinators.lightWeight"
            :canopy-weight="options.pollinators.canopyWeight"
            :temp-weight="options.pollinators.tempWeight"
            :wind-penalty="options.pollinators.windPenalty"
            :rain-penalty="options.pollinators.rainPenalty"
            @update:show-bees="options.pollinators.showBees = $event"
            @update:show-arrows="options.pollinators.showArrows = $event"
            @update:diffusion-rate="
              updatePollinatorConfig('diffusionRate', $event)
            "
            @update:diversity-weight="
              updatePollinatorConfig('diversityWeight', $event)
            "
            @update:light-weight="updatePollinatorConfig('lightWeight', $event)"
            @update:canopy-weight="
              updatePollinatorConfig('canopyWeight', $event)
            "
            @update:temp-weight="updatePollinatorConfig('tempWeight', $event)"
            @update:wind-penalty="updatePollinatorConfig('windPenalty', $event)"
            @update:rain-penalty="updatePollinatorConfig('rainPenalty', $event)"
          />
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>Weather</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
          <WeatherControls
            :storms="options.weather.storms"
            :droughts="options.weather.droughts"
            :heat-waves="options.weather.heatWaves"
            :cold-snaps="options.weather.coldSnaps"
            :wind-storms="options.weather.windStorms"
            :fog="options.weather.fog"
            @update:storms="updateWeather('storms', $event)"
            @update:droughts="updateWeather('droughts', $event)"
            @update:heat-waves="updateWeather('heatWaves', $event)"
            @update:cold-snaps="updateWeather('coldSnaps', $event)"
            @update:wind-storms="updateWeather('windStorms', $event)"
            @update:fog="updateWeather('fog', $event)"
          />
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>Interventions</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
          <InterventionControls
            :species-id="options.speciesId"
            :irrigate-amount="options.irrigateAmount"
            :cleanse-amount="options.cleanseAmount"
            @update:species-id="options.speciesId = $event"
            @update:irrigate-amount="options.irrigateAmount = $event"
            @update:cleanse-amount="options.cleanseAmount = $event"
            @plant-center="plantCenter"
            @plant-random="plantRandom"
            @irrigate-center="irrigateCenter"
            @cleanse-center="cleanseCenter"
          />
        </div>
      </section>

      <section class="card">
        <div class="section-header" v-dropdown>
          <span>Persistence</span>
          <span class="toggle-icon">−</span>
        </div>
        <div class="section-body">
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
    </aside>

    <main class="main">
      <header class="toolbar">
        <SimulationStats :stats="stats" />
        <div class="quick-controls">
          <button
            class="btn btn-primary"
            @click="start"
            :disabled="isRunning"
            title="Start the simulation"
          >
            ▶ Start
          </button>
          <button
            class="btn"
            @click="pause"
            :disabled="!isRunning"
            title="Pause the simulation"
          >
            ⏸ Pause
          </button>
          <button class="btn" @click="step" title="Advance one tick">
            ⏭ Step
          </button>
          <label class="speed">
            Speed
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              v-model.number="options.tickMs"
              @input="updateTickMs(options.tickMs)"
            />
          </label>
          <div class="time-group">
            <span class="label">Scale</span>
            <div class="btn-group">
              <button class="btn" :class="{active: options.timeScale==='minute'}" @click="setTimeScale('minute')" title="1 minute per tick">1m</button>
              <button class="btn" :class="{active: options.timeScale==='hour'}" @click="setTimeScale('hour')" title="1 hour per tick">1h</button>
              <button class="btn" :class="{active: options.timeScale==='day'}" @click="setTimeScale('day')" title="1 day per tick">1d</button>
            </div>
          </div>
        </div>
      </header>

      <PopulationGraph 
        :current-tick="stats.currentTick"
        :total-species="stats.totalSpecies"
        :chunks="engine?.getAllChunks()"
      />

      <div class="content">
        <ChunkGrid
          :chunk-grid="chunkGrid"
          :width="width"
          :show-labels="options.showLabels"
          :viz-mode="options.vizMode"
          :pollinators="options.pollinators"
          :engine="engine"
          :selected="selected"
          @select="onSelectChunk"
        />

        <div v-if="selectedChunk" class="inspector-wrapper">
          <TileInspector :chunk="selectedChunk" @close="clearSelection" />
        </div>
        <EventLog v-else :events="events" />
      </div>

      <LegendOverlay
        :overlay-legend="options.overlayLegend"
        :viz-mode="options.vizMode"
      />
    </main>
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
import WorldConfiguration from "@/components/simulation/WorldConfiguration.vue";
import VisualizationSettings from "@/components/simulation/VisualizationSettings.vue";
import PollinatorControls from "@/components/simulation/PollinatorControls.vue";
import WeatherControls from "@/components/simulation/WeatherControls.vue";
import InterventionControls from "@/components/simulation/InterventionControls.vue";
import SimulationStats from "@/components/simulation/SimulationStats.vue";
import ChunkGrid from "@/components/simulation/ChunkGrid.vue";
import EventLog from "@/components/simulation/EventLog.vue";
import LegendOverlay from "@/components/simulation/LegendOverlay.vue";
import SimulationPersistence from "@/components/simulation/SimulationPersistence.vue";
import TileInspector from "@/components/simulation/TileInspector.vue";
import PopulationGraph from "@/components/simulation/PopulationGraph.vue";
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
  seed: 12345,
  tickMs: 100,
  stepCount: 10,
  activeRadius: 1,
  maxActive: 36,
  vizMode: "rgb" as
    | "rgb"
    | "vitality"
    | "moisture"
    | "pollution"
    | "diversity"
    | "succession"
    | "pollinators",
  timeScale: 'day' as 'minute'|'hour'|'day',
  showLabels: true,
  speciesId: "common_grass",
  irrigateAmount: 0.2,
  cleanseAmount: 0.2,
  pollinators: {
    showBees: true,
    showArrows: false,
    diffusionRate: 0.02,
    diversityWeight: 0.02,
    lightWeight: 0.015,
    canopyWeight: 0.005,
    tempWeight: 0.01,
    windPenalty: 0.02,
    rainPenalty: 0.015,
  },
  weather: {
    storms: true,
    droughts: true,
    heatWaves: true,
    coldSnaps: true,
    windStorms: true,
    fog: true,
  },
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
    masterSeed: options.seed,
    maxActiveChunks: options.maxActive,
  };
  engine.value = new SimulationEngine(config);

  engine.value.activateChunksAroundPoint(
    Math.floor(options.worldWidth / 2),
    Math.floor(options.worldHeight / 2),
    options.activeRadius
  );

  weather.value = new WeatherSystem();
  // Align weather seasons with engine
  try {
    (weather.value as any).seasonLength =
      engine.value.getConfig().seasonLengthTicks;
  } catch {}
  hydro.value = new HydrologySystem();
  canopy.value = new CanopySystem();
  vegetation.value = new VegetationSystem();
  applyWeatherToggles();

  hydro.value.initializeElevation(engine.value.getAllChunks());

  pollinators.value = new PollinatorSystem();
  pollinators.value.initialize(engine.value.getAllChunks());
  applyPollinatorConfig();

  birds.value = new BirdsSystem();
  birds.value.initialize(engine.value.getAllChunks());

  updateStats();
  initSpeciesSnapshot(engine.value.getAllChunks());
  seenWeather.clear();
  if (typeof indexedDB !== "undefined") db = new SimDB();
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
    options.activeRadius
  );
}

function recreate() {
  pause();
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  init();
}

function applyWeatherToggles() {
  if (!weather.value) return;
  weather.value.enableStorms = !!options.weather.storms;
  weather.value.enableDroughts = !!options.weather.droughts;
  weather.value.enableHeatWaves = !!options.weather.heatWaves;
  weather.value.enableColdSnaps = !!options.weather.coldSnaps;
  weather.value.enableWindStorms = !!options.weather.windStorms;
  weather.value.enableFog = !!options.weather.fog;
}

function applyPollinatorConfig() {
  pollinators.value?.setConfig({
    diffusionRate: options.pollinators.diffusionRate,
    diversityWeight: options.pollinators.diversityWeight,
    lightWeight: options.pollinators.lightWeight,
    canopyWeight: options.pollinators.canopyWeight,
    tempWeight: options.pollinators.tempWeight,
    windPenalty: options.pollinators.windPenalty,
    rainPenalty: options.pollinators.rainPenalty,
  });
}

function updatePollinatorConfig(key: string, value: number) {
  (options.pollinators as any)[key] = value;
  applyPollinatorConfig();
}

function updateWeather(key: string, value: boolean) {
  (options.weather as any)[key] = value;
  applyWeatherToggles();
}

function clearSelection() {
  selected.value = null;
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

<style scoped>
.sim-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: 100%;
}

.sidebar {
  padding: 12px;
  border-right: 1px solid #333;
  display: flex;
  gap: 12px;
  flex-direction: column;
  overflow-y: scroll;
  max-height: 100vh;
}

.main {
  padding: 12px;
  display: flex;
  gap: 12px;
  flex-direction: column;
  position: relative;
  max-height: 100vh;
  overflow-y: scroll;
}

.content {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 12px;
  align-items: start;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-group { display: inline-flex; gap: 4px; }
.btn.active { outline: 2px solid #4ade80; outline-offset: -2px; }
.time-group .label { margin-left: 6px; margin-right: 4px; font-size: 12px; color: #ccc; }

.quick-actions h3 {
  margin: 0 0 8px 0;
}

.qa-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.btn {
  background: #2f2f2f;
  color: #eaeaea;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: inherit;
  cursor: pointer;
}
.btn:hover {
  background: #3a3a3a;
}
.btn:active {
  background: #262626;
}
.btn-primary {
  background: #4ade80;
  color: #101010;
  border-color: #3ecf6d;
}
.btn-primary:hover {
  background: #22c55e;
}

.card {
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px;
}

.section-header {
  display: flex;
  color: white;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin: -4px -4px 8px -4px;
  padding: 4px;
}

.toggle-icon {
  display: inline-block;
  width: 20px;
  text-align: center;
  border: 1px solid #444;
  border-radius: 4px;
  font-weight: 700;
}

.section-body {
  margin-top: 6px;
}

.inspector-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inspector-bar {
  display: flex;
  justify-content: flex-end;
}

.hint {
  margin-top: 6px;
  font-size: 12px;
  color: #aaa;
}

.speed {
  color: #aaa;
}
.speed input[type="range"] {
  vertical-align: middle;
  margin-left: 6px;
}
</style>
