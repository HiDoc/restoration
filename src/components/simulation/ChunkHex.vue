<template>
  <button
    type="button"
    role="gridcell"
    class="hex-cell overflow-hidden bg-slate-900/40 transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_18px_rgba(6,148,162,0.25)] focus-visible:outline-none"
    :class="isSelected ? 'ring-2 ring-sky-400/70 ring-offset-[3px] ring-offset-slate-900' : 'ring-0 ring-offset-0'"
    :style="hexBackground"
    :title="tooltip"
    @mouseenter="emit('hover', { x: chunk.x, y: chunk.y })"
    @mouseleave="emit('unhover')"
    @click="emit('select', { x: chunk.x, y: chunk.y })"
  >
    <div class="hex-overlay absolute inset-0 pointer-events-none transition-colors duration-200" :style="{ backgroundColor: overlayColor }"></div>

    <!-- Analytical View Badges -->
    <div v-if="!contemplative" class="hex-content pointer-events-none absolute inset-3 flex items-center justify-center text-[0.65rem] text-slate-100 drop-shadow">
      <small v-if="showLabels" class="coords absolute top-2 left-1/2 -translate-x-1/2 font-semibold tracking-[0.08em]">{{ chunk.x }},{{ chunk.y }}</small>
      <div
        v-if="emphasised"
        class="stats-grid absolute bottom-2 left-2 right-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-900/70 p-2 text-[0.6rem] shadow-inner"
      >
        <div v-for="stat in stats" :key="stat.label" class="flex items-center justify-between text-slate-100/90">
          <span class="font-semibold text-slate-200/90">{{ stat.label }}</span>
          <span class="tabular-nums">{{ stat.value }}</span>
        </div>
      </div>
      <div v-if="speciesSummary" class="species-badge absolute bottom-2 right-2 rounded-full border border-sky-400/40 bg-slate-900/70 px-2 py-0.5 text-[0.65rem]">{{ speciesSummary }}</div>
      <div v-if="pollinators?.showBees && beesBadge" class="bees-badge absolute top-2 left-2 rounded-full border border-sky-400/40 bg-slate-900/70 px-2 py-0.5 text-[0.65rem]">{{ beesBadge }}</div>
      <div v-if="pollinators?.showArrows" class="arrow-badge absolute top-2 right-2 rounded-full border border-sky-400/40 bg-slate-900/70 px-2 py-0.5 text-[0.65rem]">{{ flowIndicator }}</div>
      <div v-if="birdsBadge" class="birds-badge absolute bottom-2 left-2 rounded-full border border-sky-400/40 bg-slate-900/70 px-2 py-0.5 text-[0.65rem]">{{ birdsBadge }}</div>
      <div v-if="seedCountValue > 0" class="seeds-badge absolute bottom-8 right-2 rounded-full border border-emerald-400/40 bg-emerald-900/70 px-2 py-0.5 text-[0.65rem]">🌱{{ seedCountValue }}</div>
    </div>

    <!-- Contemplative View Hover Tooltip -->
    <div
      v-if="contemplative && isHovered"
      class="contemplative-tooltip"
    >
      <div class="tooltip-header">
        <span class="tooltip-coords">({{ chunk.x }}, {{ chunk.y }})</span>
        <span class="tooltip-biome">{{ biomeTypeName }}</span>
      </div>
      <div class="tooltip-stats">
        <div class="tooltip-stat">
          <span class="stat-icon">💚</span>
          <span class="stat-label">Vitality</span>
          <span class="stat-value">{{ formatPercent((chunk.biomeState?.vitality || 0)) }}</span>
        </div>
        <div class="tooltip-stat">
          <span class="stat-icon">💧</span>
          <span class="stat-label">Moisture</span>
          <span class="stat-value">{{ formatPercent((chunk.biomeState?.moisture || 0)) }}</span>
        </div>
        <div v-if="speciesSummary" class="tooltip-species">
          <span class="stat-icon">🌱</span>
          <span>{{ speciesSummary }}</span>
        </div>
        <div v-if="pollinatorInfo" class="tooltip-stat">
          <span class="stat-icon">🐝</span>
          <span>{{ pollinatorInfo }}</span>
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry';
import type { VizMode } from './types';
import type { ChunkGridEntry } from './chunkGridLayout';
import { getHexOverlayColor } from '@/composables/useSeasonalAtmosphere';

