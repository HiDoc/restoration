<template>
  <aside class="panel">
    <div class="panel-title">
      <span>
        Tile ({{ chunk.x }}, {{ chunk.y }})
      </span>
      <button
        class="btn"
        @click="$emit('close')"
        title="Close inspector and show events"
      >
        ✖ Close
      </button>
    </div>
    <div class="tabbar">
      <button class="tab" :class="{active: tab==='overview'}" @click="tab='overview'">Overview</button>
      <button class="tab" :class="{active: tab==='repro'}" @click="tab='repro'">Reproduction</button>
    </div>
    <div class="panel-body" v-if="tab==='overview'">
      <div class="section">
        <div class="section-title">Visualization</div>
        <ChunkPixi :chunk="chunk" :size="256" />
      </div>
      <div class="section">
        <div class="section-title">Biome State</div>
        <div class="kv">
          <span>Vitality</span><b>{{ chunk.biomeState.vitality.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Moisture</span><b>{{ chunk.biomeState.moisture.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Soil</span><b>{{ chunk.biomeState.soil.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Pollution</span><b>{{ chunk.biomeState.pollution.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Diversity</span><b>{{ chunk.biomeState.diversity.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Succession</span
          ><b>{{ chunk.biomeState.succession.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Light</span><b>{{ chunk.climateState.light.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Temp (°C)</span
          ><b>{{ chunk.climateState.temperature.toFixed(1) }}</b>
        </div>
        <div class="kv">
          <span>Wind</span><b>{{ chunk.climateState.wind.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Rain</span
          ><b>{{ chunk.climateState.rainLikelihood.toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Pollinators</span
          ><b>{{ ((chunk as any).pollinatorDensity ?? 0).toFixed(2) }}</b>
        </div>
        <div class="kv">
          <span>Bird act.</span
          ><b>{{ ((chunk as any).birdsActivity ?? 0).toFixed(2) }}</b>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Species ({{ speciesSummary.total }})</div>
        <div v-for="row in speciesSummary.rows" :key="row.id" class="rowline">
          <span>{{ row.name }}</span
          ><b>x{{ row.count }}</b>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Seeds</div>
        <div class="kv">
          <span>In bank</span><b>{{ seedStats.inBank }}</b>
        </div>
        <div class="kv">
          <span>Landed (last tick)</span><b>{{ seedStats.lastTickLanded }}</b>
        </div>
        <div class="kv">
          <span>Survived (last tick)</span
          ><b>{{ seedStats.lastTickSurvived }}</b>
        </div>
        <div class="kv">
          <span>Germinated (last tick)</span
          ><b>{{ seedStats.lastTickGerminated }}</b>
        </div>
        <div class="kv">
          <span>Landed (total)</span><b>{{ seedStats.totalLanded }}</b>
        </div>
        <div class="kv">
          <span>Survived (total)</span><b>{{ seedStats.totalSurvived }}</b>
        </div>
        <div class="kv">
          <span>Germinated (total)</span><b>{{ seedStats.totalGerminated }}</b>
        </div>
      </div>
    </div>
    <div class="panel-body" v-else>
      <div class="section">
        <div class="section-title">Reproduction Debug</div>
        <template v-if="reproRows.length">
          <div class="repro-header rowline">
            <span>Species</span>
            <b>Rate</b>
          </div>
          <div v-for="r in reproRows" :key="r.id" class="repro-row">
            <div class="rowline"><span>{{ r.name }}</span><b>{{ r.finalRate.toFixed(3) }}</b></div>
            <div class="diag">
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
        <div v-else class="hint">No reproduction data yet. Run a few ticks.</div>
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

<style scoped>
.btn {
  background: #2f2f2f;
  color: #eaeaea;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: inherit;
  cursor: pointer;
}
.btn:hover { background: #3a3a3a; }
.btn:active { background: #262626; }
.btn-primary { background: #4ade80; color: #101010; border-color: #3ecf6d; }
.btn-primary:hover { background: #22c55e; }

.panel {
  border: 1px solid #333;
  color: white;
  background: #0d0d0d;
  border-radius: 6px;
  display: grid;
  grid-template-rows: auto auto 1fr;
  max-height: 60vh;
}
.tabbar { display: flex; gap: 6px; padding: 6px 8px; border-bottom: 1px solid #222; }
.tab { background: #1b1b1b; color: #eaeaea; border: 1px solid #333; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
.tab.active { background: #333; }
.panel-title {
  padding: 8px;
  font-weight: 600;
  border-bottom: 1px solid #222;
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
}
.panel-body {
  padding: 8px;
  overflow-y: auto;
  display: grid;
  gap: 6px;
  font-size: 12px;
}
.kv {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
}
.section {
  margin-top: 6px;
  border-top: 1px solid #222;
  padding-top: 6px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.rowline {
  display: grid;
  grid-template-columns: 1fr auto;
}
.repro-row { border-top: 1px solid #222; padding-top: 4px; margin-top: 4px; }
.diag { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 11px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 4px; color: #cfcfcf; }
.note { font-size: 12px; color: #cfcfcf; background: #141414; border: 1px solid #252525; padding: 8px; border-radius: 6px; margin-bottom: 6px; }
</style>
