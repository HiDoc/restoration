<template>
  <div class="map-generator">
    <div class="editor-header">
      <h1>Map Generator</h1>
      <div class="toolbar">
        <button @click="clearMap" class="btn btn-secondary">Clear Map</button>
        <button @click="saveMap" class="btn btn-primary">Save Map</button>
        <input
          v-model="mapName"
          placeholder="Map Name"
          class="map-name-input"
        />
        <div class="map-size">
          <label>Width:</label>
          <input
            v-model.number="mapWidth"
            type="number"
            min="10"
            max="50"
            @change="resizeMap"
          />
          <label>Height:</label>
          <input
            v-model.number="mapHeight"
            type="number"
            min="10"
            max="50"
            @change="resizeMap"
          />
        </div>
      </div>
    </div>

    <div class="editor-container">
      <!-- Tile Palette -->
      <div class="tile-palette">
        <h3>Tile Palette</h3>
        <div class="palette-section">
          <h4>Ground Tiles</h4>
          <div class="tile-grid">
            <div
              v-for="tile in groundTiles"
              :key="tile.type"
              :class="['palette-tile', { active: selectedTile?.type === tile.type }]"
              @click="selectTile(tile)"
              draggable="true"
              @dragstart="handleDragStart($event, tile)"
            >
              <div class="tile-preview" :style="{ backgroundColor: tile.color }"></div>
              <span class="tile-name">{{ tile.name }}</span>
            </div>
          </div>
        </div>

        <div class="palette-section">
          <h4>Objects</h4>
          <div class="tile-grid">
            <div
              v-for="obj in objectTypes"
              :key="obj.type"
              :class="['palette-tile', { active: selectedTile?.type === obj.type }]"
              @click="selectTile(obj)"
              draggable="true"
              @dragstart="handleDragStart($event, obj)"
            >
              <div class="tile-preview" :style="{ backgroundColor: obj.color }"></div>
              <span class="tile-name">{{ obj.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Map Canvas -->
      <div class="map-canvas-container">
        <div class="canvas-header">
          <h3>Map Editor ({{ mapWidth }}x{{ mapHeight }})</h3>
          <div class="spawn-controls">
            <label>
              <input
                type="checkbox"
                v-model="spawnMode"
                @change="toggleSpawnMode"
              />
              Set Spawn Point
            </label>
          </div>
        </div>
        
        <div 
          class="map-canvas"
          @dragover="handleDragOver"
          @drop="handleDrop"
          @selectstart.prevent
        >
          <div
            v-for="(row, y) in mapTiles"
            :key="y"
            class="map-row"
          >
            <div
              v-for="(tile, x) in row"
              :key="x"
              :class="[
                'map-tile',
                { 
                  'spawn-point': isSpawnPoint(x, y),
                  'has-object': hasObject(x, y),
                  'selected': isSelected(x, y),
                  'in-selection': isInSelectionArea(x, y)
                }
              ]"
              :style="{
                backgroundColor: getTileColor(tile),
                position: 'relative'
              }"
              @mousedown="startDrag(x, y)"
              @mouseenter="updateDrag(x, y)"
              @mouseup="endDrag(x, y)"
              @click="placeTile(x, y)"
              @contextmenu.prevent="removeTile(x, y)"
            >
              <div v-if="isSpawnPoint(x, y)" class="spawn-indicator">S</div>
              <div v-if="hasObject(x, y)" class="object-indicator">
                {{ getObjectAt(x, y)?.type?.charAt(0).toUpperCase() }}
              </div>
              <div class="tile-coords">{{ x }},{{ y }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Map Data Preview -->
    <div class="map-preview">
      <h3>Map Data Preview</h3>
      <pre>{{ JSON.stringify(generateMapData(), null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface TileType {
  type: string;
  name: string;
  color: string;
  walkable?: boolean;
}

interface MapObject {
  id: string;
  type: string;
  x: number;
  y: number;
  spriteKey: string;
  layer: string;
  properties: any;
}

interface MapTile {
  type: string;
}

// Reactive state
const mapName = ref('New Map');
const mapWidth = ref(20);
const mapHeight = ref(15);
const spawnMode = ref(false);
const selectedTile = ref<TileType | null>(null);
const spawnPoint = ref({ x: 10, y: 12 });
const isDragging = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragEnd = ref<{ x: number; y: number } | null>(null);
const selectedTiles = ref(new Set<string>());

// Map data
const mapTiles = ref<MapTile[][]>([]);
const mapObjects = ref<MapObject[]>([]);

// Tile types
const groundTiles: TileType[] = [
  { type: 'grass', name: 'Grass', color: '#4a7c59', walkable: true },
  { type: 'stone', name: 'Stone', color: '#8c8c8c', walkable: false },
  { type: 'water', name: 'Water', color: '#4a90e2', walkable: false },
  { type: 'sand', name: 'Sand', color: '#f5deb3', walkable: true },
  { type: 'path', name: 'Path', color: '#8b4513', walkable: true },
  { type: 'spawn', name: 'Spawn', color: '#ffff00', walkable: true }
];

const objectTypes: TileType[] = [
  { type: 'tree', name: 'Tree', color: '#228b22' },
  { type: 'rock', name: 'Rock', color: '#696969' },
  { type: 'chest', name: 'Chest', color: '#8b4513' },
  { type: 'bush', name: 'Bush', color: '#32cd32' }
];

// Initialize map
const initializeMap = () => {
  mapTiles.value = Array(mapHeight.value).fill(null).map(() =>
    Array(mapWidth.value).fill(null).map(() => ({ type: 'grass' }))
  );
  mapObjects.value = [];
};

// Tile operations
const selectTile = (tile: TileType) => {
  selectedTile.value = tile;
  spawnMode.value = false;
};

const toggleSpawnMode = () => {
  if (spawnMode.value) {
    selectedTile.value = null;
  }
};

// Selection area functions
const isSelected = (x: number, y: number): boolean => {
  return selectedTiles.value.has(`${x},${y}`);
};

const isInSelectionArea = (x: number, y: number): boolean => {
  if (!isDragging.value || !dragStart.value || !dragEnd.value) return false;
  
  const minX = Math.min(dragStart.value.x, dragEnd.value.x);
  const maxX = Math.max(dragStart.value.x, dragEnd.value.x);
  const minY = Math.min(dragStart.value.y, dragEnd.value.y);
  const maxY = Math.max(dragStart.value.y, dragEnd.value.y);
  
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

// Drag selection functions
const startDrag = (x: number, y: number) => {
  isDragging.value = true;
  dragStart.value = { x, y };
  dragEnd.value = { x, y };
  selectedTiles.value.clear();
};

const updateDrag = (x: number, y: number) => {
  if (isDragging.value) {
    dragEnd.value = { x, y };
  }
};

const endDrag = (x: number, y: number) => {
  if (!isDragging.value || !dragStart.value) return;
  
  dragEnd.value = { x, y };
  
  // Calculate selection area
  const minX = Math.min(dragStart.value.x, x);
  const maxX = Math.max(dragStart.value.x, x);
  const minY = Math.min(dragStart.value.y, y);
  const maxY = Math.max(dragStart.value.y, y);
  
  // Add tiles to selection
  selectedTiles.value.clear();
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      selectedTiles.value.add(`${tx},${ty}`);
    }
  }
  
  // Apply selected tile to all selected positions
  if (selectedTile.value && selectedTiles.value.size > 0) {
    selectedTiles.value.forEach(tileKey => {
      const [tileX, tileY] = tileKey.split(',').map(Number);
      placeTileAt(tileX, tileY);
    });
  }
  
  isDragging.value = false;
  dragStart.value = null;
  dragEnd.value = null;
  
  // Clear selection after a short delay
  setTimeout(() => {
    selectedTiles.value.clear();
  }, 500);
};

const placeTile = (x: number, y: number) => {
  if (spawnMode.value) {
    spawnPoint.value = { x, y };
    return;
  }
  placeTileAt(x, y);
};

const placeTileAt = (x: number, y: number) => {
  if (!selectedTile.value) return;

  if (objectTypes.find(obj => obj.type === selectedTile.value?.type)) {
    // Place object
    const objectId = `${selectedTile.value.type}_${Date.now()}_${x}_${y}`;
    const newObject: MapObject = {
      id: objectId,
      type: selectedTile.value.type,
      x: x * 32, // Convert to pixel coordinates
      y: y * 32,
      spriteKey: getSpriteKeyForObject(selectedTile.value.type),
      layer: getLayerForObject(selectedTile.value.type),
      properties: {}
    };
    
    // Remove existing object at this position
    mapObjects.value = mapObjects.value.filter(obj => 
      Math.floor(obj.x / 32) !== x || Math.floor(obj.y / 32) !== y
    );
    
    mapObjects.value.push(newObject);
  } else {
    // Place ground tile
    mapTiles.value[y][x] = { type: selectedTile.value.type };
  }
};

const removeTile = (x: number, y: number) => {
  // Remove object if exists
  mapObjects.value = mapObjects.value.filter(obj => 
    Math.floor(obj.x / 32) !== x || Math.floor(obj.y / 32) !== y
  );
  
  // Reset to grass
  mapTiles.value[y][x] = { type: 'grass' };
};

// Helper functions
const getTileColor = (tile: MapTile): string => {
  const tileType = groundTiles.find(t => t.type === tile.type);
  return tileType?.color || '#4a7c59';
};

const isSpawnPoint = (x: number, y: number): boolean => {
  return spawnPoint.value.x === x && spawnPoint.value.y === y;
};

const hasObject = (x: number, y: number): boolean => {
  return mapObjects.value.some(obj => 
    Math.floor(obj.x / 32) === x && Math.floor(obj.y / 32) === y
  );
};

const getObjectAt = (x: number, y: number): MapObject | undefined => {
  return mapObjects.value.find(obj => 
    Math.floor(obj.x / 32) === x && Math.floor(obj.y / 32) === y
  );
};

const getSpriteKeyForObject = (type: string): string => {
  const spriteMap: { [key: string]: string } = {
    'tree': 'plant_large_trees',
    'bush': 'plant_medium_bushes',
    'chest': 'chest',
    'rock': 'props_rock'
  };
  return spriteMap[type] || type;
};

const getLayerForObject = (type: string): string => {
  const layerMap: { [key: string]: string } = {
    'tree': 'objects_back',
    'bush': 'objects_mid',
    'chest': 'objects_mid',
    'rock': 'objects_mid'
  };
  return layerMap[type] || 'objects_mid';
};

// Drag and drop
const handleDragStart = (event: DragEvent, tile: TileType) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify(tile));
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    const tileData = JSON.parse(event.dataTransfer.getData('text/plain')) as TileType;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / 32);
    const y = Math.floor((event.clientY - rect.top) / 32);
    
    if (x >= 0 && x < mapWidth.value && y >= 0 && y < mapHeight.value) {
      selectedTile.value = tileData;
      placeTile(x, y);
    }
  }
};

