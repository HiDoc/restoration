import { Assets } from 'pixi.js';
import { MapData } from './TileMap';

export class MapLoader {
  private static loadedMaps: Map<string, MapData> = new Map();

  static async loadMap(mapPath: string): Promise<MapData> {
    // Check cache first
    if (this.loadedMaps.has(mapPath)) {
      return this.loadedMaps.get(mapPath)!;
    }

    try {
      // Load the map JSON file
      const mapData = await Assets.load(mapPath) as MapData;
      
      // Validate map data
      this.validateMapData(mapData);
      
      // Cache the loaded map
      this.loadedMaps.set(mapPath, mapData);
      
      console.log(`Loaded map: ${mapData.name} (${mapData.width}x${mapData.height})`);
      return mapData;
    } catch (error) {
      console.error(`Failed to load map from ${mapPath}:`, error);
      throw error;
    }
  }

  private static validateMapData(mapData: MapData): void {
    if (!mapData.name) {
      throw new Error('Map data missing required field: name');
    }
    
    if (!mapData.width || !mapData.height || !mapData.tileSize) {
      throw new Error('Map data missing required dimensions');
    }
    
    if (!mapData.layers || mapData.layers.length === 0) {
      throw new Error('Map data must have at least one layer');
    }
    
    if (!mapData.spawnPoint) {
      throw new Error('Map data missing spawn point');
    }

    // Validate each layer
    mapData.layers.forEach((layer, index) => {
      if (!layer.name) {
        throw new Error(`Layer ${index} missing name`);
      }
      
      if (!layer.tiles || !Array.isArray(layer.tiles)) {
        throw new Error(`Layer ${layer.name} missing or invalid tiles array`);
      }
      
      // Check layer dimensions
      if (layer.tiles.length !== mapData.height) {
        throw new Error(`Layer ${layer.name} height mismatch: expected ${mapData.height}, got ${layer.tiles.length}`);
      }
      
      layer.tiles.forEach((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== mapData.width) {
          throw new Error(`Layer ${layer.name} row ${rowIndex} width mismatch: expected ${mapData.width}, got ${row?.length || 0}`);
        }
      });
    });

    console.log(`Map validation passed for: ${mapData.name}`);
  }

  // Preload multiple maps
  static async preloadMaps(mapPaths: string[]): Promise<void> {
    const loadPromises = mapPaths.map(path => this.loadMap(path));
    await Promise.all(loadPromises);
    console.log(`Preloaded ${mapPaths.length} maps`);
  }

  // Get cached map without loading
  static getCachedMap(mapPath: string): MapData | null {
    return this.loadedMaps.get(mapPath) || null;
  }

  // Clear map cache
  static clearCache(): void {
    this.loadedMaps.clear();
  }

  // Get all loaded map names
  static getLoadedMapNames(): string[] {
    return Array.from(this.loadedMaps.values()).map(map => map.name);
  }
}