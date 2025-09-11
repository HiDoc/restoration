import { Container } from 'pixi.js';
import { LayerType, LAYER_Z_INDEX, LayerObject, getYSortIndex } from './Layers';

export type LayeredObject = Container & LayerObject & { updateZIndex?(): void };

export class LayerManager {
  private rootContainer: Container;
  private layers: Map<LayerType, Container> = new Map();
  private layeredObjects: Set<LayeredObject> = new Set();

  constructor(rootContainer: Container) {
    this.rootContainer = rootContainer;
    this.initializeLayers();
  }

  private initializeLayers(): void {
    // Create containers for each layer type
    Object.values(LayerType).forEach(layerType => {
      const layerContainer = new Container();
      layerContainer.name = `Layer_${layerType}`;
      layerContainer.zIndex = LAYER_Z_INDEX[layerType];
      
      this.layers.set(layerType, layerContainer);
      this.rootContainer.addChild(layerContainer);
    });

    // Enable sorting on root container
    this.rootContainer.sortableChildren = true;
  }

  addObject(object: LayeredObject): void {
    const layer = this.layers.get(object.layer);
    if (!layer) {
      console.error(`Layer ${object.layer} not found`);
      return;
    }

    // Add to appropriate layer
    layer.addChild(object);
    this.layeredObjects.add(object);

    // Set initial z-index
    this.updateObjectZIndex(object);

    // Enable sorting on layer if it contains Y-sorted objects
    if (this.isYSortedLayer(object.layer)) {
      layer.sortableChildren = true;
    }
  }

  removeObject(object: LayeredObject): void {
    if (object.parent) {
      object.parent.removeChild(object);
    }
    this.layeredObjects.delete(object);
  }

  moveObjectToLayer(object: LayeredObject, newLayer: LayerType): void {
    this.removeObject(object);
    object.layer = newLayer;
    this.addObject(object);
  }

  private updateObjectZIndex(object: LayeredObject): void {
    const baseZIndex = LAYER_Z_INDEX[object.layer];
    const subLayer = object.subLayer || 0;
    
    if (this.isYSortedLayer(object.layer)) {
      // Use Y-position for depth sorting
      object.zIndex = getYSortIndex(object.y, object.layer, subLayer);
    } else {
      // Use sort key or sub-layer for static sorting
      const sortKey = object.sortKey || 0;
      object.zIndex = baseZIndex + subLayer + (sortKey * 0.001);
    }
  }

  // Update all Y-sorted objects (call this when objects move)
  updateYSorting(): void {
    this.layeredObjects.forEach(object => {
      if (this.isYSortedLayer(object.layer)) {
        this.updateObjectZIndex(object);
        if (object.updateZIndex) {
          object.updateZIndex();
        }
      }
    });
  }

  private isYSortedLayer(layer: LayerType): boolean {
    return layer === LayerType.Characters || 
           layer === LayerType.ObjectsBack || 
           layer === LayerType.ObjectsMid || 
           layer === LayerType.ObjectsFront;
  }

  getLayer(layerType: LayerType): Container | undefined {
    return this.layers.get(layerType);
  }

  getAllLayers(): Map<LayerType, Container> {
    return new Map(this.layers);
  }

  // Get objects in a specific layer
  getObjectsInLayer(layerType: LayerType): LayeredObject[] {
    return Array.from(this.layeredObjects).filter(obj => obj.layer === layerType);
  }

  // Debug: Show layer structure
  debugLayers(): void {
    console.log('Layer Structure:');
    this.layers.forEach((container, layerType) => {
      console.log(`  ${layerType}: ${container.children.length} objects (z: ${container.zIndex})`);
    });
  }

  // Clear all objects from all layers
  clearAllLayers(): void {
    this.layeredObjects.clear();
    this.layers.forEach(layer => {
      layer.removeChildren();
    });
  }

  // Clear specific layer
  clearLayer(layerType: LayerType): void {
    const layer = this.layers.get(layerType);
    if (layer) {
      // Remove from tracking
      this.layeredObjects.forEach(obj => {
        if (obj.layer === layerType) {
          this.layeredObjects.delete(obj);
        }
      });
      
      layer.removeChildren();
    }
  }
}
