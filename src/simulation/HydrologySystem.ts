/**
 * Hydrology system handling soil moisture diffusion, evaporation, and runoff
 */

import { SeededRNG, RNGManager } from './SeededRNG';
import { WorldChunk } from './WorldChunk';

export interface HydrologyConfig {
  diffusionRate: number;      // Rate of moisture movement between chunks
  evaporationBase: number;    // Base evaporation rate per tick
  runoffThreshold: number;    // Moisture level above which runoff occurs
  infiltrationRate: number;   // How quickly rain soaks into soil
  drainageRate: number;       // Natural drainage rate
}

export interface WaterFlow {
  fromChunkId: string;
  toChunkId: string;
  flow: number;               // Amount of water flowing
  type: 'surface' | 'groundwater';
}

export class HydrologySystem {
  private rng: SeededRNG;
  private config: HydrologyConfig;
  private waterFlows: WaterFlow[] = [];
  
  // Cached elevation map for flow calculations
  private elevationMap: Map<string, number> = new Map();
  
  constructor(config?: Partial<HydrologyConfig>) {
    this.rng = RNGManager.getInstance().getRNG('hydrology');
    
    this.config = {
      diffusionRate: 0.1,
      evaporationBase: 0.02,
      runoffThreshold: 0.8,
      infiltrationRate: 0.3,
      drainageRate: 0.01,
      ...config
    };
  }

  /**
   * Initialize elevation map for chunks (affects water flow)
   */
  initializeElevation(chunks: Map<string, WorldChunk>): void {
    chunks.forEach((_, chunkId) => {
      const [, x, y] = chunkId.split('_').map(Number);
      
      // Generate elevation using Perlin-like noise
      const elevation = this.generateElevation(x, y);
      this.elevationMap.set(chunkId, elevation);
    });
  }

