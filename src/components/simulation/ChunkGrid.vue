<template>
  <section
    class="grid"
    :style="{ gridTemplateColumns: `repeat(${width}, 1fr)` }"
  >
    <div
      v-for="(chunk, idx) in chunkGrid"
      :key="idx"
      class="cell"
      :title="tooltip(chunk)"
      :style="cellStyle(chunk)"
      :class="{ selected: selected && selected.x === chunk.x && selected.y === chunk.y }"
      @click="$emit('select', { x: chunk.x, y: chunk.y })"
    >
      <small v-if="showLabels">{{ chunk.x }},{{ chunk.y }}</small>
      
      <div v-if="chunk.species && chunk.species.size" class="species-badge">
        {{ speciesText(chunk) }}
      </div>
      
      <div v-if="pollinators?.showBees" class="bees-badge">
        {{ beesBadge(chunk) }}
      </div>
      
      <div v-if="pollinators?.showArrows" class="arrow-badge">
        {{ flowArrow(chunk) }}
      </div>
      
      <div class="birds-badge">
        {{ birdsBadge(chunk) }}
      </div>
      <div v-if="seedCount(chunk) > 0" class="seeds-badge">🌱{{ seedCount(chunk) }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SpeciesRegistry } from '@/simulation/SpeciesRegistry';

const props = defineProps<{
  chunkGrid: any[];
  width: number;
  showLabels: boolean;
  vizMode: 'rgb' | 'vitality' | 'moisture' | 'pollution' | 'diversity' | 'succession' | 'pollinators';
  pollinators?: {
    showBees: boolean;
    showArrows: boolean;
  };
  engine?: any;
  selected?: { x: number; y: number } | null;
}>();

defineEmits<{ (e: 'select', payload: { x: number; y: number }): void }>()

function tooltip(chunk: any) {
  const b = chunk.biomeState;
  return `(${chunk.x},${chunk.y}) v:${b.vitality.toFixed(2)} m:${b.moisture.toFixed(
    2
  )} p:${b.pollution.toFixed(2)} d:${(b.diversity ?? 0).toFixed(2)} pol:${((chunk as any).pollinatorDensity ?? 0).toFixed(2)}`;
}

function cellStyle(chunk: any) {
  const clamp255 = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)));
  const bs = chunk.biomeState;
  
  switch (props.vizMode) {
    case "vitality": {
      const v = clamp255(bs.vitality);
      return { background: `rgb(${v}, ${v}, ${v})` };
    }
    case "moisture": {
      const v = clamp255(bs.moisture);
      return { background: `rgb(${v}, ${v}, ${v})` };
    }
    case "pollution": {
      const v = clamp255(bs.pollution);
      return { background: `rgb(${v}, ${v}, ${v})` };
    }
    case "diversity": {
      const v = clamp255(bs.diversity ?? 0);
      return { background: `rgb(${v}, ${v}, ${v})` };
    }
    case "succession": {
      const v = clamp255(bs.succession);
      return { background: `rgb(${v}, ${v}, ${v})` };
    }
    case "pollinators": {
      const v = clamp255(((chunk as any).pollinatorDensity) ?? 0);
      return { background: `rgb(${v}, ${v}, ${v})` };
    }
    case "rgb":
    default: {
      const r = clamp255(bs.pollution);
      const g = clamp255(bs.vitality);
      const b = clamp255(bs.moisture);
      return { background: `rgb(${r}, ${g}, ${b})` };
    }
  }
}

function beesBadge(chunk: any): string {
  const d = (chunk as any).pollinatorDensity ?? 0;
  const n = Math.max(0, Math.min(3, Math.round(d * 3)));
  return '🐝'.repeat(n);
}

function flowArrow(chunk: any): string {
  if (!props.engine) return '';
  const here = (chunk as any).pollinatorDensity ?? 0;
  const nx = (dx: number, dy: number) => {
    const cc = props.engine!.getChunk(chunk.x + dx, chunk.y + dy);
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

function birdsBadge(chunk: any): string {
  const rec = (chunk as any).birds as Record<string, number> | undefined;
  if (!rec) return '';
  const entries = Object.entries(rec) as Array<[string, number]>;
  if (entries.length === 0) return '';
  // Pick dominant species
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];
  const icon = dominant === 'owl' ? '🦉' : dominant === 'swift' ? '🕊️' : '🐦';
  const activity = (chunk as any).birdsActivity ?? 0;
  const n = Math.max(0, Math.min(3, Math.round(activity * 3)));
  return n > 0 ? icon.repeat(n) : '';
}

function speciesText(chunk: any): string {
  try {
    const reg = SpeciesRegistry.getInstance();
    const list = Array.from((chunk.species?.values?.() ?? []) as any[]);
    if (!list.length) return '';
    // Aggregate by speciesId to avoid long duplicates
    const counts = new Map<string, number>();
    list.forEach((s: any) => counts.set(s.speciesId, (counts.get(s.speciesId) || 0) + 1));
    const abbrs = Array.from(counts.keys()).map(id => abbrev(reg.getSpecies(id)?.name || id));
    const uniqueCount = counts.size;
    return `${abbrs.join(',')} (${uniqueCount})`;
  } catch {
    return '';
  }
}

function seedCount(chunk: any): number {
  return ((chunk as any).seedBank?.length) || 0
}

function abbrev(name: string): string {
  if (!name) return '';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const clean = name.replace(/[^a-zA-Z]/g, '');
  return clean.slice(0, 3).toUpperCase();
}
</script>

<style scoped>
.grid {
  display: grid;
  gap: 4px;
}

.cell {
  border: 1px solid #222;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-shadow: 0 1px 2px #000;
  position: relative;
}

.cell.selected { outline: 2px solid #6cf; outline-offset: -2px; }

.species-badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  font-size: 10px;
  background: rgba(0,0,0,0.5);
  border: 1px solid #333;
  padding: 1px 3px;
  border-radius: 3px;
}

.bees-badge {
  position: absolute;
  left: 2px;
  top: 2px;
  font-size: 12px;
}

.arrow-badge {
  position: absolute;
  left: 2px;
  bottom: 2px;
  font-size: 12px;
  opacity: 0.9;
}

.birds-badge {
  position: absolute;
  right: 2px;
  top: 2px;
  font-size: 12px;
}

.seeds-badge {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  background: rgba(0,0,0,0.5);
  border: 1px solid #333;
  padding: 1px 3px;
  border-radius: 3px;
}
</style>
