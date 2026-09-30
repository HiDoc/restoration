<template>
  <Transition name="nv-modal" @after-enter="focusFirst">
    <div v-if="show" class="sci-modal-overlay" @click.self="dismiss">
      <div
        ref="dialog"
        class="sci-modal nv-ornate flex max-h-[90vh] w-full flex-col"
        :class="WIDTHS[size]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-label="title ? undefined : label"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <!-- Indented to clear the frame's corner flourish -->
        <header v-if="title" class="flex flex-wrap items-baseline gap-x-2 pl-5" :class="centered ? 'flex-col items-center pl-0 text-center' : 'justify-between'">
          <h2 :id="titleId" class="nv-heading" :class="centered ? 'text-xl' : 'text-2xl'">{{ title }}</h2>
          <p v-if="subtitle" class="nv-small nv-muted" :class="centered ? '' : 'basis-full'">{{ subtitle }}</p>
          <button v-if="closable && !centered" type="button" class="nv-link" @click="emit('close')">Close</button>
        </header>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string
    /** For a dialog without a visible title. */
    label?: string
    subtitle?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    /** A short announcement: title and subtitle centred, closed by its own buttons. */
    centered?: boolean
    /** False for a dialog the player must answer (no Close, no Esc, no click outside). */
    closable?: boolean
  }>(),
  { size: 'lg', closable: true },
)
const emit = defineEmits<{ close: [] }>()

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const
const titleId = useId()
const dialog = ref<HTMLElement | null>(null)
let opener: HTMLElement | null = null

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const focusables = () => [...(dialog.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]

function dismiss() {
  if (props.closable) emit('close')
}

/** Focus lands in the dialog when it opens, and returns to what opened it when it closes. */
function focusFirst() {
  // The first control after the header's Close, else the dialog itself.
  const [first, second] = focusables()
  ;(props.title && props.closable && !props.centered ? second ?? first : first)?.focus() ?? dialog.value?.focus()
}
watch(
  () => props.show,
  async open => {
    if (open) {
      opener = document.activeElement as HTMLElement | null
      await nextTick()
      if (!dialog.value?.contains(document.activeElement)) dialog.value?.focus()
    } else {
      opener?.focus?.()
      opener = null
    }
  },
  { immediate: true },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    dismiss()
  } else if (event.key === 'Tab') {
    // Keep focus inside the dialog.
    const items = focusables()
    if (!items.length) return event.preventDefault()
    const [first, last] = [items[0], items[items.length - 1]]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}
</script>

<style>
.nv-modal-enter-active,
.nv-modal-leave-active {
  transition: opacity 0.18s ease;
}
.nv-modal-enter-active .sci-modal,
.nv-modal-leave-active .sci-modal {
  transition: transform 0.18s ease;
}
.nv-modal-enter-from,
.nv-modal-leave-to {
  opacity: 0;
}
.nv-modal-enter-from .sci-modal,
.nv-modal-leave-to .sci-modal {
  transform: translateY(8px) scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .nv-modal-enter-active,
  .nv-modal-leave-active,
  .nv-modal-enter-active .sci-modal,
  .nv-modal-leave-active .sci-modal {
    transition: none;
  }
}
</style>
