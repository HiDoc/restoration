<template>
  <div class="min-h-screen max-h-screen flex flex-col font-sans">
    <!-- Header Bar -->
    <header class="sci-panel-elevated flex justify-between items-center px-5 py-3">
      <div class="flex items-center">
        <h1 class="m-0 text-2xl font-bold">🌿 EcoSim</h1>
        <span class="text-xs ml-2">{{ gameState.currentScenario.replace('_', ' ').toUpperCase() }}</span>
      </div>
      
      <div class="flex gap-5">
        <div class="text-center">
          <span class="block text-xs uppercase">Species</span>
          <span class="block text-base font-bold">{{ gameState.unlockedSpecies.size }}</span>
        </div>
        <div class="text-center">
          <span class="block text-xs uppercase">Health</span>
          <span class="block text-base font-bold">{{ Math.round(gameState.ecosystemHealth * 100) }}%</span>
        </div>
        <div class="text-center">
          <span class="block text-xs uppercase">Day</span>
          <span class="block text-base font-bold">{{ gameState.currentDay }}</span>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button @click="gameState.save()" class="sci-btn text-xs">
          💾 Save
        </button>
      </div>
    </header>

    <!-- Main Game Area -->
    <div class="flex-1 grid grid-cols-[280px_1fr] gap-3 overflow-hidden p-3">
      <!-- Left Sidebar - Tools and Species -->
      <aside class="flex flex-col gap-5">
        <!-- Player Actions -->
        <section class="sci-panel p-4">
          <h3 class="m-0 mb-3 text-sm sci-header-title">🌱 Plant Species</h3>
          <div class="flex gap-2 items-center">
            <select class="sci-select w-full text-xs mb-3" v-model="selectedSpecies">
              <option v-for="species in availableSpecies" :key="species" :value="species">
                {{ species.replace('_', ' ') }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-2">
            <button @click="selectedTool = 'plant'" :class="['sci-btn text-xs', { 'sci-btn-primary font-bold': selectedTool === 'plant' }]">
              🌱 Plant
            </button>
            <button @click="selectedTool = 'water'" :class="['sci-btn text-xs', { 'sci-btn-primary font-bold': selectedTool === 'water' }]">
              💧 Water
            </button>
            <button @click="selectedTool = 'clean'" :class="['sci-btn text-xs', { 'sci-btn-primary font-bold': selectedTool === 'clean' }]">
              🧹 Clean
            </button>
          </div>
        </section>

        <!-- Discovered Species -->
        <section class="sci-panel p-4">
          <h3 class="m-0 mb-3 text-sm sci-header-title">🦋 Species ({{ gameState.unlockedSpecies.size }})</h3>
          <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            <div 
              v-for="species in Array.from(gameState.unlockedSpecies)"
              :key="species"
              class="flex items-center gap-2 px-2 py-1.5 sci-panel cursor-pointer transition-colors duration-200"
              @click="showSpeciesDetails(species)"
            >
              <span class="text-base">{{ getSpeciesIcon(species) }}</span>
              <span class="text-xs capitalize">{{ species.replace('_', ' ') }}</span>
            </div>
          </div>
        </section>

        <!-- Recent Discoveries -->
        <section class="sci-panel p-4">
          <h3 class="m-0 mb-3 text-sm sci-header-title">🔍 Recent Discoveries</h3>
          <div class="flex flex-col gap-2">
            <div 
              v-for="discovery in gameState.recentDiscoveries.slice(0, 5)"
              :key="discovery.timestamp.toString()"
              class="grid grid-cols-[auto_1fr_auto] gap-2 px-2 py-1.5 sci-panel text-xs"
            >
              <div class="text-xs">{{ getDiscoveryIcon(discovery.type) }}</div>
              <div class="leading-tight">{{ discovery.description }}</div>
              <div class="text-[9px] opacity-70">Day {{ discovery.timestamp }}</div>
            </div>
          </div>
        </section>
      </aside>

      <!-- Center - Ecosystem Visualization -->
      <main class="relative overflow-hidden sci-panel p-1">
        <div class="w-full h-full">
          <SimulationView 
            ref="simulationRef"
            :game-mode="true"
            @species-birth="onSpeciesBirth"
            @species-interaction="onSpeciesInteraction"
            @environmental-change="onEnvironmentalChange"
            @click-chunk="onChunkClick"
          />
        </div>
        
      </main>

    </div>

    <!-- Modals and Dialogs -->

    <!-- Notification System -->
    <div class="notification-container">
      <div 
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification flex items-center gap-2 animate-slide-in', {
          'notification-success': notification.type === 'success',
          'notification-info': notification.type === 'info', 
          'notification-warning': notification.type === 'warning',
          'notification-danger': notification.type === 'error'
        }]"
      >
        <span class="text-base">{{ notification.icon }}</span>
        <span class="flex-1 text-xs">{{ notification.text }}</span>
        <button @click="dismissNotification(notification.id)" class="bg-none border-none cursor-pointer text-base font-bold opacity-70 hover:opacity-100">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { GameState, type DiscoveryEvent } from '@/game/GameState'
import SimulationView from '@/views/SimulationView.vue'

// Game state
const gameState = GameState.getInstance()
const simulationRef = ref()

