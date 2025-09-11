<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="experiment-dialog" @click.stop>
      <header class="dialog-header">
        <h2>🧪 Create New Experiment</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </header>
      
      <div class="dialog-body">
        <form @submit.prevent="createExperiment" class="experiment-form">
          <!-- Basic Information -->
          <section class="form-section">
            <h3>📝 Basic Information</h3>
            <div class="form-group">
              <label for="title">Experiment Title</label>
              <input 
                id="title"
                v-model="form.title" 
                type="text" 
                class="form-input"
                placeholder="e.g., Wetland Restoration Study"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="description">Description</label>
              <textarea 
                id="description"
                v-model="form.description"
                class="form-textarea"
                placeholder="Describe the purpose and methodology of your experiment..."
                rows="3"
                required
              ></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="duration">Duration (days)</label>
                <input 
                  id="duration"
                  v-model.number="form.duration"
                  type="number"
                  class="form-input"
                  min="1"
                  max="365"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" v-model="form.category" class="form-select">
                  <option value="restoration">Ecosystem Restoration</option>
                  <option value="conservation">Species Conservation</option>
                  <option value="intervention">Human Intervention</option>
                  <option value="monitoring">Long-term Monitoring</option>
                  <option value="pollution">Pollution Control</option>
                  <option value="climate">Climate Response</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Study Area Selection -->
          <section class="form-section">
            <h3>🎯 Study Area</h3>
            <div class="area-selector">
              <div class="selector-info">
                <p>Select the chunks you want to include in your experiment. Click and drag to select multiple areas.</p>
                <div class="selection-stats">
                  <span>Selected: {{ selectedChunks.size }} chunks</span>
                  <button type="button" @click="clearSelection" class="btn-link">Clear All</button>
                </div>
              </div>
              
              <!-- Mini chunk grid for selection -->
              <div class="chunk-selector">
                <div 
                  v-for="chunk in availableChunks"
                  :key="chunk.id"
                  :class="['chunk-tile', { 
                    selected: selectedChunks.has(chunk.id),
                    healthy: chunk.health > 0.7,
                    moderate: chunk.health > 0.4 && chunk.health <= 0.7,
                    poor: chunk.health <= 0.4
                  }]"
                  @click="toggleChunk(chunk.id)"
                  :title="`Chunk ${chunk.x},${chunk.y} - Health: ${Math.round(chunk.health * 100)}%`"
                >
                  {{ selectedChunks.has(chunk.id) ? '✓' : '' }}
                </div>
              </div>
            </div>
          </section>

          <!-- Planned Interventions -->
          <section class="form-section">
            <h3>⚡ Planned Interventions</h3>
            <div class="interventions-list">
              <div 
                v-for="(intervention, index) in form.interventions"
                :key="index"
                class="intervention-item"
              >
                <div class="intervention-header">
                  <span class="intervention-day">Day {{ intervention.day }}</span>
                  <button type="button" @click="removeIntervention(index)" class="remove-btn">×</button>
                </div>
                
                <div class="intervention-form">
                  <select v-model="intervention.type" class="intervention-select">
                    <option value="plant">Plant Species</option>
                    <option value="irrigate">Add Water</option>
                    <option value="cleanse">Clean Pollution</option>
                    <option value="weather">Weather Event</option>
                    <option value="monitor">Take Measurements</option>
                  </select>
                  
                  <div v-if="intervention.type === 'plant'" class="intervention-params">
                    <select v-model="intervention.parameters.speciesId">
                      <option value="common_grass">Common Grass</option>
                      <option value="white_clover">White Clover</option>
                      <option value="silver_birch">Silver Birch</option>
                      <option value="hawthorn">Hawthorn</option>
                    </select>
                  </div>
                  
                  <div v-else-if="intervention.type === 'irrigate'" class="intervention-params">
                    <label>Amount:</label>
                    <input 
                      v-model.number="intervention.parameters.amount"
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                      class="range-input"
                    />
                    <span>{{ intervention.parameters.amount || 0.2 }}</span>
                  </div>
                  
                  <div v-else-if="intervention.type === 'cleanse'" class="intervention-params">
                    <label>Amount:</label>
                    <input 
                      v-model.number="intervention.parameters.amount"
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                      class="range-input"
                    />
                    <span>{{ intervention.parameters.amount || 0.2 }}</span>
                  </div>
                  
                  <div v-else-if="intervention.type === 'weather'" class="intervention-params">
                    <select v-model="intervention.parameters.eventType">
                      <option value="storm">Storm</option>
                      <option value="drought">Drought</option>
                      <option value="heatwave">Heat Wave</option>
                      <option value="coldsnap">Cold Snap</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <button type="button" @click="addIntervention" class="add-intervention-btn">
                + Add Intervention
              </button>
            </div>
          </section>

          <!-- Expected Outcomes -->
          <section class="form-section">
            <h3>📊 Expected Outcomes</h3>
            <div class="outcomes-grid">
              <div class="outcome-item">
                <label>
                  <input type="checkbox" v-model="form.expectedOutcomes.biodiversityIncrease" />
                  Increase biodiversity
                </label>
              </div>
              <div class="outcome-item">
                <label>
                  <input type="checkbox" v-model="form.expectedOutcomes.stabilityImprovement" />
                  Improve ecosystem stability
                </label>
              </div>
              <div class="outcome-item">
                <label>
                  <input type="checkbox" v-model="form.expectedOutcomes.pollutionReduction" />
                  Reduce pollution levels
                </label>
              </div>
              <div class="outcome-item">
                <label>
                  <input type="checkbox" v-model="form.expectedOutcomes.speciesIntroduction" />
                  Introduce new species
                </label>
              </div>
              <div class="outcome-item">
                <label>
                  <input type="checkbox" v-model="form.expectedOutcomes.habitatRestoration" />
                  Restore natural habitat
                </label>
              </div>
              <div class="outcome-item">
                <label>
                  <input type="checkbox" v-model="form.expectedOutcomes.carbonSequestration" />
                  Increase carbon storage
                </label>
              </div>
            </div>
          </section>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" @click="$emit('close')" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="!isFormValid">
              🧪 Start Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

