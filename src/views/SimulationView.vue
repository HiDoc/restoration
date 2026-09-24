<template>
  <div class="flex h-screen flex-col text-slate-100 overflow-hidden" :class="viewMode === 'contemplative' ? 'bg-transparent' : 'bg-slate-950/95'">
    <div v-if="isInitializing || initializationError || !engine" class="m-auto max-w-md px-6 text-center" role="status" aria-live="polite">
      <p class="text-lg font-semibold">{{ initializationError ? 'The ecosystem could not load' : 'Preparing your ecosystem…' }}</p>
      <p v-if="initializationError" class="mt-3 text-sm text-slate-300">Check your connection, then try again.</p>
      <button v-if="initializationError" type="button" class="sci-btn mt-5 px-4 py-2" @click="init">Try again</button>
    </div>
    <template v-else>
    <div v-if="runtimeError" class="border-b border-rose-400/30 bg-slate-950 px-4 py-3 text-sm text-rose-100" role="alert">
      The simulation stopped unexpectedly. Load a saved ecosystem or restart to continue.
      <button type="button" class="sci-btn ml-3 px-3 py-1" @click="loadLatestSnapshot">Load</button>
      <button type="button" class="sci-btn ml-2 px-3 py-1" @click="restart">Restart</button>
    </div>
    <!-- Contemplative View -->
    <template v-if="viewMode === 'contemplative'">
      <!-- Floating Controls -->
      <FloatingControls
        :is-running="isRunning"
        :season-name="(stats as any).seasonName ?? 'Season'"
        :current-year="currentYear"
        :speed="options.tickMs"
        :year-progress="yearProgress"
        :blocked="showYearEndModal || extinction.triggered || !!runtimeError"
        :saving="isSaving"
        :loading="isLoadingSnapshot"
        :view-mode="viewMode"
        @toggle-play="toggleRunState"
        @decrease-speed="decreaseSpeed"
        @increase-speed="increaseSpeed"
        @step="stepOnce"
        @save="saveSnapshot"
        @load="loadLatestSnapshot"
        @sites="showSites = true"
        @toggle-view-mode="toggleViewMode"
      />

      <!-- Fullscreen Ecosystem Canvas -->
      <main class="flex-1 flex items-center justify-center overflow-hidden contemplative-canvas">
        <ChunkGrid
          :chunk-grid="displayChunkGrid"
          :width="width"
          :show-labels="false"
          :viz-mode="'rgb'"
          :engine="engine"
          :selected="selected"
          :season-name="(stats as any).seasonName ?? 'Season'"
          :contemplative="true"
          @select="onSelectChunk"
        />
      </main>
    </template>

    <!-- Analytical View (Original Layout) -->
    <template v-else>
    <div class="nouveau flex min-h-0 flex-1 flex-col">
      <!-- Masthead -->
      <header class="nv-masthead flex flex-shrink-0 flex-wrap items-center gap-x-5 gap-y-2 px-3 py-1.5 sm:flex-nowrap sm:px-5">
        <img :src="nv('logo')" alt="EcoSim — Living systems, brighter tomorrows" class="h-16 w-auto sm:h-24" />
        <div class="nv-serif leading-tight">
          <p class="text-3xl text-[#f6eeda]">{{ seasonLabel }}</p>
          <p class="nv-nums text-base text-[#e8d5a3]/85">Year {{ currentYear }} · Day {{ simDays }}</p>
        </div>
        <div class="relative order-last mx-auto sm:order-none" role="img" :aria-label="`Season: ${seasonLabel}`">
          <img :src="nv('seasons')" alt="" class="h-16 w-auto sm:h-[5.5rem]" />
          <span class="nv-season-mark" :style="{ left: `${4.6 + seasonIndex * 22.8}%` }" aria-hidden="true"></span>
        </div>
        <p class="nv-serif ml-auto hidden text-right text-lg italic leading-tight text-[#e8d5a3]/85 lg:block">“Small changes.<br />Living worlds.”</p>
        <div class="ml-auto flex items-center gap-1.5 lg:ml-0">
          <button type="button" class="research-panel nv-img-btn" title="Codex" aria-label="Open the Codex" @click="openCodex('plant')"><img :src="nv('btn-journal')" alt="" /></button>
          <button type="button" class="nv-img-btn" title="Contemplative view" aria-label="Switch to contemplative view" @click="toggleViewMode"><img :src="nv('btn-settings')" alt="" /></button>
          <button type="button" class="nv-img-btn" title="Restoration sites" aria-label="Restoration sites" @click="showSites = true"><img :src="nv('btn-map')" alt="" /></button>
        </div>
      </header>

      <main class="grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)_18rem] lg:overflow-hidden xl:grid-cols-[8.75rem_15rem_minmax(0,1fr)_18rem]">
        <img :src="nv('portrait-strip')" alt="" class="nv-portrait hidden h-full min-h-0 w-full object-cover object-top xl:block" />

        <!-- Workflow, overlays, time, interventions -->
        <aside class="flex min-h-0 flex-col gap-2 lg:overflow-y-auto">
          <section class="nv-ornate">
            <h2 class="nv-heading text-center text-lg">Guided Workflow</h2>
            <ol class="mt-2 grid gap-1.5">
              <li v-for="(step, i) in workflowSteps" :key="step.title" class="nv-step" :aria-current="activeStep === i ? 'step' : undefined">
                <span class="nv-step-num">{{ i + 1 }}</span>
                <img :src="nv(step.icon)" alt="" class="h-7 w-7 flex-shrink-0 object-contain" />
                <div>
                  <p class="text-[0.95rem] font-bold leading-tight">{{ step.title }}</p>
                  <p class="nv-small nv-muted">{{ step.text }}</p>
                </div>
              </li>
            </ol>
          </section>

          <section class="nv-panel p-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="nv-subheading">Measurements</h3>
              <button type="button" role="switch" class="nv-toggle" :aria-checked="showMeasurements" aria-label="Show measurements" @click="toggleMeasurements" />
            </div>
            <p v-if="!showMeasurements" class="nv-small nv-muted mt-1">Soil, water and pollution readings, and map overlays.</p>
            <ul v-else class="mt-1 grid gap-1">
              <li v-for="overlay in overlayOptions" :key="overlay.id" class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-2 text-sm"><img :src="nv(overlay.icon)" alt="" class="h-5 w-5 object-contain" />{{ overlay.label }}</span>
                <button
                  type="button"
                  role="switch"
                  class="nv-toggle"
                  :aria-checked="options.vizMode === overlay.id"
                  :aria-label="`${overlay.label} overlay`"
                  @click="setOverlay(overlay.id)"
                />
              </li>
            </ul>
          </section>

          <section class="nv-panel p-3">
            <h3 class="nv-subheading">Time</h3>
            <div class="mt-1 grid grid-cols-3 gap-1">
              <button
                type="button"
                class="nv-btn nv-time-btn"
                :aria-label="isRunning ? 'Pause' : 'Play, one day at a time'"
                :disabled="timeBlocked"
                @click="toggleRunState"
              ><span aria-hidden="true">{{ isRunning ? '❚❚' : '▶' }}</span>{{ isRunning ? 'Pause' : 'Play' }}</button>
              <button type="button" class="nv-btn nv-time-btn" aria-label="Advance one week" :disabled="timeBlocked" @click="advanceTime('week')">
                <span aria-hidden="true">▶▶</span>Week
              </button>
              <button type="button" class="nv-btn nv-time-btn" aria-label="Advance to the next season" :disabled="timeBlocked" @click="advanceTime('season')">
                <span aria-hidden="true">▶▶▶</span>Season
              </button>
            </div>
            <p v-if="advancing" class="nv-small nv-muted mt-1 text-center" role="status">Time passes…</p>
            <input
              type="range"
              class="nv-range mt-2"
              min="-1"
              :max="historyFrames.length - 1"
              :value="selectedHistoryIndex"
              :aria-label="selectedHistoryIndex === -1 ? 'Live view' : `History frame ${selectedHistoryIndex}`"
              @input="onScrubHistory(($event.target as HTMLInputElement).valueAsNumber)"
            />
            <p class="nv-small nv-muted nv-nums text-center">{{ selectedHistoryIndex === -1 ? 'Live' : `Memory, day ${historyFrames[selectedHistoryIndex]?.tick ?? ''}` }}</p>
          </section>

          <section class="intervention-panel nv-panel p-3">
            <h3 class="nv-subheading">Interventions</h3>
            <div class="mt-1 grid grid-cols-3 gap-1">
              <button
                v-for="action in interventionActions"
                :key="action.id"
                type="button"
                class="nv-btn flex flex-col items-center gap-0.5 px-0.5 py-1.5"
                :title="action.hint"
                :aria-pressed="interventionStore.selectedIntervention === action.id"
                @click="toggleIntervention(action.id)"
              >
                <img :src="nv(action.icon)" alt="" class="h-6 w-6 object-contain" />
                <span>{{ action.label }}</span>
              </button>
            </div>
            <template v-if="pouch.length">
              <label class="nv-small nv-muted mt-1.5 block" for="nv-plant-species">Seeds in your pouch</label>
              <select id="nv-plant-species" v-model="interventionStore.selectedPlantSpecies" class="nv-btn mt-0.5 w-full">
                <option v-for="seed in pouch" :key="seed.id" :value="seed.id">{{ seed.name }} × {{ seed.count }}</option>
              </select>
            </template>
            <p v-else class="nv-small nv-muted mt-1.5">No seeds yet. Collect them from ripe plants.</p>
            <p v-if="interventionStore.selectedIntervention" class="nv-small mt-1 text-center font-bold">Click a hex to {{ interventionStore.selectedIntervention === 'plant' ? 'see how it would fare' : 'apply' }}</p>
          </section>
        </aside>

        <!-- Hex world map -->
        <section class="chunk-grid-container relative min-h-[26rem] lg:min-h-0">
          <div class="nv-map-frame h-full min-h-[26rem] lg:min-h-0">
            <ChunkGrid
              :chunk-grid="displayChunkGrid"
              :width="width"
              :show-labels="false"
              :viz-mode="options.vizMode"
              :engine="engine"
              :selected="selected"
              :season-name="(stats as any).seasonName ?? 'Spring'"
              tessellated
              @select="onSelectChunk"
            />
          </div>

          <div v-if="tooltipChunk && hexStory" class="nv-panel-dark absolute right-3 top-3 w-64 p-3 sm:right-5 sm:top-5" role="status">
            <div class="flex items-start justify-between gap-2">
              <p class="font-bold">{{ hexStory.title }}</p>
              <span class="nv-nums whitespace-nowrap text-sm opacity-80">({{ tooltipChunk.x }}, {{ tooltipChunk.y }})</span>
            </div>
            <p class="nv-small opacity-85">{{ hexStory.phrase }}</p>
            <h4 v-if="hexStory.plants.length" class="nv-small mt-2 uppercase tracking-[0.15em] opacity-70">Plants</h4>
            <ul class="grid gap-0.5 text-sm">
              <li v-for="plant in hexStory.plants.slice(0, 5)" :key="plant.id" class="nv-tooltip-row">
                <span class="flex items-center gap-2"><img :src="nv(ACTIVITY_ICONS[plant.activity])" alt="" class="h-4 w-4 object-contain" />{{ plant.name }}</span>
                <span class="nv-small opacity-80">
                  <span v-if="plant.limit" class="font-bold text-[#f0b48a]">{{ plant.limit }}</span><template v-else>{{ ACTIVITY_WORDS[plant.activity] }}</template> · {{ plant.count }}
                </span>
              </li>
            </ul>
            <h4 v-if="hexStory.animals.length" class="nv-small mt-2 uppercase tracking-[0.15em] opacity-70">Animals</h4>
            <ul class="grid gap-0.5 text-sm">
              <li v-for="animal in hexStory.animals.slice(0, 4)" :key="animal.id" class="nv-tooltip-row">
                <span class="flex items-center gap-2"><img :src="nv(animal.group === 'bird' ? 'icon-birds' : 'icon-pollinators')" alt="" class="h-4 w-4 object-contain" />{{ animal.name }}</span>
                <span class="nv-small nv-nums opacity-80">{{ animal.count }}</span>
              </li>
            </ul>
            <dl v-if="showMeasurements" class="nv-nums mt-2 grid gap-1 border-t border-[#c9a227]/30 pt-2 text-sm">
              <div v-for="row in tooltipRows" :key="row.label" class="nv-tooltip-row">
                <dt class="flex items-center gap-2"><img :src="nv(row.icon)" alt="" class="h-4 w-4 object-contain" />{{ row.label }}</dt>
                <dd class="flex items-center gap-2">
                  <span>{{ row.value }}</span>
                  <span v-if="row.bar !== undefined" class="nv-bar inline-block w-16" :class="row.barClass"><span :style="{ width: `${Math.round(row.bar * 100)}%` }"></span></span>
                </dd>
              </div>
            </dl>
            <p v-if="plantFit" class="nv-small mt-2 border-t border-[#c9a227]/30 pt-2">
              {{ speciesInfo(interventionStore.selectedPlantSpecies).name }}: <span class="font-bold">{{ plantFit.words }}</span>
            </p>
            <form v-if="crossing && flowering.length > 1" class="nv-small mt-2 grid gap-1 border-t border-[#c9a227]/30 pt-2" @submit.prevent="crossPollinate">
              <label class="grid gap-0.5">Pollinate
                <select v-model="crossReceiver" class="nv-btn w-full">
                  <option v-for="plant in flowering" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
                </select>
              </label>
              <label class="grid gap-0.5">with pollen from
                <select v-model="crossDonor" class="nv-btn w-full">
                  <option v-for="plant in flowering" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
                </select>
              </label>
              <p v-if="crossProblem" role="status">{{ crossProblem }}</p>
              <button type="submit" class="nv-btn justify-self-end" :disabled="!!crossProblem">Pollinate</button>
            </form>
            <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button type="button" class="nv-small underline opacity-80 hover:opacity-100" @click="clearSelection">Close</button>
              <button v-if="flowering.length > 1 && !crossing" type="button" class="nv-btn" @click="startCross">Cross-pollinate</button>
              <button v-if="plantFit" type="button" class="nv-btn" @click="applyToSelected('plant')">Plant here</button>
              <button v-if="hexStory.plants.some(p => p.activity === 'fruiting')" type="button" class="nv-btn" @click="applyToSelected('collect')">Collect seeds</button>
              <button type="button" class="nv-btn" @click="showChunkInspector = true">Open inspector</button>
            </div>
          </div>

          <img :src="nv('compass')" alt="Hex world: interconnect, explore, preserve" class="nv-compass absolute bottom-2 left-2 hidden w-36 md:block" />
          <p class="nv-pill absolute bottom-3 right-3 hidden md:block" aria-hidden="true">Every habitat matters</p>
        </section>

        <!-- World overview, events, scenario -->
        <aside class="flex min-h-0 flex-col gap-2 lg:overflow-y-auto">
          <section class="nv-ornate">
            <h2 class="nv-heading">World Overview</h2>
            <div class="nv-nums mt-1.5 grid gap-1 text-sm">
              <div v-for="row in overviewRows" :key="row.label" class="nv-row">
                <span class="flex items-center gap-2"><img :src="nv(row.icon)" alt="" class="h-5 w-5 object-contain" />{{ row.label }}</span>
                <span class="flex items-center gap-2">
                  <span v-if="row.bar !== undefined" class="nv-bar inline-block w-20" :class="row.barClass"><span :style="{ width: `${Math.round(row.bar * 100)}%` }"></span></span>
                  <strong v-if="showMeasurements || row.bar === undefined" class="min-w-[2.25rem] text-right text-base font-normal">{{ row.value }}</strong>
                </span>
              </div>
            </div>
          </section>

          <section ref="eventsCard" class="event-log-container nv-panel p-3">
            <div class="flex items-center justify-between">
              <h2 class="nv-heading">Recent Events</h2>
              <button type="button" class="nv-link" @click="showAllEvents = !showAllEvents">{{ showAllEvents ? '← Less' : 'See All →' }}</button>
            </div>
            <ul class="mt-1.5 grid">
              <li v-if="recentEvents.length === 0" class="nv-small nv-muted">No events yet. Press play to start the season.</li>
              <li v-for="event in recentEvents" :key="event.id" class="nv-row items-start py-1 text-[0.8rem]">
                <img :src="nv(eventIcon(event.message))" alt="" class="mt-0.5 h-5 w-5 flex-shrink-0 object-contain" />
                <span class="min-w-0 flex-1 leading-snug">{{ event.message }}</span>
                <span class="nv-muted nv-nums flex-shrink-0">Day {{ event.tick }}</span>
              </li>
            </ul>
          </section>

          <section ref="scenarioCard" class="goals-panel nv-panel flex-1 p-3">
            <div class="flex items-center justify-between">
              <h2 class="nv-heading">Restoration site</h2>
              <button type="button" class="nv-link" @click="showSites = true">Sites</button>
            </div>
            <div class="mt-1.5 flex gap-2.5">
              <img :src="nv('scenario')" alt="" class="h-16 w-16 flex-shrink-0 rounded border border-[#8a6d1f] object-cover" />
              <div class="min-w-0">
                <p class="font-bold leading-tight">{{ profile.site.name }}</p>
                <p class="nv-small nv-muted">{{ profile.site.blurb }}</p>
              </div>
            </div>
            <ol class="mt-2 grid gap-0.5" aria-label="Restoration stages">
              <li v-for="(stage, index) in STAGES.slice(1)" :key="stage.title" class="nv-row text-[0.8rem]">
                <span class="flex min-w-0 items-center gap-1.5">
                  <span class="nv-check" :aria-checked="profile.siteProgress.stage > index" role="checkbox" aria-readonly="true"></span>
                  <span :class="profile.siteProgress.stage === index ? 'font-bold' : ''">{{ stage.title }}</span>
                </span>
              </li>
            </ol>
            <p v-if="nextStageGoal" class="nv-small mt-1">Next: {{ nextStageGoal }}</p>
            <p v-else class="nv-small mt-1 font-bold">Restored.</p>
            <div class="mt-2 flex items-center justify-between border-t border-[#8a6d1f]/30 pt-1.5">
              <h3 class="nv-heading">Goals</h3>
              <button type="button" class="nv-link" @click="showAllGoals = !showAllGoals">{{ showAllGoals ? 'Less' : 'View All' }}</button>
            </div>
            <ul class="mt-1 grid gap-1">
              <li v-if="scenarioGoals.length === 0" class="nv-small nv-muted">No active goals yet.</li>
              <li v-for="goal in scenarioGoals" :key="goal.goal.id" class="nv-row text-[0.8rem]">
                <span class="flex min-w-0 items-center gap-1.5">
                  <span class="nv-check" :aria-checked="goal.completed" role="checkbox" aria-readonly="true"></span>
                  <span class="truncate">{{ goal.goal.title }}</span>
                </span>
                <span class="nv-nums flex-shrink-0">{{ formatGoalValue(goal) }}<span v-if="goal.completed" class="text-[#2a5238]"> ✓</span></span>
              </li>
            </ul>
          </section>
        </aside>
      </main>

      <!-- Discoveries: brief, non-blocking notes as the player learns something new -->
      <ol class="nouveau-toasts pointer-events-none fixed bottom-24 left-1/2 z-[60] grid -translate-x-1/2 gap-1.5" aria-live="polite">
        <li v-for="toast in toasts" :key="toast.id" class="nv-panel nv-small flex items-center gap-2 px-3 py-1.5 text-[#2b2118] shadow-lg">
          <img :src="nv(toast.icon)" alt="" class="h-5 w-5" />{{ toast.text }}
        </li>
      </ol>

      <footer class="nv-dock-band flex min-w-0 flex-shrink-0 items-end">
        <img :src="nv('dock-left')" alt="Nature adapts, so can we" class="hidden h-[4.25rem] w-auto flex-shrink-0 xl:block" />
        <BottomDock class="min-w-0 flex-1" :active="dockTab" @select="onDockSelect" />
        <img :src="nv('dock-right')" alt="A healthy tomorrow takes root today" class="hidden h-[4.25rem] w-auto flex-shrink-0 xl:block" />
      </footer>

    <!-- The land emptied: say what the player saw cause it, and let life go on -->
    <div v-if="extinction.triggered" class="sci-modal-overlay">
      <div class="sci-modal nv-ornate max-w-md" role="dialog" aria-labelledby="shift-title">
        <h2 id="shift-title" class="nv-heading text-center text-xl">Ecosystem shift</h2>
        <p class="nv-small nv-muted text-center">Year {{ currentYear }} · Day {{ simDays }}</p>
        <p class="nv-small mt-2 text-center">No plants or living seed remain. The land will stay open until something arrives or you sow it.</p>
        <ul class="mt-3 grid gap-1.5">
          <li v-if="extinction.causes.length === 0" class="nv-small nv-muted text-center">The last plants faded without a clear cause.</li>
          <li v-for="cause in extinction.causes" :key="cause.text" class="nv-row text-sm">
            <span>{{ cause.text }}</span>
            <button v-if="cause.chunkId" type="button" class="nv-link flex-shrink-0" @click="inspectShift(cause.chunkId)">Inspect</button>
          </li>
        </ul>
        <div class="mt-3 flex justify-center">
          <button type="button" class="nv-btn px-5 py-1.5 text-sm font-bold" @click="acknowledgeShift">Continue</button>
        </div>
      </div>
    </div>

    <div v-if="digest" class="sci-modal-overlay" @click.self="digest = null">
      <div class="sci-modal nv-ornate max-w-md" role="dialog" aria-labelledby="digest-title">
        <h2 id="digest-title" class="nv-heading text-center text-xl">{{ digest.title }}</h2>
        <p class="nv-small nv-muted text-center">Year {{ currentYear }} · Day {{ simDays }}</p>
        <ul class="mt-3 grid gap-1.5">
          <li v-if="digest.lines.length === 0" class="nv-small nv-muted text-center">A quiet stretch: nothing notable changed.</li>
          <li v-for="line in digest.lines" :key="line.text" class="nv-row text-sm">
            <span class="flex items-center gap-2"><img :src="nv(DIGEST_ICONS[line.icon])" alt="" class="h-5 w-5 flex-shrink-0 object-contain" />{{ line.text }}</span>
            <button v-if="line.chunkId" type="button" class="nv-link flex-shrink-0" @click="inspectDigestLine(line.chunkId)">Inspect</button>
          </li>
        </ul>
        <div class="mt-3 flex justify-center">
          <button type="button" class="nv-btn px-5 py-1.5 text-sm font-bold" @click="digest = null">Continue</button>
        </div>
      </div>
    </div>

    </div>
    </template>

    <!-- Common modals for both views -->
    <YearEndSeedSelection
      :show="showYearEndModal"
      :year="completedYear"
      :engine="engine"
      :total-species="stats.totalSpecies"
      :avg-vitality="stats.avgVitality"
      @close="showYearEndModal = false"
      @confirm="onYearEndConfirm"
    />

    <CodexPanel :show="showCodex" :start-tab="codexTab" @close="showCodex = false" />



    <!-- NEW GAMEPLAY MODALS -->

    <!-- Tutorial Welcome Modal -->
    <WelcomeModal
      :show="tutorialStore.showWelcomeModal"
      @close="tutorialStore.dismissWelcome()"
      @start-tutorial="startTutorial"
      @skip="skipTutorial"
    />

    <!-- Tutorial Tooltip Overlay -->
    <TooltipOverlay
      :show="tutorialStore.showTooltip && tutorialStore.activeTooltip !== null"
      :target-selector="tutorialStore.activeTooltip?.targetElement"
      :title="tutorialStore.activeTooltip?.title || ''"
      :content="tutorialStore.activeTooltip?.content || ''"
      :placement="tutorialStore.activeTooltip?.placement"
      @next="tutorialStore.completeCurrentStep()"
      @skip="tutorialStore.skipTutorial()"
    />

    <SiteSelector :show="showSites" @close="showSites = false" @travel="travel" />

    <!-- Chunk Inspector -->
    <ChunkInspector
      :show="showChunkInspector"
      :chunk="selectedChunkForInspection"
      @close="showChunkInspector = false"
      @apply-intervention="applyInterventionFromInspector"
    />
    <p v-if="saveNotice" class="nv-skin nv-frame fixed bottom-6 left-6 z-[110] max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm text-slate-100 shadow-lg" role="status">{{ saveNotice }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, computed, watch, type Ref } from "vue";
