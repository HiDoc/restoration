<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="research-dialog" @click.stop>
      <header class="dialog-header">
        <h2>🔬 Research Laboratory</h2>
        <div class="research-level">
          <span>Research Level {{ gameState.researchLevel }}</span>
          <div class="xp-bar">
            <div class="xp-fill" :style="{ width: researchProgress + '%' }"></div>
          </div>
          <span>{{ gameState.researchPoints }} / {{ nextLevelRequirement }} RP</span>
        </div>
        <button @click="$emit('close')" class="close-btn">×</button>
      </header>
      
      <div class="dialog-body">
        <!-- Navigation Tabs -->
        <div class="tab-nav">
          <button 
            v-for="tab in tabs"
            :key="tab"
            @click="activeTab = tab"
            :class="['tab-btn', { active: activeTab === tab }]"
          >
            {{ getTabIcon(tab) }} {{ tab.toUpperCase() }}
          </button>
        </div>

        <!-- Species Codex Tab -->
        <div v-if="activeTab === 'species'" class="tab-content">
          <div class="codex-filters">
            <input 
              v-model="speciesFilter" 
              placeholder="Search species..." 
              class="search-input"
            />
            <select v-model="selectedCategory" class="filter-select">
              <option value="all">All Categories</option>
              <option value="tree">Trees</option>
              <option value="shrub">Shrubs</option>
              <option value="grass">Grasses</option>
              <option value="flower">Flowers</option>
              <option value="fern">Ferns</option>
              <option value="moss">Mosses</option>
            </select>
            <select v-model="selectedStatus" class="filter-select">
              <option value="all">All Status</option>
              <option value="discovered">Discovered</option>
              <option value="undiscovered">Undiscovered</option>
            </select>
          </div>
          
          <div class="codex-grid">
            <div class="species-list">
              <div 
                v-for="species in filteredSpecies"
                :key="species.id"
                :class="['species-entry', { 
                  discovered: gameState.unlockedSpecies.has(species.id),
                  selected: selectedSpecies === species.id 
                }]"
                @click="selectedSpecies = species.id"
              >
                <div class="species-icon">{{ species.icon }}</div>
                <div class="species-info">
                  <div class="species-name">
                    {{ gameState.unlockedSpecies.has(species.id) ? species.name : '???' }}
                  </div>
                  <div class="species-type">{{ species.type }}</div>
                </div>
                <div class="discovery-status">
                  {{ gameState.unlockedSpecies.has(species.id) ? '✓' : '?' }}
                </div>
              </div>
            </div>
            
            <div class="species-details" v-if="selectedSpeciesData">
              <div class="species-header">
                <div class="species-large-icon">{{ selectedSpeciesData.icon }}</div>
                <div>
                  <h3>{{ selectedSpeciesData.name }}</h3>
                  <p class="scientific-name">{{ selectedSpeciesData.scientific }}</p>
                  <div class="species-tags">
                    <span class="tag type">{{ selectedSpeciesData.type }}</span>
                    <span class="tag succession">{{ selectedSpeciesData.succession }}</span>
                  </div>
                </div>
              </div>
              
              <div v-if="gameState.unlockedSpecies.has(selectedSpecies)" class="species-content">
                <div class="stats-section">
                  <h4>📊 Characteristics</h4>
                  <div class="stat-grid">
                    <div class="stat-item">
                      <span class="stat-label">Growth Rate</span>
                      <div class="stat-bar">
                        <div class="stat-fill" :style="{ width: selectedSpeciesData.growthRate * 100 + '%' }"></div>
                      </div>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Max Size</span>
                      <div class="stat-bar">
                        <div class="stat-fill" :style="{ width: selectedSpeciesData.maxBiomass * 20 + '%' }"></div>
                      </div>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Hardiness</span>
                      <div class="stat-bar">
                        <div class="stat-fill" :style="{ width: selectedSpeciesData.hardiness * 100 + '%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="environment-section">
                  <h4>🌡️ Environmental Preferences</h4>
                  <div class="env-grid">
                    <div class="env-item">
                      <span class="env-label">Temperature</span>
                      <span class="env-range">{{ selectedSpeciesData.tempRange }}</span>
                    </div>
                    <div class="env-item">
                      <span class="env-label">Moisture</span>
                      <span class="env-range">{{ selectedSpeciesData.moistureRange }}</span>
                    </div>
                    <div class="env-item">
                      <span class="env-label">Light</span>
                      <span class="env-range">{{ selectedSpeciesData.lightRange }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="ecology-section">
                  <h4>🔗 Ecological Interactions</h4>
                  <div class="interaction-list">
                    <div v-for="interaction in selectedSpeciesData.interactions" :key="interaction" class="interaction">
                      {{ interaction }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-else class="species-locked">
                <div class="lock-icon">🔒</div>
                <p>This species hasn't been discovered yet. Try different environmental conditions or wait for natural colonization.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Publications Tab -->
        <div v-if="activeTab === 'publications'" class="tab-content">
          <div class="publications-header">
            <h3>📚 Research Publications ({{ gameState.publications.length }})</h3>
            <div class="pub-stats">
              <div class="stat">
                <span class="stat-value">{{ totalImpactFactor.toFixed(1) }}</span>
                <span class="stat-label">Total Impact</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ totalCitations }}</span>
                <span class="stat-label">Citations</span>
              </div>
            </div>
          </div>
          
          <div class="publication-list">
            <div 
              v-for="pub in gameState.publications"
              :key="pub.id"
              class="publication-card"
            >
              <div class="pub-header">
                <h4>{{ pub.title }}</h4>
                <div class="pub-meta">
                  <span class="impact-factor">IF: {{ pub.impactFactor }}</span>
                  <span class="citations">{{ pub.citations }} citations</span>
                  <span class="date">{{ formatDate(pub.publishDate) }}</span>
                </div>
              </div>
              <p class="pub-description">{{ pub.description }}</p>
              <div class="pub-footer">
                <span class="ecosystem-type">{{ pub.ecosystemType.replace('_', ' ') }}</span>
                <span class="research-points">+{{ pub.researchPoints }} RP</span>
              </div>
            </div>
          </div>
          
          <div v-if="gameState.publications.length === 0" class="empty-state">
            <div class="empty-icon">📄</div>
            <p>No publications yet. Complete successful experiments to publish your findings!</p>
          </div>
        </div>

        <!-- Achievements Tab -->
        <div v-if="activeTab === 'achievements'" class="tab-content">
          <div class="achievements-header">
            <h3>🏆 Achievements ({{ unlockedAchievements }}/{{ gameState.achievements.length }})</h3>
          </div>
          
          <div class="achievement-categories">
            <button 
              v-for="category in achievementCategories"
              :key="category"
              @click="selectedAchievementCategory = category"
              :class="['category-btn', { active: selectedAchievementCategory === category }]"
            >
              {{ getCategoryIcon(category) }} {{ category.toUpperCase() }}
            </button>
          </div>
          
          <div class="achievement-grid">
            <div 
              v-for="achievement in filteredAchievements"
              :key="achievement.id"
              :class="['achievement-card', { unlocked: achievement.unlockedDate }]"
            >
              <div class="achievement-icon">{{ achievement.icon }}</div>
              <div class="achievement-content">
                <h4>{{ achievement.name }}</h4>
                <p>{{ achievement.description }}</p>
                <div class="achievement-progress">
                  <div class="progress-bar">
                    <div 
                      class="progress-fill" 
                      :style="{ width: (achievement.progress / achievement.maxProgress) * 100 + '%' }"
                    ></div>
                  </div>
                  <span class="progress-text">
                    {{ achievement.progress }}/{{ achievement.maxProgress }}
                  </span>
                </div>
                <div v-if="achievement.unlockedDate" class="unlock-date">
                  Unlocked: {{ formatDate(achievement.unlockedDate) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Research Tools Tab -->
        <div v-if="activeTab === 'tools'" class="tab-content">
          <div class="tools-header">
            <h3>🛠️ Research Tools</h3>
            <p>Unlock new tools by advancing your research level and completing objectives.</p>
          </div>
          
          <div class="tools-grid">
            <div 
              v-for="tool in allTools"
              :key="tool.id"
              :class="['tool-card', { unlocked: gameState.unlockedTools.has(tool.id) }]"
            >
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-content">
                <h4>{{ tool.name }}</h4>
                <p>{{ tool.description }}</p>
                <div class="tool-requirements">
                  {{ tool.requirement }}
                </div>
                <div v-if="!gameState.unlockedTools.has(tool.id)" class="tool-locked">
                  🔒 Locked
                </div>
                <div v-else class="tool-unlocked">
                  ✅ Available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GameState as GameStateType } from '@/game/GameState'

const props = defineProps<{
  gameState: GameStateType
}>()

defineEmits<{
  close: []
}>()

// Tab navigation
const activeTab = ref('species')
const tabs = ['species', 'publications', 'achievements', 'tools']

// Species tab state
const speciesFilter = ref('')
const selectedCategory = ref('all')
const selectedStatus = ref('all')
const selectedSpecies = ref('common_grass')

// Achievement tab state
const selectedAchievementCategory = ref('all')
const achievementCategories = ['all', 'species', 'ecosystem', 'research', 'challenge']

// Research progress calculation
const researchProgress = computed(() => {
  const requirements = props.gameState.getResearchLevelRequirements()
  return Math.min(100, (props.gameState.researchPoints / requirements.points) * 100)
})

const nextLevelRequirement = computed(() => {
  return props.gameState.getResearchLevelRequirements().points
})

// Mock species data (would be loaded from database in real implementation)
const allSpeciesData = [
  {
    id: 'common_grass',
    name: 'Common Grass',
    scientific: 'Festuca rubra',
    type: 'grass',
    succession: 'pioneer',
    icon: '🌱',
    growthRate: 0.8,
    maxBiomass: 0.5,
    hardiness: 0.7,
    tempRange: '-15°C to 30°C',
    moistureRange: '20% to 90%',
    lightRange: '30% to 100%',
    interactions: ['Wind pollinated', 'Grazing resistant', 'Soil stabilization']
  },
  {
    id: 'silver_birch',
    name: 'Silver Birch',
    scientific: 'Betula pendula',
    type: 'tree',
    succession: 'early',
    icon: '🌳',
    growthRate: 0.6,
    maxBiomass: 8.0,
    hardiness: 0.9,
    tempRange: '-25°C to 25°C',
    moistureRange: '30% to 80%',
    lightRange: '60% to 100%',
    interactions: ['Wind pollinated', 'Bird nesting sites', 'Pioneer species']
  },
  {
    id: 'white_clover',
    name: 'White Clover',
    scientific: 'Trifolium repens',
    type: 'flower',
    succession: 'pioneer',
    icon: '🌿',
    growthRate: 0.9,
    maxBiomass: 0.4,
    hardiness: 0.6,
    tempRange: '-10°C to 28°C',
    moistureRange: '30% to 90%',
    lightRange: '40% to 100%',
    interactions: ['Insect pollinated', 'Nitrogen fixation', 'Attracts pollinators']
  }
  // Add more species data...
]

const filteredSpecies = computed(() => {
  let species = allSpeciesData
  
  if (speciesFilter.value) {
    species = species.filter(s => 
      s.name.toLowerCase().includes(speciesFilter.value.toLowerCase()) ||
      s.scientific.toLowerCase().includes(speciesFilter.value.toLowerCase())
    )
  }
  
  if (selectedCategory.value !== 'all') {
    species = species.filter(s => s.type === selectedCategory.value)
  }
  
  if (selectedStatus.value === 'discovered') {
    species = species.filter(s => props.gameState.unlockedSpecies.has(s.id))
  } else if (selectedStatus.value === 'undiscovered') {
    species = species.filter(s => !props.gameState.unlockedSpecies.has(s.id))
  }
  
  return species
})

const selectedSpeciesData = computed(() => {
  return allSpeciesData.find(s => s.id === selectedSpecies.value)
})

// Publication stats
const totalImpactFactor = computed(() => {
  return props.gameState.publications.reduce((sum, pub) => sum + pub.impactFactor, 0)
})

const totalCitations = computed(() => {
  return props.gameState.publications.reduce((sum, pub) => sum + pub.citations, 0)
})

// Achievement stats
const unlockedAchievements = computed(() => {
  return props.gameState.achievements.filter(a => a.unlockedDate).length
})

const filteredAchievements = computed(() => {
  if (selectedAchievementCategory.value === 'all') {
    return props.gameState.achievements
  }
  return props.gameState.achievements.filter(a => a.category === selectedAchievementCategory.value)
})

// Tools data
const allTools = [
  { id: 'plant', name: 'Plant Species', icon: '🌱', description: 'Introduce plant species to the ecosystem', requirement: 'Available from start' },
  { id: 'irrigate', name: 'Irrigation', icon: '💧', description: 'Add water to increase soil moisture', requirement: 'Available from start' },
  { id: 'cleanse', name: 'Pollution Cleanup', icon: '🧹', description: 'Remove pollution and contaminants', requirement: 'Research Level 2' },
  { id: 'weather_monitor', name: 'Weather Control', icon: '🌦️', description: 'Generate weather events', requirement: 'Research Level 2' },
  { id: 'soil_modification', name: 'Soil Modification', icon: '🏔️', description: 'Modify soil properties', requirement: 'Research Level 3' },
  { id: 'species_introduction', name: 'Animal Introduction', icon: '🦋', description: 'Introduce animal species', requirement: 'Research Level 3' },
  { id: 'hybrid_creation', name: 'Hybrid Creation', icon: '✨', description: 'Create hybrid species', requirement: 'Research Level 4' },
  { id: 'genetic_rescue', name: 'Genetic Rescue', icon: '🧬', description: 'Improve genetic diversity', requirement: 'Research Level 4' },
  { id: 'ecosystem_engineering', name: 'Ecosystem Engineering', icon: '⚗️', description: 'Design novel ecosystems', requirement: 'Research Level 5' }
]

// Helper functions
function getTabIcon(tab: string): string {
  const icons = {
    species: '🦋',
    publications: '📚',
    achievements: '🏆',
    tools: '🛠️'
  }
  return icons[tab as keyof typeof icons] || '📊'
}

function getCategoryIcon(category: string): string {
  const icons = {
    all: '🌐',
    species: '🦋',
    ecosystem: '🌱',
    research: '🔬',
    challenge: '🎯'
  }
  return icons[category as keyof typeof icons] || '📊'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.research-dialog {
  background: #1a1a1a;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 95vw;
  max-width: 1200px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #333;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #333;
  background: linear-gradient(135deg, #1a2f2f, #2a4f4f);
  border-radius: 12px 12px 0 0;
}

.dialog-header h2 {
  margin: 0;
  font-size: 20px;
  color: #fff;
}

.research-level {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #aaa;
}

.xp-bar {
  width: 100px;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.3s ease;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.dialog-body {
  flex: 1;
  padding: 20px 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #333;
  padding-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: #2a2a2a;
  border: none;
  border-radius: 6px 6px 0 0;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #3a3a3a;
  color: #fff;
}

.tab-btn.active {
  background: #4ade80;
  color: #000;
  font-weight: bold;
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
}

/* Species Tab */
.codex-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.search-input, .filter-select {
  padding: 6px 8px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.search-input {
  flex: 1;
}

.codex-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: calc(100% - 60px);
}

.species-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.species-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #2a2a2a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.species-entry:hover {
  background: #3a3a3a;
}

.species-entry.selected {
  border-left-color: #4ade80;
  background: #1a2f1a;
}

.species-entry.discovered {
  opacity: 1;
}

.species-entry:not(.discovered) {
  opacity: 0.6;
}

.species-icon {
  font-size: 20px;
}

.species-info {
  flex: 1;
}

.species-name {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}

.species-type {
  font-size: 10px;
  color: #aaa;
  text-transform: uppercase;
}

.discovery-status {
  font-size: 14px;
  color: #4ade80;
}

/* Species Details */
.species-details {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  overflow-y: auto;
}

.species-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.species-large-icon {
  font-size: 48px;
}

.species-header h3 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.scientific-name {
  margin: 4px 0 8px 0;
  font-style: italic;
  color: #aaa;
  font-size: 12px;
}

.species-tags {
  display: flex;
  gap: 6px;
}

.tag {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: bold;
  text-transform: uppercase;
}

.tag.type {
  background: #3b82f6;
  color: #fff;
}

.tag.succession {
  background: #f59e0b;
  color: #000;
}

.species-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-section h4, .environment-section h4, .ecology-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #4ade80;
}

.stat-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 11px;
  color: #ccc;
  width: 80px;
}

.stat-bar {
  flex: 1;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: #4ade80;
  transition: width 0.3s ease;
}

.env-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.env-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.env-label {
  color: #ccc;
}

.env-range {
  color: #fff;
  font-weight: 500;
}

.interaction-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.interaction {
  font-size: 11px;
  color: #ccc;
  padding: 4px 0;
  border-bottom: 1px solid #333;
}

.species-locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #aaa;
}

