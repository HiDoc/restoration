/** A soil and water sample, as the engine keeps it for a hex. */
export interface Sample {
  tick: number
  ph: number
  moisture: number
  nutrients: number
  pollution: number
  standingWater: number
  /** Species the sample's germination tray brings up; shown once the tray is ready. */
  tray: string[]
  trayReady: number
}

interface Ground { ph?: number; moisture?: number; soil?: number; pollution?: number; standingWater?: number }

export function phClass(ph: number): string {
  return ph < 5 ? 'strongly acid' : ph < 5.8 ? 'acid' : ph < 6.6 ? 'slightly acid' : ph < 7.4 ? 'neutral' : 'alkaline'
}

/** How far a reading may drift before the sample no longer describes the hex. */
const MATERIAL = 0.15

const pct = (value: number) => `${Math.round(value * 100)}%`

/** The sample's readings in words, and whether the hex has changed materially since. */
export function sampleReadings(sample: Sample, now: Ground): { rows: Array<{ label: string; value: string }>; changed: boolean } {
  const drift = [
    Math.abs((now.moisture ?? 0) - sample.moisture),
    Math.abs((now.soil ?? 0) - sample.nutrients),
    Math.abs((now.pollution ?? 0) - sample.pollution),
    Math.abs((now.standingWater ?? 0) - sample.standingWater),
  ]
  return {
    rows: [
      { label: 'Soil pH', value: `${sample.ph.toFixed(1)}, ${phClass(sample.ph)}` },
      { label: 'Moisture', value: pct(sample.moisture) },
      { label: 'Nutrients', value: pct(sample.nutrients) },
      { label: 'Pollution', value: pct(sample.pollution) },
      { label: 'Standing water', value: sample.standingWater > 0.01 ? pct(sample.standingWater) : 'none' },
    ],
    changed: drift.some(d => d > MATERIAL) || Math.abs((now.ph ?? sample.ph) - sample.ph) > 0.3,
  }
}

/** The tray in words: waiting, or what came up. */
export function trayWords(sample: Sample, tick: number, nameOf: (id: string) => string, dayTicks = 1): string {
  if (tick < sample.trayReady) {
    const days = Math.ceil((sample.trayReady - tick) / dayTicks)
    return `Germination tray: ready in ${days} ${days === 1 ? 'day' : 'days'}.`
  }
  return sample.tray.length
    ? `Germination tray: ${sample.tray.map(nameOf).join(', ')} came up.`
    : 'Germination tray: nothing came up; the soil holds no live seed.'
}

interface FlowingHex { id: string; x: number; y: number; outflow?: Record<string, number> }

/** Flow slower than this (per day) is seepage, not a current a marker would follow. */
const CURRENT = 0.0005
const MAX_STEPS = 12

/** A marker released in a hex follows the strongest outflow on, hex by hex, until the water stops moving. */
export function traceWater(hexes: Iterable<FlowingHex>, start: string): FlowingHex[] {
  const byId = new Map<string, FlowingHex>()
  for (const hex of hexes) byId.set(hex.id, hex)
  const path: FlowingHex[] = []
  let at = byId.get(start)
  while (at && path.length < MAX_STEPS && !path.includes(at)) {
    path.push(at)
    const [next, amount] = Object.entries(at.outflow ?? {}).sort((a, b) => b[1] - a[1])[0] ?? []
    at = next !== undefined && (amount ?? 0) >= CURRENT ? byId.get(next) : undefined
  }
  return path
}

/** Where the marker went, in words. */
export function traceWords(path: Array<{ x: number; y: number }>): string {
  const at = (hex: { x: number; y: number }) => `(${hex.x}, ${hex.y})`
  if (path.length < 2) return 'The marker stays put: water here is not running anywhere.'
  return `The marker runs from ${at(path[0])} to ${path.slice(1).map(at).join(', then ')}, where the water stops.`
}