import {
  SimulationEngine,
  type SimulationConfig,
} from "@/simulation/SimulationEngine";
import { FixedStepLoop } from "@/core/FixedStepLoop";
import { initializeSimulationRuntime } from "@/simulation/rust/SimulationRuntime";
import { SpeciesRegistry } from "@/simulation/SpeciesRegistry";

// Components
import YearEndSeedSelection from "@/components/simulation/YearEndSeedSelection.vue";
import ChunkGrid from "@/components/simulation/ChunkGrid.vue";
import CodexPanel from "@/components/simulation/CodexPanel.vue";
import type { CodexTab } from "@/game/codex";
import FloatingControls from "@/components/simulation/FloatingControls.vue";
import BottomDock from "@/components/simulation/BottomDock.vue";
import { nv } from "@/components/simulation/nouveauAssets";
import { buildDigest, type DigestLine } from "@/game/digest";
import { elevationOf, siteById, STAGES, surveySite } from "@/game/sites";
import { habitatFit, rewardSpecies, REWARD_SEEDS } from "@/game/seeds";
import { crossBarrier } from "@/game/hybrids";
import { explainShift, type ShiftCause } from "@/game/shift";
import { MYSTERIES } from "@/game/mysteries";
import { describeHex, type PlantActivity } from "@/game/hexDescription";
import { speciesInfo } from "@/game/speciesInfo";
import type { Discovery } from "@/game/knowledge";
import WelcomeModal from "@/components/simulation/WelcomeModal.vue";
import TooltipOverlay from "@/components/simulation/TooltipOverlay.vue";
import SiteSelector from "@/components/simulation/SiteSelector.vue";
import ChunkInspector from "@/components/simulation/ChunkInspector.vue";

