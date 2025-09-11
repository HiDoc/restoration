<template>
  <div ref="root" class="chunk-pixi" />
</template>

<script setup lang="ts">
import { Application, Graphics } from 'pixi.js'
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ chunk: any; size?: number }>()

const root = ref<HTMLElement | null>(null)
let app: Application | null = null

function drawChunk() {
  if (!app) return
  const s = props.size ?? 256
  const g = new Graphics()
  g.clear()

  // Background
  g.beginFill(0x0d0d0d)
  g.drawRect(0, 0, s, s)
  g.endFill()

  // Grid
  g.lineStyle(1, 0x222222, 1)
  for (let i = 1; i < 8; i++) {
    const p = (i / 8) * s
    g.moveTo(p, 0); g.lineTo(p, s)
    g.moveTo(0, p); g.lineTo(s, p)
  }

  // Seeds as small green dots
  const seeds: Array<{ x: number; y: number }> = (props.chunk as any).seedBank || []
  for (const seed of seeds) {
    const x = Math.max(0, Math.min(1, seed.x)) * s
    const y = Math.max(0, Math.min(1, seed.y)) * s
    g.beginFill(0x5eea5e)
    g.drawCircle(x, y, 2)
    g.endFill()
  }

  // Species as circles; size ~ biomass, color by category guess
  const species = Array.from((props.chunk.species || new Map()).values()) as any[]
  for (const inst of species) {
    const x = Math.max(0, Math.min(1, inst.x)) * s
    const y = Math.max(0, Math.min(1, inst.y)) * s
    const r = Math.max(2, Math.min(12, (inst.biomass || 0.1) * 2))
    const color = colorFor(inst.speciesId)
    g.beginFill(color, Math.max(0.4, Math.min(1, inst.health || 1)))
    g.lineStyle(1, 0x111111, 0.8)
    g.drawCircle(x, y, r)
    g.endFill()
  }

  // Birds activity pulse border
  const birdsActivity = ((props.chunk as any).birdsActivity as number | undefined) ?? 0
  if (birdsActivity > 0.05) {
    const a = Math.max(0.1, Math.min(0.6, birdsActivity))
    g.lineStyle(2, 0xffff88, a)
    g.drawRect(1, 1, s - 2, s - 2)
  }

  app.stage.removeChildren()
  app.stage.addChild(g)
}

function colorFor(id: string): number {
  // simple hashing to palette buckets
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const palette = [0x66ccff, 0x88e088, 0xffcc66, 0xcc88ff, 0xff8888, 0x88ddff]
  return palette[h % palette.length]
}

onMounted(async () => {
  const s = props.size ?? 256
  app = new Application()
  await app.init({ width: s, height: s, backgroundAlpha: 0, antialias: true })
  if (root.value) root.value.appendChild((app as any).canvas as HTMLCanvasElement)
  drawChunk()
})

onBeforeUnmount(() => {
  if (app) {
    try { app.destroy(true) } catch { try { (app as any).destroy?.() } catch {} }
    app = null
  }
})

watch(() => [props.chunk?.lastUpdateTick, (props.chunk as any)?.seedBank?.length, props.chunk?.species?.size], () => {
  drawChunk()
})
</script>

<style scoped>
.chunk-pixi { width: 100%; display: flex; justify-content: center; }
</style>
