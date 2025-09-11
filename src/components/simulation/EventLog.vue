<template>
  <aside class="chat">
    <div class="chat-title">Events</div>
    <div class="chat-list" ref="chatListEl">
      <div v-for="(event, i) in events" :key="i" class="chat-item">{{ event }}</div>
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

<style scoped>
.chat {
  border: 1px solid #333;
  background: #0d0d0d;
  border-radius: 6px;
  display: grid;
  grid-template-rows: auto 1fr;
  max-height: 60vh;
}

.chat-title {
  padding: 8px;
  font-weight: 600;
  border-bottom: 1px solid #222;
}

.chat-list {
  padding: 8px;
  overflow-y: auto;
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.chat-item {
  color: #cfd3dc;
}
</style>