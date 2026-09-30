<template>
  <Teleport to="body">
    <Transition name="nv-hint">
      <aside
        v-if="hint"
        class="hint-card sci-modal nv-ornate"
        role="note"
        :aria-label="`Hint: ${hint.title}`"
      >
        <h3 class="nv-heading text-base">{{ hint.title }}</h3>
        <p class="nv-small mt-1">{{ hint.content }}</p>
        <div class="mt-2 flex items-center justify-between gap-3">
          <button type="button" class="nv-link" @click="$emit('skip')">No more hints</button>
          <button type="button" class="nv-btn px-3" @click="$emit('next')">Got it</button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Hint } from '@/stores/tutorialStore'

defineProps<{ hint: Hint | null }>()
defineEmits<{ next: []; skip: [] }>()
</script>

<style>
/* Centred on screen at every size. */
.hint-card {
  position: fixed;
  z-index: 45;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  width: min(20rem, calc(100vw - 1rem));
  padding: 0.9rem 1rem 0.8rem;
}
.nv-hint-enter-active,
.nv-hint-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.nv-hint-enter-from,
.nv-hint-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
@media (prefers-reduced-motion: reduce) {
  .nv-hint-enter-active,
  .nv-hint-leave-active { transition: none; }
}
</style>