// UI state
const selectedTool = ref('plant')
const selectedSpecies = ref('common_grass')

// Notifications
interface Notification {
  id: number
  type: 'success' | 'info' | 'warning' | 'error'
  icon: string
  text: string
}

const notifications = ref<Notification[]>([])
let notificationId = 0

// Available species for planting
const availableSpecies = computed(() => Array.from(gameState.unlockedSpecies))

// Game initialization
onMounted(async () => {
  // Load saved game state
  gameState.load()
  
  // Show welcome notification
  showNotification('info', '🌿', 'Welcome to EcoSim! Manage and restore ecosystems.')
  
  // Set up simulation update handler
  setInterval(updateGameState, 1000) // Update every second
})

// Game state updates
function updateGameState() {
  if (simulationRef.value) {
    const stats = simulationRef.value.getSimulationStats()
    gameState.updateDaily(stats)
    
    // Auto-save every minute
    if (gameState.currentDay % 60 === 0) {
      gameState.save()
    }
  }
}

// Species and discovery management
function getSpeciesIcon(speciesId: string): string {
  const icons: Record<string, string> = {
    common_grass: '🌱',
    silver_birch: '🌳',
    white_clover: '🌿',
    english_oak: '🌲',
    hawthorn: '🌸',
    robin_european: '🐦',
    blue_tit: '🐦',
    healing_fern: '🌿',
    shadow_moss: '🟢'
  }
  return icons[speciesId] || '❓'
}

function getDiscoveryIcon(type: string): string {
  const icons = {
    species: '🆕',
    interaction: '🔗',
    hybrid: '✨',
    behavior: '👁️'
  }
  return icons[type as keyof typeof icons] || '📊'
}

function showSpeciesDetails(speciesId: string) {
  // TODO: Implement species details modal
  showNotification('info', getSpeciesIcon(speciesId), `Studying ${speciesId.replace('_', ' ')}`)
}

// Event handlers
function onSpeciesBirth(event: any) {
  const discovery: DiscoveryEvent = {
    type: 'species',
    speciesId: event.speciesId,
    description: `New ${event.speciesId.replace('_', ' ')} discovered!`,
    timestamp: new Date(),
    chunkId: event.chunkId,
    significance: 'minor'
  }
  
  gameState.recordDiscovery(discovery)
  showNotification('success', '🆕', discovery.description)
}

function onSpeciesInteraction(event: any) {
  const discovery: DiscoveryEvent = {
    type: 'interaction',
    description: `Observed ${event.type} between species`,
    timestamp: new Date(),
    chunkId: event.chunkId,
    significance: 'minor'
  }
  
  gameState.recordDiscovery(discovery)
  showNotification('info', '🔗', discovery.description)
}

function onEnvironmentalChange(event: any) {
  if (event.changeType === 'major') {
    showNotification('warning', '⚠️', `Environmental change detected: ${event.description}`)
  }
}

function onChunkClick(chunkId: string, x: number, y: number) {
  if (selectedTool.value === 'plant' && selectedSpecies.value) {
    plantSpecies(chunkId, x, y, selectedSpecies.value)
  } else if (selectedTool.value === 'water') {
    addWater(chunkId, x, y)
  } else if (selectedTool.value === 'clean') {
    cleanArea(chunkId, x, y)
  }
}

// Quick actions
function plantSpecies(chunkId: string, x: number, y: number, speciesId: string) {
  if (simulationRef.value) {
    simulationRef.value.executeIntervention({
      chunkId,
      x, y,
      type: 'plant',
      data: { speciesId }
    })
    showNotification('success', '🌱', `Planted ${speciesId.replace('_', ' ')}`)
  }
}

function addWater(chunkId: string, x: number, y: number) {
  if (simulationRef.value) {
    simulationRef.value.executeIntervention({
      chunkId,
      x, y,
      type: 'irrigate',
      data: { amount: 0.2 }
    })
    showNotification('success', '💧', 'Added water to area')
  }
}

function cleanArea(chunkId: string, x: number, y: number) {
  if (simulationRef.value) {
    simulationRef.value.executeIntervention({
      chunkId,
      x, y,
      type: 'cleanse',
      data: { amount: 0.2 }
    })
    showNotification('success', '🧹', 'Cleaned pollution from area')
  }
}


// Notification system
function showNotification(type: Notification['type'], icon: string, text: string) {
  const notification: Notification = {
    id: notificationId++,
    type,
    icon,
    text
  }
  
  notifications.value.push(notification)
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    dismissNotification(notification.id)
  }, 5000)
}

function dismissNotification(id: number) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}
</script>

<style scoped>
/* Custom animation for notifications - not available in default Tailwind */
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease;
}

/* Responsive adjustments using Tailwind breakpoints */
@media (max-width: 1200px) {
  .game-main {
    grid-template-columns: 240px 1fr;
  }
}

@media (max-width: 1000px) {
  .game-stats {
    gap: 12px;
  }
  
  .game-main {
    grid-template-columns: 200px 1fr;
  }
}

@media (max-width: 768px) {
  .game-main {
    grid-template-columns: 1fr;
  }
  
  .game-sidebar {
    display: none;
  }
}
</style>
