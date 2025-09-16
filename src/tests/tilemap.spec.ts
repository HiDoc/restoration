import { describe, it, expect } from 'vitest'
import { TileMap, MapData } from '@/world/TileMap'
import { TileType, MapTile, MapLayer } from '@/world/TileTypes'

function buildLayer(name: string, width: number, height: number, type: TileType): MapLayer {
  const row: MapTile[] = Array.from({ length: width }, () => ({ type }))
  const tiles: MapTile[][] = Array.from({ length: height }, () => row.slice())
  return { name, tiles, visible: true, opacity: 1 }
}

describe('TileMap logic', () => {
  const tileSize = 16
  const width = 3
  const height = 3
  const baseData: MapData = {
    name: 'test',
    width,
    height,
    tileSize,
    layers: [buildLayer('base', width, height, TileType.Grass)],
    spawnPoint: { x: 1, y: 2 }
  }

  const spriteManager: any = {}
  const layerManager: any = {}

  it('computes bounds and spawn point in world coords', () => {
    const tm = new TileMap(baseData, spriteManager, layerManager)
    const bounds = tm.getBounds()
    expect(bounds.width).toBe(width * tileSize)
    expect(bounds.height).toBe(height * tileSize)

    const spawn = tm.getSpawnPoint()
    expect(spawn).toEqual({ x: baseData.spawnPoint.x * tileSize, y: baseData.spawnPoint.y * tileSize })
  })

  it('provides tile at world position', () => {
    const tm = new TileMap(baseData, spriteManager, layerManager)
    const res = tm.getTileAtPosition(17, 1) // x=1,y=0 in tile coords
    expect(res.tileX).toBe(1)
    expect(res.tileY).toBe(0)
    expect(res.tile?.type).toBe(TileType.Grass)

    // Outside map
    const out = tm.getTileAtPosition(-1, -1)
    expect(out.tile).toBeNull()
  })

  it('reports walkability and speed multiplier based on tile type', () => {
    const sandLayer = buildLayer('sand', width, height, TileType.Sand)
    const data: MapData = { ...baseData, layers: [sandLayer] }
    const tm = new TileMap(data, spriteManager, layerManager)

    expect(tm.isWalkable(8, 8)).toBe(true)
    expect(tm.getSpeedMultiplier(8, 8)).toBeGreaterThan(0)

    const waterLayer = buildLayer('water', width, height, TileType.Water)
    const tm2 = new TileMap({ ...baseData, layers: [waterLayer] }, spriteManager, layerManager)
    expect(tm2.isWalkable(8, 8)).toBe(false)
    expect(tm2.getSpeedMultiplier(8, 8)).toBe(0.5)
  })
})

