<template>
  <div class="sprite-section">
    <h2 class="section-title">{{ title }}</h2>
    <div class="sprite-grid">
      <SpriteCard
        v-for="sprite in sprites"
        :key="sprite.name"
        :name="sprite.name"
        :sprite="sprite.sprite"
        :info="sprite.info"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface SpriteData {
  name: string
  sprite: any
  info: string
}

defineProps<{
  title: string
  sprites: SpriteData[]
}>()
</script>

<script lang="ts">
import SpriteCard from './SpriteCard.vue'

export default {
  components: {
    SpriteCard
  }
}
</script>

<style scoped>
.sprite-section {
  margin-bottom: 50px;
  border: 1px solid #333;
  padding: 30px;
  border-radius: 12px;
  background: linear-gradient(135deg, #222 0%, #1a1a1a 100%);
}

.section-title {
  font-size: 24px;
  color: #60a5fa;
  margin: 0 0 25px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #60a5fa;
  display: inline-block;
}

.sprite-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}
</style>