// Stores and utilities
import { SimDB, type SimSnapshot } from "@/persistence/SimDB";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { useInterventionStore } from "@/stores/interventionStore";
import { useGoalsStore } from "@/stores/goalsStore";
import { useTutorialStore } from "@/stores/tutorialStore";
import { useProfileStore } from "@/stores/profileStore";
import type { VizMode } from "@/components/simulation/types";
import type { InterventionType } from "@/simulation/InterventionManager";

const engine: Ref<SimulationEngine | null> = ref(null);
const isInitializing = ref(true);
const initializationError = ref<string | null>(null);
const runtimeError = ref<string | null>(null);
const isSaving = ref(false);
const isLoadingSnapshot = ref(false);
const saveNotice = ref('');
let unmounted = false;
let initializationVersion = 0;

const width = ref(6);
const height = ref(6);
type SimulationEventEntry = { id: number; message: string; timeLabel: string; tick: number };
const events = ref<SimulationEventEntry[]>([]);
let eventCounter = 0;
const selected = ref<{ x: number; y: number } | null>(null);

// Year-end seed selection
const showYearEndModal = ref(false);
const completedYear = ref(0);
const currentYear = ref(0);
const yearProgress = ref(0);

const persist = reactive({
  autoSave: false,
  interval: 50,
  lastSavedTick: null as number | null,
});
let db: SimDB | null = null;