.lock-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

/* Publications Tab */
.publications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pub-stats {
  display: flex;
  gap: 20px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #4ade80;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: #aaa;
  text-transform: uppercase;
}

.publication-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.publication-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border-left: 3px solid #8b5cf6;
}

.pub-header {
  margin-bottom: 8px;
}

.pub-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #fff;
}

.pub-meta {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #aaa;
}

.impact-factor {
  color: #8b5cf6;
  font-weight: bold;
}

.pub-description {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #ccc;
  line-height: 1.4;
}

.pub-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.ecosystem-type {
  color: #aaa;
  text-transform: capitalize;
}

.research-points {
  color: #4ade80;
  font-weight: bold;
}

/* Achievements Tab */
.achievements-header {
  margin-bottom: 16px;
}

.achievement-categories {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.category-btn {
  padding: 6px 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #aaa;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-btn:hover {
  background: #3a3a3a;
  color: #fff;
}

.category-btn.active {
  background: #f59e0b;
  color: #000;
  border-color: #f59e0b;
  font-weight: bold;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.achievement-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #444;
  opacity: 0.6;
}

.achievement-card.unlocked {
  border-color: #f59e0b;
  opacity: 1;
  background: #2a2a1a;
}

.achievement-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.achievement-content h4 {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #fff;
}

.achievement-content p {
  margin: 0 0 8px 0;
  font-size: 11px;
  color: #ccc;
  line-height: 1.3;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #f59e0b;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 10px;
  color: #aaa;
  min-width: 40px;
}

.unlock-date {
  font-size: 9px;
  color: #f59e0b;
  font-style: italic;
}

/* Tools Tab */
.tools-header {
  margin-bottom: 20px;
}

.tools-header p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #aaa;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.tool-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #444;
  opacity: 0.6;
}

.tool-card.unlocked {
  border-color: #4ade80;
  opacity: 1;
  background: #1a2a1a;
}

.tool-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.tool-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #fff;
}

.tool-content p {
  margin: 0 0 8px 0;
  font-size: 11px;
  color: #ccc;
  line-height: 1.3;
}

.tool-requirements {
  font-size: 10px;
  color: #aaa;
  margin-bottom: 8px;
}

.tool-locked {
  color: #ef4444;
  font-size: 11px;
  font-weight: bold;
}

.tool-unlocked {
  color: #4ade80;
  font-size: 11px;
  font-weight: bold;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #aaa;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Scrollbar styling */
.tab-content::-webkit-scrollbar,
.species-list::-webkit-scrollbar,
.species-details::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track,
.species-list::-webkit-scrollbar-track,
.species-details::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.tab-content::-webkit-scrollbar-thumb,
.species-list::-webkit-scrollbar-thumb,
.species-details::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.tab-content::-webkit-scrollbar-thumb:hover,
.species-list::-webkit-scrollbar-thumb:hover,
.species-details::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>