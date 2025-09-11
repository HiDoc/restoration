<template>
  <div class="population-graph">
    <div class="graph-header">
      <h3>Species Population Over Time</h3>
      <div class="graph-controls">
        <button 
          class="btn btn-small" 
          @click="clearHistory"
          title="Clear population history"
        >
          🗑️ Clear
        </button>
        <button 
          class="btn btn-small" 
          :class="{ active: isPaused }"
          @click="togglePause"
          title="Pause/resume tracking"
        >
          {{ isPaused ? '▶️' : '⏸️' }} {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        <button 
          class="btn btn-small" 
          :class="{ active: showEnvironmental }"
          @click="toggleEnvironmentalView"
          title="Toggle environmental data view"
        >
          🌡️ Environment
        </button>
      </div>
    </div>
    
    <div class="graph-container" ref="graphContainer">
      <canvas 
        ref="canvas" 
        :width="canvasWidth" 
        :height="canvasHeight"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
      />
      
      <div 
        v-if="tooltipData" 
        class="tooltip"
        :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
      >
        <div class="tooltip-header">Tick {{ tooltipData.tick }}</div>
        
        <div v-if="!showEnvironmental">
          <div v-for="(count, species) in tooltipData.populations" :key="species" class="tooltip-row">
            <span class="species-dot" :style="{ backgroundColor: getSpeciesColor(species) }"></span>
            {{ getSpeciesName(species) }}: {{ count }}
          </div>
          <div class="tooltip-total">Total: {{ tooltipData.total }}</div>
        </div>
        
        <div v-else class="environmental-tooltip">
          <div class="tooltip-row">
            <span class="species-dot" :style="{ backgroundColor: '#fff' }"></span>
            Population: {{ tooltipData.total }}
          </div>
          <div v-for="(metric, key) in environmentalMetrics" :key="key" class="tooltip-row">
            <span class="species-dot" :style="{ backgroundColor: metric.color }"></span>
            {{ metric.name }}: {{ formatEnvironmentalValue(tooltipData.environment[key as keyof typeof tooltipData.environment], metric) }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="graph-legend">
      <div v-if="!showEnvironmental">
        <div v-for="species in visibleSpecies" :key="species" class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: getSpeciesColor(species) }"></span>
          <span class="legend-label">{{ getSpeciesName(species) }}</span>
          <span class="legend-count">({{ getCurrentCount(species) }})</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dashed" :style="{ backgroundColor: '#fff' }"></span>
          <span class="legend-label">Total Population</span>
        </div>
      </div>
      
      <div v-else class="environmental-legend">
        <div class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: '#fff' }"></span>
          <span class="legend-label">Population (normalized)</span>
        </div>
        <div v-for="(metric, key) in environmentalMetrics" :key="key" class="legend-item clickable" @click="toggleEnvironmentalMetric(key)">
          <span class="legend-dot dashed" :style="{ backgroundColor: metric.color, opacity: selectedMetrics.has(key) ? 1 : 0.3 }"></span>
          <span class="legend-label" :class="{ active: selectedMetrics.has(key) }">{{ metric.name }}</span>
          <span class="legend-range">({{ metric.scale[0] }}-{{ metric.scale[1] }})</span>
        </div>
      </div>
    </div>
    
    <div class="graph-stats">
      <div class="stat">
        <span class="label">Max Population:</span>
        <span class="value">{{ maxPopulation }}</span>
      </div>
      <div class="stat">
        <span class="label">Time Range:</span>
        <span class="value">{{ timeRange }} ticks</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry'

interface PopulationDataPoint {
  tick: number
  populations: Record<string, number>
  total: number
  environment: {
    avgTemperature: number
    avgMoisture: number
    avgVitality: number
    avgPollution: number
    avgLight: number
    avgNutrients: number
  }
}

interface TooltipData {
  x: number
  y: number
  tick: number
  populations: Record<string, number>
  total: number
  environment: {
    avgTemperature: number
    avgMoisture: number
    avgVitality: number
    avgPollution: number
    avgLight: number
    avgNutrients: number
  }
}

const props = defineProps<{
  currentTick: number
  totalSpecies: number
  chunks?: Map<string, any>
  showEnvironmental?: boolean
}>()

// Refs
const canvas = ref<HTMLCanvasElement>()
const graphContainer = ref<HTMLDivElement>()
const tooltipData = ref<TooltipData | null>(null)

