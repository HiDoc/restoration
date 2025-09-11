<template>
  <div class="sprite-card">
    <div class="sprite-label">{{ name }}</div>
    <div ref="spriteContainer" class="sprite-container">
      <canvas 
        ref="spriteCanvas"
        :width="140" 
        :height="140"
        class="sprite-canvas"
      />
    </div>
    <div class="sprite-info">{{ info }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { CanvasRenderer } from '../utils/CanvasRenderer'

const props = defineProps<{
  name: string
  sprite: any
  info: string
}>()

const spriteContainer = ref<HTMLElement>()
const spriteCanvas = ref<HTMLCanvasElement>()

onMounted(async () => {
  await nextTick()
  
  if (spriteCanvas.value && props.sprite) {
    const renderer = new CanvasRenderer(140, 140)
    let renderedCanvas: HTMLCanvasElement
    
    // Handle animated sprites
    if (props.sprite.textures && props.sprite.textures.length > 1) {
      // For animated sprites, we'll animate manually
      let frameIndex = 0
      const animate = () => {
        const texture = props.sprite.textures[frameIndex % props.sprite.textures.length]
        const staticSprite = { texture }
        renderedCanvas = renderer.renderSprite(staticSprite)
        
        // Copy to our canvas
        const ctx = spriteCanvas.value?.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, 140, 140)
          ctx.drawImage(renderedCanvas, 0, 0)
        }
        
        frameIndex++
        setTimeout(animate, 200) // ~5fps animation
      }
      animate()
    } else {
      // Static sprite
      renderedCanvas = renderer.renderSprite(props.sprite)
      const ctx = spriteCanvas.value.getContext('2d')
      if (ctx) {
        ctx.drawImage(renderedCanvas, 0, 0)
      }
    }
  }
})
</script>

<style scoped>
.sprite-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.sprite-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border-color: #60a5fa;
}

.sprite-label {
  font-size: 14px;
  font-weight: bold;
  color: #e5e5e5;
  margin-bottom: 15px;
  text-transform: capitalize;
}

.sprite-container {
  background: #333;
  border-radius: 8px;
  margin: 0 auto 15px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.sprite-canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.sprite-info {
  font-size: 12px;
  color: #999;
  font-style: italic;
}
</style>