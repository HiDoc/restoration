<template>
  <div class="grid gap-1 text-[0.7rem]" ref="chatListEl">
    <div v-for="event in events" :key="event.id" class="flex items-start gap-1.5 text-slate-200/90 leading-tight">
      <span class="text-[0.65rem] text-emerald-200/70 flex-shrink-0 font-mono">{{ event.timeLabel }}</span>
      <span class="flex-1 min-w-0 break-words">{{ event.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  events: Array<{ id: number; message: string; timeLabel: string }>;
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
