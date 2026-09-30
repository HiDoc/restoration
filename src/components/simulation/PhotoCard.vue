<template>
  <figure class="nv-panel p-1.5">
    <div class="relative aspect-[4/3] overflow-hidden rounded" :style="backdrop" role="img" :aria-label="`${name}, ${photo.caption}`">
      <img v-if="plantIcon" :src="plantIcon" alt="" class="absolute bottom-[12%] left-[18%] w-1/4 drop-shadow" />
      <img v-if="subjectIcon" :src="subjectIcon" alt="" class="absolute left-1/2 top-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" />
      <svg v-else viewBox="0 0 20 16" class="absolute left-1/2 top-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 fill-[#e08a3c] drop-shadow-lg" aria-hidden="true">
        <path d="M10 8C6 1 1 1 1.5 5.5 2 9 6 10 10 8Zm0 0c4-7 9-7 8.5-2.5C18 9 14 10 10 8Z" /><path d="M10 8C7 11 4 14 6 15s3-3 4-7Zm0 0c3 3 6 6 4 7s-3-3-4-7Z" opacity=".8" />
      </svg>
    </div>
    <figcaption class="nv-small mt-1">
      <span class="font-bold">{{ name }}</span>, {{ photo.caption }}
      <span class="nv-muted block">{{ place }} · {{ photo.when }}</span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Photo } from '@/game/knowledge'
import type { Habitat } from '@/game/hexDescription'
import { speciesInfo } from '@/game/speciesInfo'
import { siteById } from '@/game/sites'
import { HABITAT_LOOK, HABITAT_WORDS, SPRITE_ICON } from './habitatLook'
import { nv } from './nouveauAssets'

const props = defineProps<{ photo: Photo }>()

const info = computed(() => speciesInfo(props.photo.subject))
const name = computed(() => info.value.name)
const look = computed(() => HABITAT_LOOK[props.photo.habitat as Habitat] ?? HABITAT_LOOK.meadow)
const backdrop = computed(() => ({
  backgroundImage: `url("${look.value.scene}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}))
// Plants are drawn with the kit's plant icon; animals with their group's sprite (butterflies as a shape).
const subjectIcon = computed(() => (info.value.animal ? SPRITE_ICON[info.value.kind] : nv('icon-plants')))
const plantIcon = computed(() => (props.photo.plant ? nv('icon-plants') : undefined))
const place = computed(() => `${HABITAT_WORDS[props.photo.habitat as Habitat] ?? props.photo.habitat}, ${siteById(props.photo.site)?.name ?? props.photo.site}`)
</script>
