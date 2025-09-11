<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="scenario-dialog" @click.stop>
      <header class="dialog-header">
        <h2>🎯 Select Scenario</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </header>
      
      <div class="dialog-body">
        <div class="scenario-categories">
          <button 
            v-for="category in categories"
            :key="category"
            @click="selectedCategory = category"
            :class="['category-btn', { active: selectedCategory === category }]"
          >
            {{ category.replace('_', ' ').toUpperCase() }}
          </button>
        </div>
        
        <div class="scenario-grid">
          <div 
            v-for="scenario in filteredScenarios"
            :key="scenario.id"
            :class="['scenario-card', { locked: scenario.locked }]"
            @click="!scenario.locked && selectScenario(scenario.id)"
          >
            <div class="scenario-icon">{{ scenario.icon }}</div>
            <div class="scenario-content">
              <h3>{{ scenario.name }}</h3>
              <p>{{ scenario.description }}</p>
              <div class="scenario-meta">
                <span class="difficulty" :class="scenario.difficulty">
                  {{ scenario.difficulty.toUpperCase() }}
                </span>
                <span class="duration">{{ scenario.estimatedDays }} days</span>
              </div>
              <div class="scenario-objectives">
                <strong>Objectives:</strong>
                <ul>
                  <li v-for="objective in scenario.objectives.slice(0, 3)" :key="objective">
                    {{ objective }}
                  </li>
                </ul>
              </div>
              <div v-if="scenario.locked" class="lock-reason">
                🔒 {{ scenario.lockReason }}
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
import { GameState } from '@/game/GameState'

const emit = defineEmits<{
  close: []
  'select-scenario': [scenarioId: string]
}>()

const gameState = GameState.getInstance()
const selectedCategory = ref('beginner')

const categories = ['beginner', 'intermediate', 'advanced', 'expert']

const scenarios = [
  // Beginner Scenarios
  {
    id: 'abandoned_field',
    name: 'Abandoned Field',
    description: 'Transform a simple grass field into a thriving meadow ecosystem.',
    icon: '🌾',
    category: 'beginner',
    difficulty: 'easy',
    estimatedDays: 60,
    objectives: [
      'Achieve 60% biodiversity',
      'Establish 8 different species', 
      'Maintain 70% stability'
    ],
    locked: false,
    lockReason: ''
  },
  {
    id: 'polluted_pond',
    name: 'Polluted Pond',
    description: 'Clean a contaminated pond and establish thriving aquatic life.',
    icon: '🏞️',
    category: 'beginner', 
    difficulty: 'easy',
    estimatedDays: 45,
    objectives: [
      'Reduce pollution to <20%',
      'Introduce aquatic plants',
      'Establish fish populations'
    ],
    locked: false,
    lockReason: ''
  },
  {
    id: 'urban_garden',
    name: 'Urban Garden',
    description: 'Create biodiversity in a small city plot despite urban pressures.',
    icon: '🏙️',
    category: 'beginner',
    difficulty: 'easy', 
    estimatedDays: 30,
    objectives: [
      'Plant 5 native species',
      'Attract pollinators',
      'Resist urban pollution'
    ],
    locked: false,
    lockReason: ''
  },

  // Intermediate Scenarios
  {
    id: 'forest_recovery',
    name: 'Forest Recovery',
    description: 'Restore a logged forest area with proper succession stages.',
    icon: '🌲',
    category: 'intermediate',
    difficulty: 'medium',
    estimatedDays: 120,
    objectives: [
      'Establish canopy layer',
      'Achieve forest succession',
      'Support wildlife habitat'
    ],
    locked: gameState.researchLevel < 2,
    lockReason: 'Requires Research Level 2'
  },
  {
    id: 'wetland_creation',
    name: 'Wetland Creation', 
    description: 'Build a wetland ecosystem from scratch in a former agricultural field.',
    icon: '🦆',
    category: 'intermediate',
    difficulty: 'medium',
    estimatedDays: 90,
    objectives: [
      'Create water habitats',
      'Establish wetland plants',
      'Attract migratory birds'
    ],
    locked: gameState.researchLevel < 2,
    lockReason: 'Requires Research Level 2'
  },
  {
    id: 'invasive_control',
    name: 'Invasive Species Control',
    description: 'Control invasive plant species while maintaining ecosystem diversity.',
    icon: '⚔️',
    category: 'intermediate',
    difficulty: 'medium',
    estimatedDays: 75,
    objectives: [
      'Reduce invasive species by 80%',
      'Protect native species',
      'Prevent re-invasion'
    ],
    locked: gameState.researchLevel < 2,
    lockReason: 'Requires Research Level 2'
  },

  // Advanced Scenarios
  {
    id: 'climate_adaptation',
    name: 'Climate Adaptation',
    description: 'Help an ecosystem adapt to changing temperature and precipitation.',
    icon: '🌡️',
    category: 'advanced',
    difficulty: 'hard',
    estimatedDays: 150,
    objectives: [
      'Survive temperature increase',
      'Adapt to new rainfall patterns',
      'Maintain species diversity'
    ],
    locked: gameState.researchLevel < 3,
    lockReason: 'Requires Research Level 3'
  },
  {
    id: 'fire_management',
    name: 'Fire Management',
    description: 'Use controlled burns to maintain prairie health and prevent wildfires.',
    icon: '🔥',
    category: 'advanced',
    difficulty: 'hard',
    estimatedDays: 100,
    objectives: [
      'Conduct controlled burns',
      'Maintain fire-adapted species',
      'Prevent catastrophic fires'
    ],
    locked: gameState.researchLevel < 3,
    lockReason: 'Requires Research Level 3'
  },
  {
    id: 'corridor_creation',
    name: 'Wildlife Corridor',
    description: 'Connect fragmented forest habitats with wildlife corridors.',
    icon: '🦌',
    category: 'advanced',
    difficulty: 'hard',
    estimatedDays: 180,
    objectives: [
      'Connect habitat fragments',
      'Facilitate animal movement',
      'Increase genetic diversity'
    ],
    locked: gameState.researchLevel < 3,
    lockReason: 'Requires Research Level 3'
  },

  // Expert Scenarios
  {
    id: 'ecosystem_engineering',
    name: 'Ecosystem Engineering',
    description: 'Design and create a completely novel ecosystem for specific goals.',
    icon: '⚗️',
    category: 'expert',
    difficulty: 'extreme',
    estimatedDays: 250,
    objectives: [
      'Design novel ecosystem',
      'Achieve target services',
      'Ensure long-term stability'
    ],
    locked: gameState.researchLevel < 5,
    lockReason: 'Requires Research Level 5'
  },
  {
    id: 'species_reintroduction',
    name: 'Species Reintroduction',
    description: 'Bring back locally extinct species to their historical habitat.',
    icon: '🦅',
    category: 'expert',
    difficulty: 'extreme',
    estimatedDays: 200,
    objectives: [
      'Prepare suitable habitat',
      'Successfully reintroduce species',
      'Achieve breeding population'
    ],
    locked: gameState.researchLevel < 4,
    lockReason: 'Requires Research Level 4'
  },
  {
    id: 'carbon_optimization',
    name: 'Carbon Sequestration',
    description: 'Optimize an ecosystem for maximum carbon storage and climate benefits.',
    icon: '🌱',
    category: 'expert',
    difficulty: 'extreme',
    estimatedDays: 300,
    objectives: [
      'Maximize carbon storage',
      'Maintain biodiversity',
      'Ensure permanence'
    ],
    locked: gameState.researchLevel < 4,
    lockReason: 'Requires Research Level 4'
  }
]

