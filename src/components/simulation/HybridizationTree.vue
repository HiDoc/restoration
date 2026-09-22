<template>
  <div class="sci-panel p-4 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-emerald-300 flex items-center gap-2">
        <span>🧬</span>
        Hybridization Tree
      </h2>
      <div class="flex gap-2">
        <button
          class="sci-btn text-xs py-1 px-2"
          @click="expandAll"
        >
          Expand All
        </button>
        <button
          class="sci-btn text-xs py-1 px-2"
          @click="collapseAll"
        >
          Collapse All
        </button>
      </div>
    </div>

    <!-- Statistics -->
    <div class="grid grid-cols-4 gap-2 mb-4">
      <div class="bg-slate-900/60 rounded p-2">
        <div class="text-[0.65rem] uppercase tracking-wider text-slate-400 mb-1">Total Hybrids</div>
        <div class="text-xl font-bold text-purple-300">{{ stats.totalHybrids }}</div>
      </div>
      <div class="bg-slate-900/60 rounded p-2">
        <div class="text-[0.65rem] uppercase tracking-wider text-slate-400 mb-1">Events</div>
        <div class="text-xl font-bold text-sky-300">{{ stats.totalEvents }}</div>
      </div>
      <div class="bg-slate-900/60 rounded p-2">
        <div class="text-[0.65rem] uppercase tracking-wider text-slate-400 mb-1">Success Rate</div>
        <div class="text-xl font-bold text-emerald-300">
          {{ ((stats.successfulEvents / Math.max(1, stats.totalEvents)) * 100).toFixed(0) }}%
        </div>
      </div>
      <div class="bg-slate-900/60 rounded p-2">
        <div class="text-[0.65rem] uppercase tracking-wider text-slate-400 mb-1">Max Generation</div>
        <div class="text-xl font-bold text-amber-300">{{ stats.maxGeneration }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search species..."
        class="w-full bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
      />
    </div>

    <!-- Tree View -->
    <div class="border border-slate-700/50 rounded bg-slate-950/40 p-4 max-h-[600px] overflow-y-auto">
      <div v-if="filteredBaseSpecies.length === 0" class="text-center py-8 text-slate-400">
        No species found
      </div>
      <div v-else class="space-y-2">
        <TreeNode
          v-for="species in filteredBaseSpecies"
          :key="species.speciesId"
          :lineage="species"
          :expanded-nodes="expandedNodes"
          :selected-node="selectedNode"
          @toggle="toggleNode"
          @select="selectNode"
        />
      </div>
    </div>

    <!-- Details Panel -->
    <div v-if="selectedNode" class="mt-4 border border-emerald-500/30 rounded bg-emerald-950/20 p-4">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h3 class="text-base font-bold text-emerald-200">{{ selectedNode.speciesName }}</h3>
          <div class="flex gap-3 mt-1 text-xs text-slate-400">
            <span>Generation: {{ selectedNode.generation }}</span>
            <span v-if="selectedNode.isHybrid">✓ Hybrid</span>
            <span v-else>Base Species</span>
          </div>
        </div>
        <button
          class="text-slate-400 hover:text-slate-200"
          @click="selectedNode = null"
        >
          ✕
        </button>
      </div>

      <!-- Parents -->
      <div v-if="selectedNode.parentA && selectedNode.parentB" class="mb-3">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Parents</div>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-slate-900/60 rounded p-2 text-xs">
            <div class="text-sky-300 font-medium">{{ getSpeciesName(selectedNode.parentA) }}</div>
            <div class="text-slate-500 text-[0.65rem]">Parent A</div>
          </div>
          <div class="bg-slate-900/60 rounded p-2 text-xs">
            <div class="text-purple-300 font-medium">{{ getSpeciesName(selectedNode.parentB) }}</div>
            <div class="text-slate-500 text-[0.65rem]">Parent B</div>
          </div>
        </div>
      </div>

      <!-- Children -->
      <div v-if="selectedNode.children.length > 0" class="mb-3">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Offspring ({{ selectedNode.children.length }})
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="childId in selectedNode.children.slice(0, 6)"
            :key="childId"
            class="bg-slate-900/60 rounded p-2 text-xs text-emerald-300 cursor-pointer hover:bg-slate-800/60"
            @click="selectNodeById(childId)"
          >
            {{ getSpeciesName(childId) }}
          </div>
          <div v-if="selectedNode.children.length > 6" class="bg-slate-900/60 rounded p-2 text-xs text-slate-500 flex items-center justify-center">
            +{{ selectedNode.children.length - 6 }} more
          </div>
        </div>
      </div>

      <!-- Events -->
      <div v-if="selectedNode.hybridizationEvents.length > 0">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Hybridization Events
        </div>
        <div class="space-y-1 max-h-32 overflow-y-auto">
          <div
            v-for="eventId in selectedNode.hybridizationEvents.slice(0, 5)"
            :key="eventId"
            class="bg-slate-900/60 rounded p-2 text-xs"
          >
            <div class="text-slate-300">Event {{ eventId.slice(-6) }}</div>
            <div class="text-slate-500 text-[0.6rem]">Tick {{ getEventTick(eventId) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HybridLineage } from '@/simulation/HybridizationSystem';

const props = defineProps<{
  lineages: Map<string, HybridLineage>;
  stats: {
    totalHybrids: number;
    totalEvents: number;
    successfulEvents: number;
    averageGeneration: number;
    maxGeneration: number;
  };
}>();

const expandedNodes = ref<Set<string>>(new Set());
const selectedNode = ref<HybridLineage | null>(null);
const searchQuery = ref('');

// Get base species (generation 0, not hybrids)
const baseSpecies = computed(() => {
  return Array.from(props.lineages.values())
    .filter(l => !l.isHybrid && l.generation === 0)
    .sort((a, b) => a.speciesName.localeCompare(b.speciesName));
});

// Filter base species
const filteredBaseSpecies = computed(() => {
  if (!searchQuery.value) return baseSpecies.value;

  const query = searchQuery.value.toLowerCase();
  return baseSpecies.value.filter(s =>
    s.speciesName.toLowerCase().includes(query) ||
    hasMatchingDescendants(s.speciesId, query)
  );
});

function hasMatchingDescendants(speciesId: string, query: string): boolean {
  const lineage = props.lineages.get(speciesId);
  if (!lineage) return false;

  for (const childId of lineage.children) {
    const child = props.lineages.get(childId);
    if (!child) continue;

    if (child.speciesName.toLowerCase().includes(query)) return true;
    if (hasMatchingDescendants(childId, query)) return true;
  }

  return false;
}

function toggleNode(speciesId: string) {
  if (expandedNodes.value.has(speciesId)) {
    expandedNodes.value.delete(speciesId);
  } else {
    expandedNodes.value.add(speciesId);
  }
}

function selectNode(lineage: HybridLineage) {
  selectedNode.value = lineage;
}

function selectNodeById(speciesId: string) {
  const lineage = props.lineages.get(speciesId);
  if (lineage) {
    selectedNode.value = lineage;
  }
}

function getSpeciesName(speciesId: string): string {
  return props.lineages.get(speciesId)?.speciesName || speciesId;
}

function getEventTick(eventId: string): string {
  // Extract tick from event ID if possible
  const match = eventId.match(/_(\d+)_/);
  return match ? match[1] : '?';
}

function expandAll() {
  props.lineages.forEach((_, id) => expandedNodes.value.add(id));
}

function collapseAll() {
  expandedNodes.value.clear();
}
</script>

<script lang="ts">
// TreeNode component definition
import { defineComponent, PropType } from 'vue';

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    lineage: {
      type: Object as PropType<HybridLineage>,
      required: true
    },
    expandedNodes: {
      type: Object as PropType<Set<string>>,
      required: true
    },
    selectedNode: {
      type: Object as PropType<HybridLineage | null>,
      required: true
    },
    depth: {
      type: Number,
      default: 0
    }
  },
  emits: ['toggle', 'select'],
  setup(props, { emit }) {
    const isExpanded = computed(() => props.expandedNodes.has(props.lineage.speciesId));
    const isSelected = computed(() => props.selectedNode?.speciesId === props.lineage.speciesId);
    const hasChildren = computed(() => props.lineage.children.length > 0);

    function toggle() {
      emit('toggle', props.lineage.speciesId);
    }

    function select() {
      emit('select', props.lineage);
    }

    return {
      isExpanded,
      isSelected,
      hasChildren,
      toggle,
      select
    };
  },
  template: `
    <div :style="{ paddingLeft: (depth * 24) + 'px' }">
      <div
        class="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-slate-800/40"
        :class="{
          'bg-emerald-900/30 border-l-2 border-emerald-500': isSelected,
          'bg-slate-900/20': !isSelected
        }"
        @click="select"
      >
        <button
          v-if="hasChildren"
          class="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-200"
          @click.stop="toggle"
        >
          {{ isExpanded ? '▼' : '▶' }}
        </button>
        <span v-else class="w-4"></span>

        <span class="text-xs" :class="lineage.isHybrid ? 'text-purple-300' : 'text-sky-300'">
          {{ lineage.isHybrid ? '🧬' : '🌱' }}
        </span>

        <span class="text-sm font-medium" :class="lineage.isHybrid ? 'text-purple-200' : 'text-slate-200'">
          {{ lineage.speciesName }}
        </span>

        <span class="text-xs text-slate-500 ml-auto">
          Gen {{ lineage.generation }}
        </span>

        <span v-if="hasChildren" class="text-xs text-emerald-400">
          {{ lineage.children.length }}
        </span>
      </div>

      <div v-if="isExpanded && hasChildren">
        <TreeNode
          v-for="childId in lineage.children"
          :key="childId"
          :lineage="$parent.$parent.lineages.get(childId)"
          :expanded-nodes="expandedNodes"
          :selected-node="selectedNode"
          :depth="depth + 1"
          @toggle="(id) => $emit('toggle', id)"
          @select="(l) => $emit('select', l)"
        />
      </div>
    </div>
  `
});

export { TreeNode };
</script>
