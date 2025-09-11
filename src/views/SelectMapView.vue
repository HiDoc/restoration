<template>
  <div class="select-map">
    <div class="map-selector">
      <!-- Left Menu -->
      <div class="maps-menu">
        <h2>Available Maps</h2>
        <div class="maps-list">
          <div
            v-for="map in availableMaps"
            :key="map.path"
            :class="['map-item', { active: selectedMapPath === map.path }]"
            @click="selectMap(map)"
          >
            <div class="map-name">{{ map.name }}</div>
            <div class="map-info">
              {{ map.width }}x{{ map.height }} - {{ map.tileSize }}px tiles
            </div>
          </div>
        </div>
        
        <div class="menu-actions">
          <button @click="refreshMaps" class="btn btn-secondary">
            Refresh Maps
          </button>
          <button @click="testSelectedMap" class="btn btn-primary" :disabled="!selectedMapPath">
            Test Map
          </button>
        </div>
      </div>

      <!-- Map Preview -->
      <div class="map-preview-panel">
        <div class="preview-header">
          <h2>Map Preview</h2>
          <div v-if="selectedMap" class="map-details">
            <span><strong>Name:</strong> {{ selectedMap.name }}</span>
            <span><strong>Size:</strong> {{ selectedMap.width }}x{{ selectedMap.height }}</span>
            <span><strong>Tile Size:</strong> {{ selectedMap.tileSize }}px</span>
            <span><strong>Objects:</strong> {{ selectedMap.objects?.length || 0 }}</span>
            <span><strong>Spawn:</strong> ({{ selectedMap.spawnPoint?.x }}, {{ selectedMap.spawnPoint?.y }})</span>
          </div>
        </div>
        
        <div class="map-canvas-container" v-if="selectedMap">
          <div class="map-preview-canvas">
            <div
              v-for="(row, y) in selectedMap.layers[0]?.tiles"
              :key="y"
              class="preview-row"
            >
              <div
                v-for="(tile, x) in row"
                :key="x"
                :class="[
                  'preview-tile',
                  {
                    'spawn-tile': isSpawnPoint(x, y),
                    'has-object': hasObjectAt(x, y)
                  }
                ]"
                :style="{
                  backgroundColor: getTileColor(tile.type),
                }"
                :title="`${tile.type} (${x}, ${y})`"
              >
                <div v-if="isSpawnPoint(x, y)" class="spawn-marker">S</div>
                <div v-if="hasObjectAt(x, y)" class="object-marker">
                  {{ getObjectAt(x, y)?.type?.charAt(0).toUpperCase() }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-map-selected">
          <p>Select a map from the left menu to preview it here</p>
        </div>
      </div>
    </div>

    <!-- Map Data Display -->
    <div v-if="selectedMap" class="map-data-panel">
      <h3>Map Data</h3>
      <div class="data-tabs">
        <button
          v-for="tab in dataTabs"
          :key="tab"
          :class="['tab-btn', { active: activeTab === tab }]"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
      
      <div class="data-content">
        <pre v-if="activeTab === 'JSON'">{{ JSON.stringify(selectedMap, null, 2) }}</pre>
        <div v-else-if="activeTab === 'Objects'" class="objects-list">
          <div v-for="obj in selectedMap.objects" :key="obj.id" class="object-item">
            <strong>{{ obj.type }}</strong> ({{ obj.id }})
            <div>Position: ({{ Math.floor(obj.x / 32) }}, {{ Math.floor(obj.y / 32) }})</div>
            <div>Sprite: {{ obj.spriteKey }}</div>
            <div>Layer: {{ obj.layer }}</div>
          </div>
        </div>
        <div v-else-if="activeTab === 'Layers'" class="layers-list">
          <div v-for="layer in selectedMap.layers" :key="layer.name" class="layer-item">
            <strong>{{ layer.name }}</strong>
            <div>Visible: {{ layer.visible ? 'Yes' : 'No' }}</div>
            <div>Opacity: {{ layer.opacity }}</div>
            <div>Tiles: {{ layer.tiles.length }}x{{ layer.tiles[0]?.length || 0 }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface MapInfo {
  name: string;
  path: string;
  width: number;
  height: number;
  tileSize: number;
}

interface MapData {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  spawnPoint: { x: number; y: number };
  layers: Array<{
    name: string;
    visible: boolean;
    opacity: number;
    tiles: Array<Array<{ type: string }>>;
  }>;
  objects: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    spriteKey: string;
    layer: string;
    properties: any;
  }>;
}

const router = useRouter();

// Reactive state
const availableMaps = ref<MapInfo[]>([]);
const selectedMapPath = ref<string | null>(null);
const selectedMap = ref<MapData | null>(null);
const activeTab = ref('JSON');
const dataTabs = ['JSON', 'Objects', 'Layers'];
const loading = ref(false);

// Tile colors for preview
const tileColors: { [key: string]: string } = {
  grass: '#4a7c59',
  stone: '#8c8c8c',
  water: '#4a90e2',
  sand: '#f5deb3',
  path: '#8b4513',
  spawn: '#ffff00'
};

// Initialize available maps dynamically by scanning the maps directory
const initializeMaps = async () => {
  try {
    // Try to get list of maps from a maps manifest or scan directory
    // First, try to load a maps index file if it exists
    try {
      const response = await fetch('/data/maps/index.json');
      if (response.ok) {
        const mapsIndex = await response.json();
        availableMaps.value = mapsIndex.maps;
        return;
      }
    } catch (e) {
      // Index file doesn't exist, continue with manual discovery
    }

    // Fallback: try to load known maps and check if they exist
    const knownMaps = [
      '/data/maps/starter-town.json',
      '/data/maps/test-map.json',
      '/data/maps/forest-area.json',
      '/data/maps/cave-entrance.json',
      '/data/maps/town-center.json'
    ];

    const discoveredMaps: MapInfo[] = [];
    
    for (const mapPath of knownMaps) {
      try {
        const response = await fetch(mapPath);
        if (response.ok) {
          const mapData = await response.json();
          discoveredMaps.push({
            name: mapData.name || mapPath.split('/').pop()?.replace('.json', '') || 'Unknown Map',
            path: mapPath,
            width: mapData.width || 0,
            height: mapData.height || 0,
            tileSize: mapData.tileSize || 32
          });
        }
      } catch (e) {
        // Map doesn't exist or is invalid, skip it
      }
    }

    availableMaps.value = discoveredMaps;

    // If no maps were found, add default
    if (availableMaps.value.length === 0) {
      availableMaps.value = [
        {
          name: 'Starter Town',
          path: '/data/maps/starter-town.json',
          width: 20,
          height: 15,
          tileSize: 32
        }
      ];
    }
  } catch (error) {
    console.error('Error initializing maps:', error);
    // Fallback to default map
    availableMaps.value = [
      {
        name: 'Starter Town',
        path: '/data/maps/starter-town.json',
        width: 20,
        height: 15,
        tileSize: 32
      }
    ];
  }
};

// Load map data
const loadMapData = async (mapPath: string): Promise<MapData | null> => {
  try {
    loading.value = true;
    const response = await fetch(mapPath);
    if (!response.ok) {
      throw new Error(`Failed to load map: ${response.statusText}`);
    }
    const mapData = await response.json();
    return mapData;
  } catch (error) {
    console.error('Error loading map:', error);
    return null;
  } finally {
    loading.value = false;
  }
};

// Select map
const selectMap = async (map: MapInfo) => {
  selectedMapPath.value = map.path;
  selectedMap.value = await loadMapData(map.path);
};

// Helper functions
const getTileColor = (tileType: string): string => {
  return tileColors[tileType] || '#4a7c59';
};

const isSpawnPoint = (x: number, y: number): boolean => {
  return selectedMap.value?.spawnPoint?.x === x && selectedMap.value?.spawnPoint?.y === y;
};

const hasObjectAt = (x: number, y: number): boolean => {
  return selectedMap.value?.objects?.some(obj => 
    Math.floor(obj.x / 32) === x && Math.floor(obj.y / 32) === y
  ) || false;
};

const getObjectAt = (x: number, y: number) => {
  return selectedMap.value?.objects?.find(obj => 
    Math.floor(obj.x / 32) === x && Math.floor(obj.y / 32) === y
  );
};

// Actions
const refreshMaps = async () => {
  await initializeMaps();
};

const testSelectedMap = () => {
  if (selectedMapPath.value) {
    // Navigate to game with selected map as query parameter
    router.push({
      path: '/',
      query: { map: selectedMapPath.value }
    });
  }
};

// Initialize
onMounted(async () => {
  await initializeMaps();
  
  // Auto-select first map if available
  if (availableMaps.value.length > 0) {
    selectMap(availableMaps.value[0]);
  }
});
</script>

<style scoped>
.select-map {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
  font-family: 'Courier New', monospace;
}

.map-selector {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  height: 70vh;
}

.maps-menu {
  width: 300px;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.maps-menu h2 {
  margin: 0 0 15px 0;
  color: #495057;
}

.maps-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 15px;
}

.map-item {
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.map-item:hover {
  background: #e9ecef;
}

.map-item.active {
  border-color: #007acc;
  background: #cce7ff;
}

.map-name {
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}

.map-info {
  font-size: 12px;
  color: #6c757d;
}

.menu-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
  flex: 1;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-preview-panel {
  flex: 1;
  background: #fff;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  margin-bottom: 15px;
}

.preview-header h2 {
  margin: 0 0 10px 0;
  color: #495057;
}

.map-details {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 14px;
  color: #6c757d;
}

.map-canvas-container {
  flex: 1;
  overflow: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
}

.map-preview-canvas {
  display: inline-block;
  min-width: fit-content;
}

.preview-row {
  display: flex;
}

.preview-tile {
  width: 20px;
  height: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spawn-tile {
  box-shadow: inset 0 0 0 2px #ff6b6b;
}

.has-object {
  box-shadow: inset 0 0 0 1px #28a745;
}

.spawn-marker,
.object-marker {
  font-size: 10px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
}

.spawn-marker {
  color: #ff6b6b;
}

.object-marker {
  color: #28a745;
}

.no-map-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-style: italic;
}

.map-data-panel {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.map-data-panel h3 {
  margin: 0 0 15px 0;
  color: #495057;
}

.data-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 15px;
}

.tab-btn {
  padding: 8px 16px;
  border: 2px solid #dee2e6;
  background: white;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-family: inherit;
  color: #6c757d;
}

.tab-btn.active {
  border-color: #007acc;
  background: #007acc;
  color: white;
}

.data-content {
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  max-height: 300px;
  overflow: auto;
}

.data-content pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.objects-list,
.layers-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.object-item,
.layer-item {
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: #f8f9fa;
}

.object-item strong,
.layer-item strong {
  color: #495057;
  margin-bottom: 5px;
  display: block;
}

.object-item div,
.layer-item div {
  font-size: 12px;
  color: #6c757d;
  margin: 2px 0;
}
</style>
