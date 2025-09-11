<template>
  <div class="showcase-container">
    <nav class="showcase-nav">
      <router-link to="/" class="nav-button back-button">← Back to Game</router-link>
      <h1 class="title">🎮 Sprite Showcase</h1>
    </nav>

    <div v-if="!isLoaded" class="loading">
      Loading sprites...
    </div>

    <div v-else class="content">
      <SpriteSection title="Characters" :sprites="characterSprites" />
      <SpriteSection title="Player Character" :sprites="playerSprites" />
      <SpriteSection title="Plants & Trees" :sprites="plantSprites" />
      <SpriteSection title="Props & Objects" :sprites="propSprites" />
      <SpriteSection title="Grass Tileset" :sprites="grassSprites" />
      <SpriteSection title="Stone Tileset" :sprites="stoneSprites" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SpriteManager } from '../render/SpriteManager'
import SpriteSection from '../components/SpriteSection.vue'

interface SpriteData {
  name: string
  sprite: any
  info: string
}

const isLoaded = ref(false)
const characterSprites = ref<SpriteData[]>([])
const playerSprites = ref<SpriteData[]>([])
const plantSprites = ref<SpriteData[]>([])
const propSprites = ref<SpriteData[]>([])
const grassSprites = ref<SpriteData[]>([])
const stoneSprites = ref<SpriteData[]>([])

let spriteManager: SpriteManager

onMounted(async () => {
  spriteManager = new SpriteManager()
  await spriteManager.preloadSprites()
  
  loadCharacterSprites()
  loadPlayerSprites()
  loadPlantSprites()
  loadPropSprites()
  loadGrassSprites()
  loadStoneSprites()
  
  isLoaded.value = true
})

function loadCharacterSprites(): void {
  const sprites: SpriteData[] = []
  const characterIds = spriteManager.getAllCharacterIds()
  
  characterIds.forEach(id => {
    // Show idle down pose for each character
    const sprite = spriteManager.createCharacterSprite(id, 0)
    if (sprite) {
      sprites.push({
        name: `Character ${id}`,
        sprite,
        info: '20×32px'
      })
    }
    
    // Show walk down animation for first few characters
    if (parseInt(id) < 5) {
      const walkSprite = spriteManager.createCharacterAnimatedSprite(id, 'walk_down')
      if (walkSprite) {
        walkSprite.play()
        sprites.push({
          name: `Character ${id} Walk`,
          sprite: walkSprite,
          info: '20×32px animated'
        })
      }
    }
  })
  
  characterSprites.value = sprites
}

function loadPlayerSprites(): void {
  const sprites: SpriteData[] = []
  
  // Individual frames
  for (let i = 0; i < 4; i++) {
    const sprite = spriteManager.createSprite('player', i)
    if (sprite) {
      sprites.push({
        name: `Player Frame ${i}`,
        sprite,
        info: '32×32px'
      })
    }
  }
  
  // Animation
  const animatedSprite = spriteManager.createPlayerSprite()
  if (animatedSprite) {
    animatedSprite.play()
    sprites.push({
      name: 'Walk Animation',
      sprite: animatedSprite,
      info: '32×32px animated'
    })
  }
  
  playerSprites.value = sprites
}

function loadPlantSprites(): void {
  const sprites: SpriteData[] = []
  
  // Large trees
  for (let i = 0; i < 3; i++) {
    const sprite = spriteManager.createPlantSprite('large', i)
    if (sprite) {
      sprites.push({
        name: `Large Tree ${i + 1}`,
        sprite,
        info: '170×170px'
      })
    }
  }
  
  // Medium bushes
  for (let i = 0; i < 6; i++) {
    const sprite = spriteManager.createPlantSprite('medium', i)
    if (sprite) {
      sprites.push({
        name: `Bush ${i + 1}`,
        sprite,
        info: '85×85px'
      })
    }
  }
  
  // Small grass (first 8)
  for (let i = 0; i < 8; i++) {
    const sprite = spriteManager.createPlantSprite('small', i)
    if (sprite) {
      sprites.push({
        name: `Grass ${i + 1}`,
        sprite,
        info: '32×32px'
      })
    }
  }
  
  plantSprites.value = sprites
}

function loadPropSprites(): void {
  const sprites: SpriteData[] = []
  const propNames = ['chest', 'barrel', 'crate', 'pillar', 'door', 'table']
  
  propNames.forEach(propName => {
    const sprite = spriteManager.createPropSprite(propName)
    if (sprite) {
      sprites.push({
        name: propName.charAt(0).toUpperCase() + propName.slice(1),
        sprite,
        info: '64×64px'
      })
    }
  })
  
  propSprites.value = sprites
}

function loadGrassSprites(): void {
  const sprites: SpriteData[] = []
  
  for (let i = 0; i < 64; i++) {
    const sprite = spriteManager.createTileSprite('tileset_grass', i)
    if (sprite) {
      sprites.push({
        name: `Grass Tile ${i}`,
        sprite,
        info: '32×32px'
      })
    }
  }
  
  grassSprites.value = sprites
}

function loadStoneSprites(): void {
  const sprites: SpriteData[] = []
  
  for (let i = 0; i < 16; i++) {
    const sprite = spriteManager.createTileSprite('tileset_stone', i)
    if (sprite) {
      sprites.push({
        name: `Stone Tile ${i}`,
        sprite,
        info: '64×64px'
      })
    }
  }
  
  stoneSprites.value = sprites
}
</script>

<style scoped>
.showcase-container {
  min-height: 100vh;
  overflow-y: scroll;
  background: #1a1a1a;
  color: #fff;
  font-family: 'Courier New', monospace;
}

.showcase-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(10px);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid #333;
}

.back-button {
  background: #60a5fa;
  color: #1a1a1a;
  padding: 10px 20px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.back-button:hover {
  background: #3b82f6;
}

.title {
  margin: 0;
  color: #4ade80;
  font-size: 28px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 24px;
  color: #4ade80;
}

.content {
  padding: 20px;
  overflow-y: scroll;
  max-height: calc(100vh - 100px);
  max-width: 1400px;
  margin: 0 auto;
}
</style>