const emit = defineEmits<{
  close: []
  'create-experiment': [experimentData: any]
}>()

// Form data
const form = reactive({
  title: '',
  description: '',
  duration: 30,
  category: 'restoration',
  interventions: [] as Array<{
    day: number
    type: string
    parameters: Record<string, any>
  }>,
  expectedOutcomes: {
    biodiversityIncrease: false,
    stabilityImprovement: false,
    pollutionReduction: false,
    speciesIntroduction: false,
    habitatRestoration: false,
    carbonSequestration: false
  }
})

// Selected study area chunks
const selectedChunks = ref(new Set<string>())

// Mock available chunks (would come from simulation in real implementation)
const availableChunks = ref([
  { id: 'chunk_0_0', x: 0, y: 0, health: 0.6 },
  { id: 'chunk_1_0', x: 1, y: 0, health: 0.4 },
  { id: 'chunk_2_0', x: 2, y: 0, health: 0.8 },
  { id: 'chunk_3_0', x: 3, y: 0, health: 0.3 },
  { id: 'chunk_0_1', x: 0, y: 1, health: 0.7 },
  { id: 'chunk_1_1', x: 1, y: 1, health: 0.5 },
  { id: 'chunk_2_1', x: 2, y: 1, health: 0.9 },
  { id: 'chunk_3_1', x: 3, y: 1, health: 0.2 },
  { id: 'chunk_0_2', x: 0, y: 2, health: 0.6 },
  { id: 'chunk_1_2', x: 1, y: 2, health: 0.4 },
  { id: 'chunk_2_2', x: 2, y: 2, health: 0.7 },
  { id: 'chunk_3_2', x: 3, y: 2, health: 0.5 },
])

