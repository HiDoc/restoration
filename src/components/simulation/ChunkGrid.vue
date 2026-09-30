<template>
  <div v-if="tessellated" ref="mapHost" class="flex h-full w-full items-center justify-center overflow-hidden">
    <section class="hex-map" role="grid" :style="mapStyle">
      <ChunkHex
        v-for="chunk in chunkGrid"
        :key="`${chunk.x}-${chunk.y}`"
        v-bind="hexBindings(chunk)"
        :style="tilePosition(chunk)"
        @hover="setHovered"
        @unhover="clearHovered"
        @select="$emit('select', $event)"
      />
      <!-- A traced marker's path along the water's flow -->
      <svg v-if="tracePath" class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path :d="tracePath.d" fill="none" stroke="#bfe3f5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 6" opacity="0.9" />
        <circle :cx="tracePath.start.x" :cy="tracePath.start.y" r="5" fill="none" stroke="#bfe3f5" stroke-width="2" />
        <circle r="6" fill="#3f8fc0" stroke="#fff" stroke-width="2">
          <animateMotion :path="tracePath.d" :dur="`${tracePath.steps}s`" repeatCount="indefinite" />
        </circle>
      </svg>
      <!-- A followed insect in flight: seen crossing to its next hex, then out of view -->
      <svg v-if="flightPath" :key="flight!.key" class="flight pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <g>
          <image v-if="flight!.icon" :href="flight!.icon" x="-14" y="-14" width="28" height="28" />
          <circle v-else r="7" fill="#e08a3c" stroke="#3a2a10" stroke-width="1.5" />
          <animateMotion :path="flightPath" dur="1.2s" fill="freeze" />
        </g>
      </svg>
    </section>
  </div>
  <section
    v-else
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
        v-bind="hexBindings(chunk)"
        @hover="setHovered"
        @unhover="clearHovered"
        @select="$emit('select', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { VizMode } from './types';
import ChunkHex from './ChunkHex.vue';
import { buildChunkColumns, type ChunkGridEntry } from './chunkGridLayout';
import { useSeasonalAtmosphere } from '@/composables/useSeasonalAtmosphere';

const HEX_WIDTH = 148;
const HEX_HEIGHT = HEX_WIDTH * Math.sqrt(3) / 2;
// Terrain tiles are pointy-top hexes (78x92 in the UI kit); tessellated rows step by 3/4 of a tile's height.
const TILE_RATIO = 92 / 78;

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
  /** Pointy-top tessellation scaled to fill the parent (odd rows shifted right). */
  tessellated?: boolean;
  /** Hexes a traced marker passes through, in order. */
  trace?: Array<{ x: number; y: number }>;
  /** A followed animal's flight from one hex to the next; a new key restarts it. */
  flight?: { from: { x: number; y: number }; to: { x: number; y: number }; key: number; icon?: string } | null;
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

const hexBindings = (chunk: ChunkGridEntry) => ({
  chunk,
  vizMode: props.vizMode,
  showLabels: props.showLabels,
  pollinators: props.pollinators,
  engine: props.engine,
  isSelected: isSelected(chunk),
  isHovered: isHovered(chunk),
  contemplative: props.contemplative,
  seasonName: props.seasonName,
});

const bounds = computed(() => {
  const xs = props.chunkGrid.map((c) => c.x);
  const ys = props.chunkGrid.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, cols: Math.max(...xs) - minX + 1, rows: Math.max(...ys) - minY + 1 };
});

const mapHost = ref<HTMLElement | null>(null);
const hostSize = ref({ width: 0, height: 0 });
const observer = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver(([entry]) => {
      hostSize.value = { width: entry.contentRect.width, height: entry.contentRect.height };
    })
  : null;
