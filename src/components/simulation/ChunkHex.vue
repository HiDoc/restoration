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
    <!-- Selection rim, shown only by tessellated maps (see ChunkGrid .hex-map) -->
    <svg v-if="isSelected" class="hex-outline pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill="rgba(244,215,122,0.06)" stroke="#f4d77a" stroke-width="6" vector-effect="non-scaling-stroke" />
    </svg>
    <!-- Animals present, drawn by tessellated maps (see ChunkGrid .hex-map) -->
    <span v-for="sprite in sprites" :key="sprite.key" class="hex-sprite pointer-events-none" :class="`hex-sprite--${sprite.group}`" :style="sprite.style" aria-hidden="true">
      <img v-if="sprite.icon" :src="sprite.icon" alt="" />
      <svg v-else viewBox="0 0 20 16"><path d="M10 8C6 1 1 1 1.5 5.5 2 9 6 10 10 8Zm0 0c4-7 9-7 8.5-2.5C18 9 14 10 10 8Z" /><path d="M10 8C7 11 4 14 6 15s3-3 4-7Zm0 0c3 3 6 6 4 7s-3-3-4-7Z" opacity=".8" /></svg>
    </span>

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
import { nv } from './nouveauAssets';
import { describeHex, type Habitat } from '@/game/hexDescription';

// Kit tile and legacy biome name (used by the calm view's seasonal tint) for each habitat.
const HABITAT_LOOK: Record<Habitat, { tile: string; biome: string; wash?: string }> = {
  open_water: { tile: nv('hex-water'), biome: 'wetland' },
  // Marsh: grassland under a wash of water.
  wetland: { tile: nv('hex-grassland'), biome: 'wetland', wash: 'rgba(52, 110, 128, 0.38)' },
  woodland: { tile: nv('hex-forest'), biome: 'forest' },
  scrub: { tile: nv('hex-grassland'), biome: 'grassland' }, // the grassland tile shows scattered trees
  meadow: { tile: nv('hex-grassland'), biome: 'grassland' },
  dry_grassland: { tile: nv('hex-savanna'), biome: 'savanna' },
  blighted: { tile: nv('hex-degraded'), biome: 'wasteland' },
  bare: { tile: nv('hex-degraded'), biome: 'wasteland' },
};

// Animals drawn per hex: a few sprites hint at abundance without cluttering the map.
const MAX_SPRITES = 6;
const SPRITE_ICON: Record<string, string> = { bird: nv('icon-birds'), bee: nv('icon-pollinators'), hoverfly: nv('icon-pollinators') };

/** Stable 32-bit hash, so a hex's sprites keep their places between renders. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

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

const description = computed(() => describeHex(props.chunk as any));
const look = computed(() => HABITAT_LOOK[description.value.habitat]);

const sprites = computed(() =>
  description.value.animals
    .flatMap(animal => Array.from({ length: Math.min(3, Math.ceil(animal.count / 3)) }, (_, i) => {
      const h = hash(`${props.chunk.x},${props.chunk.y}:${animal.id}:${i}`);
      return {
        key: `${animal.id}-${i}`,
        group: animal.group,
        icon: SPRITE_ICON[animal.group],
        style: { left: `${18 + (h % 60)}%`, top: `${22 + ((h >>> 8) % 52)}%`, animationDelay: `${-((h >>> 16) % 3000) / 1000}s` },
      };
    }))
    .slice(0, MAX_SPRITES)
);

const hexBackground = computed(() => {
  const texture = look.value.tile;
  const baseColor = baseFill(props.chunk, props.vizMode);
  return {
    backgroundImage: texture ? [look.value.wash && `linear-gradient(${look.value.wash}, ${look.value.wash})`, `url(${texture})`].filter(Boolean).join(', ') : undefined,
    backgroundColor: texture ? undefined : baseColor,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };
});

const overlayColor = computed(() => {
  if (props.contemplative) {
    // Use naturalistic colors in contemplative mode
    return getHexOverlayColor(look.value.biome, props.seasonName || 'spring', props.chunk.biomeState?.vitality || 0.5);
  }
  return overlayFill(props.chunk, props.vizMode);
});

const stats = computed(() => chunkStats(props.chunk));

const speciesSummary = computed(() => speciesText(props.chunk));

const beesBadge = computed(() => beesLabel(props.chunk));

const flowIndicator = computed(() => flowArrow(props.chunk, props.engine));

const birdsBadge = computed(() => birdsLabel(props.chunk));

const seedCountValue = computed(() => seedCount(props.chunk));

const biomeTypeName = computed(() => description.value.title);

const pollinatorInfo = computed(() => {
  const density = (props.chunk as any).pollinatorDensity ?? 0;
  if (density < 0.2) return null;
  return `Pollinators: ${Math.round(density * 100)}%`;
});


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
    case 'temperature': {
      const t = Math.max(0, Math.min(1, (((chunk as any).climateState?.temperature ?? 14) as number) / 30));
      return `rgba(251,146,60,${0.25 + t * 0.4})`;
    }
    case 'species': {
      const n = Math.max(0, Math.min(1, countSpecies(chunk) / 12));
      return `rgba(45,212,191,${0.25 + n * 0.4})`;
    }
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
    case 'temperature': {
      const t = Math.max(0, Math.min(1, (((chunk as any).climateState?.temperature ?? 14) as number) / 30));
      return `rgba(251,146,60,${0.18 + t * 0.35})`;
    }
    case 'species': {
      const n = Math.max(0, Math.min(1, countSpecies(chunk) / 12));
      return `rgba(45,212,191,${0.18 + n * 0.35})`;
    }
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
    const cc = engine.readChunk(chunk.x + dx, chunk.y + dy);
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

  .hex-outline,
  .hex-sprite {
    display: none;
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
