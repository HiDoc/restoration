import { describe, expect, it } from 'vitest'
import { phClass, sampleReadings, traceWater, traceWords, trayWords, type Sample } from '@/game/fieldwork'
import { phOf, SITES } from '@/game/sites'

const sample: Sample = { tick: 30, ph: 5.4, moisture: 0.5, nutrients: 0.6, pollution: 0.05, standingWater: 0, tray: ['dog_violet'], trayReady: 44 }

describe('fieldwork', () => {
  it('reads a sample and notices when the hex has changed since', () => {
    const { rows, changed } = sampleReadings(sample, { ph: 5.4, moisture: 0.55, soil: 0.6, pollution: 0.05 })
    expect(rows[0]).toEqual({ label: 'Soil pH', value: '5.4, acid' })
    expect(rows[4].value).toBe('none')
    expect(changed).toBe(false)
    expect(sampleReadings(sample, { ph: 5.4, moisture: 0.9, soil: 0.6, pollution: 0.05 }).changed).toBe(true)
    expect(phClass(7)).toBe('neutral')
  })

  it('keeps the tray closed until it is ready', () => {
    expect(trayWords(sample, 40, id => id)).toBe('Germination tray: ready in 4 days.')
    expect(trayWords(sample, 44, () => 'Common Dog-violet')).toBe('Germination tray: Common Dog-violet came up.')
  })

  it('follows the strongest outflow until the water stops', () => {
    const hexes: Array<{ id: string; x: number; y: number; outflow: Record<string, number> }> = [
      { id: 'a', x: 0, y: 0, outflow: { b: 0.004, c: 0.001 } },
      { id: 'b', x: 1, y: 0, outflow: { c: 0.003 } },
      { id: 'c', x: 2, y: 0, outflow: { b: 0.0001 } },
    ]
    const path = traceWater(hexes, 'a')
    expect(path.map(h => h.id)).toEqual(['a', 'b', 'c'])
    expect(traceWords(path)).toBe('The marker runs from (0, 0) to (1, 0), then (2, 0), where the water stops.')
    expect(traceWords(traceWater(hexes, 'c'))).toMatch(/stays put/)
  })

  it('gives each site its soil, a little different hex to hex', () => {
    const [meadow, woodland] = SITES
    const values = [0, 1, 2, 3, 4, 5].map(x => phOf(woodland)(x, 2))
    expect(values.every(v => Math.abs(v - 5.6) <= 0.3)).toBe(true)
    expect(new Set(values).size).toBeGreaterThan(1)
    expect(phOf(meadow)(1, 1)).toBe(phOf(meadow)(1, 1))
  })
})
