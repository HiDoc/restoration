<template>
  <div class="chunk-sim">
    <div class="toolbar">
      <button class="btn" @click="start" :disabled="running || !ready">▶ Start</button>
      <button class="btn" @click="pause" :disabled="!running">⏸ Pause</button>
      <span class="label">Scale</span>
      <div class="btn-group">
        <button class="btn" :class="{active: timeScale==='minute'}" @click="setScale('minute')">1m</button>
        <button class="btn" :class="{active: timeScale==='hour'}" @click="setScale('hour')">1h</button>
        <button class="btn" :class="{active: timeScale==='day'}" @click="setScale('day')">1d</button>
      </div>
      <span class="spacer" />
      <span class="info">Day {{ Math.floor(simDays) }} — {{ seasonName }} ({{ Math.round(seasonProgress*100) }}%)</span>
    </div>
    <p v-if="initializing" class="status" role="status">Preparing your ecosystem…</p>
    <p v-else-if="errorMessage" class="status" role="alert">
      {{ errorMessage }} Reload this page to try again.
    </p>
    <div ref="root" class="pixi-root" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Application, Graphics } from 'pixi.js'
import { SimulationEngine, type SimulationConfig } from '@/simulation/SimulationEngine'
import { initializeSimulationRuntime } from '@/simulation/rust/SimulationRuntime'
import { FixedStepLoop } from '@/core/FixedStepLoop'

const root = ref<HTMLElement | null>(null)
let app: Application | null = null
let engine: SimulationEngine | null = null
let disposed = false
let loop: FixedStepLoop | null = null
const running = ref(false)
const ready = ref(false)
const initializing = ref(true)
const errorMessage = ref('')
const timeScale = ref<'minute'|'hour'|'day'>('day')
const simDays = ref(0)
const seasonName = ref('spring')
const seasonProgress = ref(0)

const size = 512
const speciesSprites = new Map<string, Graphics>()

function toWorld(n: number) { return Math.max(0, Math.min(1, n)) * size }


async function initPixi() {
  const application = new Application()
  await application.init({ width: size, height: size, background: '#0a0a0a', antialias: true })
  if (disposed) {
    application.destroy(true)
    return
  }
  app = application
  if (root.value) root.value.appendChild(app.canvas)

  // Background grid
  const g = new Graphics()
  g.lineStyle(1, 0x1a1a1a, 1)
  for (let i = 1; i < 16; i++) {
    const p = (i / 16) * size
    g.moveTo(p, 0); g.lineTo(p, size)
    g.moveTo(0, p); g.lineTo(size, p)
  }
  app.stage.addChild(g)
}

function drawChunk() {
  if (!app || !engine) return
  const chunk = engine.getChunk(0,0)
  if (!chunk) return

  // Update/add sprites for species
  const seen = new Set<string>()
  chunk.species.forEach((inst: any, id: string) => {
    seen.add(id)
    let s = speciesSprites.get(id)
    if (!s) {
      const dot = new Graphics().circle(0, 0, 4).fill(0x66ccff)
      app!.stage.addChild(dot)
      speciesSprites.set(id, dot)
      s = dot
    }
    s.x = toWorld(inst.x)
    s.y = toWorld(inst.y)
    const sc = Math.max(0.4, Math.min(2.0, (inst.biomass || 0.2)))
    s.scale.set(sc)
    if ((s as any).alpha !== undefined) (s as any).alpha = Math.max(0.3, Math.min(1.0, inst.health || 1))
  })

  // Remove sprites for dead species
  Array.from(speciesSprites.keys()).forEach(id => {
    if (!seen.has(id)) {
      const s = speciesSprites.get(id)
      s?.parent?.removeChild?.(s)
      speciesSprites.delete(id)
    }
  })
}

function initEngine() {
  const cfg: SimulationConfig = {
    worldWidth: 1,
    worldHeight: 1,
    chunkSize: 32,
    tickRate: 10,
    masterSeed: 1337,
    maxActiveChunks: 1,
  }
  engine = new SimulationEngine(cfg)
  engine.activateChunksAroundPoint(0,0,0)
  setScale(timeScale.value)
}

function updateOnce() {
  if (!engine) return
  engine.update()
  const s: any = engine.getStatistics()
  simDays.value = s.simDays || 0
  seasonName.value = s.seasonName
  seasonProgress.value = s.seasonProgress
  drawChunk()
}

function start() {
  if (!ready.value || !loop) return
  loop.start()
  running.value = true
}
function pause() {
  loop?.pause()
  running.value = false
}
function setScale(scale: 'minute'|'hour'|'day') {
  timeScale.value = scale
  const minutes = scale === 'minute' ? 1 : scale === 'hour' ? 60 : 1440
  engine?.setTimePerTickMinutes(minutes)
}

function onVisibilityChange() {
  loop?.setSuspended(document.hidden)
}

onMounted(async () => {
  try {
    await initializeSimulationRuntime()
    if (disposed) return
    await initPixi()
    if (disposed) return
    initEngine()
    loop = new FixedStepLoop(updateOnce, {
      stepMs: 100,
      onError(error) {
        pause()
        ready.value = false
        errorMessage.value = 'The ecosystem could not advance.'
        console.error('Chunk simulation stopped:', error)
      },
    })
    document.addEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange()
    drawChunk()
    ready.value = true
  } catch (error) {
    if (!disposed) {
      errorMessage.value = 'The ecosystem could not load.'
      console.error('Chunk simulation failed to load:', error)
    }
  } finally {
    if (!disposed) initializing.value = false
  }
})

onBeforeUnmount(() => {
  disposed = true
  ready.value = false
  pause()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  engine?.pause()
  engine = null
  if (app) { app.destroy(true); app = null }
  speciesSprites.clear()
})
</script>

<style scoped>
.chunk-sim { position: relative; width: 100%; height: 100%; }
.pixi-root { display: flex; justify-content: center; align-items: center; }
.toolbar { position: absolute; top: 8px; left: 8px; z-index: 10; display: flex; gap: 8px; align-items: center; background: rgba(20,20,20,0.8); border: 1px solid #333; border-radius: 8px; padding: 6px 8px; }
.btn { background: #2f2f2f; color: #eaeaea; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
.btn:hover { background: #3a3a3a; }
.btn:disabled { opacity: 0.6; cursor: default; }
.btn-group { display: inline-flex; gap: 4px; }
.btn.active { outline: 2px solid #4ade80; outline-offset: -2px; }
.label { font-size: 12px; color: #ccc; margin-left: 6px; }
.info { font-size: 12px; color: #ddd; }
.spacer { width: 16px; display: inline-block; }
.status { position: relative; padding: 64px 16px 16px; color: #eaeaea; }
</style>