const options = reactive({
  worldWidth: 6,
  worldHeight: 6,
  tickMs: 100,
  vizMode: "rgb" as VizMode,
  showLabels: true,
});

const isRunning = ref(false);
const loop = new FixedStepLoop(updateOnce, {
  stepMs: options.tickMs,
  maxCatchUpSteps: 5,
  onError(error) {
    isRunning.value = false;
    runtimeError.value = error instanceof Error ? error.message : String(error);
    console.error('Simulation update failed:', error);
  },
});

// View mode state (contemplative/analytical)
const viewMode = ref<'contemplative' | 'analytical'>('analytical');

const stats = reactive({
  seasonName: 'spring',
  simDays: 0,
  currentTick: 0,
  activeChunks: 0,
  totalChunks: 0,
  totalSpecies: 0,
  avgVitality: 0,
  avgPollution: 0,
});

// Stores
const knowledgeStore = useKnowledgeStore();
const interventionStore = useInterventionStore();
const goalsStore = useGoalsStore();
const tutorialStore = useTutorialStore();
const profile = useProfileStore();
const showSites = ref(false);

// An emptied land pauses once with its causes; after Continue it waits for life to return before watching again.
const extinction = reactive({ triggered: false, acknowledged: false, sinceTick: 0, causes: [] as ShiftCause[] });
let extinctionGraceUntilTick = 50;
let resumeAfterYearEnd = false;

// Lightweight gameplay state
const gameplay = reactive({
  difficulty: 'normal' as 'easy'|'normal'|'hard',
})

// Chunk inspector state
const showChunkInspector = ref(false);
const selectedChunkForInspection = ref<any>(null);

const chunkGrid = computed(() => {
  if (!engine.value) return [] as any[];
  // Read-only access keeps ticks cheap; the engine refreshes these chunks in place when read.
  return Array.from(engine.value.readChunks().values())
    .filter(chunk => chunk.x < width.value && chunk.y < height.value)
    .sort((a, b) => a.y - b.y || a.x - b.x);
});

type HistoryFrame = { tick: number; capturedAt: string; grid: any[] };
const historyConfig = { captureEvery: 12, maxFrames: 24 };
const historyFrames = ref<HistoryFrame[]>([]);
const selectedHistoryIndex = ref<number>(-1);

const displayChunkGrid = computed(() => {
  if (selectedHistoryIndex.value === -1) return chunkGrid.value;
  const frame = historyFrames.value[selectedHistoryIndex.value];
  return frame?.grid || chunkGrid.value;
});

// Species change detection helpers
const prevSpecies: Map<string, Map<string, string>> = new Map();
const seenWeather: Set<string> = new Set();

async function init() {
  const version = ++initializationVersion;
  pause();
  isInitializing.value = true;
  initializationError.value = null;
  runtimeError.value = null;
  try {
    await initializeSimulationRuntime();
    if (unmounted || version !== initializationVersion) return;
    initializeWorld();
    // Continue the current site where it was last saved.
    const snap = db ? await db.loadLatest(profile.currentSite).catch(() => null) : null;
    if (snap && version === initializationVersion) applySnapshot(snap);
  } catch (error) {
    initializationError.value = error instanceof Error ? error.message : String(error);
    console.error('Ecosystem initialization failed:', error);
  } finally {
    if (!unmounted && version === initializationVersion) isInitializing.value = false;
  }
}

/** Found the current site fresh, carrying the pouch in if the player arrived from another site. */
function initializeWorld(carriedPouch?: unknown[]) {
  const site = profile.site;
  width.value = options.worldWidth = site.world.width;
  height.value = options.worldHeight = site.world.height;
  const config: SimulationConfig = {
    worldWidth: site.world.width,
    worldHeight: site.world.height,
    chunkSize: 32,
    tickRate: 10,
    masterSeed: site.world.seed,
    maxActiveChunks: site.world.width * site.world.height,
    seasonLengthTicks: 90,
    timePerTickMinutes: 1440,
  };
  engine.value = new SimulationEngine(config);
  engine.value.applyScenarioConditions({ biomeStates: site.conditions, elevation: elevationOf(site), establishedSpecies: site.established, initialSpecies: site.established });

  historyFrames.value = [];
  selectedHistoryIndex.value = -1;

  // Activate all chunks for EcoSim view
  engine.value.activateAllChunks();

  events.value = [];
  eventCounter = 0;
  showYearEndModal.value = false;
  showChunkInspector.value = false;
  selectedChunkForInspection.value = null;
  selected.value = null;
  extinctionGraceUntilTick = 50;
  extinction.triggered = extinction.acknowledged = false;
  updateStats();
  initSpeciesSnapshot(engine.value.readChunks());
  seenWeather.clear();
  if (!db && typeof indexedDB !== "undefined") db = new SimDB();

  // Knowledge belongs to the player and grows across sites; only a first game learns its start without fanfare.
  const firstGame = Object.keys(knowledgeStore.knowledge.species).length === 0;
  knowledgeStore.followWorld(engine.value);
  const found = knowledgeStore.observe(engine.value);
  if (!firstGame) announce(found);

  // Initialize intervention system
  interventionStore.reset();
  interventionStore.initialize(engine.value);
  if (carriedPouch) interventionStore.carryPouch(carriedPouch);
  if (profile.arrive(site.id)) interventionStore.addSeeds(site.starterSeeds);

  // Initialize goals system
  goalsStore.reset();
  goalsStore.initialize(engine.value, gameplay.difficulty, () => knowledgeStore.summary);

  // Initialize tutorial system
  tutorialStore.initializeTutorial();


  // Register year-end callback
  engine.value.onYearEnd(onYearEnd);

  // Initialize year progress
  updateYearProgress();
  captureHistory(stats.currentTick);
  loop.setStepMs(options.tickMs);
  loop.setSuspended(document.hidden);
}

/**
 * Goals, scenario and tutorial react to the world the player sees, so they run once per displayed tick rather
 * than inside the engine loop, where reading statistics would pull a full-world snapshot on every tick.
 */
function evaluateProgress(tick: number) {
  const alreadyCompleted = new Set(goalsStore.completedGoals.map(goal => goal.goal.id));
  goalsStore.evaluateGoals(tick).forEach(result => {
    if (result.completed && !alreadyCompleted.has(result.goal.id)) rewardGoal(result.goal.title);
  });
  if (engine.value) reportSite(engine.value);
  tutorialStore.triggerByTick(tick);
}

/** A completed goal sends seed of a species the map lacks. */
function rewardGoal(title: string) {
  const species = engine.value && rewardSpecies(engine.value.readChunks().values(), interventionStore.seeds);
  if (!species) return;
  interventionStore.addSeeds({ [species]: REWARD_SEEDS });
  notify('icon-plants', `${title} done: ${REWARD_SEEDS} ${speciesInfo(species).name} seeds arrive.`);
}

function updateOnce() {
  if (!engine.value || showYearEndModal.value || runtimeError.value) return;

  // Rust owns the full ecology schedule. Vue only observes the completed tick.
  engine.value.update();
  refreshView();
}