const textureMap = {
  grassland: '/assets/terrain/grassland.png',
  forest: '/assets/terrain/forest.png',
  wetland: '/assets/terrain/wetland.png',
  savanna: '/assets/terrain/savanna.png',
  wasteland: '/assets/terrain/wasteland.png',
} as const;

const props = defineProps<{
  chunk: ChunkGridEntry;
  vizMode: VizMode;
  showLabels: boolean;
  pollinators?: {
    showBees: boolean;
    showArrows: boolean;
  };
  engine?: any;
  isSelected: boolean;
  isHovered: boolean;
  contemplative?: boolean;
  seasonName?: string;
}>();

const emit = defineEmits<{
  (e: 'select', payload: { x: number; y: number }): void;
  (e: 'hover', payload: { x: number; y: number }): void;
  (e: 'unhover'): void;
}>();

const emphasised = computed(() => props.isSelected || props.isHovered);

const tooltip = computed(() => {
  const biome = props.chunk.biomeState || {};
  const fmt = (value: number | undefined) => (Number.isFinite(value) ? (value as number).toFixed(2) : '0.00');
  return `(${props.chunk.x},${props.chunk.y}) v:${fmt(biome.vitality)} m:${fmt(biome.moisture)} p:${fmt(biome.pollution)} d:${fmt((biome as any).diversity)} pol:${fmt((props.chunk as any).pollinatorDensity)}`;
});

const hexBackground = computed(() => {
  const texture = biomeTexture(props.chunk);
  const baseColor = baseFill(props.chunk, props.vizMode);
  return {
    backgroundImage: texture ? `url(${texture})` : undefined,
    backgroundColor: texture ? undefined : baseColor,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };
});

const overlayColor = computed(() => {
  if (props.contemplative) {
    // Use naturalistic colors in contemplative mode
    const biomeState = props.chunk.biomeState || {};
    const biomeType = determineBiomeType(biomeState);
    return getHexOverlayColor(biomeType, props.seasonName || 'spring', biomeState.vitality || 0.5);
  }
  return overlayFill(props.chunk, props.vizMode);
});

const stats = computed(() => chunkStats(props.chunk));

const speciesSummary = computed(() => speciesText(props.chunk));

const beesBadge = computed(() => beesLabel(props.chunk));

const flowIndicator = computed(() => flowArrow(props.chunk, props.engine));

const birdsBadge = computed(() => birdsLabel(props.chunk));

const seedCountValue = computed(() => seedCount(props.chunk));

const biomeTypeName = computed(() => {
  const biomeState = props.chunk.biomeState || {};
  const type = determineBiomeType(biomeState);
  return type.charAt(0).toUpperCase() + type.slice(1);
});

const pollinatorInfo = computed(() => {
  const density = (props.chunk as any).pollinatorDensity ?? 0;
  if (density < 0.2) return null;
  return `Pollinators: ${Math.round(density * 100)}%`;
});

function biomeTexture(chunk: ChunkGridEntry): string | null {
  const { moisture = 0, pollution = 0, canopy = 0 } = chunk.biomeState ?? {};
  if (pollution > 0.65) return textureMap.wasteland;
  if (moisture > 0.75) return textureMap.wetland;
  if (canopy > 0.55) return textureMap.forest;
  if (moisture < 0.3) return textureMap.savanna;
  return textureMap.grassland;
}

