<template>
  <div v-if="show" class="sci-modal-overlay" @click.self="$emit('close')">
    <div class="sci-modal nv-ornate w-full max-w-md" role="dialog" aria-labelledby="settings-title">
      <!-- Indented to clear the frame's corner flourish -->
      <header class="flex items-baseline justify-between gap-2 pl-5">
        <h2 id="settings-title" class="nv-heading text-2xl">Settings</h2>
        <button type="button" class="nv-link" @click="$emit('close')">Close</button>
      </header>
      <section class="mt-3 grid gap-2">
        <div class="flex items-center justify-between gap-2">
          <span>This site's ecosystem</span>
          <span class="flex gap-1">
            <button type="button" class="nv-btn" :disabled="saving" @click="$emit('save')">Save</button>
            <button type="button" class="nv-btn" :disabled="loading" @click="$emit('load')">Load last save</button>
          </span>
        </div>
        <label class="flex items-center justify-between gap-2">
          <span>Save every {{ autosaveDays }} days while playing</span>
          <input type="checkbox" :checked="autoSave" @change="$emit('update:autoSave', ($event.target as HTMLInputElement).checked)" />
        </label>
        <div class="flex items-center justify-between gap-2">
          <span>Play speed: a day every {{ speedWords }}</span>
          <span class="flex gap-1">
            <button type="button" class="nv-btn" aria-label="Slower" @click="$emit('slower')">Slower</button>
            <button type="button" class="nv-btn" aria-label="Faster" @click="$emit('faster')">Faster</button>
          </span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span>Calm view: the map alone, with the time controls floating</span>
          <button type="button" class="nv-btn" @click="$emit('calm')">Switch</button>
        </div>
        <p v-if="notice" class="nv-small" role="status">{{ notice }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ show: boolean; autoSave: boolean; autosaveDays: number; tickMs: number; saving: boolean; loading: boolean; notice?: string }>()
defineEmits<{ close: []; save: []; load: []; slower: []; faster: []; calm: []; 'update:autoSave': [value: boolean] }>()

const speedWords = computed(() => (props.tickMs >= 1000 ? `${props.tickMs / 1000} s` : `${(props.tickMs / 1000).toFixed(2).replace(/0$/, '')} s`))
</script>