// Data
const populationHistory = ref<PopulationDataPoint[]>([])
const isPaused = ref(false)
const canvasWidth = ref(600)
const canvasHeight = ref(300)
const showEnvironmental = ref(true)
const selectedMetrics = ref(new Set(['avgTemperature', 'avgMoisture', 'avgVitality']))

// Species colors for consistent visualization
const speciesColors = new Map<string, string>()
const colorPalette = [
  '#4ade80', '#60a5fa', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
  '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9'
]

// Environmental metric colors and configs
const environmentalMetrics = {
  avgTemperature: { name: 'Temperature', color: '#ef4444', scale: [0, 40] },
  avgMoisture: { name: 'Moisture', color: '#06b6d4', scale: [0, 1] },
  avgVitality: { name: 'Vitality', color: '#4ade80', scale: [0, 1] },
  avgPollution: { name: 'Pollution', color: '#78716c', scale: [0, 1] },
  avgLight: { name: 'Light', color: '#f59e0b', scale: [0, 1] },
  avgNutrients: { name: 'Nutrients', color: '#a855f7', scale: [0, 1] }
}

// Computed
const visibleSpecies = computed(() => {
  const speciesSet = new Set<string>()
  populationHistory.value.forEach(point => {
    Object.keys(point.populations).forEach(species => {
      if (point.populations[species] > 0) {
        speciesSet.add(species)
      }
    })
  })
  return Array.from(speciesSet).sort()
})

const maxPopulation = computed(() => {
  return Math.max(1, ...populationHistory.value.map(p => p.total))
})

const timeRange = computed(() => {
  if (populationHistory.value.length < 2) return 0
  const first = populationHistory.value[0].tick
  const last = populationHistory.value[populationHistory.value.length - 1].tick
  return last - first
})

// Methods
function updatePopulationData() {
  if (isPaused.value || !props.chunks) return
  
  const populations: Record<string, number> = {}
  let total = 0
  
  // Environmental data collection
  let totalTemp = 0
  let totalMoisture = 0
  let totalVitality = 0
  let totalPollution = 0
  let totalLight = 0
  let totalNutrients = 0
  let chunkCount = 0
  
  // Count species and collect environmental data across all chunks
  props.chunks.forEach((chunk) => {
    if (chunk.species) {
      chunk.species.forEach((species: any) => {
        populations[species.speciesId] = (populations[species.speciesId] || 0) + 1
        total++
      })
    }
    
    // Collect environmental data
    if (chunk.climateState) {
      totalTemp += chunk.climateState.temperature || 20
      totalLight += chunk.climateState.light || 0.5
    }
    
    if (chunk.biomeState) {
      totalMoisture += chunk.biomeState.moisture || 0.5
      totalVitality += chunk.biomeState.vitality || 0.5
      totalPollution += chunk.biomeState.pollution || 0
      totalNutrients += chunk.biomeState.soil || 0.5
    }
    
    chunkCount++
  })
  
  const dataPoint: PopulationDataPoint = {
    tick: props.currentTick,
    populations,
    total,
    environment: {
      avgTemperature: chunkCount > 0 ? totalTemp / chunkCount : 20,
      avgMoisture: chunkCount > 0 ? totalMoisture / chunkCount : 0.5,
      avgVitality: chunkCount > 0 ? totalVitality / chunkCount : 0.5,
      avgPollution: chunkCount > 0 ? totalPollution / chunkCount : 0,
      avgLight: chunkCount > 0 ? totalLight / chunkCount : 0.5,
      avgNutrients: chunkCount > 0 ? totalNutrients / chunkCount : 0.5
    }
  }
  
  populationHistory.value.push(dataPoint)
  
  // Limit history to prevent memory issues (keep last 1000 points)
  if (populationHistory.value.length > 1000) {
    populationHistory.value = populationHistory.value.slice(-1000)
  }
  
  nextTick(() => drawGraph())
}

function getSpeciesColor(speciesId: string): string {
  if (!speciesColors.has(speciesId)) {
    const index = speciesColors.size % colorPalette.length
    speciesColors.set(speciesId, colorPalette[index])
  }
  return speciesColors.get(speciesId)!
}

function getSpeciesName(speciesId: string): string {
  const registry = SpeciesRegistry.getInstance()
  const species = registry.getSpecies(speciesId)
  return species?.name || speciesId
}

