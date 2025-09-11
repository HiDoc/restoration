/**
 * Weather system with seasonal patterns and stochastic events
 */

import { SeededRNG, RNGManager } from './SeededRNG';
import { WorldChunk } from './WorldChunk';

export interface WeatherPattern {
  temperature: { base: number; amplitude: number; phase: number }; // Seasonal temperature
  precipitation: { frequency: number; intensity: number; seasonality: number };
  windPatterns: { baseSpeed: number; gustiness: number; direction: number };
  lightCycle: { dayLength: number; seasonalVariation: number };
}

export interface WeatherEvent {
  type: WeatherEventType;
  duration: number;
  intensity: number;
  radius: number;
  centerX: number;
  centerY: number;
  startTick: number;
}

export enum WeatherEventType {
  STORM = 'storm',
  DROUGHT = 'drought', 
  HEAT_WAVE = 'heat_wave',
  COLD_SNAP = 'cold_snap',
  WIND_STORM = 'wind_storm',
  FOG = 'fog'
}

export class WeatherSystem {
  private rng: SeededRNG;
  private currentTick: number = 0;
  private activeEvents: Map<string, WeatherEvent> = new Map();
  
  // Global weather parameters
  private globalPattern: WeatherPattern;
  private seasonLength: number = 10000; // ticks per season
  // Feature toggles
  public enableStorms = true;
  public enableDroughts = true;
  public enableHeatWaves = true;
  public enableColdSnaps = true;
  public enableWindStorms = true;
  public enableFog = true;
  
  constructor() {
    this.rng = RNGManager.getInstance().getRNG('weather');
    
    // Initialize global weather pattern
    this.globalPattern = {
      temperature: { base: 20, amplitude: 15, phase: 0 },
      precipitation: { frequency: 0.1, intensity: 1.0, seasonality: 0.3 },
      windPatterns: { baseSpeed: 0.3, gustiness: 0.2, direction: 0 },
      lightCycle: { dayLength: 12, seasonalVariation: 4 }
    };
  }

  /**
   * Update weather system for current tick
   */
  update(currentTick: number, chunks: Map<string, WorldChunk>): void {
    this.currentTick = currentTick;
    
    // Update global weather patterns
    this.updateGlobalWeather();
    
    // Update weather events
    this.updateWeatherEvents();
    
    // Generate new weather events randomly
    this.generateWeatherEvents(chunks);
    
    // Apply weather to all chunks
    this.applyWeatherToChunks(chunks);
  }

  /**
   * Update global weather patterns (seasonal cycles)
   */
  private updateGlobalWeather(): void {
    const yearProgress = (this.currentTick % (this.seasonLength * 4)) / (this.seasonLength * 4);
    
    // Seasonal temperature variation
    const seasonalTemp = Math.sin((yearProgress - 0.25) * 2 * Math.PI) * this.globalPattern.temperature.amplitude;
    this.globalPattern.temperature.base = 20 + seasonalTemp;
    
    // Seasonal precipitation changes
    this.globalPattern.precipitation.frequency = 0.1 + 0.05 * Math.sin(yearProgress * 2 * Math.PI);
    
    // Wind direction shifts
    this.globalPattern.windPatterns.direction += this.rng.nextGaussian(0, 0.1);
    this.globalPattern.windPatterns.direction = this.normalizeAngle(this.globalPattern.windPatterns.direction);
    
    // Day length variation
    const dayLengthVariation = Math.sin((yearProgress - 0.25) * 2 * Math.PI) * this.globalPattern.lightCycle.seasonalVariation;
    this.globalPattern.lightCycle.dayLength = 12 + dayLengthVariation;
  }

