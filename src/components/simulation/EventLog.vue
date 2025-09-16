<template>
  <aside class="sci-panel grid grid-rows-[auto_1fr] max-h-[60vh]">
    <div class="sci-header px-2 py-2 font-semibold">Events</div>
    <div class="p-2 overflow-y-auto grid gap-1.5 text-xs" ref="chatListEl">
      <div v-for="(event, i) in events" :key="i" class="opacity-80">{{ event }}</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  events: string[];
}>();

const chatListEl = ref<HTMLElement | null>(null);

// Auto-scroll to bottom when new events are added
watch(() => props.events.length, () => {
  nextTick(() => {
    const el = chatListEl.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
});
</script>

<!-- All styles have been converted to Tailwind CSS classes -->
