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
        :blocked="extinction.triggered || !!runtimeError"
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
              <select id="nv-plant-species" v-model="pouchChoice" class="nv-btn mt-0.5 w-full">
                <option v-for="seed in pouch" :key="seed.key" :value="seed.key">{{ seed.label }}</option>
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
              :trace="trace"
              :flight="followFlight"
              :season-name="(stats as any).seasonName ?? 'Spring'"
              tessellated
              @select="onSelectChunk"
            />
          </div>

          <div v-if="follow.active.value" class="nv-panel-dark absolute left-3 top-3 max-w-xs p-3 sm:left-5 sm:top-5" role="status">
            <p class="font-bold">Following the {{ speciesInfo(follow.animal.value!).name }}</p>
            <p class="nv-small">{{ follow.landing.value ? 'Where did it land? Pick the hex.' : 'Watch where it flies…' }} ({{ follow.hops.value }} of {{ HOPS }})</p>
            <button type="button" class="nv-link nv-small mt-1" @click="follow.cancel()">Stop following</button>
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
                  <button v-if="untaggedOf(plant.id)" type="button" class="nv-link ml-1" :title="`Tag the oldest ${plant.name} here and follow it in the Journal`" @click="tagOldest(plant.id)">Tag</button>
                  <button type="button" class="nv-link ml-1" :title="`Photograph ${plant.name}`" @click="takePhoto(plant.id)">Photo</button>
                </span>
              </li>
            </ul>
            <h4 v-if="hexStory.animals.length" class="nv-small mt-2 uppercase tracking-[0.15em] opacity-70">Animals</h4>
            <ul class="grid gap-0.5 text-sm">
              <li v-for="animal in hexStory.animals.slice(0, 4)" :key="animal.id" class="nv-tooltip-row">
                <span class="flex items-center gap-2"><img :src="nv(animal.group === 'bird' ? 'icon-birds' : 'icon-pollinators')" alt="" class="h-4 w-4 object-contain" />{{ animal.name }}</span>
                <span class="nv-small nv-nums opacity-80">
                  {{ animal.count }}
                  <button type="button" class="nv-link ml-1" :title="`Photograph ${animal.name}`" @click="takePhoto(animal.id)">Photo</button>
                  <button v-if="animal.group !== 'bird' && knowledgeStore.knowledge.species[animal.id]" type="button" class="nv-link ml-1" :title="`Follow ${animal.name} from flower to flower`" @click="startFollow(animal.id)">Follow</button>
                </span>
              </li>
            </ul>
            <div class="nv-small mt-2 border-t border-[#c9a227]/30 pt-2">
              <template v-if="hexSample">
                <p class="opacity-80">Sampled on day {{ hexSample.day }}<template v-if="hexSample.changed">; <span class="font-bold text-[#f0b48a]">changed since sampling</span></template></p>
                <dl class="nv-nums mt-0.5 grid gap-0.5">
                  <div v-for="row in hexSample.rows" :key="row.label" class="nv-tooltip-row">
                    <dt>{{ row.label }}</dt>
                    <dd>{{ row.value }}</dd>
                  </div>
                </dl>
                <p class="mt-0.5">{{ hexSample.tray }}</p>
              </template>
              <p v-if="traceText" class="mt-0.5">{{ traceText }}</p>
              <p class="mt-1 flex flex-wrap gap-x-3">
                <button type="button" class="nv-link" @click="applyToSelected('sample')">{{ hexSample ? 'Sample again' : 'Take a soil & water sample' }}</button>
                <button type="button" class="nv-link" @click="traceFromSelected">Trace the water</button>
                <button type="button" class="nv-link" @click="listenHere">Listen</button>
                <button type="button" class="nv-link" @click="noteHere">Note in calendar</button>
              </p>
            </div>
            <p v-if="plantFit" class="nv-small mt-2 border-t border-[#c9a227]/30 pt-2">
              {{ speciesInfo(interventionStore.selectedPlantSpecies).name }}: <span class="font-bold">{{ plantFit.words }}</span>
            </p>
            <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button type="button" class="nv-small underline opacity-80 hover:opacity-100" @click="clearSelection">Close</button>
              <button v-if="hexStory.plants.some(p => p.activity === 'flowering')" type="button" class="nv-btn" @click="showCross = true">Cross-pollinate</button>
              <button v-if="plantFit" type="button" class="nv-btn" @click="applyToSelected('plant')">Plant here</button>
              <button v-if="hexStory.plants.some(p => p.activity === 'fruiting')" type="button" class="nv-btn" @click="showCollect = true">Collect seeds</button>
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
                  <strong v-if="row.bar === undefined" class="min-w-[2.25rem] text-right text-base font-normal">{{ row.value }}</strong>
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
        <li v-for="toast in toasts" :key="toast.id" class="nv-panel nv-small text-[#2b2118] shadow-lg">
          <button v-if="toast.opens" type="button" class="pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-left" :title="toast.opens === 'journal' ? 'Open the Journal' : 'Open the Codex'" @click="openFromToast(toast.opens)">
            <img :src="nv(toast.icon)" alt="" class="h-5 w-5" />{{ toast.text }}
          </button>
          <span v-else class="flex items-center gap-2 px-3 py-1.5"><img :src="nv(toast.icon)" alt="" class="h-5 w-5" />{{ toast.text }}</span>
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

    <CodexPanel :show="showCodex" :start-tab="codexTab" @close="showCodex = false" />
    <div v-if="lastPhoto" class="sci-modal-overlay" @click.self="lastPhoto = null">
      <div class="sci-modal nv-ornate w-full max-w-sm" role="dialog" aria-label="Your photo">
        <PhotoCard :photo="lastPhoto" />
        <div class="mt-2 flex justify-end"><button type="button" class="nv-btn" @click="lastPhoto = null">Close</button></div>
      </div>
    </div>
    <CollectPanel :show="showCollect" :plants="hexPlants" :tags="hexTags" @close="showCollect = false" @collect="collectFrom" />
    <CrossPanel :show="showCross" :plants="hexPlants" :tags="hexTags" @close="showCross = false" @cross="crossFrom" />
    <JournalPanel :show="showJournal" :tick="stats.currentTick" @close="showJournal = false" @inspect="inspectFromJournal" />



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
import ChunkGrid from "@/components/simulation/ChunkGrid.vue";
import CodexPanel from "@/components/simulation/CodexPanel.vue";
import JournalPanel from "@/components/simulation/JournalPanel.vue";
import CollectPanel from "@/components/simulation/CollectPanel.vue";
import CrossPanel from "@/components/simulation/CrossPanel.vue";
import PhotoCard from "@/components/simulation/PhotoCard.vue";
import { useFollow, HOPS } from "@/composables/useFollow";
import { HABITAT_WORDS, SPRITE_ICON } from "@/components/simulation/habitatLook";
import type { Photo } from "@/game/knowledge";
import { deathNote } from "@/game/journal";
import type { CodexTab } from "@/game/codex";
import FloatingControls from "@/components/simulation/FloatingControls.vue";
import BottomDock from "@/components/simulation/BottomDock.vue";
import { nv } from "@/components/simulation/nouveauAssets";
import { buildDigest, type DigestLine } from "@/game/digest";
import { elevationOf, phOf, siteById, STAGES, surveySite } from "@/game/sites";
import { sampleReadings, traceWater, traceWords, trayWords, type Sample } from "@/game/fieldwork";
import { animalLabel, listen, photograph, visibleFirsts } from "@/game/watching";
import { habitatFit, pouchOptions, rewardSpecies, REWARD_SEEDS } from "@/game/seeds";
import { explainShift, type ShiftCause } from "@/game/shift";
import { MYSTERIES } from "@/game/mysteries";
import { describeRareEvent } from "@/game/rareEvents";
import { CAUSES, mostCommon } from "@/game/causes";
import { EventType } from "@/simulation/EventJournal";
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
    site: site.id,
  };
  engine.value = new SimulationEngine(config);
  engine.value.applyScenarioConditions({ biomeStates: site.conditions, elevation: elevationOf(site), ph: phOf(site), establishedSpecies: site.established, initialSpecies: site.established });

  historyFrames.value = [];
  selectedHistoryIndex.value = -1;

  // Activate all chunks for EcoSim view
  engine.value.activateAllChunks();

  events.value = [];
  eventCounter = 0;
  showChunkInspector.value = false;
  selectedChunkForInspection.value = null;
  selected.value = null;
  extinctionGraceUntilTick = 50;
  extinction.triggered = extinction.acknowledged = false;
  rareSeenUntil = -1;
  updateStats();
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
  if (!engine.value || runtimeError.value) return;

  // Rust owns the full ecology schedule. Vue only observes the completed tick.
  engine.value.update();
  refreshView();
}

