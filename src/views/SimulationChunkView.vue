<template>
  <div class="chunk-sim">
    <div class="toolbar">
      <button class="btn" @click="start" :disabled="running">▶ Start</button>
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
    <div ref="root" class="pixi-root" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Application, Graphics } from 'pixi.js'
import { SimulationEngine, type SimulationConfig } from '@/simulation/SimulationEngine'
import { SpeciesRegistry, SpeciesCategory } from '@/simulation/SpeciesRegistry'

const root = ref<HTMLElement | null>(null)
let app: Application | null = null
let engine: SimulationEngine | null = null
let tickHandle: number | null = null
const running = ref(false)
const timeScale = ref<'minute'|'hour'|'day'>('day')
const simDays = ref(0)
const seasonName = ref('spring')
const seasonProgress = ref(0)

const size = 512
const speciesSprites = new Map<string, any>()
const reg = SpeciesRegistry.getInstance()

function toWorld(n: number) { return Math.max(0, Math.min(1, n)) * size }

function pickPlantSprite(_speciesId: string) { return null }

async function initPixi() {
  app = new Application()
  await app.init({ width: size, height: size, background: '#0a0a0a', antialias: true })
  if (root.value) root.value.appendChild((app as any).canvas as HTMLCanvasElement)

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
      const sprite = pickPlantSprite(inst.speciesId)
      if (sprite) {
        sprite.anchor.set(0.5)
        app!.stage.addChild(sprite)
        speciesSprites.set(id, sprite)
        s = sprite
      } else {
        // Fallback: draw a colored dot if sprites unavailable
        const dot = new Graphics()
        dot.beginFill(0x66ccff)
        dot.drawCircle(0,0,4)
        dot.endFill()
        app!.stage.addChild(dot)
        speciesSprites.set(id, dot)
        s = dot
      }
    }
    s.x = toWorld(inst.x)
    s.y = toWorld(inst.y)
    const sc = Math.max(0.4, Math.min(2.0, (inst.biomass || 0.2)))
    if ((s as any).scale) (s as any).scale.set(sc)
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

async function initEngine() {
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
  if (tickHandle != null) return
  running.value = true
  tickHandle = window.setInterval(updateOnce, 100)
}
function pause() {
  if (tickHandle != null) { clearInterval(tickHandle); tickHandle = null }
  running.value = false
}
function setScale(scale: 'minute'|'hour'|'day') {
  timeScale.value = scale
  const minutes = scale === 'minute' ? 1 : scale === 'hour' ? 60 : 1440
  ;(engine as any)?.setTimePerTickMinutes?.(minutes)
}

onMounted(async () => {
  await initPixi()
  await initEngine()
  drawChunk()
})

onBeforeUnmount(() => { pause(); if (app) { try { app.destroy(true) } catch {} app = null } })
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
</style>