  /**
   * Update active weather events
   */
  private updateWeatherEvents(): void {
    const toRemove: string[] = [];
    
    this.activeEvents.forEach((event, id) => {
      event.duration--;
      
      if (event.duration <= 0) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.activeEvents.delete(id));
  }

  /**
   * Generate new weather events
   */
  private generateWeatherEvents(chunks: Map<string, WorldChunk>): void {
    // Check for storm generation
    if (this.enableStorms && this.rng.next() < 0.001) { // 0.1% chance per tick
      this.generateStorm(chunks);
    }
    
    // Check for drought
    if (this.enableDroughts && this.rng.next() < 0.0005) {
      this.generateDrought(chunks);
    }
    
    // Check for heat wave
    if (this.enableHeatWaves && this.rng.next() < 0.0003 && this.globalPattern.temperature.base > 25) {
      this.generateHeatWave(chunks);
    }
    
    // Check for cold snap
    if (this.enableColdSnaps && this.rng.next() < 0.0003 && this.globalPattern.temperature.base < 15) {
      this.generateColdSnap(chunks);
    }

    // Check for wind storm
    if (this.enableWindStorms && this.rng.next() < 0.0004) {
      this.generateWindStorm(chunks);
    }

    // Check for fog
    if (this.enableFog && this.rng.next() < 0.0006) {
      this.generateFog(chunks);
    }
  }

  /**
   * Generate a storm event
   */
  private generateStorm(chunks: Map<string, WorldChunk>): void {
    const chunkIds = Array.from(chunks.keys());
    if (chunkIds.length === 0) return;
    
    const randomChunk = this.rng.choice(chunkIds);
    const [, x, y] = randomChunk.split('_').map(Number);
    
    const storm: WeatherEvent = {
      type: WeatherEventType.STORM,
      duration: this.rng.nextInt(50, 200), // 50-200 ticks
      intensity: this.rng.nextFloat(0.5, 1.0),
      radius: this.rng.nextInt(2, 5),
      centerX: x,
      centerY: y,
      startTick: this.currentTick
    };
    
    this.activeEvents.set(`storm_${this.currentTick}_${Math.random()}`, storm);
  }

  /**
   * Generate a drought event
   */
  private generateDrought(chunks: Map<string, WorldChunk>): void {
    const chunkIds = Array.from(chunks.keys());
    if (chunkIds.length === 0) return;
    
    const randomChunk = this.rng.choice(chunkIds);
    const [, x, y] = randomChunk.split('_').map(Number);
    
    const drought: WeatherEvent = {
      type: WeatherEventType.DROUGHT,
      duration: this.rng.nextInt(500, 1500), // Long duration
      intensity: this.rng.nextFloat(0.6, 1.0),
      radius: this.rng.nextInt(3, 8),
      centerX: x,
      centerY: y,
      startTick: this.currentTick
    };
    
    this.activeEvents.set(`drought_${this.currentTick}_${Math.random()}`, drought);
  }

  /**
   * Generate heat wave
   */
  private generateHeatWave(chunks: Map<string, WorldChunk>): void {
    const chunkIds = Array.from(chunks.keys());
    if (chunkIds.length === 0) return;
    
    const randomChunk = this.rng.choice(chunkIds);
    const [, x, y] = randomChunk.split('_').map(Number);
    
    const heatWave: WeatherEvent = {
      type: WeatherEventType.HEAT_WAVE,
      duration: this.rng.nextInt(200, 500),
      intensity: this.rng.nextFloat(0.7, 1.0),
      radius: this.rng.nextInt(4, 10),
      centerX: x,
      centerY: y,
      startTick: this.currentTick
    };
    
    this.activeEvents.set(`heatwave_${this.currentTick}_${Math.random()}`, heatWave);
  }

  /**
   * Generate cold snap
   */
  private generateColdSnap(chunks: Map<string, WorldChunk>): void {
    const chunkIds = Array.from(chunks.keys());
    if (chunkIds.length === 0) return;
    
    const randomChunk = this.rng.choice(chunkIds);
    const [, x, y] = randomChunk.split('_').map(Number);
    
    const coldSnap: WeatherEvent = {
      type: WeatherEventType.COLD_SNAP,
      duration: this.rng.nextInt(100, 300),
      intensity: this.rng.nextFloat(0.5, 1.0),
      radius: this.rng.nextInt(3, 7),
      centerX: x,
      centerY: y,
      startTick: this.currentTick
    };
    
    this.activeEvents.set(`coldsnap_${this.currentTick}_${Math.random()}`, coldSnap);
  }

  /**
   * Generate wind storm
   */
  private generateWindStorm(chunks: Map<string, WorldChunk>): void {
    const chunkIds = Array.from(chunks.keys());
    if (chunkIds.length === 0) return;
    const randomChunk = this.rng.choice(chunkIds);
    const [, x, y] = randomChunk.split('_').map(Number);
    const wind: WeatherEvent = {
      type: WeatherEventType.WIND_STORM,
      duration: this.rng.nextInt(50, 200),
      intensity: this.rng.nextFloat(0.4, 1.0),
      radius: this.rng.nextInt(2, 6),
      centerX: x,
      centerY: y,
      startTick: this.currentTick
    };
    this.activeEvents.set(`wind_${this.currentTick}_${Math.random()}`, wind);
  }

  /**
   * Generate fog event
   */
  private generateFog(chunks: Map<string, WorldChunk>): void {
    const chunkIds = Array.from(chunks.keys());
    if (chunkIds.length === 0) return;
    const randomChunk = this.rng.choice(chunkIds);
    const [, x, y] = randomChunk.split('_').map(Number);
    const fog: WeatherEvent = {
      type: WeatherEventType.FOG,
      duration: this.rng.nextInt(100, 400),
      intensity: this.rng.nextFloat(0.3, 0.8),
      radius: this.rng.nextInt(3, 8),
      centerX: x,
      centerY: y,
      startTick: this.currentTick
    };
    this.activeEvents.set(`fog_${this.currentTick}_${Math.random()}`, fog);
  }

  /**
   * Apply weather effects to chunks
   */
  private applyWeatherToChunks(chunks: Map<string, WorldChunk>): void {
    chunks.forEach((chunk, chunkId) => {
      const [, x, y] = chunkId.split('_').map(Number);
      
      // Apply base climate
      this.applyBaseClimate(chunk);
      
      // Apply weather events
      this.applyWeatherEvents(chunk, x, y);
      
      // Apply day/night cycle
      this.applyDayNightCycle(chunk);
    });
  }

  /**
   * Apply base climate patterns
   */
  private applyBaseClimate(chunk: WorldChunk): void {
    // Base temperature with some spatial variation
    const spatialVariation = this.rng.nextGaussian(0, 2);
    chunk.climateState.temperature = this.globalPattern.temperature.base + spatialVariation;
    
    // Base wind
    chunk.climateState.wind = Math.max(0, Math.min(1, 
      this.globalPattern.windPatterns.baseSpeed + this.rng.nextGaussian(0, 0.1)
    ));
    
    // Base rain likelihood
    chunk.climateState.rainLikelihood = Math.max(0, Math.min(1,
      this.globalPattern.precipitation.frequency + this.rng.nextGaussian(0, 0.05)
    ));
  }

  /**
   * Apply weather events to chunk
   */
  private applyWeatherEvents(chunk: WorldChunk, chunkX: number, chunkY: number): void {
    this.activeEvents.forEach(event => {
      const distance = Math.sqrt(
        Math.pow(chunkX - event.centerX, 2) + Math.pow(chunkY - event.centerY, 2)
      );
      
      if (distance <= event.radius) {
        // Calculate effect strength based on distance
        const effectStrength = Math.max(0, 1 - (distance / event.radius)) * event.intensity;
        
        this.applyWeatherEventEffects(chunk, event, effectStrength);
      }
    });
  }

  /**
   * Apply specific weather event effects
   */
  private applyWeatherEventEffects(chunk: WorldChunk, event: WeatherEvent, strength: number): void {
    switch (event.type) {
      case WeatherEventType.STORM:
        chunk.climateState.rainLikelihood = Math.min(1, chunk.climateState.rainLikelihood + strength * 0.8);
        chunk.climateState.wind = Math.min(1, chunk.climateState.wind + strength * 0.5);
        chunk.climateState.temperature -= strength * 5; // Storms cool things down
        break;
        
      case WeatherEventType.DROUGHT:
        chunk.climateState.rainLikelihood = Math.max(0, chunk.climateState.rainLikelihood - strength * 0.7);
        chunk.climateState.temperature += strength * 3; // Droughts are hot
        // Gradually reduce soil moisture
        chunk.biomeState.moisture = Math.max(0, chunk.biomeState.moisture - strength * 0.02);
        break;
        
      case WeatherEventType.HEAT_WAVE:
        chunk.climateState.temperature += strength * 8;
        chunk.climateState.rainLikelihood = Math.max(0, chunk.climateState.rainLikelihood - strength * 0.3);
        break;
        
      case WeatherEventType.COLD_SNAP:
        chunk.climateState.temperature -= strength * 10;
        chunk.climateState.wind = Math.min(1, chunk.climateState.wind + strength * 0.3);
        break;
        
      case WeatherEventType.WIND_STORM:
        chunk.climateState.wind = Math.min(1, chunk.climateState.wind + strength * 0.8);
        break;
        
      case WeatherEventType.FOG:
        chunk.climateState.light = Math.max(0, chunk.climateState.light - strength * 0.5);
        chunk.biomeState.moisture = Math.min(1, chunk.biomeState.moisture + strength * 0.1);
        break;
    }
  }

  /**
   * Apply day/night cycle
   */
  private applyDayNightCycle(chunk: WorldChunk): void {
    const totalDayTicks = 24 * 60; // 24 hour day
    
    const timeOfDay = (this.currentTick % totalDayTicks) / totalDayTicks;
    let lightLevel = 0;
    
    // Calculate sun angle
    const sunAngle = (timeOfDay - 0.25) * 2 * Math.PI; // 0.25 offset so noon is at top
    const sunHeight = Math.sin(sunAngle);
    
    if (sunHeight > 0) {
      lightLevel = sunHeight;
    }
    
    // Add atmospheric effects
    const atmosphericScattering = this.rng.nextGaussian(0, 0.05);
    lightLevel = Math.max(0, Math.min(1, lightLevel + atmosphericScattering));
    
    // Cloud cover reduces light
    const cloudCover = chunk.climateState.rainLikelihood;
    lightLevel *= (1 - cloudCover * 0.7);
    
    chunk.climateState.light = lightLevel;
  }

  /**
   * Normalize angle to [0, 2π]
   */
  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  }