/** Bring the screen, goals, knowledge and history up to the engine's latest tick. */
function refreshView() {
  if (!engine.value) return;
  announce(knowledgeStore.observe(engine.value));
  evaluateProgress(engine.value.getCurrentTick());
  const chunks = engine.value.readChunks();
  updateStats();
  detectSpeciesChanges(chunks);
  detectWeatherEvents();
  captureHistory(stats.currentTick);
  // Auto save
  if (
    persist.autoSave &&
    db &&
    stats.currentTick % Math.max(1, persist.interval) === 0
  ) {
    saveSnapshot();
  }
}

function updateStats() {
  if (!engine.value) return;
  const s = engine.value.getStatistics();
  stats.currentTick = s.currentTick;
  stats.activeChunks = s.activeChunks;
  stats.totalChunks = s.totalChunks;
  stats.totalSpecies = s.totalSpecies;
  stats.avgVitality = s.avgVitality;
  stats.avgPollution = s.avgPollution;
  (stats as any).seasonName = s.seasonName;
  (stats as any).seasonProgress = s.seasonProgress;
  (stats as any).dayFraction = s.dayFraction;
  (stats as any).simDays = (s as any).simDays ?? 0;
  
  // Update year progress
  updateYearProgress();

  if (stats.currentTick >= extinctionGraceUntilTick) {
    const hasViableSeeds = Array.from(engine.value.readChunks().values()).some(chunk =>
      chunk.seedBank.some(seed => seed.viability > 0)
    );
    if (stats.totalSpecies <= 0 && !hasViableSeeds) {
      if (!extinction.triggered && !extinction.acknowledged) {
        pause();
        const seasonTicks = (engine.value.getConfig().seasonLengthTicks ?? 90) * 1440 / (engine.value.getConfig().timePerTickMinutes ?? 1440);
        Object.assign(extinction, {
          triggered: true,
          sinceTick: stats.currentTick,
          causes: explainShift(engine.value.getEventJournal().getAllEvents(), stats.currentTick - seasonTicks, id => speciesInfo(id).name),
        });
        pushEvent('The land has emptied: an ecosystem shift.');
      }
    } else {
      extinction.triggered = false;
      extinction.acknowledged = false;
    }
  }
}

function captureHistory(tick: number) {
  if (!engine.value || historyConfig.captureEvery <= 0) return;
  if (tick % historyConfig.captureEvery !== 0) return;

  const frame: HistoryFrame = {
    tick,
    capturedAt: new Date().toISOString(),
    grid: chunkGrid.value.map((chunk: any) => snapshotChunk(chunk)),
  };

  const viewingLatest = selectedHistoryIndex.value !== -1 && selectedHistoryIndex.value === historyFrames.value.length - 1;
  historyFrames.value.push(frame);
  if (historyFrames.value.length > historyConfig.maxFrames) {
    historyFrames.value.shift();
    if (selectedHistoryIndex.value !== -1) {
      selectedHistoryIndex.value = Math.max(0, selectedHistoryIndex.value - 1);
    }
  }
  if (selectedHistoryIndex.value !== -1) {
    if (!historyFrames.value.length) {
      selectedHistoryIndex.value = -1;
    } else if (viewingLatest) {
      selectedHistoryIndex.value = historyFrames.value.length - 1;
    } else {
      selectedHistoryIndex.value = Math.min(selectedHistoryIndex.value, historyFrames.value.length - 1);
    }
  }
}

function snapshotChunk(chunk: any) {
  const biomeState = chunk?.biomeState ? { ...chunk.biomeState } : {};
  const birds = (chunk as any).birds ? { ...((chunk as any).birds as Record<string, number>) } : undefined;
  const speciesLabel = makeSpeciesLabel(chunk);
  const base: any = {
    id: chunk.id,
    x: chunk.x,
    y: chunk.y,
    biomeState,
    pollinatorDensity: (chunk as any).pollinatorDensity ?? 0,
    birdsActivity: (chunk as any).birdsActivity ?? 0,
    seedBankCount: ((chunk as any).seedBank?.length) || 0,
  };
  if (birds) base.birds = birds;
  if (speciesLabel) base.speciesLabel = speciesLabel;
  return base;
}

function makeSpeciesLabel(chunk: any): string | undefined {
  try {
    const reg = SpeciesRegistry.getInstance();
    const speciesMap: Map<string, any[]> | undefined = chunk.species as Map<string, any[]> | undefined;
    if (!speciesMap || speciesMap.size === 0) return undefined;
    const counts = new Map<string, number>();
    speciesMap.forEach((instances, sid) => {
      counts.set(sid, (counts.get(sid) || 0) + (instances?.length || 0));
    });
    if (!counts.size) return undefined;
    const labels = Array.from(counts.keys())
      .slice(0, 3)
      .map((id) => abbreviate(reg.getSpecies(id)?.name || id));
    return `${labels.join(',')} (${counts.size})`;
  } catch {
    return undefined;
  }
}

function abbreviate(name: string): string {
  if (!name) return '';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const clean = name.replace(/[^a-zA-Z]/g, '');
  return clean.slice(0, 3).toUpperCase();
}


function pushEvent(msg: string) {
  const entry: SimulationEventEntry = {
    id: ++eventCounter,
    message: msg,
    timeLabel: `T${stats.currentTick}`,
    tick: stats.currentTick,
  };
  events.value.push(entry);
  if (events.value.length > 200) {
    events.value.splice(0, events.value.length - 200);
  }
}

function start() {
  if (!engine.value || isInitializing.value || showYearEndModal.value || extinction.triggered || runtimeError.value) return;
  loop.start();
  isRunning.value = true;
}

function pause() {
  loop.pause();
  isRunning.value = false;
}

function stepOnce() {
  if (!engine.value || isInitializing.value || showYearEndModal.value || extinction.triggered || runtimeError.value) return;
  loop.step();
}

function onSelectChunk(payload: { x: number; y: number }) {
  selected.value = payload;
  const armed = interventionStore.selectedIntervention;
  // Planting waits for "Plant here" on the hex card, after the player has seen how the seed would fare.
  if (armed && armed !== 'plant') {
    applyIntervention(armed, payload);
    return;
  }
  const chunk = engine.value?.readChunk(payload.x, payload.y);
  if (chunk) {
    selectedChunkForInspection.value = chunk;
    // Nouveau map shows an inline card; the full modal opens on demand.
    showChunkInspector.value = viewMode.value === 'contemplative';
  }
}

const INTERVENTION_ICONS: Partial<Record<InterventionType, string>> = { plant: 'icon-plants', collect: 'icon-plants', cross: 'icon-modify', irrigate: 'icon-moisture', cleanse: 'icon-clean' };

function applyIntervention(type: InterventionType, at: { x: number; y: number }, data?: Record<string, string>) {
  if (!engine.value) return;
  const success = interventionStore.executeIntervention({
    chunkId: `chunk_${at.x}_${at.y}`,
    x: 0.5,
    y: 0.5,
    type,
    data: data ?? (type === 'plant' ? { speciesId: interventionStore.selectedPlantSpecies } : {}),
  });
  notify(success ? INTERVENTION_ICONS[type] ?? 'icon-leaf' : 'icon-observe', interventionStore.actionMessage);
  if (success) {
    updateStats();
    detectSpeciesChanges(engine.value.readChunks());
  }
}

function applyToSelected(type: InterventionType, data?: Record<string, string>) {
  if (selected.value) applyIntervention(type, selected.value, data);
}

// Hand pollination between two species flowering in the selected hex.
const crossing = ref(false);
const crossReceiver = ref('');
const crossDonor = ref('');
const flowering = computed(() => hexStory.value?.plants.filter(plant => plant.activity === 'flowering') ?? []);
const crossProblem = computed(() => {
  const registry = SpeciesRegistry.getInstance();
  return crossBarrier(registry.getSpecies(crossReceiver.value), registry.getSpecies(crossDonor.value));
});
function startCross() {
  const [first, second] = flowering.value;
  crossReceiver.value = first.id;
  crossDonor.value = second.id;
  crossing.value = true;
}
function crossPollinate() {
  applyToSelected('cross', { receiver: crossReceiver.value, donor: crossDonor.value });
  crossing.value = false;
}
watch(selected, () => { crossing.value = false; });

// Handler for tutorial
function startTutorial() {
  tutorialStore.startTutorial();
}

function skipTutorial() {
  tutorialStore.skipTutorial();
}

// Handler for applying intervention from inspector
function applyInterventionFromInspector(action: string) {
  if (!selectedChunkForInspection.value) return;

  interventionStore.selectIntervention(action as any);
  showChunkInspector.value = false;
}

