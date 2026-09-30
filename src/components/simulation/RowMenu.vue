<template>
  <span class="relative inline-flex">
    <button
      type="button"
      class="hex-card-icon"
      :aria-label="`Actions for ${label}`"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click.stop="$emit('toggle')"
    >
      <LineIcon name="more" class="h-4 w-4" />
    </button>
    <ul v-if="open" class="row-menu" role="menu" :aria-label="`Actions for ${label}`">
      <li v-for="item in items" :key="item.id" role="none">
        <button type="button" role="menuitem" class="row-menu-item" @click.stop="$emit('pick', item)">
          <LineIcon :name="item.icon" class="h-4 w-4 flex-shrink-0" />{{ item.label }}
        </button>
      </li>
    </ul>
  </span>
</template>

<script lang="ts">
import type { LineIconName } from './lineIcons'
export interface RowMenuItem { id: 'tag' | 'photo' | 'follow'; target: string; icon: LineIconName; label: string }
</script>

<script setup lang="ts">
import LineIcon from './LineIcon.vue'

defineProps<{ open: boolean; label: string; items: RowMenuItem[] }>()
defineEmits<{ toggle: []; pick: [item: RowMenuItem] }>()
</script>

<style>
.row-menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 20;
  min-width: 13rem;
  padding: 0.25rem;
  border-radius: 0.6rem;
  background: var(--nv-parchment-100);
  color: var(--nv-ink-900);
  border: 1px solid var(--nv-brass-700);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.row-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: 0.4rem;
  font-size: 0.8rem;
  text-align: left;
}
.row-menu-item:hover,
.row-menu-item:focus-visible { background: var(--nv-parchment-300); outline: none; }
</style>
