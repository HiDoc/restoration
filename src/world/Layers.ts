export enum LayerType {
  // Background layers (furthest back)
  Background = 'background',           // Sky, distant mountains
  Terrain = 'terrain',                 // Ground tiles, water, paths
  TerrainDecoration = 'terrain_decoration', // Grass patches, flowers on ground
  
  // World object layers
  ObjectsBack = 'objects_back',        // Objects that player walks in front of
  ObjectsMid = 'objects_mid',          // Objects at player level
  Characters = 'characters',           // Player and NPCs
  ObjectsFront = 'objects_front',      // Objects that appear in front of player
  
  // Effect and overlay layers (closest to camera)
  Effects = 'effects',                 // Particle effects, magic
  Weather = 'weather',                 // Rain, snow, fog effects
  UI = 'ui',                          // Game UI, health bars, dialogue
  Debug = 'debug'                     // Debug info, collision boxes
}

export const LAYER_Z_INDEX = {
  [LayerType.Background]: 0,
  [LayerType.Terrain]: 100,
  [LayerType.TerrainDecoration]: 200,
  [LayerType.ObjectsBack]: 300,
  [LayerType.ObjectsMid]: 400,
  [LayerType.Characters]: 500,
  [LayerType.ObjectsFront]: 600,
  [LayerType.Effects]: 700,
  [LayerType.Weather]: 800,
  [LayerType.UI]: 900,
  [LayerType.Debug]: 1000
} as const;

// Sub-layer indices for fine-grained sorting within layers
export const SUB_LAYER = {
  // Character sub-layers (for depth sorting)
  SHADOW: 0,
  BODY: 10,
  ACCESSORY: 20,
  
  // Object sub-layers
  BASE: 0,
  DECORATION: 5,
  INTERACTION: 10,
  
  // UI sub-layers
  BACKGROUND_UI: 0,
  TEXT: 10,
  OVERLAY: 20
} as const;

export interface LayerObject {
  layer: LayerType;
  subLayer?: number;
  sortKey?: number; // For Y-sorting within same layer/sublayer
}

export function getLayerZIndex(layer: LayerType, subLayer: number = 0, sortKey: number = 0): number {
  return LAYER_Z_INDEX[layer] + subLayer + (sortKey * 0.001);
}

// Helper function to create Y-sorted sprites (objects further down appear in front)
export function getYSortIndex(y: number, layer: LayerType, subLayer: number = 0): number {
  return getLayerZIndex(layer, subLayer, y);
}