async function saveSnapshot() {
  if (!engine.value || isSaving.value) return;
  if (!db) {
    saveNotice.value = 'Saving is unavailable in this browser.';
    return;
  }
  isSaving.value = true;
  const tick = engine.value.getCurrentTick();
  try {
    // Store data only: Vue proxies and goal evaluator functions cannot be cloned by IndexedDB.
    const state = JSON.parse(JSON.stringify({
      format: 'ecosim-game-v2',
      engine: engine.value.exportState(),
      knowledge: knowledgeStore.exportState(),
      interventions: interventionStore.exportState(),
      goals: goalsStore.exportState(),
      tutorial: tutorialStore.exportState(),
      gameplay: { ...gameplay },
      options: { ...options },
      yearEnd: { show: showYearEndModal.value, completedYear: completedYear.value, resume: resumeAfterYearEnd },
      extinctionGraceUntilTick,
    }));
    const id = await db.saveSnapshot({ siteId: profile.currentSite, createdAt: Date.now(), tick, state });
    profile.save();
    persist.lastSavedTick = tick;
    saveNotice.value = `Ecosystem saved at day ${tick}.`;
    pushEvent(`💾 Saved snapshot #${id} @ tick ${tick}`);
  } catch (error) {
    saveNotice.value = 'The ecosystem could not be saved. Check available browser storage and try again.';
    console.error('Snapshot save failed:', error);
  } finally {
    isSaving.value = false;
  }
}

async function loadLatestSnapshot() {
  if (!engine.value || isLoadingSnapshot.value) return;
  if (!db) {
    saveNotice.value = 'Saved ecosystems are unavailable in this browser.';
    return;
  }
  pause();
  isLoadingSnapshot.value = true;
  try {
    const snap = await db.loadLatest(profile.currentSite);
    if (!snap) {
      saveNotice.value = 'No saved ecosystem yet. Use Save to create one.';
      return;
    }
    applySnapshot(snap);
    saveNotice.value = `Ecosystem loaded at day ${snap.tick}. Press Play when ready.`;
  } catch (error) {
    saveNotice.value = 'The saved ecosystem could not be loaded. Your simulation is paused.';
    console.error('Snapshot load failed:', error);
  } finally {
    isLoadingSnapshot.value = false;
  }
}

/** Replace the world with a saved one of the current site. The Codex is the player's and is not rolled back. */
function applySnapshot(snap: SimSnapshot) {
  if (!engine.value) return;
  const legacy = snap.state?.format !== 'ecosim-game-v2';
  const state = snap.state;
  engine.value.importState(legacy ? state : state.engine);
  knowledgeStore.followWorld(engine.value);
  if (legacy) {
    interventionStore.reset();
    interventionStore.initialize(engine.value);
    goalsStore.reset();
    goalsStore.initialize(engine.value, gameplay.difficulty, () => knowledgeStore.summary);
  } else {
    interventionStore.importState(state.interventions);
    goalsStore.importState(state.goals);
    tutorialStore.importState(state.tutorial);
    Object.assign(gameplay, state.gameplay);
    applySavedOptions(state.options);
  }
  const config = engine.value.getConfig();
  width.value = options.worldWidth = config.worldWidth;
  height.value = options.worldHeight = config.worldHeight;
  showYearEndModal.value = legacy ? false : state.yearEnd.show;
  completedYear.value = legacy ? engine.value.getCurrentYear() : state.yearEnd.completedYear;
  resumeAfterYearEnd = legacy ? false : state.yearEnd.resume;
  extinctionGraceUntilTick = legacy ? engine.value.getCurrentTick() + 50 : state.extinctionGraceUntilTick;
  extinction.triggered = extinction.acknowledged = false;
  runtimeError.value = null;
  showChunkInspector.value = false;
  selectedChunkForInspection.value = null;
  selected.value = null;
  historyFrames.value = [];
  selectedHistoryIndex.value = -1;
  events.value = [];
  seenWeather.clear();
  updateStats();
  initSpeciesSnapshot(engine.value.readChunks());
  captureHistory(stats.currentTick);
  pushEvent(`📥 Loaded snapshot #${snap.id} @ tick ${snap.tick}`);
}

/** Move to another site: save this one, carry the pouch, and resume the target where it was left or found it. */
async function travel(siteId: string) {
  if (!engine.value || siteId === profile.currentSite) return;
  showSites.value = false;
  pause();
  await saveSnapshot();
  const pouch = engine.value.exportPouch();
  profile.currentSite = siteId;
  const snap = db ? await db.loadLatest(siteId) : null;
  if (snap) {
    applySnapshot(snap);
    interventionStore.carryPouch(pouch);
    profile.arrive(siteId);
  } else {
    initializeWorld(pouch);
  }
  // Saved on arrival too, so the site's latest save holds the pouch the player carried in.
  await saveSnapshot();
  notify('icon-observe', `You arrive at ${profile.site.name}.`);
}

/** Survey the site each displayed tick and tell the player when it reaches a stage. */
function reportSite(sim: SimulationEngine) {
  const config = sim.getConfig();
  const seasonIndex = Math.floor(sim.getCurrentTick() * (config.timePerTickMinutes ?? 1440) / 1440 / (config.seasonLengthTicks ?? 90));
  const season = (['spring', 'summer', 'autumn', 'winter'] as const)[seasonIndex % 4];
  announce(knowledgeStore.investigate(profile.currentSite, { season, chunks: sim.readChunks().values() }, sim.getCurrentTick()));
  const news = profile.update(surveySite(sim.readChunks().values()), seasonIndex);
  if (!news.reached) return;
  const text = news.restored ? `${profile.site.name} is restored.` : `${profile.site.name} has reached a new stage: ${news.reached}.`;
  notify('icon-diversity', text);
  pushEvent(text);
  if (news.unlocked) notify('icon-observe', `${siteById(news.unlocked)?.name} is open to you.`);
  profile.save();
}

const nextStageGoal = computed(() => {
  const stage = STAGES[profile.siteProgress.stage + 1];
  const sim = engine.value;
  if (!stage || !sim) return null;
  void stats.currentTick; // re-evaluate as the world changes
  return stage.goal(surveySite(sim.readChunks().values()), profile.site.targets, profile.siteProgress);
});

// Year-end seed selection functions
function onYearEnd(year: number) {
  resumeAfterYearEnd = isRunning.value;
  completedYear.value = year;
  showYearEndModal.value = true;
  // Pause simulation for seed selection
  if (isRunning.value) {
    pause();
  }
}

function onYearEndConfirm(seedInstanceId: string | null) {
  engine.value?.commitYearEndSelections();
  showYearEndModal.value = false;
  
  // Show notification
  const message = seedInstanceId 
    ? `✅ Selected specimen for Year ${completedYear.value + 1}` 
    : `⏭️ Using default genetics for Year ${completedYear.value + 1}`;
  pushEvent(message);
  
  // Resume simulation
  if (resumeAfterYearEnd) {
    start();
  }
}

function updateYearProgress() {
  if (engine.value?.getCurrentYear && engine.value?.getYearProgress) {
    currentYear.value = engine.value.getCurrentYear();
    yearProgress.value = engine.value.getYearProgress();
  }
}

function toggleRunState() {
  if (isRunning.value) {
    pause();
  } else {
    start();
  }
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'contemplative' ? 'analytical' : 'contemplative';
  saveViewModePreference();
}

function decreaseSpeed() {
  const speeds = [10, 50, 100, 200, 500, 1000];
  options.tickMs = speeds.find(speed => speed > options.tickMs) ?? speeds[speeds.length - 1];
}

function increaseSpeed() {
  const speeds = [10, 50, 100, 200, 500, 1000];
  options.tickMs = [...speeds].reverse().find(speed => speed < options.tickMs) ?? speeds[0];
}

// ---- Nouveau UI state ----
const dockTab = ref('overview');
const showAllEvents = ref(false);
const showAllGoals = ref(false);
const eventsCard = ref<HTMLElement | null>(null);
const scenarioCard = ref<HTMLElement | null>(null);

const seasonIndex = computed(() =>
  Math.max(0, ['spring', 'summer', 'autumn', 'winter'].indexOf(String((stats as any).seasonName ?? 'spring').toLowerCase()))
);
const seasonLabel = computed(() => {
  const raw = String((stats as any).seasonName ?? 'Spring');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
});
const simDays = computed(() => Math.floor((stats as any).simDays ?? stats.currentTick));
const cleanliness = computed(() => Math.max(0, Math.min(1, 1 - (stats.avgPollution || 0))));

// ---- Codex and discoveries ----
const showCodex = ref(false);
const codexTab = ref<CodexTab>('plant');
function openCodex(tab: CodexTab) {
  codexTab.value = tab;
  showCodex.value = true;
}
const toasts = ref<Array<{ id: number; icon: string; text: string }>>([]);
let toastId = 0;
// A few at a time: a burst of discoveries (e.g. after a Season) shouldn't bury the map.
const MAX_TOASTS = 3;
const TOAST_MS = 4500;

