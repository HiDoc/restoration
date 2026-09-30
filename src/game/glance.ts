/** The world at a glance: repeated events grouped, and figures traced over the last weeks. */

interface LoggedEvent { id: number; message: string; tick: number }

const PLACE = / in \((\d+),\s*(\d+)\)$/

/** Events that differ only in the hex, on the same day, read as one line: "Red Fescue sprouted in 3 hexes". */
export function groupEvents<T extends LoggedEvent>(events: T[]): T[] {
  const groups: Array<{ first: T; base: string; count: number }> = []
  for (const event of events) {
    const base = event.message.replace(PLACE, '')
    const same = PLACE.test(event.message) ? groups.find(g => g.base === base && g.first.tick === event.tick) : undefined
    if (same) same.count += 1
    else groups.push({ first: event, base, count: 1 })
  }
  return groups.map(g => (g.count > 1 ? { ...g.first, message: `${g.base} in ${g.count} hexes` } : g.first))
}

/** An SVG path through the values, scaled to fill a w×h box (flat when they do not change). */
export function sparkPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return ''
  const [min, max] = [Math.min(...values), Math.max(...values)]
  const y = (v: number) => (max === min ? h / 2 : h - ((v - min) / (max - min)) * h)
  return values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}
