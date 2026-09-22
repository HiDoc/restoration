<script setup lang="ts">
import { computed } from 'vue';
import type { WorldChunk } from '@/simulation/WorldChunk';
import { ChunkAnalyzer } from '@/simulation/ChunkAnalyzer';

const props = defineProps<{
  chunk: WorldChunk | null;
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-intervention', action: string): void;
}>();

// Analyze chunk
const analysis = computed(() => {
  if (!props.chunk) return null;
  return ChunkAnalyzer.analyzeChunk(props.chunk);
});

// Format biome state values
function formatValue(value: number, isPercentage = false): string {
  if (isPercentage) {
    return `${Math.round(value * 100)}%`;
  }
  return value.toFixed(2);
}

// Get severity color
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-900/30 border-red-500/50';
    case 'warning': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
    case 'info': return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
    default: return 'text-slate-400 bg-slate-900/30 border-slate-500/50';
  }
}

// Get priority color
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-400';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-blue-400';
    default: return 'text-slate-400';
  }
}

// Get trend icon
function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving':
    case 'increasing':
    case 'growing': return '↗';
    case 'declining':
    case 'decreasing':
    case 'shrinking':
    case 'rising': return '↘';
    case 'stable':
    default: return '→';
  }
}

function close() {
  emit('close');
}

function applyIntervention(action: string) {
  emit('apply-intervention', action);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="inspector-slide">
      <div
        v-if="show && chunk"
        class="fixed right-0 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-sm border-l-2 border-cyan-400/40 shadow-2xl z-40 overflow-y-auto"
      >
        <!-- Header -->
        <div class="sticky top-0 bg-slate-900/95 border-b border-cyan-400/30 p-4 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-cyan-300">Chunk Inspector</h3>
            <p class="text-xs text-slate-400">{{ chunk.id }}</p>
          </div>
          <button
            @click="close"
            class="text-slate-400 hover:text-slate-200 transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <div class="p-4 space-y-4">
          <!-- Biome State -->
          <div>
            <h4 class="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2">
              <span>🌍</span>
              <span>Environmental Conditions</span>
            </h4>
            <div class="space-y-2">
              <div class="bg-slate-800/60 border border-slate-600/40 rounded p-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Temperature</span>
                  <span class="text-slate-200">{{ Math.round(chunk.climateState.temperature) }}°C</span>
                </div>
              </div>

              <div class="bg-slate-800/60 border border-slate-600/40 rounded p-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Moisture</span>
                  <div class="flex items-center gap-2">
                    <span class="text-slate-200">{{ formatValue(chunk.biomeState.moisture, true) }}</span>
                    <span v-if="analysis" class="text-lg">{{ getTrendIcon(analysis.trends.moisture) }}</span>
                  </div>
                </div>
              </div>

              <div class="bg-slate-800/60 border border-slate-600/40 rounded p-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Light</span>
                  <span class="text-slate-200">{{ formatValue(chunk.climateState.light, true) }}</span>
                </div>
              </div>

              <div class="bg-slate-800/60 border border-slate-600/40 rounded p-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Nutrients</span>
                  <span class="text-slate-200">{{ formatValue(chunk.biomeState.soil, true) }}</span>
                </div>
              </div>

              <div class="bg-slate-800/60 border border-slate-600/40 rounded p-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Vitality</span>
                  <div class="flex items-center gap-2">
                    <span :class="chunk.biomeState.vitality > 0.6 ? 'text-emerald-400' : chunk.biomeState.vitality > 0.4 ? 'text-yellow-400' : 'text-red-400'">
                      {{ formatValue(chunk.biomeState.vitality, true) }}
                    </span>
                    <span v-if="analysis" class="text-lg">{{ getTrendIcon(analysis.trends.vitality) }}</span>
                  </div>
                </div>
              </div>

              <div class="bg-slate-800/60 border border-slate-600/40 rounded p-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Pollution</span>
                  <div class="flex items-center gap-2">
                    <span :class="chunk.biomeState.pollution < 0.3 ? 'text-emerald-400' : chunk.biomeState.pollution < 0.6 ? 'text-yellow-400' : 'text-red-400'">
                      {{ formatValue(chunk.biomeState.pollution, true) }}
                    </span>
                    <span v-if="analysis" class="text-lg">{{ getTrendIcon(analysis.trends.pollution) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Species -->
          <div>
            <h4 class="text-sm font-semibold text-emerald-300 mb-2 flex items-center gap-2">
              <span>🌱</span>
              <span>Species ({{ chunk.species.size }})</span>
              <span v-if="analysis" class="text-lg">{{ getTrendIcon(analysis.trends.speciesCount) }}</span>
            </h4>
            <div v-if="chunk.species.size > 0" class="space-y-1">
              <div
                v-for="[id, instance] of chunk.species"
                :key="id"
                class="bg-slate-800/60 border border-slate-600/40 rounded p-2 text-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="text-slate-200">{{ instance.speciesId }}</span>
                  <span :class="instance.health > 0.7 ? 'text-emerald-400' : instance.health > 0.4 ? 'text-yellow-400' : 'text-red-400'">
                    {{ formatValue(instance.health, true) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-500 italic">No species present</div>
          </div>

          <!-- Insights -->
          <div v-if="analysis && analysis.insights.length > 0">
            <h4 class="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <span>💡</span>
              <span>Insights</span>
            </h4>
            <div class="space-y-2">
              <div
                v-for="(insight, idx) in analysis.insights"
                :key="idx"
                :class="['border rounded p-3 text-xs', getSeverityColor(insight.severity)]"
              >
                <div class="font-semibold mb-1">{{ insight.observation }}</div>
                <div class="text-slate-300 mb-1">{{ insight.likelyCause }}</div>
                <div class="text-slate-400 italic">→ {{ insight.suggestedAction }}</div>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div v-if="analysis && analysis.recommendations.length > 0">
            <h4 class="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <span>🔧</span>
              <span>Recommended Actions</span>
            </h4>
            <div class="space-y-2">
              <div
                v-for="(rec, idx) in analysis.recommendations"
                :key="idx"
                class="bg-slate-800/60 border border-purple-500/40 rounded p-3"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="text-sm font-semibold text-purple-300 capitalize">{{ rec.action }}</div>
                  <span :class="['text-xs font-medium', getPriorityColor(rec.priority)]">
                    {{ rec.priority }} priority
                  </span>
                </div>
                <div class="text-xs text-slate-300 mb-1">{{ rec.reason }}</div>
                <div class="text-xs text-slate-400 italic mb-2">→ {{ rec.expectedImpact }}</div>
                <button
                  @click="applyIntervention(rec.action)"
                  class="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded transition-colors"
                >
                  Apply {{ rec.action }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.inspector-slide-enter-active,
.inspector-slide-leave-active {
  transition: transform 0.3s ease;
}

.inspector-slide-enter-from {
  transform: translateX(100%);
}

.inspector-slide-leave-to {
  transform: translateX(100%);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.4);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.6);
}
</style>