// Map operations
const clearMap = () => {
  initializeMap();
  spawnPoint.value = { x: Math.floor(mapWidth.value / 2), y: Math.floor(mapHeight.value - 3) };
};

const resizeMap = () => {
  const newTiles = Array(mapHeight.value).fill(null).map((_, y) =>
    Array(mapWidth.value).fill(null).map((_, x) => {
      if (y < mapTiles.value.length && x < mapTiles.value[y].length) {
        return mapTiles.value[y][x];
      }
      return { type: 'grass' };
    })
  );
  mapTiles.value = newTiles;
  
  // Filter out objects that are now outside the map bounds
  mapObjects.value = mapObjects.value.filter(obj => 
    Math.floor(obj.x / 32) < mapWidth.value && Math.floor(obj.y / 32) < mapHeight.value
  );
  
  // Adjust spawn point if it's outside the new bounds
  if (spawnPoint.value.x >= mapWidth.value) spawnPoint.value.x = mapWidth.value - 1;
  if (spawnPoint.value.y >= mapHeight.value) spawnPoint.value.y = mapHeight.value - 1;
};

const generateMapData = () => {
  return {
    name: mapName.value,
    width: mapWidth.value,
    height: mapHeight.value,
    tileSize: 32,
    spawnPoint: { 
      x: spawnPoint.value.x, 
      y: spawnPoint.value.y 
    },
    layers: [
      {
        name: 'ground',
        visible: true,
        opacity: 1.0,
        tiles: mapTiles.value
      }
    ],
    objects: mapObjects.value
  };
};

