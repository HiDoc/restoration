import { computed, ref } from 'vue'
import { nextHop, type WatchedHex } from '@/game/watching'

/** Landings to keep up with for a full follow. */
export const HOPS = 4
/** How long the insect is in view in flight, and how long the player then has to find where it landed. */
const FLIGHT_MS = 1200
const FIND_MS = 6000

interface Hooks {
  hexes: () => WatchedHex[]
  /** The player kept up as the animal landed and fed there. */
  kept: (animal: string, plant: string, hex: WatchedHex) => void
  /** The follow ended: `full` when kept up to the last hop; the hexes it was kept up with. */
  ended: (animal: string, full: boolean, visited: WatchedHex[], why: string) => void
}

/**
 * Following a pollinator across the map: it flies to a neighbouring hex with its food, shown only in flight,
 * and the player keeps up by picking the hex where it landed.
 */
export function useFollow(hooks: Hooks) {
  const animal = ref<string | null>(null)
  const at = ref<{ x: number; y: number } | null>(null)
  const target = ref<{ hex: WatchedHex; plant: string } | null>(null)
  const visited = ref<WatchedHex[]>([])
  /** The flight on show; `key` restarts the animation for each hop. */
  const flight = ref<{ from: { x: number; y: number }; to: { x: number; y: number }; key: number } | null>(null)
  const landing = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const active = computed(() => animal.value !== null)

  function end(full: boolean, why: string) {
    clearTimeout(timer)
    if (animal.value) hooks.ended(animal.value, full, visited.value, why)
    animal.value = at.value = target.value = flight.value = null
    visited.value = []
    landing.value = false
  }

  function hop() {
    const next = animal.value && at.value ? nextHop(hooks.hexes(), animal.value, at.value, Math.random) : undefined
    if (!next) return end(false, 'It flew off beyond the flowers you can see.')
    target.value = next
    flight.value = { from: at.value!, to: { x: next.hex.x, y: next.hex.y }, key: (flight.value?.key ?? 0) + 1 }
    landing.value = false
    timer = setTimeout(() => {
      landing.value = true
      timer = setTimeout(() => end(false, 'You lost sight of it.'), FIND_MS)
    }, FLIGHT_MS)
  }

  function start(id: string, from: { x: number; y: number }) {
    end(false, '')
    animal.value = id
    at.value = from
    hop()
  }

  /** A hex the player picked while following; true when the pick was the follow's. */
  function pick(coords: { x: number; y: number }): boolean {
    if (!active.value || !target.value) return false
    clearTimeout(timer)
    const { hex, plant } = target.value
    if (coords.x !== hex.x || coords.y !== hex.y) {
      end(false, 'It landed somewhere else, and you lost it.')
      return true
    }
    hooks.kept(animal.value!, plant, hex)
    visited.value = [...visited.value, hex]
    at.value = coords
    if (visited.value.length >= HOPS) end(true, '')
    else hop()
    return true
  }

  const cancel = () => end(false, '')

  return { animal, active, flight, landing, hops: computed(() => visited.value.length), start, pick, cancel }
}