/** Bring the screen, goals, knowledge and history up to the engine's latest tick. */
function refreshView() {
  if (!engine.value) return;
  announce(knowledgeStore.observe(engine.value));
  readJournal(engine.value);
  evaluateProgress(engine.value.getCurrentTick());
  updateStats();
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


function pushEvent(msg: string, tick = stats.currentTick) {
  const entry: SimulationEventEntry = {
    id: ++eventCounter,
    message: msg,
    timeLabel: `T${tick}`,
    tick,
  };
  events.value.push(entry);
  if (events.value.length > 200) {
    events.value.splice(0, events.value.length - 200);
  }
}

function start() {
  if (!engine.value || isInitializing.value || extinction.triggered || runtimeError.value) return;
  loop.start();
  isRunning.value = true;
}

function pause() {
  loop.pause();
  isRunning.value = false;
}

function stepOnce() {
  if (!engine.value || isInitializing.value || extinction.triggered || runtimeError.value) return;
  loop.step();
}

function onSelectChunk(payload: { x: number; y: number }) {
  if (follow.pick(payload)) return;
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

const INTERVENTION_ICONS: Partial<Record<InterventionType, string>> = { plant: 'icon-plants', collect: 'icon-plants', tag: 'icon-journal', sample: 'icon-moisture', cross: 'icon-modify', irrigate: 'icon-moisture', cleanse: 'icon-clean' };

function applyIntervention(type: InterventionType, at: { x: number; y: number }, data?: Record<string, unknown>) {
  if (!engine.value) return;
  const success = interventionStore.executeIntervention({
    chunkId: `chunk_${at.x}_${at.y}`,
    x: 0.5,
    y: 0.5,
    type,
    // The seed shown in the pouch list is the one sown, including the site it came from.
    data: data ?? (type === 'plant' ? { speciesId: interventionStore.selectedPlantSpecies, origin: pouch.value.find(o => o.key === pouchChoice.value)?.origin } : {}),
  });
  notify(success ? INTERVENTION_ICONS[type] ?? 'icon-leaf' : 'icon-observe', interventionStore.actionMessage);
  if (success) {
    updateStats();
    readJournal(engine.value);
  }
}

/** The oldest plant of a species in the selected hex that is not yet tagged, if any. */
function untaggedOf(speciesId: string): string | undefined {
  const tags = engine.value?.getTags() ?? {};
  let oldest: { id: string; age: number } | undefined;
  tooltipChunk.value?.species.forEach((plant: { id: string; speciesId: string; age: number }) => {
    if (plant.speciesId === speciesId && !tags[plant.id] && (!oldest || plant.age > oldest.age)) oldest = plant;
  });
  return oldest?.id;
}

function tagOldest(speciesId: string) {
  const instanceId = untaggedOf(speciesId);
  if (instanceId) applyToSelected('tag', { instanceId });
}

function applyToSelected(type: InterventionType, data?: Record<string, unknown>) {
  if (selected.value) applyIntervention(type, selected.value, data);
}

// Seed collecting and hand pollination, on plants the player picks in the selected hex.
const showCollect = ref(false);
const showCross = ref(false);
const hexPlants = computed(() => {
  const plants: any[] = [];
  if (showCollect.value || showCross.value) tooltipChunk.value?.species.forEach((plant: any) => plants.push(plant));
  return plants;
});
const hexTags = computed(() => ((showCollect.value || showCross.value) && engine.value ? engine.value.getTags() : {}));
function collectFrom(instanceIds: string[]) {
  showCollect.value = false;
  applyToSelected('collect', { instanceIds });
}
function crossFrom(data: Record<string, unknown>) {
  showCross.value = false;
  applyToSelected('cross', data);
}

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
  extinctionGraceUntilTick = legacy ? engine.value.getCurrentTick() + 50 : state.extinctionGraceUntilTick;
  extinction.triggered = extinction.acknowledged = false;
  rareSeenUntil = -1;
  runtimeError.value = null;
  showChunkInspector.value = false;
  selectedChunkForInspection.value = null;
  selected.value = null;
  historyFrames.value = [];
  selectedHistoryIndex.value = -1;
  events.value = [];
  seenWeather.clear();
  updateStats();
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

// Journal events already read, by tick; a new world or a loaded one starts from its current day.
let rareSeenUntil = -1;

/**
 * Read what the engine journalled since the last look: births and deaths go to Recent Events (every one, even
 * inside a time-lapse), rare events are announced.
 */
function readJournal(sim: SimulationEngine) {
  const tick = sim.getCurrentTick();
  if (rareSeenUntil < 0) rareSeenUntil = tick;
  const where = (chunkId?: string) => (chunkId ? ` in (${chunkId.split('_').slice(1).join(',')})` : '');
  for (const event of sim.getEventJournal().getAllEvents()) {
    if (event.tick <= rareSeenUntil) continue;
    const name = event.data?.speciesId ? speciesInfo(event.data.speciesId).name : '';
    if (event.type === EventType.SPECIES_SPAWN) {
      pushEvent(`${event.data.speciesId.startsWith('hybrid_') ? `Hybrid ${name}` : name} sprouted${where(event.chunkId)}`, event.tick);
    } else if (event.type === EventType.SPECIES_DIE) {
      const cause = CAUSES[event.data?.cause]?.noun;
      pushEvent(`${name} died${where(event.chunkId)}${cause ? ` of ${cause}` : ''}`, event.tick);
    } else if (event.type === EventType.TAGGED_DIED) {
      const tag = sim.getTags()[event.data.instanceId];
      if (tag) notify('icon-journal', deathNote(tag, speciesInfo(tag.speciesId).name, event.data.cause, event.data.ageDays), 'journal');
    } else if (event.type === EventType.TRAY_READY) {
      const species: string[] = event.data?.species ?? [];
      const from = `the germination tray of soil from (${event.chunkId?.split('_').slice(1).join(', ')})`;
      notify('icon-plants', species.length
        ? `In ${from}, ${species.map(id => speciesInfo(id).name).join(', ')} came up.`
        : `Nothing came up in ${from}.`);
    } else if (event.type === EventType.RARE_EVENT) {
      notify('icon-vitality', describeRareEvent(event.data, id => speciesInfo(id).name));
    }
  }
  rareSeenUntil = tick;
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
const showJournal = ref(false);
function inspectFromJournal(chunkId: string) {
  showJournal.value = false;
  inspectDigestLine(chunkId);
}
const codexTab = ref<CodexTab>('plant');
function openCodex(tab: CodexTab) {
  codexTab.value = tab;
  showCodex.value = true;
}
const toasts = ref<Array<{ id: number; icon: string; text: string; opens?: CodexTab | 'journal' }>>([]);
let toastId = 0;
// A few at a time: a burst of discoveries (e.g. after a Season) shouldn't bury the map.
const MAX_TOASTS = 3;
const TOAST_MS = 4500;

/** Show a short note; clicking it can open the Journal or the Codex at a tab. */
function notify(icon: string, text: string, opens?: CodexTab | 'journal') {
  const toast = { id: ++toastId, icon, text, opens };
  toasts.value = [...toasts.value, toast].slice(-MAX_TOASTS);
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== toast.id); }, TOAST_MS);
}