watch(mapHost, (el, old) => {
  if (old) observer?.unobserve(old);
  if (el) observer?.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());

const tileWidth = computed(() => {
  const { cols, rows } = bounds.value;
  const { width, height } = hostSize.value;
  if (!width || !height) return HEX_WIDTH;
  return Math.min(width / (cols + 0.5), height / ((0.75 * (rows - 1) + 1) * TILE_RATIO));
});

const mapStyle = computed(() => {
  const w = tileWidth.value;
  const h = w * TILE_RATIO;
  const { cols, rows } = bounds.value;
  return {
    '--hex-width': `${w}px`,
    '--hex-height': `${h}px`,
    width: `${(cols + 0.5) * w}px`,
    height: `${(0.75 * (rows - 1) + 1) * h}px`,
  };
});

function tilePosition(chunk: ChunkGridEntry) {
  const w = tileWidth.value;
  const row = chunk.y - bounds.value.minY;
  return {
    left: `${(chunk.x - bounds.value.minX + (row % 2) * 0.5) * w}px`,
    top: `${row * 0.75 * w * TILE_RATIO}px`,
  };
}

function centre(hex: { x: number; y: number }) {
  const w = tileWidth.value;
  const row = hex.y - bounds.value.minY;
  return { x: (hex.x - bounds.value.minX + (row % 2) * 0.5 + 0.5) * w, y: (row * 0.75 + 0.5) * w * TILE_RATIO };
}

// The trace as a line through tile centres, one second per hex for the moving marker.
const tracePath = computed(() => {
  if (!props.trace || props.trace.length < 2) return null;
  const points = props.trace.map(centre);
  return { d: points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '), start: points[0], steps: points.length - 1 };
});

const flightPath = computed(() => {
  if (!props.flight) return null;
  const [a, b] = [centre(props.flight.from), centre(props.flight.to)];
  // A slight arc, as insects rarely fly straight.
  return `M${a.x},${a.y} Q${(a.x + b.x) / 2 + (b.y - a.y) * 0.3},${(a.y + b.y) / 2 - (b.x - a.x) * 0.3} ${b.x},${b.y}`;
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

  .hex-map {
    position: relative;
  }

  /* The followed insect lands, then drops out of view. */
  .hex-map .flight {
    animation: flight-out 0.4s ease-in 1.2s forwards;
  }
  @keyframes flight-out {
    to { opacity: 0; }
  }

  /* Tiles carry their own drawn hex border; clip everything else to the hex. */
  .hex-map .hex-cell {
    position: absolute;
    background-color: transparent !important;
    background-size: 100% 100% !important;
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  }

  .hex-map .hex-cell:hover {
    translate: none !important;
    filter: brightness(1.12) saturate(1.1);
  }

  .hex-map .hex-content {
    display: none !important;
  }

  .hex-map .hex-outline {
    display: block;
  }

  /* Animals on the map: bees loop, butterflies drift and flap, birds hop now and then. */
  .hex-map .hex-sprite {
    display: block;
    position: absolute;
    width: 12%;
    aspect-ratio: 1;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
    animation: sprite-buzz 2.4s ease-in-out infinite;
  }
  .hex-map .hex-sprite img,
  .hex-map .hex-sprite svg {
    width: 100%;
    height: 100%;
  }
  .hex-map .hex-sprite--butterfly {
    width: 14%;
    color: #6f9fd8;
    fill: currentColor;
    animation: sprite-drift 5s ease-in-out infinite;
  }
  .hex-map .hex-sprite--butterfly svg {
    animation: sprite-flap 0.35s ease-in-out infinite alternate;
  }
  .hex-map .hex-sprite--bird {
    width: 15%;
    animation: sprite-hop 3.2s ease-in-out infinite;
  }

  @keyframes sprite-buzz {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(18%, -14%); }
    50% { transform: translate(-10%, -22%); }
    75% { transform: translate(-16%, 6%); }
  }
  @keyframes sprite-drift {
    0%, 100% { transform: translate(0, 0) rotate(-6deg); }
    50% { transform: translate(45%, -30%) rotate(8deg); }
  }
  @keyframes sprite-flap {
    from { transform: scaleX(1); }
    to { transform: scaleX(0.35); }
  }
  @keyframes sprite-hop {
    0%, 70%, 100% { transform: translateY(0); }
    78% { transform: translateY(-30%); }
    86% { transform: translateY(0); }
    92% { transform: translateY(-15%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hex-map .hex-sprite,
    .hex-map .hex-sprite svg {
      animation: none;
    }
  }

  .hex-column {
    display: flex;
    flex-direction: column;
    gap: var(--hex-gap);
  }
}
</style>
