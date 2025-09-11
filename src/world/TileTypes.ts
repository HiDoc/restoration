export enum TileType {
  // Terrain tiles
  Grass = 'grass',
  Stone = 'stone',
  Water = 'water',
  Sand = 'sand',
  Dirt = 'dirt',
  
  // Path tiles
  Path = 'path',
  Bridge = 'bridge',
  
  // Special tiles
  Void = 'void', // Empty/black space
  Spawn = 'spawn' // Player spawn point
}

export interface TileProperties {
  // Visual properties
  spriteSheet: string;   // Which sprite sheet to use
  spriteIndex: number;   // Which frame from the sheet
  
  // Gameplay properties
  walkable: boolean;     // Can player walk on this tile
  swimable: boolean;     // Requires swimming
  runSpeed: number;      // Speed multiplier (1.0 = normal, 0.5 = slow, 1.5 = fast)
  
  // Interaction properties
  hasCollision: boolean; // Solid collision
  triggerEvent?: string; // Event to trigger when stepped on
  
  // Audio properties
  footstepSound?: string; // Sound when walking on this tile
  
  // Visual effects
  animated?: boolean;    // Is this tile animated
  animationSpeed?: number;
}

// Define tile properties for each tile type
export const TILE_PROPERTIES: Record<TileType, TileProperties> = {
  [TileType.Grass]: {
    spriteSheet: 'tileset_grass',
    spriteIndex: 0,
    walkable: true,
    swimable: false,
    runSpeed: 1.0,
    hasCollision: false,
    footstepSound: 'grass_step'
  },
  
  [TileType.Stone]: {
    spriteSheet: 'tileset_stone',
    spriteIndex: 0,
    walkable: true,
    swimable: false,
    runSpeed: 1.0,
    hasCollision: false,
    footstepSound: 'stone_step'
  },
  
  [TileType.Water]: {
    spriteSheet: 'tileset_grass',
    spriteIndex: 10,
    walkable: false,
    swimable: true,
    runSpeed: 0.5,
    hasCollision: true,
    footstepSound: 'water_splash',
    animated: true,
    animationSpeed: 0.1
  },
  
  [TileType.Sand]: {
    spriteSheet: 'tileset_stone',
    spriteIndex: 8,
    walkable: true,
    swimable: false,
    runSpeed: 0.8,
    hasCollision: false,
    footstepSound: 'sand_step'
  },
  
  [TileType.Dirt]: {
    spriteSheet: 'tileset_stone',
    spriteIndex: 4,
    walkable: true,
    swimable: false,
    runSpeed: 1.0,
    hasCollision: false,
    footstepSound: 'dirt_step'
  },
  
  [TileType.Path]: {
    spriteSheet: 'tileset_stone',
    spriteIndex: 12,
    walkable: true,
    swimable: false,
    runSpeed: 1.2,
    hasCollision: false,
    footstepSound: 'path_step'
  },
  
  [TileType.Bridge]: {
    spriteSheet: 'tileset_stone',
    spriteIndex: 14,
    walkable: true,
    swimable: false,
    runSpeed: 1.0,
    hasCollision: false,
    footstepSound: 'wood_step'
  },
  
  [TileType.Void]: {
    spriteSheet: 'tileset_grass',
    spriteIndex: 63,
    walkable: false,
    swimable: false,
    runSpeed: 0,
    hasCollision: true
  },
  
  [TileType.Spawn]: {
    spriteSheet: 'tileset_grass',
    spriteIndex: 5,
    walkable: true,
    swimable: false,
    runSpeed: 1.0,
    hasCollision: false,
    footstepSound: 'grass_step'
  }
};

export interface MapTile {
  type: TileType;
  variant?: number; // For random variations of the same tile type
  rotation?: number; // 0, 90, 180, 270 degrees
}

export interface MapLayer {
  name: string;
  tiles: MapTile[][];
  visible: boolean;
  opacity: number;
}