function getCurrentCount(speciesId: string): number {
  const latest = populationHistory.value[populationHistory.value.length - 1]
  return latest?.populations[speciesId] || 0
}

function clearHistory() {
  populationHistory.value = []
  tooltipData.value = null
  drawGraph()
}

function togglePause() {
  isPaused.value = !isPaused.value
}

function toggleEnvironmentalMetric(metric: string) {
  if (selectedMetrics.value.has(metric)) {
    selectedMetrics.value.delete(metric)
  } else {
    selectedMetrics.value.add(metric)
  }
  nextTick(() => drawGraph())
}

function toggleEnvironmentalView() {
  showEnvironmental.value = !showEnvironmental.value
  nextTick(() => drawGraph())
}

function formatEnvironmentalValue(value: number, metric: { scale: [number, number] }): string {
  if (metric.scale[1] <= 1) {
    return value.toFixed(2)
  } else {
    return Math.round(value).toString()
  }
}

function drawGraph() {
  if (!canvas.value) return
  
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  
  const width = canvasWidth.value
  const height = canvasHeight.value
  
  // Clear canvas
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)
  
  if (populationHistory.value.length < 2) {
    // Draw "No data" message
    ctx.fillStyle = '#888'
    ctx.font = '16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('No population data yet', width / 2, height / 2)
    return
  }
  
  const padding = 40
  const rightPadding = showEnvironmental.value ? 80 : 40
  const graphWidth = width - padding - rightPadding
  const graphHeight = height - padding * 2
  
  const minTick = populationHistory.value[0].tick
  const maxTick = populationHistory.value[populationHistory.value.length - 1].tick
  const tickRange = Math.max(1, maxTick - minTick)
  
  // Determine y-axis scale based on what we're showing
  const maxScale = showEnvironmental.value ? 1 : maxPopulation.value
  
  // Draw grid
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  
  // Vertical grid lines (time)
  const timeSteps = 5
  for (let i = 0; i <= timeSteps; i++) {
    const x = padding + (i / timeSteps) * graphWidth
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
    
    // Time labels
    const tick = minTick + (i / timeSteps) * tickRange
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(Math.round(tick).toString(), x, height - padding + 15)
  }
  
  // Horizontal grid lines
  const steps = 5
  for (let i = 0; i <= steps; i++) {
    const y = padding + (1 - i / steps) * graphHeight
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(padding + graphWidth, y)
    ctx.stroke()
    
    // Left axis labels (population or normalized)
    if (showEnvironmental.value) {
      const value = i / steps
      ctx.fillStyle = '#888'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(1), padding - 5, y + 3)
    } else {
      const pop = (i / steps) * maxPopulation.value
      ctx.fillStyle = '#888'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(Math.round(pop).toString(), padding - 5, y + 3)
    }
  }
  
  // Draw environmental metrics if enabled
  if (showEnvironmental.value) {
    selectedMetrics.value.forEach(metricKey => {
      const metric = environmentalMetrics[metricKey as keyof typeof environmentalMetrics]
      if (!metric) return
      
      ctx.strokeStyle = metric.color
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      
      populationHistory.value.forEach((point, index) => {
        const rawValue = point.environment[metricKey as keyof typeof point.environment]
        // Normalize value to [0, 1] range
        const normalizedValue = (rawValue - metric.scale[0]) / (metric.scale[1] - metric.scale[0])
        const clampedValue = Math.max(0, Math.min(1, normalizedValue))
        
        const x = padding + ((point.tick - minTick) / tickRange) * graphWidth
        const y = padding + (1 - clampedValue) * graphHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      ctx.setLineDash([])
    })
    
    // Draw right axis labels for environmental metrics
    for (let i = 0; i <= steps; i++) {
      const y = padding + (1 - i / steps) * graphHeight
      const value = i / steps
      ctx.fillStyle = '#666'
      ctx.font = '9px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(value.toFixed(1), padding + graphWidth + 5, y + 3)
    }
  }
  
  // Draw species lines (normalized to 0-1 if environmental view is on)
  if (!showEnvironmental.value) {
    visibleSpecies.value.forEach(speciesId => {
      const color = getSpeciesColor(speciesId)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      
      let isFirstPoint = true
      populationHistory.value.forEach((point, index) => {
        const count = point.populations[speciesId] || 0
        if (count > 0 || !isFirstPoint) {
          const x = padding + ((point.tick - minTick) / tickRange) * graphWidth
          const y = padding + (1 - count / maxPopulation.value) * graphHeight
          
          if (isFirstPoint) {
            ctx.moveTo(x, y)
            isFirstPoint = false
          } else {
            ctx.lineTo(x, y)
          }
        }
      })
      
      ctx.stroke()
    })
    
    // Draw total population line (dashed)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    
    populationHistory.value.forEach((point, index) => {
      const x = padding + ((point.tick - minTick) / tickRange) * graphWidth
      const y = padding + (1 - point.total / maxPopulation.value) * graphHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // In environmental view, show normalized population as a solid line
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    populationHistory.value.forEach((point, index) => {
      const normalizedPop = maxPopulation.value > 0 ? point.total / maxPopulation.value : 0
      const x = padding + ((point.tick - minTick) / tickRange) * graphWidth
      const y = padding + (1 - normalizedPop) * graphHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  }
}

function onMouseMove(event: MouseEvent) {
  if (!canvas.value || populationHistory.value.length < 2) return
  
  const rect = canvas.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const padding = 40
  const graphWidth = canvasWidth.value - padding * 2
  
  if (mouseX < padding || mouseX > canvasWidth.value - padding) {
    tooltipData.value = null
    return
  }
  
  const minTick = populationHistory.value[0].tick
  const maxTick = populationHistory.value[populationHistory.value.length - 1].tick
  const tickRange = maxTick - minTick
  
  const targetTick = minTick + ((mouseX - padding) / graphWidth) * tickRange
  
  // Find closest data point
  let closestPoint = populationHistory.value[0]
  let closestDistance = Math.abs(closestPoint.tick - targetTick)
  
  populationHistory.value.forEach(point => {
    const distance = Math.abs(point.tick - targetTick)
    if (distance < closestDistance) {
      closestDistance = distance
      closestPoint = point
    }
  })
  
  tooltipData.value = {
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 10,
    tick: closestPoint.tick,
    populations: closestPoint.populations,
    total: closestPoint.total,
    environment: closestPoint.environment
  }
}

function onMouseLeave() {
  tooltipData.value = null
}

function resizeCanvas() {
  if (!graphContainer.value) return
  
  const rect = graphContainer.value.getBoundingClientRect()
  canvasWidth.value = rect.width
  canvasHeight.value = 300
  
  nextTick(() => drawGraph())
}

// Watchers
watch(() => props.currentTick, () => {
  updatePopulationData()
}, { immediate: false })

watch(() => [canvasWidth.value, canvasHeight.value], () => {
  nextTick(() => drawGraph())
})

// Lifecycle
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.population-graph {
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.graph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.graph-header h3 {
  margin: 0;
  color: white;
  font-size: 16px;
}

.graph-controls {
  display: flex;
  gap: 8px;
}

.btn-small {
  background: #2f2f2f;
  color: #eaeaea;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.btn-small:hover {
  background: #3a3a3a;
}

.btn-small.active {
  outline: 2px solid #4ade80;
  outline-offset: -2px;
}

.graph-container {
  position: relative;
  width: 100%;
  margin-bottom: 12px;
}

canvas {
  width: 100%;
  height: 300px;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: crosshair;
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #666;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: white;
  pointer-events: none;
  z-index: 10;
  max-width: 200px;
}

.tooltip-header {
  font-weight: bold;
  margin-bottom: 4px;
  color: #4ade80;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.tooltip-total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #666;
  font-weight: bold;
}

.species-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px;
  background: #2a2a2a;
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-label {
  color: white;
}

.legend-count {
  color: #888;
}

.legend-range {
  color: #666;
  font-size: 10px;
}

.legend-dot.dashed {
  border: 2px dashed currentColor;
  background: transparent !important;
  border-color: inherit;
}

.legend-item.clickable {
  cursor: pointer;
}

.legend-item.clickable:hover .legend-label {
  color: #4ade80;
}

.legend-label.active {
  color: white;
  font-weight: bold;
}

.environmental-tooltip .tooltip-row {
  margin-bottom: 3px;
}

.environmental-legend {
  max-height: 120px;
  overflow-y: auto;
}

.graph-stats {
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: #888;
}

.stat {
  display: flex;
  gap: 6px;
}

.stat .label {
  color: #aaa;
}

.stat .value {
  color: white;
  font-weight: bold;
}
</style>