function openFromToast(opens: CodexTab | 'journal') {
  if (opens === 'journal') showJournal.value = true;
  else openCodex(opens);
}

function announce(found: Discovery[]) {
  for (const discovery of found.slice(0, MAX_TOASTS)) {
    if (discovery.kind === 'species') {
      const info = speciesInfo(discovery.id);
      notify('icon-observe', `New in your Codex: ${info.name}`, !info.animal ? 'plant' : info.kind === 'bird' ? 'bird' : 'pollinator');
    } else if (discovery.kind === 'heard') {
      notify('icon-observe', `Heard, not yet seen: ${speciesInfo(discovery.id).name}`, speciesInfo(discovery.id).kind === 'bird' ? 'bird' : 'pollinator');
    } else if (discovery.kind === 'interaction') {
      notify('icon-diversity', `New interaction: ${speciesInfo(discovery.animal).name} ↔ ${speciesInfo(discovery.plant).name}`, 'interaction');
    } else {
      const mystery = MYSTERIES.find(m => m.id === discovery.id);
      notify('icon-journal', discovery.solved ? 'A mystery is solved. The Codex explains.' : `A mystery: ${mystery?.question}`, 'mystery');
      if (discovery.solved) profile.save();
    }
  }
}

// ---- Advancing time ----
const advancing = ref<null | 'week' | 'season'>(null);
const digest = ref<null | { title: string; lines: DigestLine[] }>(null);
const timeBlocked = computed(() => !!advancing.value || extinction.triggered || !!runtimeError.value);
const DIGEST_ICONS: Record<DigestLine['icon'], string> = {
  season: 'icon-leaf',
  sighting: 'icon-observe',
  arrival: 'icon-pollinators',
  interaction: 'icon-diversity',
  corridor: 'icon-restore',
  rare: 'icon-vitality',
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
  const before = { season: stats.seasonName, population: populationBySpecies() };
  advancing.value = span;

  const frame = () => {
    for (let i = 0; i < TICKS_PER_FRAME[span] && sim.getCurrentTick() < targetTick && !runtimeError.value; i++) {
      sim.update();
    }
    refreshView();
    if (sim.getCurrentTick() < targetTick && !runtimeError.value) {
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
        animalName: id => animalLabel(id, knowledgeStore.knowledge),
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
  else if (key === 'journal') showJournal.value = true;
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
// The hex as the player knows it: animals by name only once seen or heard.
const hexStory = computed(() => {
  if (!tooltipChunk.value) return null;
  return describeHex(tooltipChunk.value, id => {
    const info = speciesInfo(id);
    return info.animal ? { ...info, name: animalLabel(id, knowledgeStore.knowledge) } : info;
  });
});
const ACTIVITY_WORDS: Record<PlantActivity, string> = { flowering: 'in flower', fruiting: 'fruiting', dormant: 'resting', growing: 'growing' };
const ACTIVITY_ICONS: Record<PlantActivity, string> = { flowering: 'icon-plants', fruiting: 'icon-diversity', dormant: 'icon-leaf', growing: 'icon-vitality' };

// Fieldwork in the selected hex: its latest sample, and the path of a traced marker.
const hexSample = computed(() => {
  const chunk = tooltipChunk.value;
  const sample: Sample | undefined = chunk?.sample;
  if (!sample) return null;
  const { rows, changed } = sampleReadings(sample, chunk.biomeState ?? {});
  const dayTicks = 1440 / (engine.value?.getConfig().timePerTickMinutes ?? 1440);
  return {
    day: Math.floor(sample.tick / dayTicks),
    rows,
    changed,
    tray: trayWords(sample, stats.currentTick, id => speciesInfo(id).name, dayTicks),
  };
});
const trace = ref<Array<{ x: number; y: number }>>([]);
const traceText = computed(() => (trace.value.length && selected.value && trace.value[0].x === selected.value.x && trace.value[0].y === selected.value.y ? traceWords(trace.value) : ''));
watch(selected, () => { trace.value = []; });

// ---- Watching: photos, listening, the phenology calendar and following a pollinator ----
const watchedHexes = () => [...(engine.value?.readChunks().values() ?? [])] as any[];
const lastPhoto = ref<Photo | null>(null);
function takePhoto(subject: string) {
  const chunk = tooltipChunk.value;
  if (!chunk || !engine.value) return;
  const shot = photograph(chunk, subject, Math.random);
  const photo: Photo = {
    subject,
    ...shot,
    habitat: describeHex(chunk).habitat,
    site: profile.currentSite,
    tick: engine.value.getCurrentTick(),
    when: `day ${simDays.value % 360} of year ${currentYear.value}`,
  };
  announce(knowledgeStore.photographed(photo, chunk.id));
  lastPhoto.value = photo;
}
function listenHere() {
  if (!selected.value || !engine.value) return;
  const heard = listen(watchedHexes(), selected.value);
  const found = knowledgeStore.listenedTo(heard, engine.value.getCurrentTick());
  notify('icon-observe', heard.length
    ? `You hear ${heard.map(id => animalLabel(id, knowledgeStore.knowledge)).filter((name, i, all) => all.indexOf(name) === i).join(', ')}.`
    : 'Only the wind. Nothing calls or hums nearby.');
  announce(found);
}
const PHASE_WORDS = { flower: 'first flower', fruit: 'first fruit', arrival: 'first arrival' } as const;
function noteHere() {
  const chunk = tooltipChunk.value;
  if (!chunk) return;
  const day = simDays.value % 360;
  const noted = visibleFirsts(chunk, knowledgeStore.knowledge)
    .filter(first => knowledgeStore.noted(profile.currentSite, first.species, currentYear.value, first.phase, day))
    .map(first => `${PHASE_WORDS[first.phase]} of ${speciesInfo(first.species).name}`);
  notify('icon-journal', noted.length ? `Noted in the calendar: ${noted.join(', ')}.` : 'Nothing here is new to your calendar this year.', 'journal');
}
const follow = useFollow({
  hexes: watchedHexes,
  kept: (animal, plant, hex) => announce(knowledgeStore.followed(animal, plant, engine.value?.getCurrentTick() ?? 0, hex.id)),
  ended: (animal, full, visited, why) => {
    const name = speciesInfo(animal).name;
    if (full) {
      // Where it kept to: the habitat most of its landings were in.
      const habitats = visited.map(hex => describeHex(hex as any).habitat);
      const habitat = HABITAT_WORDS[mostCommon(habitats)!];
      knowledgeStore.keptUpWith(animal, habitat);
      notify('icon-pollinators', `You kept up with the ${name} to the end. It keeps to ${habitat}; the Codex notes it.`, 'pollinator');
    } else if (why) {
      notify('icon-observe', `${why} ${visited.length ? `You saw the ${name} feed ${visited.length} ${visited.length === 1 ? 'time' : 'times'}.` : ''}`.trim());
    }
  },
});
// The followed insect in flight, drawn with its group's sprite (butterflies as a plain marker).
const followFlight = computed(() => follow.flight.value && { ...follow.flight.value, icon: SPRITE_ICON[speciesInfo(follow.animal.value!).kind] });
function startFollow(animal: string) {
  if (!selected.value) return;
  pause();
  follow.start(animal, selected.value);
}
function traceFromSelected() {
  const sim = engine.value;
  if (!sim || !selected.value) return;
  trace.value = traceWater(sim.readChunks().values(), `chunk_${selected.value.x}_${selected.value.y}`);
}

const overviewRows = computed<StatRow[]>(() => [
  { label: 'Vitality', icon: 'icon-vitality', value: fmt01(stats.avgVitality), bar: stats.avgVitality, barClass: 'nv-bar-leaf' },
  { label: 'Cleanliness', icon: 'icon-moisture', value: fmt01(cleanliness.value), bar: cleanliness.value, barClass: 'nv-bar-water' },
  { label: 'Plant species', icon: 'icon-species', value: life.value.plantKinds },
  { label: 'Plants', icon: 'icon-plants', value: life.value.plantCount },
  { label: 'Bird species', icon: 'icon-birds', value: life.value.birdKinds },
  { label: 'Pollinator species', icon: 'icon-pollinators', value: life.value.pollinatorKinds },
]);
const pouch = computed(() =>
  pouchOptions(interventionStore.pouchByOrigin, id => knowledgeStore.knowledge.names[id] ?? speciesInfo(id).name, id => siteById(id)?.name ?? id)
);
// The chosen line of the pouch: a species, and the site its seed came from when the pouch holds several.
const pouchChoice = computed({
  get: () => pouch.value.find(o => o.speciesId === interventionStore.selectedPlantSpecies && o.origin === interventionStore.selectedPlantOrigin)?.key
    ?? pouch.value.find(o => o.speciesId === interventionStore.selectedPlantSpecies)?.key,
  set: key => {
    const option = pouch.value.find(o => o.key === key);
    if (!option) return;
    interventionStore.selectedPlantSpecies = option.speciesId;
    interventionStore.selectedPlantOrigin = option.origin;
  },
});
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