// Form validation
const isFormValid = computed(() => {
  return form.title.trim() !== '' && 
         form.description.trim() !== '' && 
         form.duration > 0 && 
         selectedChunks.value.size > 0
})

// Chunk selection methods
function toggleChunk(chunkId: string) {
  if (selectedChunks.value.has(chunkId)) {
    selectedChunks.value.delete(chunkId)
  } else {
    selectedChunks.value.add(chunkId)
  }
}

function clearSelection() {
  selectedChunks.value.clear()
}

// Intervention management
function addIntervention() {
  const maxDay = form.interventions.length > 0 
    ? Math.max(...form.interventions.map(i => i.day))
    : 0
  
  form.interventions.push({
    day: Math.min(maxDay + 7, form.duration),
    type: 'monitor',
    parameters: {}
  })
}

function removeIntervention(index: number) {
  form.interventions.splice(index, 1)
}

// Form submission
function createExperiment() {
  if (!isFormValid.value) return
  
  const experimentData = {
    title: form.title,
    description: form.description,
    duration: form.duration,
    category: form.category,
    chunkIds: Array.from(selectedChunks.value),
    interventions: form.interventions.map(intervention => ({
      ...intervention,
      chunkId: Array.from(selectedChunks.value)[0] // Default to first selected chunk
    })),
    expectedOutcomes: form.expectedOutcomes
  }
  
  emit('create-experiment', experimentData)
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

.experiment-dialog {
  background: #1a1a1a;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #333;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
  background: linear-gradient(135deg, #2a1a2a, #4a2a4a);
  border-radius: 12px 12px 0 0;
}

.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  border-radius: 14px;
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
  overflow-y: auto;
  padding: 20px;
}

/* Form Styles */
.experiment-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border-left: 3px solid #8b5cf6;
}

.form-section h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #8b5cf6;
}

.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #ccc;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  padding: 8px 10px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  transition: border-color 0.2s ease;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: #8b5cf6;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

/* Area Selector */
.area-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #aaa;
}

.selection-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-link {
  background: none;
  border: none;
  color: #8b5cf6;
  cursor: pointer;
  font-size: 11px;
  text-decoration: underline;
}

.btn-link:hover {
  color: #a78bfa;
}

.chunk-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  max-width: 200px;
}

.chunk-tile {
  aspect-ratio: 1;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;
}

.chunk-tile.healthy {
  background: #1a3a1a;
  border-color: #4ade80;
}

.chunk-tile.moderate {
  background: #3a3a1a;
  border-color: #f59e0b;
}

.chunk-tile.poor {
  background: #3a1a1a;
  border-color: #ef4444;
}

.chunk-tile.selected {
  background: #2a2a4a !important;
  border-color: #8b5cf6 !important;
  color: #fff;
  font-weight: bold;
}

.chunk-tile:hover {
  transform: scale(1.05);
}

/* Interventions */
.interventions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intervention-item {
  background: #1a1a1a;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #444;
}

.intervention-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.intervention-day {
  font-size: 11px;
  color: #8b5cf6;
  font-weight: bold;
}

.remove-btn {
  background: #ef4444;
  border: none;
  color: #fff;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.intervention-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.intervention-select {
  flex: 1;
  padding: 4px 6px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
}

.intervention-params {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #ccc;
}

.intervention-params select {
  padding: 2px 4px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 2px;
  color: #fff;
  font-size: 10px;
}

.range-input {
  width: 80px;
}

.add-intervention-btn {
  padding: 8px 12px;
  background: #374151;
  border: 1px solid #4b5563;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s ease;
  align-self: flex-start;
}

.add-intervention-btn:hover {
  background: #4b5563;
}

/* Expected Outcomes */
.outcomes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.outcome-item label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #ccc;
  cursor: pointer;
}

.outcome-item input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #374151;
  color: #fff;
  border: 1px solid #4b5563;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-primary {
  background: #8b5cf6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #7c3aed;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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