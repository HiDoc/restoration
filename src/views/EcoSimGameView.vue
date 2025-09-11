<template>
  <div class="ecosim-game">
    <!-- Header Bar -->
    <header class="game-header">
      <div class="game-title">
        <h1>🌿 EcoSim</h1>
        <span class="scenario-name">{{ gameState.currentScenario.replace('_', ' ').toUpperCase() }}</span>
      </div>
      
      <div class="game-stats">
        <div class="stat-item">
          <span class="label">Research Level</span>
          <span class="value">{{ gameState.researchLevel }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Species</span>
          <span class="value">{{ gameState.unlockedSpecies.size }}/87</span>
        </div>
        <div class="stat-item">
          <span class="label">Health</span>
          <span class="value">{{ Math.round(gameState.ecosystemHealth * 100) }}%</span>
        </div>
        <div class="stat-item">
          <span class="label">Day</span>
          <span class="value">{{ gameState.currentDay }}</span>
        </div>
      </div>
      
      <div class="header-controls">
        <button @click="showScenarioSelect = true" class="btn btn-secondary">
          📋 Scenarios
        </button>
        <button @click="showResearchLab = true" class="btn btn-secondary">
          🔬 Research
        </button>
        <button @click="gameState.save()" class="btn btn-secondary">
          💾 Save
        </button>
      </div>
    </header>

    <!-- Main Game Area -->
    <div class="game-main">
      <!-- Left Sidebar - Tools and Species -->
      <aside class="game-sidebar">
        <!-- Management Tools -->
        <section class="tool-panel">
          <h3>🛠️ Management Tools</h3>
          <div class="tool-grid">
            <button 
              v-for="tool in availableTools" 
              :key="tool.id"
              @click="selectTool(tool.id)"
              :class="['tool-btn', { active: selectedTool === tool.id }]"
              :disabled="!tool.unlocked"
            >
              {{ tool.icon }} {{ tool.name }}
            </button>
          </div>
          
          <div v-if="selectedTool" class="tool-info">
            <h4>{{ getToolInfo(selectedTool).name }}</h4>
            <p>{{ getToolInfo(selectedTool).description }}</p>
            <div v-if="selectedTool === 'plant'" class="species-selector">
              <label>Species:</label>
              <select v-model="selectedSpecies">
                <option v-for="species in availableSpecies" :key="species" :value="species">
                  {{ species.replace('_', ' ') }}
                </option>
              </select>
            </div>
          </div>
        </section>

        <!-- Discovered Species -->
        <section class="species-panel">
          <h3>🦋 Species ({{ gameState.unlockedSpecies.size }})</h3>
          <div class="species-list">
            <div 
              v-for="species in Array.from(gameState.unlockedSpecies)"
              :key="species"
              class="species-item"
              @click="showSpeciesDetails(species)"
            >
              <span class="species-icon">{{ getSpeciesIcon(species) }}</span>
              <span class="species-name">{{ species.replace('_', ' ') }}</span>
            </div>
          </div>
        </section>

        <!-- Recent Discoveries -->
        <section class="discoveries-panel">
          <h3>🔍 Recent Discoveries</h3>
          <div class="discovery-list">
            <div 
              v-for="discovery in gameState.recentDiscoveries.slice(0, 5)"
              :key="discovery.timestamp.toString()"
              class="discovery-item"
            >
              <div class="discovery-type">{{ getDiscoveryIcon(discovery.type) }}</div>
              <div class="discovery-text">{{ discovery.description }}</div>
              <div class="discovery-time">Day {{ discovery.timestamp }}</div>
            </div>
          </div>
        </section>
      </aside>

      <!-- Center - Ecosystem Visualization -->
      <main class="ecosystem-view">
        <div class="simulation-container">
          <SimulationView 
            ref="simulationRef"
            :game-mode="true"
            @species-birth="onSpeciesBirth"
            @species-interaction="onSpeciesInteraction"
            @environmental-change="onEnvironmentalChange"
            @click-chunk="onChunkClick"
          />
        </div>
        
        <!-- Overlay Information -->
        <div class="ecosystem-overlay">
          <div class="ecosystem-metrics">
            <div class="metric">
              <span class="metric-label">Biodiversity</span>
              <div class="metric-bar">
                <div class="metric-fill" :style="{ width: gameState.biodiversityIndex * 100 + '%' }"></div>
              </div>
              <span class="metric-value">{{ Math.round(gameState.biodiversityIndex * 100) }}%</span>
            </div>
            
            <div class="metric">
              <span class="metric-label">Stability</span>
              <div class="metric-bar">
                <div class="metric-fill" :style="{ width: gameState.stabilityScore * 100 + '%' }"></div>
              </div>
              <span class="metric-value">{{ Math.round(gameState.stabilityScore * 100) }}%</span>
            </div>
            
            <div class="metric">
              <span class="metric-label">Carbon Seq.</span>
              <div class="metric-bar">
                <div class="metric-fill" :style="{ width: Math.min(gameState.carbonSequestration / 100, 1) * 100 + '%' }"></div>
              </div>
              <span class="metric-value">{{ Math.round(gameState.carbonSequestration) }} kg</span>
            </div>
          </div>
        </div>
      </main>

      <!-- Right Sidebar - Objectives and Experiments -->
      <aside class="objectives-sidebar">
        <!-- Scenario Objectives -->
        <section class="objectives-panel" v-if="gameState.scenarioProgress">
          <h3>🎯 Objectives</h3>
          <div class="objective-list">
            <div 
              v-for="objective in gameState.scenarioProgress.objectives"
              :key="objective.id"
              :class="['objective-item', { completed: objective.completed }]"
            >
              <div class="objective-icon">
                {{ objective.completed ? '✅' : '⏳' }}
              </div>
              <div class="objective-content">
                <div class="objective-description">{{ objective.description }}</div>
                <div class="objective-progress">
                  {{ formatObjectiveProgress(objective) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="scenario-score">
            <strong>Score: {{ Math.round(gameState.scenarioProgress.score) }}%</strong>
            <div class="grade-badge" :class="gameState.scenarioProgress.grade.toLowerCase()">
              {{ gameState.scenarioProgress.grade }}
            </div>
          </div>
        </section>

        <!-- Active Experiments -->
        <section class="experiments-panel">
          <h3>🧪 Experiments ({{ gameState.activeExperiments.length }})</h3>
          <div class="experiment-list">
            <div 
              v-for="experiment in gameState.activeExperiments"
              :key="experiment.id"
              class="experiment-item"
            >
              <div class="experiment-title">{{ experiment.title }}</div>
              <div class="experiment-progress">
                Day {{ gameState.currentDay - experiment.startDay + 1 }}/{{ experiment.duration }}
              </div>
              <div class="experiment-status">{{ experiment.status }}</div>
            </div>
          </div>
          
          <button @click="showExperimentDialog = true" class="btn btn-primary full-width">
            + New Experiment
          </button>
        </section>

        <!-- Quick Actions -->
        <section class="actions-panel">
          <h3>⚡ Quick Actions</h3>
          <div class="action-grid">
            <button @click="plantRandomSpecies" class="action-btn" :disabled="selectedSpecies === ''">
              🌱 Plant Random
            </button>
            <button @click="addWaterToCenter" class="action-btn">
              💧 Add Water
            </button>
            <button @click="cleanseRandomArea" class="action-btn">
              🧹 Clean Area
            </button>
            <button @click="generateWeatherEvent" class="action-btn">
              🌦️ Weather Event
            </button>
          </div>
        </section>
      </aside>
    </div>

    <!-- Modals and Dialogs -->
    <ScenarioSelectDialog 
      v-if="showScenarioSelect"
      @close="showScenarioSelect = false"
      @select-scenario="startNewScenario"
    />
    
    <ResearchLabDialog
      v-if="showResearchLab"
      :game-state="gameState"
      @close="showResearchLab = false"
    />
    
    <ExperimentDialog
      v-if="showExperimentDialog"
      @close="showExperimentDialog = false"
      @create-experiment="createExperiment"
    />

    <!-- Notification System -->
    <div class="notifications">
      <div 
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', notification.type]"
      >
        <span class="notification-icon">{{ notification.icon }}</span>
        <span class="notification-text">{{ notification.text }}</span>
        <button @click="dismissNotification(notification.id)" class="notification-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { GameState, type Experiment, type DiscoveryEvent } from '@/game/GameState'
import SimulationView from '@/views/SimulationView.vue'
import ScenarioSelectDialog from '@/components/game/ScenarioSelectDialog.vue'
import ResearchLabDialog from '@/components/game/ResearchLabDialog.vue'
import ExperimentDialog from '@/components/game/ExperimentDialog.vue'

// Game state
const gameState = GameState.getInstance()
const simulationRef = ref()

// UI state
const showScenarioSelect = ref(false)
const showResearchLab = ref(false)
const showExperimentDialog = ref(false)
const selectedTool = ref('monitor')
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

// Available tools based on research level and unlocks
const availableTools = computed(() => {
  const tools = [
    { id: 'monitor', name: 'Monitor', icon: '🔍', unlocked: true },
    { id: 'plant', name: 'Plant', icon: '🌱', unlocked: gameState.unlockedTools.has('plant') },
    { id: 'irrigate', name: 'Irrigate', icon: '💧', unlocked: gameState.unlockedTools.has('irrigate') },
    { id: 'cleanse', name: 'Cleanse', icon: '🧹', unlocked: gameState.unlockedTools.has('cleanse') },
    { id: 'weather', name: 'Weather', icon: '🌦️', unlocked: gameState.unlockedTools.has('weather_monitor') },
    { id: 'soil', name: 'Soil Mod', icon: '🏔️', unlocked: gameState.unlockedTools.has('soil_modification') },
    { id: 'species_intro', name: 'Introduce', icon: '🦋', unlocked: gameState.unlockedTools.has('species_introduction') }
  ]
  
  return tools.filter(tool => tool.unlocked)
})

// Available species for planting
const availableSpecies = computed(() => Array.from(gameState.unlockedSpecies))

// Game initialization
onMounted(async () => {
  // Load saved game state
  gameState.load()
  
  // Start default scenario if no scenario is active
  if (!gameState.scenarioProgress) {
    gameState.startScenario('abandoned_field')
  }
  
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

// Tool selection and management
function selectTool(toolId: string) {
  selectedTool.value = toolId
  showNotification('info', '🛠️', `Selected ${getToolInfo(toolId).name}`)
}

function getToolInfo(toolId: string) {
  const toolInfo = {
    monitor: { name: 'Monitor', description: 'Observe ecosystem health and species interactions' },
    plant: { name: 'Plant Species', description: 'Introduce new plant species to the ecosystem' },
    irrigate: { name: 'Add Water', description: 'Increase moisture in selected areas' },
    cleanse: { name: 'Clean Pollution', description: 'Remove pollution and contaminants' },
    weather: { name: 'Weather Control', description: 'Generate weather events' },
    soil: { name: 'Soil Modification', description: 'Modify soil properties and nutrients' },
    species_intro: { name: 'Species Introduction', description: 'Introduce animal species' }
  }
  
  return toolInfo[toolId as keyof typeof toolInfo] || { name: 'Unknown', description: '' }
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
  } else if (selectedTool.value === 'irrigate') {
    addWater(chunkId, x, y)
  } else if (selectedTool.value === 'cleanse') {
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

function plantRandomSpecies() {
  // Plant random species at center
  const centerChunk = simulationRef.value?.getCenterChunk()
  if (centerChunk && selectedSpecies.value) {
    plantSpecies(centerChunk.id, 0.5, 0.5, selectedSpecies.value)
  }
}

function addWaterToCenter() {
  const centerChunk = simulationRef.value?.getCenterChunk()
  if (centerChunk) {
    addWater(centerChunk.id, 0.5, 0.5)
  }
}

function cleanseRandomArea() {
  const centerChunk = simulationRef.value?.getCenterChunk()
  if (centerChunk) {
    cleanArea(centerChunk.id, 0.5, 0.5)
  }
}

function generateWeatherEvent() {
  // TODO: Implement weather event generation
  showNotification('info', '🌦️', 'Weather event generated!')
}

// Objective progress formatting
function formatObjectiveProgress(objective: any): string {
  if (typeof objective.target === 'number' && typeof objective.current === 'number') {
    return `${Math.round(objective.current * 100)}/100%`
  }
  return `${objective.current}/${objective.target}`
}

// Scenario management
function startNewScenario(scenarioId: string) {
  gameState.startScenario(scenarioId)
  showScenarioSelect.value = false
  showNotification('info', '📋', `Started scenario: ${scenarioId.replace('_', ' ')}`)
}

// Experiment management
function createExperiment(experimentData: any) {
  const experiment: Experiment = {
    id: `exp_${Date.now()}`,
    title: experimentData.title,
    description: experimentData.description,
    startDay: gameState.currentDay,
    duration: experimentData.duration,
    chunkIds: experimentData.chunkIds,
    interventions: experimentData.interventions,
    status: 'active'
  }
  
  gameState.startExperiment(experiment)
  showExperimentDialog.value = false
  showNotification('success', '🧪', `Started experiment: ${experiment.title}`)
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
.ecosim-game {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  color: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* Header */
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #1a2f1a, #2a4f2a);
  border-bottom: 2px solid #4a7c59;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.game-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
}

.scenario-name {
  font-size: 12px;
  color: #aaa;
  margin-left: 8px;
}

.game-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-item .label {
  display: block;
  font-size: 10px;
  color: #aaa;
  text-transform: uppercase;
}

.stat-item .value {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #4ade80;
}

.header-controls {
  display: flex;
  gap: 8px;
}

/* Main Game Area */
.game-main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 1px;
  background: #333;
  overflow: hidden;
}

/* Sidebars */
.game-sidebar, .objectives-sidebar {
  background: #1a1a1a;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Tool Panel */
.tool-panel h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #4ade80;
}

.tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.tool-btn {
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #3a3a3a;
  border-color: #4ade80;
}

.tool-btn.active {
  background: #4ade80;
  color: #000;
  font-weight: bold;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-info {
  background: #2a2a2a;
  border-radius: 6px;
  padding: 12px;
}

.tool-info h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #4ade80;
}

.tool-info p {
  margin: 0 0 12px 0;
  font-size: 11px;
  color: #ccc;
  line-height: 1.4;
}

.species-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.species-selector select {
  flex: 1;
  padding: 4px 8px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
}

/* Species Panel */
.species-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.species-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #2a2a2a;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.species-item:hover {
  background: #3a3a3a;
}

.species-icon {
  font-size: 16px;
}

.species-name {
  font-size: 11px;
  text-transform: capitalize;
}

/* Discoveries Panel */
.discovery-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discovery-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  padding: 6px 8px;
  background: #2a2a2a;
  border-radius: 4px;
  font-size: 10px;
}

.discovery-type {
  font-size: 12px;
}

.discovery-text {
  color: #ccc;
  line-height: 1.3;
}

.discovery-time {
  color: #666;
  font-size: 9px;
}

/* Ecosystem View */
.ecosystem-view {
  background: #000;
  position: relative;
  overflow: hidden;
}

.simulation-container {
  width: 100%;
  height: 100%;
}

.ecosystem-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  pointer-events: none;
}

.ecosystem-metrics {
  display: flex;
  gap: 16px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 16px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.metric {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.metric-label {
  font-size: 11px;
  color: #aaa;
  width: 60px;
}

.metric-bar {
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #4ade80);
  transition: width 0.3s ease;
}

.metric-value {
  font-size: 10px;
  font-weight: bold;
  color: #4ade80;
  width: 40px;
  text-align: right;
}

/* Objectives Panel */
.objectives-panel h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #f59e0b;
}

.objective-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.objective-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: #2a2a2a;
  border-radius: 6px;
  border-left: 3px solid #666;
}

.objective-item.completed {
  border-left-color: #4ade80;
  background: #1a2f1a;
}

.objective-icon {
  font-size: 14px;
}

.objective-content {
  flex: 1;
}

.objective-description {
  font-size: 11px;
  line-height: 1.3;
  margin-bottom: 4px;
}

.objective-progress {
  font-size: 10px;
  color: #aaa;
}

.scenario-score {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 8px;
  background: #2a2a2a;
  border-radius: 6px;
}

.grade-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.grade-badge.s { background: #fbbf24; color: #000; }
.grade-badge.a { background: #4ade80; color: #000; }
.grade-badge.b { background: #3b82f6; color: #fff; }
.grade-badge.c { background: #f59e0b; color: #000; }
.grade-badge.d { background: #ef4444; color: #fff; }
.grade-badge.f { background: #991b1b; color: #fff; }

/* Experiments and Actions */
.experiments-panel h3, .actions-panel h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #8b5cf6;
}

.experiment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.experiment-item {
  padding: 8px;
  background: #2a2a2a;
  border-radius: 6px;
  border-left: 3px solid #8b5cf6;
}

.experiment-title {
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 4px;
}

.experiment-progress, .experiment-status {
  font-size: 10px;
  color: #aaa;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-btn {
  padding: 8px 12px;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.action-btn:hover {
  background: #1d4ed8;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Common Buttons */
.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #4ade80;
  color: #000;
}

.btn-primary:hover {
  background: #22c55e;
}

.btn-secondary {
  background: #374151;
  color: #fff;
  border: 1px solid #4b5563;
}

.btn-secondary:hover {
  background: #4b5563;
}

.full-width {
  width: 100%;
}

/* Notifications */
.notifications {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #2a2a2a;
  border-radius: 6px;
  border-left: 3px solid #4ade80;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  min-width: 250px;
  animation: slideIn 0.3s ease;
}

.notification.success { border-left-color: #4ade80; }
.notification.info { border-left-color: #3b82f6; }
.notification.warning { border-left-color: #f59e0b; }
.notification.error { border-left-color: #ef4444; }

.notification-icon {
  font-size: 16px;
}

.notification-text {
  flex: 1;
  font-size: 12px;
}

.notification-close {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.notification-close:hover {
  color: #fff;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .game-main {
    grid-template-columns: 240px 1fr 240px;
  }
}

@media (max-width: 1000px) {
  .game-stats {
    gap: 12px;
  }
  
  .game-main {
    grid-template-columns: 200px 1fr 200px;
  }
}
</style>