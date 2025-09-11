<template>
  <div class="game-container">
    <div ref="pixiContainer" class="pixi-container"></div>
    <nav class="game-nav">
      <router-link to="/sprites" class="nav-button">View Sprites</router-link>
      <router-link to="/map-generator" class="nav-button">Map Generator</router-link>
      <router-link to="/select-map" class="nav-button">Select Map</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Application } from 'pixi.js'
import { GameEngine } from '../core/GameEngine'

const pixiContainer = ref<HTMLElement>()
const route = useRoute()
let app: Application | null = null
let gameEngine: GameEngine | null = null

onMounted(async () => {
  if (pixiContainer.value) {
    app = new Application({
      width: 1024,
      height: 768,
      backgroundColor: 0x2c5234,
      antialias: true
    })
    
    pixiContainer.value.appendChild(app.view as HTMLCanvasElement)
    
    gameEngine = new GameEngine(app)
    
    // Check if a specific map was requested via query parameter
    const requestedMap = route.query.map as string
    if (requestedMap) {
      gameEngine.setCustomMap(requestedMap)
    }
    await gameEngine.initialize()
  }
})

onUnmounted(() => {
  if (app) {
    app.destroy(true, true)
  }
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #1a1a1a;
}

.pixi-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.game-nav {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.nav-button {
  background: #4ade80;
  color: #1a1a1a;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  transition: background-color 0.2s;
}

.nav-button:hover {
  background: #22c55e;
}
</style>