const saveMap = () => {
  const mapData = generateMapData();
  const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mapName.value.toLowerCase().replace(/\s+/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Initialize
onMounted(() => {
  initializeMap();
  selectedTile.value = groundTiles[0]; // Select grass by default
});
</script>

<style scoped>
.map-generator {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Courier New', monospace;
}

.editor-header {
  margin-bottom: 20px;
}

.editor-header h1 {
  margin: 0 0 15px 0;
  color: #333;
}

.toolbar {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

.map-name-input {
  padding: 8px;
  border: 2px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
  min-width: 150px;
}

.map-size {
  display: flex;
  gap: 10px;
  align-items: center;
}

.map-size input {
  width: 60px;
  padding: 5px;
  border: 2px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
}

.editor-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.tile-palette {
  width: 250px;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  height: fit-content;
}

.tile-palette h3 {
  margin: 0 0 15px 0;
  color: #495057;
}

.palette-section {
  margin-bottom: 20px;
}

.palette-section h4 {
  margin: 0 0 10px 0;
  color: #6c757d;
  font-size: 14px;
}

.tile-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.palette-tile:hover {
  background: #e9ecef;
}

.palette-tile.active .tile-preview {
  border-color: #007acc;
  border-width: 3px;
  box-shadow: 0 0 0 2px #007acc;
}

.tile-preview {
  width: 24px;
  height: 24px;
  border: 1px solid #000;
  flex-shrink: 0;
}

.tile-name {
  font-size: 12px;
  font-weight: bold;
}

.map-canvas-container {
  flex: 1;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.canvas-header h3 {
  margin: 0;
  color: #495057;
}

.spawn-controls {
  display: flex;
  align-items: center;
  gap: 5px;
}

.map-canvas {
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  overflow: auto;
  max-height: 600px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.map-row {
  display: flex;
}

.map-tile {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-tile:hover {
  border-color: #007acc;
  border-width: 2px;
}

.spawn-point {
  box-shadow: inset 0 0 0 3px #ff6b6b;
}

.has-object {
  box-shadow: inset 0 0 0 2px #28a745;
}

.selected {
  box-shadow: inset 0 0 0 3px #007acc;
}

.in-selection {
  background: rgba(0, 122, 204, 0.2);
  box-shadow: inset 0 0 0 1px #007acc;
}

.spawn-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  background: #ff6b6b;
  color: white;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
}

.object-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #28a745;
  color: white;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
}

.tile-coords {
  position: absolute;
  bottom: 1px;
  left: 1px;
  font-size: 6px;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

.map-preview {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  max-height: 300px;
  overflow: auto;
}

.map-preview h3 {
  margin: 0 0 10px 0;
  color: #495057;
}

.map-preview pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #495057;
}
</style>
