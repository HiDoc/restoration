<template>
  <Modal :show="show" title="Restoration sites" size="lg" @close="$emit('close')">
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
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
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