const filteredScenarios = computed(() => {
  return scenarios.filter(s => s.category === selectedCategory.value)
})

function selectScenario(scenarioId: string) {
  emit('select-scenario', scenarioId)
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

.scenario-dialog {
  background: #1a1a1a;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 90vw;
  max-width: 1000px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #333;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #333;
  background: linear-gradient(135deg, #1a2f1a, #2a4f2a);
  border-radius: 12px 12px 0 0;
}

.dialog-header h2 {
  margin: 0;
  font-size: 20px;
  color: #fff;
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
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scenario-categories {
  display: flex;
  gap: 8px;
}

.category-btn {
  padding: 8px 16px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #aaa;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-btn:hover {
  background: #3a3a3a;
  color: #fff;
}

.category-btn.active {
  background: #4ade80;
  color: #000;
  border-color: #4ade80;
  font-weight: bold;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.scenario-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #444;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.scenario-card:not(.locked):hover {
  border-color: #4ade80;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(74, 222, 128, 0.2);
}

.scenario-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
  background: #1a1a1a;
}

.scenario-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.scenario-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #fff;
}

.scenario-content p {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #ccc;
  line-height: 1.4;
}

.scenario-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.difficulty {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.difficulty.easy {
  background: #4ade80;
  color: #000;
}

.difficulty.medium {
  background: #f59e0b;
  color: #000;
}

.difficulty.hard {
  background: #ef4444;
  color: #fff;
}

.difficulty.extreme {
  background: #8b5cf6;
  color: #fff;
}

.duration {
  font-size: 11px;
  color: #aaa;
}

.scenario-objectives {
  font-size: 12px;
  color: #ccc;
}

.scenario-objectives strong {
  color: #4ade80;
  display: block;
  margin-bottom: 4px;
}

.scenario-objectives ul {
  margin: 0;
  padding-left: 16px;
  list-style-type: disc;
}

.scenario-objectives li {
  margin-bottom: 2px;
  line-height: 1.3;
}

.lock-reason {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  color: #f59e0b;
  font-weight: bold;
  backdrop-filter: blur(2px);
}

/* Scrollbar styling */
.dialog-body::-webkit-scrollbar {
  width: 6px;
}

.dialog-body::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.dialog-body::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>