function baseFill(chunk: ChunkGridEntry, vizMode: VizMode): string {
  const bs = chunk.biomeState ?? {};
  switch (vizMode) {
    case 'vitality':
      return `rgba(34,197,94,${0.25 + (bs.vitality ?? 0) * 0.4})`;
    case 'moisture':
      return `rgba(56,189,248,${0.25 + (bs.moisture ?? 0) * 0.4})`;
    case 'pollution':
      return `rgba(248,113,113,${0.25 + (bs.pollution ?? 0) * 0.4})`;
    case 'diversity':
      return `rgba(192,132,252,${0.25 + (bs.diversity ?? 0) * 0.4})`;
    case 'succession':
      return `rgba(251,191,36,${0.25 + (bs.succession ?? 0) * 0.4})`;
    case 'pollinators':
      return `rgba(244,114,182,${0.25 + (((chunk as any).pollinatorDensity ?? 0) as number) * 0.4})`;
    case 'rgb':
    default:
      return 'rgba(15,23,42,0.4)';
  }
}

function overlayFill(chunk: ChunkGridEntry, vizMode: VizMode): string {
  const bs = chunk.biomeState ?? {};
  switch (vizMode) {
    case 'vitality':
      return `rgba(34,197,94,${0.18 + (bs.vitality ?? 0) * 0.35})`;
    case 'moisture':
      return `rgba(56,189,248,${0.18 + (bs.moisture ?? 0) * 0.35})`;
    case 'pollution':
      return `rgba(248,113,113,${0.18 + (bs.pollution ?? 0) * 0.35})`;
    case 'diversity':
      return `rgba(192,132,252,${0.18 + (bs.diversity ?? 0) * 0.35})`;
    case 'succession':
      return `rgba(251,191,36,${0.18 + (bs.succession ?? 0) * 0.35})`;
    case 'pollinators':
      return `rgba(244,114,182,${0.18 + (((chunk as any).pollinatorDensity ?? 0) as number) * 0.35})`;
    case 'rgb':
    default:
      return 'rgba(15,23,42,0.25)';
  }
}

function chunkStats(chunk: ChunkGridEntry): Array<{ label: string; value: string }> {
  const biome = chunk.biomeState ?? {};
  const climate = (chunk as any).climateState ?? {};
  const speciesCount = countSpecies(chunk);
  return [
    { label: 'V', value: formatPercent(biome.vitality) },
    { label: 'M', value: formatPercent(biome.moisture) },
    { label: 'P', value: formatPercent(biome.pollution, true) },
    { label: 'Temp', value: formatDegrees(climate.temperature) },
    { label: 'D', value: formatPercent(biome.diversity) },
    { label: 'Sp', value: speciesCount.toString() },
  ];
}

function formatPercent(value: number | undefined, invert = false): string {
  if (!Number.isFinite(value)) return '—';
  const val = (value as number) * 100;
  const display = invert ? 100 - val : val;
  return `${Math.round(Math.max(0, Math.min(100, display))) }%`;
}

