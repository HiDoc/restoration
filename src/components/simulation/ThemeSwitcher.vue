<template>
  <div class="sci-card">
    <div class="sci-card-header flex items-center justify-between">
      <div class="sci-header-title text-sm">Appearance</div>
    </div>
    <div class="sci-card-body space-y-3">
      <label class="sci-label">Theme</label>
      <select class="sci-select" v-model="selected" @change="onChange">
        <option value="system">System (auto)</option>
        <option value="eco">Eco (dark)</option>
        <option value="air">Air (light)</option>
      </select>
      <div class="text-xs text-gray-400">
        Current: <span class="font-mono">{{ selected }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTheme, setTheme, type ThemeName } from '@/utils/theme'

const selected = ref<ThemeName>('system')

onMounted(() => {
  selected.value = getTheme()
})

function onChange() {
  setTheme(selected.value)
}
</script>