  /**
   * Generate elevation for a chunk using pseudo-Perlin noise
   */
  private generateElevation(x: number, y: number): number {
    // Simple multi-octave noise for elevation
    let elevation = 0;
    let amplitude = 1;
    let frequency = 0.1;
    
    for (let octave = 0; octave < 4; octave++) {
      const noiseX = x * frequency;
      const noiseY = y * frequency;
      
      // Simplified noise function using sine waves
      const noise = Math.sin(noiseX) * Math.cos(noiseY) + 
                   Math.sin(noiseX * 2.1) * Math.cos(noiseY * 1.7) * 0.5 +
                   Math.sin(noiseX * 4.3) * Math.cos(noiseY * 3.9) * 0.25;
      
      elevation += noise * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    // Normalize to [0, 1] and add some randomness
    elevation = (elevation + 1) / 2;
    elevation += this.rng.nextGaussian(0, 0.1);
    return Math.max(0, Math.min(1, elevation));
  }

  /**
   * Update hydrology system
   */
  update(chunks: Map<string, WorldChunk>, activeChunks: Set<string>): void {
    this.waterFlows = [];
    
    // Process only active chunks for performance
    const activeChunkList = Array.from(activeChunks).map(id => chunks.get(id)).filter(Boolean) as WorldChunk[];
    
    // Calculate evaporation
    this.processEvaporation(activeChunkList);
    
    // Process precipitation infiltration
    this.processInfiltration(activeChunkList);
    
    // Calculate water flows between chunks
    this.calculateWaterFlows(chunks, activeChunks);
    
    // Apply water flows
    this.applyWaterFlows(chunks);
    
    // Natural drainage
    this.processDrainage(activeChunkList);
    
    // Update groundwater levels
    this.updateGroundwater(activeChunkList);
  }

  /**
   * Process evaporation from soil moisture
   */
  private processEvaporation(chunks: WorldChunk[]): void {
    chunks.forEach(chunk => {
      if (chunk.biomeState.moisture <= 0) return;
      
      // Base evaporation rate
      let evapRate = this.config.evaporationBase;
      
      // Temperature effects - higher temp = more evaporation
      const tempFactor = Math.max(0, (chunk.climateState.temperature - 10) / 30);
      evapRate *= (1 + tempFactor);
      
      // Wind effects - more wind = more evaporation
      evapRate *= (1 + chunk.climateState.wind * 0.5);
      
      // Canopy reduces evaporation (shade effect)
      evapRate *= (1 - chunk.biomeState.canopy * 0.4);
      
      // Light intensity affects evaporation
      evapRate *= (0.5 + chunk.climateState.light * 0.5);
      
      // Apply evaporation
      const evaporated = Math.min(chunk.biomeState.moisture, evapRate);
      chunk.biomeState.moisture -= evaporated;
    });
  }

  /**
   * Process infiltration of precipitation into soil
   */
  private processInfiltration(chunks: WorldChunk[]): void {
    chunks.forEach(chunk => {
      // Check if it's raining
      if (this.rng.next() < chunk.climateState.rainLikelihood) {
        const rainfall = this.rng.nextFloat(0.05, 0.2); // Random rainfall amount
        
        // Infiltration capacity depends on current moisture and soil properties
        const infiltrationCapacity = this.config.infiltrationRate * 
                                   (1 - chunk.biomeState.moisture) * // Less capacity when already wet
                                   (0.5 + chunk.biomeState.soil * 0.5); // Better soil = better infiltration
        
        const infiltrated = Math.min(rainfall, infiltrationCapacity);
        const runoff = rainfall - infiltrated;
        
        // Add infiltrated water to soil moisture
        chunk.biomeState.moisture = Math.min(1, chunk.biomeState.moisture + infiltrated);
        
        // Store runoff for flow calculations (add to temporary property)
        (chunk as any).tempRunoff = ((chunk as any).tempRunoff || 0) + runoff;
      }
    });
  }

  /**
   * Calculate water flows between neighboring chunks
   */
  private calculateWaterFlows(chunks: Map<string, WorldChunk>, activeChunks: Set<string>): void {
    activeChunks.forEach(chunkId => {
      const chunk = chunks.get(chunkId);
      if (!chunk) return;
      
      const [, x, y] = chunkId.split('_').map(Number);
      const currentElevation = this.elevationMap.get(chunkId) || 0;
      const currentMoisture = chunk.biomeState.moisture;
      const runoff = (chunk as any).tempRunoff || 0;
      
      // Check all neighboring chunks
      const neighbors = this.getNeighboringChunkIds(x, y);
      
      neighbors.forEach(neighborId => {
        const neighbor = chunks.get(neighborId);
        if (!neighbor) return;
        
        const neighborElevation = this.elevationMap.get(neighborId) || 0;
        const neighborMoisture = neighbor.biomeState.moisture;
        
        // Calculate hydraulic gradient
        const elevationGradient = currentElevation - neighborElevation;
        const moistureGradient = currentMoisture - neighborMoisture;
        
        // Surface water flow (runoff flows downhill)
        if (runoff > 0 && elevationGradient > 0) {
          const surfaceFlow = Math.min(runoff * 0.5, elevationGradient * 0.1);
          
          this.waterFlows.push({
            fromChunkId: chunkId,
            toChunkId: neighborId,
            flow: surfaceFlow,
            type: 'surface'
          });
        }
        
        // Groundwater flow (moisture diffusion)
        if (Math.abs(moistureGradient) > 0.1) {
          const groundwaterFlow = moistureGradient * this.config.diffusionRate;
          
          if (groundwaterFlow > 0) {
            this.waterFlows.push({
              fromChunkId: chunkId,
              toChunkId: neighborId,
              flow: Math.min(groundwaterFlow, currentMoisture * 0.1), // Max 10% per tick
              type: 'groundwater'
            });
          }
        }
      });
    });
  }

  /**
   * Apply calculated water flows
   */
  private applyWaterFlows(chunks: Map<string, WorldChunk>): void {
    // Group flows by chunk for efficient processing
    const flowsFrom: Map<string, number> = new Map();
    const flowsTo: Map<string, number> = new Map();
    
    this.waterFlows.forEach(flow => {
      flowsFrom.set(flow.fromChunkId, (flowsFrom.get(flow.fromChunkId) || 0) + flow.flow);
      flowsTo.set(flow.toChunkId, (flowsTo.get(flow.toChunkId) || 0) + flow.flow);
    });
    
    // Apply outflows
    flowsFrom.forEach((totalOutflow, chunkId) => {
      const chunk = chunks.get(chunkId);
      if (chunk) {
        chunk.biomeState.moisture = Math.max(0, chunk.biomeState.moisture - totalOutflow);
        // Clear temporary runoff
        delete (chunk as any).tempRunoff;
      }
    });
    
    // Apply inflows
    flowsTo.forEach((totalInflow, chunkId) => {
      const chunk = chunks.get(chunkId);
      if (chunk) {
        chunk.biomeState.moisture = Math.min(1, chunk.biomeState.moisture + totalInflow);
      }
    });
  }

  /**
   * Process natural drainage
   */
  private processDrainage(chunks: WorldChunk[]): void {
    chunks.forEach(chunk => {
      if (chunk.biomeState.moisture > 0) {
        // Natural drainage rate depends on soil properties
        const drainageRate = this.config.drainageRate * (0.5 + chunk.biomeState.soil * 0.5);
        
        const drained = Math.min(chunk.biomeState.moisture, drainageRate);
        chunk.biomeState.moisture -= drained;
      }
    });
  }

  /**
   * Update groundwater levels (simplified)
   */
  private updateGroundwater(chunks: WorldChunk[]): void {
    chunks.forEach(chunk => {
      // Groundwater slowly equilibrates with surface moisture
      // This is a simplified model - real groundwater is much more complex
      
      // Assume chunks have a "groundwater" property we can access
      if (!(chunk as any).groundwaterLevel) {
        (chunk as any).groundwaterLevel = chunk.biomeState.moisture * 0.5;
      }
      
      const groundwater = (chunk as any).groundwaterLevel;
      const equilibriumLevel = chunk.biomeState.moisture * 0.7;
      
      // Slow equilibration
      const adjustment = (equilibriumLevel - groundwater) * 0.01;
      (chunk as any).groundwaterLevel = Math.max(0, Math.min(1, groundwater + adjustment));
      
      // Groundwater can contribute to surface moisture during dry periods
      if (chunk.biomeState.moisture < 0.2 && groundwater > 0.3) {
        const upwelling = (groundwater - 0.3) * 0.005;
        chunk.biomeState.moisture += upwelling;
        (chunk as any).groundwaterLevel -= upwelling;
      }
    });
  }

  /**
   * Get neighboring chunk IDs
   */
  private getNeighboringChunkIds(x: number, y: number): string[] {
    return [
      `chunk_${x-1}_${y}`,   // West
      `chunk_${x+1}_${y}`,   // East  
      `chunk_${x}_${y-1}`,   // North
      `chunk_${x}_${y+1}`,   // South
      // Diagonal neighbors for more realistic flow
      `chunk_${x-1}_${y-1}`, // Northwest
      `chunk_${x+1}_${y-1}`, // Northeast
      `chunk_${x-1}_${y+1}`, // Southwest
      `chunk_${x+1}_${y+1}`  // Southeast
    ];
  }

  /**
   * Get water table depth at a chunk
   */
  getWaterTableDepth(chunkId: string): number {
    const chunk = this.getChunkFromId(chunkId);
    if (!chunk) return 0;
    
    const groundwater = (chunk as any).groundwaterLevel || 0;
    return Math.max(0, 1 - groundwater); // Inverted - high groundwater = shallow table
  }

  /**
   * Get current water flows
   */
  getCurrentFlows(): WaterFlow[] {
    return [...this.waterFlows];
  }

  /**
   * Get flows affecting a specific chunk
   */
  getFlowsForChunk(chunkId: string): { incoming: WaterFlow[]; outgoing: WaterFlow[] } {
    const incoming = this.waterFlows.filter(flow => flow.toChunkId === chunkId);
    const outgoing = this.waterFlows.filter(flow => flow.fromChunkId === chunkId);
    
    return { incoming, outgoing };
  }

  /**
   * Calculate watershed for a chunk (which chunks drain to this one)
   */
  calculateWatershed(centerChunkId: string, chunks: Map<string, WorldChunk>): Set<string> {
    const watershed = new Set<string>();
    const toProcess = [centerChunkId];
    const centerElevation = this.elevationMap.get(centerChunkId) || 0;
    
    while (toProcess.length > 0) {
      const currentId = toProcess.pop()!;
      if (watershed.has(currentId)) continue;
      
      watershed.add(currentId);
      const [, x, y] = currentId.split('_').map(Number);
      const neighbors = this.getNeighboringChunkIds(x, y);
      
      neighbors.forEach(neighborId => {
        if (!chunks.has(neighborId) || watershed.has(neighborId)) return;
        
        const neighborElevation = this.elevationMap.get(neighborId) || 0;
        
        // If neighbor is higher than current, it's in the watershed
        if (neighborElevation > centerElevation) {
          toProcess.push(neighborId);
        }
      });
    }
    
    return watershed;
  }

  /**
   * Simulate flood event
   */
  simulateFlood(centerChunkId: string, intensity: number, duration: number): void {
    // Add massive amount of water to simulate flood
    const chunks = this.getActiveChunks();
    const centerChunk = chunks.find(c => c.id === centerChunkId);
    
    if (centerChunk) {
      // Add flood water over multiple ticks
      for (let tick = 0; tick < duration; tick++) {
        setTimeout(() => {
          centerChunk.biomeState.moisture = Math.min(1, centerChunk.biomeState.moisture + intensity * 0.1);
          (centerChunk as any).tempRunoff = ((centerChunk as any).tempRunoff || 0) + intensity * 0.2;
        }, tick * 100); // Spread over time
      }
    }
  }

  /**
   * Helper to get chunk from ID (this would need access to chunks map)
   */
  private getChunkFromId(_chunkId: string): WorldChunk | null {
    // This is a placeholder - in practice, this would need to be passed in
    // or the hydrology system would need a reference to the chunk collection
    return null;
  }

  /**
   * Helper to get active chunks (placeholder)
   */
  private getActiveChunks(): WorldChunk[] {
    // Placeholder - would need access to active chunks
    return [];
  }

  /**
   * Export hydrology state
   */
  exportState(): any {
    return {
      config: this.config,
      elevationMap: Array.from(this.elevationMap.entries()),
      waterFlows: this.waterFlows,
      rngState: this.rng.getState()
    };
  }

  /**
   * Import hydrology state
   */
  importState(state: any): void {
    this.config = state.config;
    this.elevationMap.clear();
    state.elevationMap.forEach(([id, elevation]: [string, number]) => {
      this.elevationMap.set(id, elevation);
    });
    this.waterFlows = state.waterFlows;
    this.rng.setState(state.rngState);
  }
}