  /**
   * Get current weather events
   */
  getActiveWeatherEvents(): WeatherEvent[] {
    return Array.from(this.activeEvents.values());
  }

  /**
   * Get weather events affecting a specific chunk
   */
  getWeatherEventsForChunk(chunkX: number, chunkY: number): WeatherEvent[] {
    const affectingEvents: WeatherEvent[] = [];
    
    this.activeEvents.forEach(event => {
      const distance = Math.sqrt(
        Math.pow(chunkX - event.centerX, 2) + Math.pow(chunkY - event.centerY, 2)
      );
      
      if (distance <= event.radius) {
        affectingEvents.push(event);
      }
    });
    
    return affectingEvents;
  }

  /**
   * Get current season
   */
  getCurrentSeason(): { season: string; progress: number } {
    const yearProgress = (this.currentTick % (this.seasonLength * 4)) / (this.seasonLength * 4);
    const seasonProgress = (this.currentTick % this.seasonLength) / this.seasonLength;
    
    let season = 'spring';
    if (yearProgress < 0.25) season = 'spring';
    else if (yearProgress < 0.5) season = 'summer';
    else if (yearProgress < 0.75) season = 'autumn';
    else season = 'winter';
    
    return { season, progress: seasonProgress };
  }

  /**
   * Get weather forecast for next N ticks
   */
  getForecast(_chunkX: number, _chunkY: number, ticksAhead: number): {
    temperature: number[];
    precipitation: number[];
    wind: number[];
    light: number[];
  } {
    // This would require running a simplified simulation forward
    // For now, return a simple extrapolation
    const forecast = {
      temperature: [] as number[],
      precipitation: [] as number[],
      wind: [] as number[],
      light: [] as number[]
    };
    
    // Simple linear extrapolation
    for (let i = 1; i <= ticksAhead; i++) {
      forecast.temperature.push(this.globalPattern.temperature.base + this.rng.nextGaussian(0, 2));
      forecast.precipitation.push(this.globalPattern.precipitation.frequency);
      forecast.wind.push(this.globalPattern.windPatterns.baseSpeed);
      forecast.light.push(0.5); // Average light level
    }
    
    return forecast;
  }

  /**
   * Export weather system state
   */
  exportState(): any {
    return {
      currentTick: this.currentTick,
      activeEvents: Array.from(this.activeEvents.entries()),
      globalPattern: this.globalPattern,
      seasonLength: this.seasonLength,
      rngState: this.rng.getState()
    };
  }

  /**
   * Import weather system state
   */
  importState(state: any): void {
    this.currentTick = state.currentTick;
    this.activeEvents.clear();
    state.activeEvents.forEach(([id, event]: [string, WeatherEvent]) => {
      this.activeEvents.set(id, event);
    });
    this.globalPattern = state.globalPattern;
    this.seasonLength = state.seasonLength;
    this.rng.setState(state.rngState);
  }
}
