import { Container, Sprite } from 'pixi.js';
import { SpriteManager } from '../render/SpriteManager';
import { LayerManager } from './LayerManager';
import { LayerType } from './Layers';
import { TileType, TileProperties, TILE_PROPERTIES, MapTile, MapLayer } from './TileTypes';

export interface MapData {
  name: string;
  width: number;  // Width in tiles
  height: number; // Height in tiles
  tileSize: number;
  layers: MapLayer[];
  objects?: MapObject[]; // Trees, chests, NPCs, etc.
  spawnPoint: { x: number; y: number };
}

export interface MapObject {
  id: string;
  type: 'plant' | 'prop' | 'npc' | 'item';
  x: number; // World coordinates
  y: number;
  spriteKey: string;
  layer: LayerType;
  properties?: Record<string, any>;
}

export class TileMap {
  private mapData: MapData;
  private spriteManager: SpriteManager;
  private layerManager: LayerManager;
  private tileSize: number;
  private mapContainer: Container;
  private tileSprites: Map<string, Sprite> = new Map();

  constructor(mapData: MapData, spriteManager: SpriteManager, layerManager: LayerManager) {
    this.mapData = mapData;
    this.spriteManager = spriteManager;
    this.layerManager = layerManager;
    this.tileSize = mapData.tileSize;
    this.mapContainer = new Container();
    this.mapContainer.name = 'TileMap';
  }

  // Load and render the entire map
  loadMap(): void {
    this.clearMap();
    this.renderLayers();
    this.renderObjects();
  }

  private clearMap(): void {
    this.tileSprites.clear();
    this.mapContainer.removeChildren();
  }

  private renderLayers(): void {
    this.mapData.layers.forEach(layer => {
      if (!layer.visible) return;
      
      this.renderLayer(layer);
    });
  }

  private renderLayer(layer: MapLayer): void {
    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        if (!layer.tiles[y] || !layer.tiles[y][x]) continue;
        
        const mapTile = layer.tiles[y][x];
        this.renderTile(mapTile, x, y, layer);
      }
    }
  }

  private renderTile(mapTile: MapTile, tileX: number, tileY: number, layer: MapLayer): void {
    const tileProps = TILE_PROPERTIES[mapTile.type];
    const worldX = tileX * this.tileSize;
    const worldY = tileY * this.tileSize;

    // Create sprite for this tile
    const sprite = this.createTileSprite(tileProps, mapTile);
    if (!sprite) return;

    sprite.x = worldX;
    sprite.y = worldY;

    // Apply layer opacity
    sprite.alpha = layer.opacity;

    // Apply rotation if specified
    if (mapTile.rotation) {
      sprite.rotation = (mapTile.rotation * Math.PI) / 180;
    }

    // Add to layer manager
    const layerType = this.getTileLayerType(mapTile.type);
    (sprite as any).layer = layerType;
    (sprite as any).tileX = tileX;
    (sprite as any).tileY = tileY;
    (sprite as any).tileType = mapTile.type;

    this.layerManager.addObject(sprite as any);

    // Store reference
    const key = `${tileX}_${tileY}_${layer.name}`;
    this.tileSprites.set(key, sprite);
  }

  private createTileSprite(tileProps: TileProperties, mapTile: MapTile): Sprite | null {
    let spriteIndex = tileProps.spriteIndex;
    
    // Apply variant if specified
    if (mapTile.variant !== undefined) {
      spriteIndex += mapTile.variant;
    }

    return this.spriteManager.createTileSprite(tileProps.spriteSheet, spriteIndex);
  }

  private getTileLayerType(tileType: TileType): LayerType {
    switch (tileType) {
      case TileType.Water:
        return LayerType.Terrain;
      case TileType.Path:
      case TileType.Bridge:
        return LayerType.TerrainDecoration;
      case TileType.Void:
        return LayerType.Background;
      default:
        return LayerType.Terrain;
    }
  }

  private renderObjects(): void {
    if (!this.mapData.objects) return;

    this.mapData.objects.forEach(obj => {
      const sprite = this.createObjectSprite(obj);
      if (!sprite) return;

      sprite.x = obj.x;
      sprite.y = obj.y;

      // Make it layered
      (sprite as any).layer = obj.layer;
      (sprite as any).sortKey = obj.y; // Y-sorting for depth
      (sprite as any).objectId = obj.id;
      (sprite as any).objectType = obj.type;

      this.layerManager.addObject(sprite as any);
    });
  }

  private createObjectSprite(obj: MapObject): Sprite | null {
    switch (obj.type) {
      case 'plant':
        const size = obj.properties?.size || 'medium';
        const index = obj.properties?.index || 0;
        return this.spriteManager.createPlantSprite(size, index);
      
      case 'prop':
        return this.spriteManager.createPropSprite(obj.spriteKey);
      
      default:
        return this.spriteManager.createSprite(obj.spriteKey, 0);
    }
  }

  // Get tile at world coordinates
  getTileAtPosition(worldX: number, worldY: number): { tile: MapTile | null; tileX: number; tileY: number } {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    
    if (tileX < 0 || tileX >= this.mapData.width || tileY < 0 || tileY >= this.mapData.height) {
      return { tile: null, tileX, tileY };
    }

    // Get from first visible layer (for collision detection)
    const layer = this.mapData.layers.find(l => l.visible);
    if (!layer || !layer.tiles[tileY] || !layer.tiles[tileY][tileX]) {
      return { tile: null, tileX, tileY };
    }

    return { tile: layer.tiles[tileY][tileX], tileX, tileY };
  }

  // Check if a position is walkable
  isWalkable(worldX: number, worldY: number): boolean {
    const { tile } = this.getTileAtPosition(worldX, worldY);
    if (!tile) return false;
    
    const props = TILE_PROPERTIES[tile.type];
    return props.walkable && !props.hasCollision;
  }

  // Get movement speed multiplier for a position
  getSpeedMultiplier(worldX: number, worldY: number): number {
    const { tile } = this.getTileAtPosition(worldX, worldY);
    if (!tile) return 0;
    
    return TILE_PROPERTIES[tile.type].runSpeed;
  }

  // Get map boundaries
  getBounds(): { width: number; height: number; maxX: number; maxY: number } {
    return {
      width: this.mapData.width * this.tileSize,
      height: this.mapData.height * this.tileSize,
      maxX: this.mapData.width * this.tileSize,
      maxY: this.mapData.height * this.tileSize
    };
  }

  // Get spawn point in world coordinates
  getSpawnPoint(): { x: number; y: number } {
    return {
      x: this.mapData.spawnPoint.x * this.tileSize,
      y: this.mapData.spawnPoint.y * this.tileSize
    };
  }

  // Debug: visualize tile grid
  debugDrawGrid(): void {
    // This would draw grid lines for debugging
    // Implementation would use PIXI Graphics to draw lines
  }

  getMapData(): MapData {
    return this.mapData;
  }
}