function notify(icon: string, text: string) {
  const toast = { id: ++toastId, icon, text };
  toasts.value = [...toasts.value, toast].slice(-MAX_TOASTS);
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== toast.id); }, TOAST_MS);
}

function announce(found: Discovery[]) {
  for (const discovery of found.slice(0, MAX_TOASTS)) {
    if (discovery.kind === 'species') notify('icon-observe', `New in your Codex: ${speciesInfo(discovery.id).name}`);
    else if (discovery.kind === 'interaction') notify('icon-diversity', `New interaction: ${speciesInfo(discovery.animal).name} ↔ ${speciesInfo(discovery.plant).name}`);
    else {
      const mystery = MYSTERIES.find(m => m.id === discovery.id);
      notify('icon-journal', discovery.solved ? 'A mystery is solved. The Codex explains.' : `A mystery: ${mystery?.question}`);
      if (discovery.solved) profile.save();
    }
  }
}

// ---- Advancing time ----
const advancing = ref<null | 'week' | 'season'>(null);
const digest = ref<null | { title: string; lines: DigestLine[] }>(null);
const timeBlocked = computed(() => !!advancing.value || showYearEndModal.value || extinction.triggered || !!runtimeError.value);
const DIGEST_ICONS: Record<DigestLine['icon'], string> = {
  season: 'icon-leaf',
  sighting: 'icon-observe',
  arrival: 'icon-pollinators',
  interaction: 'icon-diversity',
  corridor: 'icon-restore',
  flower: 'icon-plants',
  seed: 'icon-diversity',
  spread: 'icon-vitality',
  decline: 'icon-observe',
  lost: 'icon-observe',
  weather: 'icon-moisture',
  more: 'icon-journal',
};
// Ticks advanced per animation frame, so a week or season plays out as a short time-lapse.
const TICKS_PER_FRAME = { week: 2, season: 6 } as const;

function populationBySpecies(): Map<string, number> {
  const counts = new Map<string, number>();
  engine.value?.readChunks().forEach(chunk => chunk.species.forEach(plant => counts.set(plant.speciesId, (counts.get(plant.speciesId) ?? 0) + 1)));
  return counts;
}

/** Advance a week, or to the first day of the next season, as a time-lapse, then summarise what changed. */
function advanceTime(span: 'week' | 'season') {
  const sim = engine.value;
  if (!sim || timeBlocked.value) return;
  pause();
  const seasonDays = sim.getConfig().seasonLengthTicks ?? 90;
  const day = Math.floor(stats.simDays);
  const days = span === 'week' ? 7 : seasonDays - (day % seasonDays);
  const ticksPerDay = 1440 / (sim.getConfig().timePerTickMinutes ?? 1440);
  const startTick = sim.getCurrentTick();
  const targetTick = startTick + days * ticksPerDay;
  const before = { season: stats.seasonName, population: populationBySpecies(), interactions: new Set(Object.keys(knowledgeStore.knowledge.interactions)) };
  advancing.value = span;

  const frame = () => {
    for (let i = 0; i < TICKS_PER_FRAME[span] && sim.getCurrentTick() < targetTick && !showYearEndModal.value && !runtimeError.value; i++) {
      sim.update();
    }
    refreshView();
    if (sim.getCurrentTick() < targetTick && !showYearEndModal.value && !runtimeError.value) {
      requestAnimationFrame(frame);
      return;
    }
    advancing.value = null;
    digest.value = {
      title: span === 'week' ? 'A week passes' : `${seasonLabel.value} arrives`,
      lines: buildDigest({
        events: sim.getEventJournal().getAllEvents().filter(event => event.tick > startTick),
        seasonBefore: before.season,
        seasonAfter: stats.seasonName,
        populationBefore: before.population,
        populationAfter: populationBySpecies(),
        nameOf: id => speciesInfo(id).name,
        knownInteractions: before.interactions,
      }),
    };
  };
  requestAnimationFrame(frame);
}

function acknowledgeShift() {
  extinction.triggered = false;
  extinction.acknowledged = true;
}

function inspectShift(chunkId: string) {
  acknowledgeShift();
  inspectDigestLine(chunkId);
}

function inspectDigestLine(chunkId: string) {
  const [, x, y] = chunkId.split('_').map(Number);
  digest.value = null;
  onSelectChunk({ x, y });
}

const workflowSteps = [
  { title: 'Observe', text: 'Explore the world and analyze patterns.', icon: 'icon-observe' },
  { title: 'Hypothesize', text: 'Plan interventions and set goals.', icon: 'icon-hypothesize' },
  { title: 'Test', text: 'Apply changes and watch the results.', icon: 'icon-test' },
];
// Selecting a hex means the player is forming a plan; arming an intervention means they are testing it.
const activeStep = computed(() => (interventionStore.selectedIntervention ? 2 : selected.value ? 1 : 0));

const overlayOptions: Array<{ id: VizMode; label: string; icon: string }> = [
  { id: 'vitality', label: 'Vitality', icon: 'icon-vitality' },
  { id: 'moisture', label: 'Moisture', icon: 'icon-moisture' },
  { id: 'pollution', label: 'Pollution', icon: 'icon-pollution' },
  { id: 'temperature', label: 'Temperature', icon: 'icon-temperature' },
  { id: 'diversity', label: 'Diversity', icon: 'icon-diversity' },
  { id: 'species', label: 'Species', icon: 'icon-species' },
];

const interventionActions = [
  { id: 'plant' as const, label: 'Plant', icon: 'icon-plants', hint: 'Plant the selected species in a hex' },
  { id: 'irrigate' as const, label: 'Restore', icon: 'icon-restore', hint: 'Restore water to a hex' },
  { id: 'cleanse' as const, label: 'Clean', icon: 'icon-clean', hint: 'Cleanse pollution from a hex' },
];

interface StatRow { label: string; icon: string; value: string | number; bar?: number; barClass?: string }

function eventIcon(message: string): string {
  if (/rain|water|drought|moist/i.test(message)) return 'icon-moisture';
  if (/bird/i.test(message)) return 'icon-birds';
  if (/pollinat|bee/i.test(message)) return 'icon-pollinators';
  if (/pollut|died|death|collapse|extinct/i.test(message)) return 'icon-pollution';
  return 'icon-leaf';
}

// Measurements (soil, water, pollution readings and overlays) stay out of the way until asked for.
const showMeasurements = ref(false);
function toggleMeasurements() {
  showMeasurements.value = !showMeasurements.value;
  if (!showMeasurements.value) options.vizMode = 'rgb';
}

function setOverlay(mode: VizMode) {
  options.vizMode = options.vizMode === mode ? 'rgb' : mode;
}

function toggleIntervention(type: (typeof interventionActions)[number]['id']) {
  interventionStore.selectIntervention(interventionStore.selectedIntervention === type ? null : type);
}

function onScrubHistory(index: number) {
  selectedHistoryIndex.value = Math.max(-1, Math.min(historyFrames.value.length - 1, index));
}

function onDockSelect(key: string) {
  dockTab.value = key;
  if (key === 'overview') options.vizMode = 'rgb';
  else if (key === 'species') openCodex('plant');
  else if (key === 'climate') options.vizMode = 'temperature';
  else if (key === 'hydro') options.vizMode = 'moisture';
  else if (key === 'interactions') openCodex('interaction');
  else if (key === 'goals') scenarioCard.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  else if (key === 'events') eventsCard.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  else if (key === 'settings') options.showLabels = !options.showLabels;
}

function fmt01(value: number | undefined): string {
  if (!Number.isFinite(value)) return '—';
  return (value as number).toFixed(2);
}

// Engine messages lead with an emoji; the kit icon from eventIcon() replaces it here.
const recentEvents = computed(() => {
  const list = showAllEvents.value ? events.value.slice(-12) : events.value.slice(-5);
  return list.map((event) => ({ ...event, message: event.message.replace(/^[^\p{L}\p{N}]+/u, '') })).reverse();
});

const scenarioGoals = computed(() => {
  const list = goalsStore.activeGoals;
  return showAllGoals.value ? list : list.slice(0, 4);
});

function formatGoalValue(goal: { goal: { category: string; targetValue: number }; currentValue: number }): string {
  const pct = goal.goal.category === 'ecosystem_health' || goal.goal.category === 'pollution';
  const cur = pct ? `${Math.round(goal.currentValue * 100)}%` : `${Math.round(goal.currentValue)}`;
  const tgt = pct ? `${Math.round(goal.goal.targetValue * 100)}%` : `${Math.round(goal.goal.targetValue)}`;
  return `${cur} / ${tgt}`;
}