function formatDegrees(value: number | undefined): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value as number)}°`;
}

function countSpecies(chunk: ChunkGridEntry): number {
  const raw = (chunk as any).species;
  if (raw instanceof Map) return raw.size;
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw.size === 'number') return raw.size;
  return 0;
}

function beesLabel(chunk: ChunkGridEntry): string {
  const density = (chunk as any).pollinatorDensity ?? 0;
  const score = Math.max(0, Math.min(3, Math.round(density * 3)));
  return score > 0 ? '🐝'.repeat(score) : '';
}

function flowArrow(chunk: ChunkGridEntry, engine: any): string {
  if (!engine) return '•';
  const here = (chunk as any).pollinatorDensity ?? 0;
  const nx = (dx: number, dy: number) => {
    const cc = engine.getChunk(chunk.x + dx, chunk.y + dy);
    return (cc as any)?.pollinatorDensity ?? here;
  };
  const diffs = [
    { a: nx(0, -1) - here, sym: '↑' },
    { a: nx(0, 1) - here, sym: '↓' },
    { a: nx(-1, 0) - here, sym: '←' },
    { a: nx(1, 0) - here, sym: '→' },
  ];
  diffs.sort((a, b) => b.a - a.a);
  return diffs[0].a > 0.01 ? diffs[0].sym : '•';
}

function birdsLabel(chunk: ChunkGridEntry): string {
  const rec = (chunk as any).birds as Record<string, number> | undefined;
  if (!rec) return '';
  const entries = Object.entries(rec) as Array<[string, number]>;
  if (entries.length === 0) return '';
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];
  const icon = dominant === 'owl' ? '🦉' : dominant === 'swift' ? '🕊️' : '🐦';
  const activity = (chunk as any).birdsActivity ?? 0;
  const score = Math.max(0, Math.min(3, Math.round(activity * 3)));
  return score > 0 ? icon.repeat(score) : '';
}

function speciesText(chunk: ChunkGridEntry): string {
  if ((chunk as any).speciesLabel) return (chunk as any).speciesLabel as string;
  try {
    const registry = SpeciesRegistry.getInstance();
    const species = chunk.species;
    const values = species instanceof Map ? Array.from(species.values()) : Array.isArray(species) ? species : [];
    if (!values.length) return '';
    const counts = new Map<string, number>();
    values.forEach((entry: any) => counts.set(entry.speciesId, (counts.get(entry.speciesId) || 0) + 1));
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([id, count]) => `${abbrev(registry.getSpecies(id)?.name || id)}×${count}`)
      .join(' / ');
  } catch {
    return '';
  }
}

function seedCount(chunk: ChunkGridEntry): number {
  if (typeof (chunk as any).seedBankCount === 'number') return (chunk as any).seedBankCount as number;
  return ((chunk as any).seedBank?.length) || 0;
}

function abbrev(name: string): string {
  if (!name) return '';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const clean = name.replace(/[^a-zA-Z]/g, '');
  return clean.slice(0, 3).toUpperCase();
}

function determineBiomeType(biomeState: any): string {
  const { moisture = 0, pollution = 0, canopy = 0 } = biomeState;
  if (pollution > 0.65) return 'wasteland';
  if (moisture > 0.75) return 'wetland';
  if (canopy > 0.55) return 'forest';
  if (moisture < 0.3) return 'savanna';
  return 'grassland';
}
</script>

<style>
@layer components {
  .hex-cell {
    width: var(--hex-width);
    height: var(--hex-height);
    will-change: transform;
    border-radius: 16%;
    position: relative;
    transition: transform 300ms ease, box-shadow 300ms ease;
  }

  .hex-content {
    border-radius: 14%;
  }

  .hex-overlay {
    transition: background-color 600ms ease;
  }

  /* Contemplative Tooltip */
  .contemplative-tooltip {
    position: absolute;
    bottom: 110%;
    left: 50%;
    transform: translateX(-50%);
    min-width: 180px;
    padding: 0.75rem;
    background: rgba(62, 48, 38, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(139, 92, 66, 0.5);
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 1000;
    animation: tooltip-fade-in 250ms ease-out;
  }

  @keyframes tooltip-fade-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(139, 92, 66, 0.3);
  }

  .tooltip-coords {
    font-size: 0.7rem;
    color: rgb(180, 160, 140);
    font-family: 'SF Mono', monospace;
  }

  .tooltip-biome {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(210, 184, 156);
  }

  .tooltip-stats {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .tooltip-stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: rgb(200, 180, 160);
  }

  .stat-icon {
    font-size: 0.9rem;
  }

  .stat-label {
    flex: 1;
    color: rgb(180, 160, 140);
  }

  .stat-value {
    font-weight: 600;
    color: rgb(210, 184, 156);
    font-family: 'SF Mono', monospace;
  }

  .tooltip-species {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: rgb(180, 220, 150);
    margin-top: 0.25rem;
    padding-top: 0.375rem;
    border-top: 1px solid rgba(139, 92, 66, 0.2);
  }
}
</style>
