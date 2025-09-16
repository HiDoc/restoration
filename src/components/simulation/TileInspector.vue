<template>
  <aside class="sci-panel grid grid-rows-[auto_auto_1fr] max-h-[60vh]">
    <div class="sci-header flex items-center justify-between">
      <span>
        Tile ({{ chunk.x }}, {{ chunk.y }})
      </span>
      <button
        class="sci-btn sci-btn-sm"
        @click="$emit('close')"
        title="Close inspector and show events"
      >
        ✖ Close
      </button>
    </div>
    <div class="sci-header flex gap-1 px-2 py-1">
      <button class="sci-btn sci-btn-sm text-xs" :class="{ 'sci-btn-primary': tab==='overview' }" @click="tab='overview'">Overview</button>
      <button class="sci-btn sci-btn-sm text-xs" :class="{ 'sci-btn-primary': tab==='repro' }" @click="tab='repro'">Reproduction</button>
    </div>
    <div class="p-2 overflow-y-auto grid gap-1 text-xs" v-if="tab==='overview'">
      <div class="mt-1 pt-1 border-t">
        <div class="font-semibold mb-1">Visualization</div>
        <ChunkPixi :chunk="chunk" :size="256" />
      </div>
      <div class="mt-1 pt-1 border-t">
        <div class="font-semibold mb-1">Biome State</div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Vitality</span><b>{{ chunk.biomeState.vitality.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Moisture</span><b>{{ chunk.biomeState.moisture.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Soil</span><b>{{ chunk.biomeState.soil.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Pollution</span><b>{{ chunk.biomeState.pollution.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Diversity</span><b>{{ chunk.biomeState.diversity.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Succession</span
          ><b>{{ chunk.biomeState.succession.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Light</span><b>{{ chunk.climateState.light.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Temp (°C)</span
          ><b>{{ chunk.climateState.temperature.toFixed(1) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Wind</span><b>{{ chunk.climateState.wind.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Rain</span
          ><b>{{ chunk.climateState.rainLikelihood.toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Pollinators</span
          ><b>{{ ((chunk as any).pollinatorDensity ?? 0).toFixed(2) }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Bird act.</span
          ><b>{{ ((chunk as any).birdsActivity ?? 0).toFixed(2) }}</b>
        </div>
      </div>

      <div class="mt-1 pt-1 border-t">
        <div class="font-semibold mb-1">Species ({{ speciesSummary.total }})</div>
        <div v-for="row in speciesSummary.rows" :key="row.id" class="grid grid-cols-[1fr_auto]">
          <span>{{ row.name }}</span
          ><b>x{{ row.count }}</b>
        </div>
      </div>

      <div class="mt-1 pt-1 border-t">
        <div class="font-semibold mb-1">Seeds</div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>In bank</span><b>{{ seedStats.inBank }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Landed (last tick)</span><b>{{ seedStats.lastTickLanded }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Survived (last tick)</span
          ><b>{{ seedStats.lastTickSurvived }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Germinated (last tick)</span
          ><b>{{ seedStats.lastTickGerminated }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Landed (total)</span><b>{{ seedStats.totalLanded }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Survived (total)</span><b>{{ seedStats.totalSurvived }}</b>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-1">
          <span>Germinated (total)</span><b>{{ seedStats.totalGerminated }}</b>
        </div>
      </div>
    </div>
    <div class="p-2 overflow-y-auto grid gap-1 text-xs" v-else>
      <div class="mt-1 pt-1 border-t">
        <div class="font-semibold mb-1">Reproduction Debug</div>
        <template v-if="reproRows.length">
          <div class="grid grid-cols-[1fr_auto]">
            <span>Species</span>
            <b>Rate</b>
          </div>
          <div v-for="r in reproRows" :key="r.id" class="pt-1 mt-1 border-t">
            <div class="grid grid-cols-[1fr_auto]"><span>{{ r.name }}</span><b>{{ r.finalRate.toFixed(3) }}</b></div>
            <div class="font-mono text-[11px] grid grid-cols-2 gap-1 opacity-80">
              <div>base: {{ r.base.toFixed(3) }}</div>
              <div>size: {{ r.sizeEffect.toFixed(2) }}</div>
              <div>health: {{ r.healthFactor.toFixed(2) }}</div>
              <div>vitality: {{ r.vitalityFactor.toFixed(2) }}</div>
              <div>light: {{ r.lightFactor.toFixed(2) }}</div>
              <div>season: {{ r.seasonFactor.toFixed(2) }}</div>
              <div>pollination: {{ r.pollinationSuccess.toFixed(2) }} (boost {{ r.pollinationBoost.toFixed(2) }})</div>
              <div>dispersal boost: {{ r.dispersalBoost.toFixed(2) }}</div>
            </div>
          </div>
        </template>
        <div v-else class="opacity-80">No reproduction data yet. Run a few ticks.</div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { SpeciesRegistry } from "@/simulation/SpeciesRegistry";
import ChunkPixi from './ChunkPixi.vue'

const props = defineProps<{ chunk: any }>();
const emits = defineEmits(["close"]);
const tab = ref<'overview'|'repro'>('overview')

const speciesSummary = computed(() => {
  const chunk: any = props.chunk;
  if (!chunk || !chunk.species)
    return {
      total: 0,
      rows: [] as Array<{ id: string; name: string; count: number }>,
    };
  const reg = SpeciesRegistry.getInstance();
  const counts = new Map<string, number>();
  (chunk.species as Map<string, any>).forEach((inst: any) =>
    counts.set(inst.speciesId, (counts.get(inst.speciesId) || 0) + 1)
  );
  const rows = Array.from(counts.entries()).map(([id, count]) => ({
    id,
    count,
    name: reg.getSpecies(id)?.name || id,
  }));
  rows.sort((a, b) => b.count - a.count);
  return { total: rows.reduce((a, r) => a + r.count, 0), rows };
});

const seedStats = computed(() => {
  const stats = (props.chunk as any).seedStats || {
    totalLanded: 0,
    totalSurvived: 0,
    totalGerminated: 0,
    lastTickLanded: 0,
    lastTickSurvived: 0,
    lastTickGerminated: 0,
  };
  const inBank = (props.chunk as any).seedBank?.length || 0;
  return { inBank, ...stats };
});

const reproRows = computed(() => {
  const map: Map<string, any> | undefined = (props.chunk as any).__reproDebug
  if (!map || map.size === 0) return [] as Array<any>
  const reg = SpeciesRegistry.getInstance();
  const rows = Array.from(map.entries()).map(([id, d]) => ({ id, name: reg.getSpecies(id)?.name || id, ...d }))
  rows.sort((a, b) => b.finalRate - a.finalRate)
  return rows
})
</script>

<style scoped></style>