// What lives on the map now: kinds of plants and animals, and how many plants.
const life = computed(() => {
  const plants = new Set<string>(), birds = new Set<string>(), pollinators = new Set<string>();
  let plantCount = 0;
  for (const chunk of chunkGrid.value as any[]) {
    chunk.species?.forEach((plant: { speciesId: string }) => { plants.add(plant.speciesId); plantCount += 1; });
    for (const [id, count] of Object.entries((chunk.fauna ?? {}) as Record<string, number>)) {
      if (count >= 1) (speciesInfo(id).kind === 'bird' ? birds : pollinators).add(id);
    }
  }
  return { plantKinds: plants.size, plantCount, birdKinds: birds.size, pollinatorKinds: pollinators.size };
});


const tooltipChunk = computed(() => selectedChunkForInspection.value as any | null);
const hexStory = computed(() => (tooltipChunk.value ? describeHex(tooltipChunk.value) : null));
const ACTIVITY_WORDS: Record<PlantActivity, string> = { flowering: 'in flower', fruiting: 'fruiting', dormant: 'resting', growing: 'growing' };
const ACTIVITY_ICONS: Record<PlantActivity, string> = { flowering: 'icon-plants', fruiting: 'icon-diversity', dormant: 'icon-leaf', growing: 'icon-vitality' };

/** Measurements shown with the lens on; plants and animals are in the description above them. */
const tooltipRows = computed<StatRow[]>(() => {
  const chunk = tooltipChunk.value;
  const { vitality = 0, moisture = 0, pollution = 0 } = chunk?.biomeState ?? {};
  const temperature = chunk?.climateState?.temperature;
  return [
    { label: 'Vitality', icon: 'icon-vitality', value: fmt01(vitality), bar: vitality, barClass: 'nv-bar-leaf' },
    { label: 'Moisture', icon: 'icon-moisture', value: fmt01(moisture), bar: moisture, barClass: 'nv-bar-water' },
    { label: 'Pollution', icon: 'icon-pollution', value: fmt01(pollution), bar: pollution, barClass: 'nv-bar-stone' },
    Number.isFinite(temperature)
      ? { label: 'Temperature', icon: 'icon-temperature', value: `${Math.round(temperature)}°C`, bar: Math.max(0, Math.min(1, temperature / 35)), barClass: 'nv-bar-gold' }
      : { label: 'Temperature', icon: 'icon-temperature', value: '—' },
  ];
});

const overviewRows = computed<StatRow[]>(() => [
  { label: 'Vitality', icon: 'icon-vitality', value: fmt01(stats.avgVitality), bar: stats.avgVitality, barClass: 'nv-bar-leaf' },
  { label: 'Cleanliness', icon: 'icon-moisture', value: fmt01(cleanliness.value), bar: cleanliness.value, barClass: 'nv-bar-water' },
  { label: 'Plant species', icon: 'icon-species', value: life.value.plantKinds },
  { label: 'Plants', icon: 'icon-plants', value: life.value.plantCount },
  { label: 'Bird species', icon: 'icon-birds', value: life.value.birdKinds },
  { label: 'Pollinator species', icon: 'icon-pollinators', value: life.value.pollinatorKinds },
]);
const pouch = computed(() =>
  Object.entries(interventionStore.seeds).map(([id, count]) => ({ id, count, name: knowledgeStore.knowledge.names[id] ?? speciesInfo(id).name }))
);
// With Plant armed, the selected hex says how the chosen seed would fare before anything is spent.
const plantFit = computed(() => {
  const species = SpeciesRegistry.getInstance().getSpecies(interventionStore.selectedPlantSpecies);
  return interventionStore.selectedIntervention === 'plant' && species && tooltipChunk.value ? habitatFit(species, tooltipChunk.value) : null;
});

function clearSelection() {
  selected.value = null;
  selectedChunkForInspection.value = null;
  showChunkInspector.value = false;
}

function saveViewModePreference() {
  try {
    localStorage.setItem('ecosim-view-mode', viewMode.value);
  } catch {}
}

function loadViewModePreference() {
  try {
    const saved = localStorage.getItem('ecosim-view-mode');
    if (saved === 'contemplative' || saved === 'analytical') {
      viewMode.value = saved;
    }
  } catch {}
}

async function restart() {
  pause();
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  await init();
}

function initSpeciesSnapshot(chunks: ReadonlyMap<string, any>) {
  prevSpecies.clear();
  chunks.forEach((chunk, id) => {
    const m = new Map<string, string>();
    (chunk.species as Map<string, any>).forEach((inst, sid) => {
      m.set(sid, inst.speciesId);
    });
    prevSpecies.set(id, m);
  });
}

function detectSpeciesChanges(chunks: ReadonlyMap<string, any>) {
  const reg = SpeciesRegistry.getInstance();
  chunks.forEach((chunk, id) => {
    const oldMap = prevSpecies.get(id) || new Map<string, string>();
    const currentMap = new Map<string, string>();
    (chunk.species as Map<string, any>).forEach((inst, sid) =>
      currentMap.set(sid, inst.speciesId)
    );

    // births
    currentMap.forEach((spId, sid) => {
      if (!oldMap.has(sid)) {
        const name = reg.getSpecies(spId)?.name || spId;
        // Check if this is a hybrid (species ID starts with 'hybrid_')
        if (spId.startsWith('hybrid_')) {
          pushEvent(`🧬 Hybrid ${name} sprouted in chunk (${chunk.x},${chunk.y})`);
        } else {
          pushEvent(`🆕 ${name} spawned in chunk (${chunk.x},${chunk.y})`);
        }
      }
    });

    // deaths
    oldMap.forEach((spId, sid) => {
      if (!currentMap.has(sid)) {
        const name = reg.getSpecies(spId)?.name || spId;
        pushEvent(`☠️ ${name} died in chunk (${chunk.x},${chunk.y})`);
      }
    });

    prevSpecies.set(id, currentMap);
  });
}

function detectWeatherEvents() {
  if (!engine.value) return;
  const list = engine.value.getActiveWeatherEvents();
  list.forEach((ev) => {
    const key = `${ev.type}-${ev.centerX}-${ev.centerY}-${ev.startTick}`;
    if (!seenWeather.has(key)) {
      seenWeather.add(key);
      const emoji =
        ev.type === "storm"
          ? "⛈️"
          : ev.type === "drought"
          ? "☀️"
          : ev.type === "heat_wave"
          ? "🔥"
          : ev.type === "cold_snap"
          ? "❄️"
          : ev.type === "wind_storm"
          ? "🌬️"
          : ev.type === "fog"
          ? "🌫️"
          : "⛅";
      pushEvent(
        `${emoji} ${ev.type.replace(/_/g, " ")} near (${ev.centerX},${
          ev.centerY
        })`
      );
    }
  });
}

// Persist options to localStorage
const STORAGE_KEY = "simOptionsV1";
function loadOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    applySavedOptions(saved);
  } catch {}
}

function applySavedOptions(saved: Partial<typeof options> | null) {
  if (!saved || typeof saved !== 'object') return;
  for (const dimension of ['worldWidth', 'worldHeight'] as const) {
    const value = Number(saved[dimension]);
    if (Number.isInteger(value) && value >= 1 && value <= 20) options[dimension] = value;
  }
  const tickMs = Number(saved.tickMs);
  if (Number.isFinite(tickMs)) options.tickMs = Math.max(10, Math.min(1000, tickMs));
  if (typeof saved.showLabels === 'boolean') options.showLabels = saved.showLabels;
}

watch(() => options.tickMs, value => loop.setStepMs(value), { flush: 'sync' });

function onVisibilityChange() {
  loop.setSuspended(document.hidden);
}

watch(
  options,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch {}
  },
  { deep: true }
);

// Expose methods for parent components
defineExpose({
  getSimulationStats: () => ({
    currentTick: stats.currentTick,
    activeChunks: stats.activeChunks,
    totalChunks: stats.totalChunks,
    totalSpecies: stats.totalSpecies,
    avgVitality: stats.avgVitality,
    avgPollution: stats.avgPollution,
    biodiversity: stats.totalSpecies / Math.max(1, stats.activeChunks),
    ecosystemHealth: Math.max(0, stats.avgVitality - stats.avgPollution)
  }),
  getEngine: () => engine.value,
  step: stepOnce,
  pause,
  play: start,
  executeIntervention: (intervention: any) => engine.value?.executeIntervention(intervention)
});

onMounted(() => {
  loadOptions();
  loadViewModePreference();
  profile.load();
  // Ensure grid reflects saved/current world size before creating engine
  width.value = options.worldWidth;
  height.value = options.worldHeight;
  document.addEventListener('visibilitychange', onVisibilityChange);
  void init();
});

onBeforeUnmount(() => {
  unmounted = true;
  initializationVersion += 1;
  pause();
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<style scoped>
.contemplative-canvas {
  background: linear-gradient(to bottom, #2c3e50 0%, #4a5568 50%, #6b7280 100%);
  transition: background 1200ms ease;
}

/* Smooth view mode transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 600ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
