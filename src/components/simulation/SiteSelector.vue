<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal nv-ornate w-full max-w-2xl" role="dialog" aria-labelledby="sites-title">
      <!-- Indented to clear the frame's corner flourish -->
      <header class="flex items-baseline justify-between gap-2 pl-5">
        <h2 id="sites-title" class="nv-heading text-2xl">Restoration sites</h2>
        <button type="button" class="nv-link" @click="$emit('close')">Close</button>
      </header>
      <p class="nv-small nv-muted mt-1 pl-5">Your Codex and seed pouch travel with you.</p>
      <ul class="mt-3 grid gap-2">
        <li v-for="site in SITES" :key="site.id" class="nv-panel p-3">
          <div class="flex items-baseline justify-between gap-2">
            <h3 class="font-bold">{{ site.name }}</h3>
            <span class="nv-small nv-muted">{{ status(site) }}</span>
          </div>
          <p class="nv-small mt-0.5">{{ site.blurb }}</p>
          <div class="mt-2 flex justify-end">
            <span v-if="site.id === profile.currentSite" class="nv-small nv-muted">You are here</span>
            <button v-else-if="profile.unlocked.includes(site.id)" type="button" class="nv-btn" @click="$emit('travel', site.id)">Travel here</button>
            <span v-else class="nv-small nv-muted">Restore {{ previous(site)?.name ?? 'an earlier site' }} to open</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SITES, STAGES, type Site } from '@/game/sites'
import { useProfileStore } from '@/stores/profileStore'

defineProps<{ show: boolean }>()
defineEmits<{ close: []; travel: [siteId: string] }>()

const profile = useProfileStore()
const previous = (site: Site) => SITES.find(s => s.unlocks === site.id)
const status = (site: Site) => {
  if (!profile.founded.includes(site.id)) return profile.unlocked.includes(site.id) ? 'Not visited' : 'Locked'
  return STAGES[profile.progress[site.id]?.stage ?? 0].title
}
</script>
