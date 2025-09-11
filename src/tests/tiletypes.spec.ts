import { describe, it, expect } from 'vitest'
import { TILE_PROPERTIES, TileType } from '@/world/TileTypes'

describe('TileTypes properties', () => {
  it('defines required properties for each TileType', () => {
    const entries = Object.entries(TILE_PROPERTIES)
    expect(entries.length).toBeGreaterThan(0)
    for (const [key, props] of entries) {
      expect(typeof props.spriteSheet).toBe('string')
      expect(props.spriteSheet.length).toBeGreaterThan(0)
      expect(typeof props.spriteIndex).toBe('number')
      expect(typeof props.walkable).toBe('boolean')
      expect(typeof props.swimable).toBe('boolean')
      expect(props.runSpeed).toBeGreaterThanOrEqual(0)
      expect(typeof props.hasCollision).toBe('boolean')
    }
  })

  it('has sensible defaults for special tiles', () => {
    expect(TILE_PROPERTIES[TileType.Spawn].walkable).toBe(true)
    expect(TILE_PROPERTIES[TileType.Void].walkable).toBe(false)
    expect(TILE_PROPERTIES[TileType.Void].hasCollision).toBe(true)
  })
})

