<template>
  <div class="sci-panel p-4 mb-3">
    <div class="flex items-center justify-between mb-4">
      <h3 class="m-0 text-white text-base">Species Population Over Time</h3>
      <div class="flex gap-2">
        <button 
          class="sci-btn text-xs px-2 py-1" 
          @click="clearHistory"
          title="Clear population history"
        >
          🗑️ Clear
        </button>
        <button 
          class="sci-btn text-xs px-2 py-1" 
          :class="{ 'outline outline-2 outline-primary-400 outline-offset-[-2px]': isPaused }"
          @click="togglePause"
          title="Pause/resume tracking"
        >
          {{ isPaused ? '▶️' : '⏸️' }} {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        <button 
          class="sci-btn text-xs px-2 py-1" 
          :class="{ 'outline outline-2 outline-primary-400 outline-offset-[-2px]': environmentalVisible }"
          @click="toggleEnvironmentalView"
          title="Toggle environmental data view"
        >
          🌡️ Environment
        </button>
      </div>
    </div>
    
    <div class="relative w-full mb-3" ref="graphContainer">
      <canvas 
        class="w-full h-[300px] sci-panel cursor-crosshair"
        ref="canvas" 
        :width="canvasWidth" 
        :height="canvasHeight"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
      />
      
      <div 
        v-if="tooltipData" 
        class="absolute sci-panel px-2 py-2 text-xs pointer-events-none z-10 max-w-[200px]"
        :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
      >
        <div class="font-bold mb-1 text-primary-400">Tick {{ tooltipData.tick }}</div>
        
        <div v-if="!environmentalVisible">
          <div v-for="(count, species) in tooltipData.populations" :key="species" class="tooltip-row">
            <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: getSpeciesColor(species) }"></span>
            {{ getSpeciesName(species) }}: {{ count }}
          </div>
          <div class="mt-1 pt-1 border-t border-dark-500 font-bold">Total: {{ tooltipData.total }}</div>
        </div>
        
        <div v-else>
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: '#fff' }"></span>
            Population: {{ tooltipData.total }}
          </div>
          <div v-for="(metric, key) in environmentalMetrics" :key="key" class="tooltip-row">
            <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: metric.color }"></span>
            {{ metric.name }}: {{ formatEnvironmentalValue(tooltipData.environment[key as keyof typeof tooltipData.environment], metric) }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex flex-wrap gap-3 mb-3 p-2 sci-panel">
      <div v-if="!environmentalVisible">
        <div v-for="species in visibleSpecies" :key="species" class="flex items-center gap-1.5 text-xs">
          <span class="w-2.5 h-2.5 rounded-full inline-block" :style="{ backgroundColor: getSpeciesColor(species) }"></span>
          <span>{{ getSpeciesName(species) }}</span>
          <span class="opacity-70">({{ getCurrentCount(species) }})</span>
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <span class="w-2.5 h-2.5 rounded-full inline-block border-2 border-dashed bg-transparent"></span>
          <span>Total Population</span>
        </div>
      </div>
      
      <div v-else class="max-h-30 overflow-y-auto">
        <div class="flex items-center gap-1.5 text-xs">
          <span class="w-2.5 h-2.5 rounded-full inline-block" :style="{ backgroundColor: '#fff' }"></span>
          <span>Population (normalized)</span>
        </div>
        <div v-for="(metric, key) in environmentalMetrics" :key="key" class="flex items-center gap-1.5 text-xs cursor-pointer hover:text-primary-400" @click="toggleEnvironmentalMetric(key)">
          <span class="w-2.5 h-2.5 rounded-full inline-block border-2 border-dashed bg-transparent" :style="{ borderColor: metric.color, opacity: selectedMetrics.has(key) ? 1 : 0.3 }"></span>
          <span :class="{ 'font-bold': selectedMetrics.has(key) }">{{ metric.name }}</span>
          <span class="opacity-70 text-[10px]">({{ metric.scale[0] }}-{{ metric.scale[1] }})</span>
        </div>
      </div>
    </div>
    
    <div class="flex gap-6 text-xs opacity-80">
      <div class="flex gap-1.5">
        <span class="opacity-70">Max Population:</span>
        <span class="font-bold">{{ maxPopulation }}</span>
      </div>
      <div class="flex gap-1.5">
        <span class="opacity-70">Time Range:</span>
        <span class="font-bold">{{ timeRange }} ticks</span>
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
const environmentalVisible = ref(props.showEnvironmental ?? true)
const selectedMetrics = ref(new Set(['avgTemperature', 'avgMoisture', 'avgVitality']))

// Species colors for consistent visualization
const speciesColors = new Map<string, string>()
const colorPalette = [
  '#4ade80', '#60a5fa', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
  '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9'
]

// Environmental metric colors and configs
const environmentalMetrics: Record<string, { name: string; color: string; scale: [number, number] }> = {
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
  environmentalVisible.value = !environmentalVisible.value
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
  const rightPadding = environmentalVisible.value ? 80 : 40
  const graphWidth = width - padding - rightPadding
  const graphHeight = height - padding * 2
  
  const minTick = populationHistory.value[0].tick
  const maxTick = populationHistory.value[populationHistory.value.length - 1].tick
  const tickRange = Math.max(1, maxTick - minTick)
  
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
    if (environmentalVisible.value) {
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
  if (environmentalVisible.value) {
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
  if (!environmentalVisible.value) {
    visibleSpecies.value.forEach(speciesId => {
      const color = getSpeciesColor(speciesId)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      
      let isFirstPoint = true
      populationHistory.value.forEach((point) => {
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

<!-- Most styles have been converted to Tailwind CSS classes. Canvas rendering styles remain in JS. -->
