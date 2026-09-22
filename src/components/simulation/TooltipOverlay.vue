<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { TooltipPlacement } from '@/stores/tutorialStore';

const props = defineProps<{
  show: boolean;
  targetSelector?: string;
  title: string;
  content: string;
  placement?: TooltipPlacement;
}>();

const emit = defineEmits<{
  (e: 'next'): void;
  (e: 'skip'): void;
}>();

const tooltipRef = ref<HTMLElement | null>(null);
const position = ref({ top: 0, left: 0 });
const actualPlacement = ref<TooltipPlacement>(props.placement || 'right');

// Calculate position based on target element
function updatePosition() {
  if (!props.targetSelector || !tooltipRef.value) {
    // Center on screen if no target
    position.value = {
      top: window.innerHeight / 2,
      left: window.innerWidth / 2
    };
    return;
  }

  const targetElement = document.querySelector(props.targetSelector);
  if (!targetElement) {
    console.warn(`Target element not found: ${props.targetSelector}`);
    return;
  }

  const targetRect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltipRef.value.getBoundingClientRect();

  let top = 0;
  let left = 0;

  switch (actualPlacement.value) {
    case 'top':
      top = targetRect.top - tooltipRect.height - 16;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + 16;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.left - tooltipRect.width - 16;
      break;
    case 'right':
    default:
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.right + 16;
      break;
  }

  // Keep within viewport bounds
  const padding = 16;
  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

  position.value = { top, left };
}

// Watch for changes and update position
watch(() => [props.show, props.targetSelector], () => {
  if (props.show) {
    // Wait for next tick to ensure element is rendered
    setTimeout(updatePosition, 50);
  }
});

// Update position on resize
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (props.show) {
    updatePosition();
  }

  // Watch for window resize
  window.addEventListener('resize', updatePosition);

  // Watch for DOM changes that might affect layout
  resizeObserver = new ResizeObserver(updatePosition);
  if (tooltipRef.value) {
    resizeObserver.observe(tooltipRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// Arrow position based on placement
const arrowClasses = computed(() => {
  switch (actualPlacement.value) {
    case 'top': return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45';
    case 'bottom': return 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45';
    case 'left': return 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45';
    case 'right': return 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45';
    default: return '';
  }
});

function handleNext() {
  emit('next');
}

function handleSkip() {
  emit('skip');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div v-if="show" class="fixed inset-0 z-40 pointer-events-none">
        <!-- Spotlight effect on target -->
        <div
          v-if="targetSelector"
          class="absolute inset-0 bg-black/50 pointer-events-auto"
          @click="handleSkip"
        >
          <!-- This creates a "hole" effect around the target (simplified version) -->
        </div>

        <!-- Tooltip -->
        <div
          ref="tooltipRef"
          :style="{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: targetSelector ? 'none' : 'translate(-50%, -50%)'
          }"
          class="tooltip-container pointer-events-auto max-w-sm"
        >
          <div class="bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 border-2 border-emerald-400/50 rounded-lg shadow-2xl p-4 relative">
            <!-- Arrow pointer -->
            <div
              v-if="targetSelector"
              :class="['absolute w-4 h-4 bg-emerald-900 border-emerald-400/50', arrowClasses]"
              style="border-width: 2px 0 0 2px;"
            ></div>

            <!-- Title -->
            <h3 class="text-lg font-semibold text-emerald-100 mb-2">
              {{ title }}
            </h3>

            <!-- Content -->
            <p class="text-sm text-slate-300 leading-relaxed mb-4">
              {{ content }}
            </p>

            <!-- Actions -->
            <div class="flex items-center justify-between gap-3">
              <button
                @click="handleSkip"
                class="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                Skip Tutorial
              </button>

              <button
                @click="handleNext"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.3s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}

.tooltip-container {
  animation: tooltip-bounce 0.5s ease;
}

@keyframes tooltip-bounce {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
