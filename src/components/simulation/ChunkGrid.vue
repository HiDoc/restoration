<template>
  <section
    class="hex-board"
    :class="{ 'contemplative-board': contemplative }"
    role="grid"
    :style="boardStyle"
  >
    <div
      v-for="column in chunkColumns"
      :key="column.x"
      class="hex-column"
      :style="column.x % 2 === 1 ? { marginTop: 'calc(var(--hex-height)/2)' } : null"
      role="row"
    >
      <ChunkHex
        v-for="chunk in column.chunks"
        :key="`${chunk.x}-${chunk.y}`"
        :chunk="chunk"
        :viz-mode="vizMode"
        :show-labels="showLabels"
        :pollinators="pollinators"
        :engine="engine"
        :is-selected="isSelected(chunk)"
        :is-hovered="isHovered(chunk)"
        :contemplative="contemplative"
        :season-name="seasonName"
        @hover="setHovered"
        @unhover="clearHovered"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { VizMode } from './types';
import ChunkHex from './ChunkHex.vue';
import { buildChunkColumns, type ChunkGridEntry } from './chunkGridLayout';
import { useSeasonalAtmosphere } from '@/composables/useSeasonalAtmosphere';

const HEX_WIDTH = 148;
const HEX_HEIGHT = HEX_WIDTH * Math.sqrt(3) / 2;

const props = defineProps<{
  chunkGrid: ChunkGridEntry[];
  width: number;
  showLabels: boolean;
  vizMode: VizMode;
  pollinators?: {
    showBees: boolean;
    showArrows: boolean;
  };
  engine?: any;
  selected?: { x: number; y: number } | null;
  contemplative?: boolean;
  seasonName?: string;
}>();

defineEmits<{ (e: 'select', payload: { x: number; y: number }): void }>();

const chunkColumns = computed(() => buildChunkColumns(props.chunkGrid));

const atmosphere = useSeasonalAtmosphere(computed(() => props.seasonName || 'spring'));

const boardStyle = computed(() => {
  const base = {
    '--hex-width': `${HEX_WIDTH}px`,
    '--hex-height': `${HEX_HEIGHT}px`,
    '--hex-gap': `${HEX_WIDTH * 0.06}px`,
  };

  if (props.contemplative && atmosphere.value) {
    return {
      ...base,
      background: atmosphere.value.palette.skyGradient,
    };
  }

  return base;
});

const hovered = ref<{ x: number; y: number } | null>(null);

const isSelected = (chunk: ChunkGridEntry) =>
  !!props.selected && props.selected.x === chunk.x && props.selected.y === chunk.y;

const isHovered = (chunk: ChunkGridEntry) =>
  !!hovered.value && hovered.value.x === chunk.x && hovered.value.y === chunk.y;

function setHovered(coords: { x: number; y: number }) {
  hovered.value = coords;
}

function clearHovered() {
  hovered.value = null;
}
</script>

<style>
@layer components {
  .hex-board {
    display: flex;
    justify-content: center;
    gap: var(--hex-gap);
    transition: background 1200ms ease;
  }

  .contemplative-board {
    width: 100%;
    height: 100%;
    padding: 2rem;
    border-radius: 0;
  }

  .hex-column {
    display: flex;
    flex-direction: column;
    gap: var(--hex-gap);
  }
}
</style>
