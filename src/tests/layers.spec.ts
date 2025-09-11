import { describe, it, expect } from 'vitest'
import { LayerType, LAYER_Z_INDEX, getLayerZIndex, getYSortIndex } from '@/world/Layers'

describe('Layers sorting utilities', () => {
  it('computes base z-index plus subLayer and sortKey scale', () => {
    const base = LAYER_Z_INDEX[LayerType.Characters]
    expect(getLayerZIndex(LayerType.Characters)).toBeCloseTo(base)
    expect(getLayerZIndex(LayerType.Characters, 10)).toBeCloseTo(base + 10)
    // sortKey contributes by 0.001
    expect(getLayerZIndex(LayerType.Characters, 10, 5)).toBeCloseTo(base + 10 + 0.005)
  })

  it('uses y position for Y-sorted layers', () => {
    const low = getYSortIndex(10, LayerType.Characters, 0)
    const high = getYSortIndex(100, LayerType.Characters, 0)
    expect(high).toBeGreaterThan(low)
  })
})

