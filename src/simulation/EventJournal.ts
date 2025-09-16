/**
 * Event Journal for recording and replaying simulation events
 * Ensures deterministic reproduction of simulation states
 */

export interface SimulationEvent {
  tick: number;
  timestamp: number;
  type: EventType;
  data: any;
  chunkId?: string;
  playerId?: string;
}

export enum EventType {
  // Player actions
  PLAYER_PLANT = 'player_plant',
  PLAYER_HYBRIDIZE = 'player_hybridize', 
  PLAYER_IRRIGATE = 'player_irrigate',
  PLAYER_CLEANSE = 'player_cleanse',
  PLAYER_RITUAL = 'player_ritual',
  
  // System events
  WEATHER_CHANGE = 'weather_change',
  CHUNK_UPDATE = 'chunk_update',
  SPECIES_SPAWN = 'species_spawn',
  SPECIES_DIE = 'species_die',
  SEED_SELECTION = 'seed_selection',
  POLLINATOR_MOVE = 'pollinator_move',
  HYBRID_CREATED = 'hybrid_created',
  
  // Simulation control
  SIM_START = 'sim_start',
  SIM_PAUSE = 'sim_pause',
  SIM_RESUME = 'sim_resume',
  SIM_RESET = 'sim_reset',
  TICK_ADVANCE = 'tick_advance',
  YEAR_END = 'year_end',
  YEAR_START = 'year_start'
}

export class EventJournal {
  private events: SimulationEvent[] = [];
  private currentTick: number = 0;
  private replayMode: boolean = false;
  private replayIndex: number = 0;
  private maxEvents: number = 10000; // Prevent memory overflow

  constructor() {}

  /**
   * Record a new event
   */
  recordEvent(type: EventType, data: any, chunkId?: string, playerId?: string): void {
    if (this.replayMode) {
      console.warn('Cannot record events during replay mode');
      return;
    }

    const event: SimulationEvent = {
      tick: this.currentTick,
      timestamp: Date.now(),
      type,
      data: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
      chunkId,
      playerId
    };

    this.events.push(event);
    
    // Trim old events if needed
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents * 0.8); // Keep 80% of max
    }
  }

  /**
   * Advance simulation tick
   */
  advanceTick(): void {
    this.currentTick++;
    this.recordEvent(EventType.TICK_ADVANCE, { tick: this.currentTick });
  }

  /**
   * Get current tick
   */
  getCurrentTick(): number {
    return this.currentTick;
  }

  /**
   * Set current tick (use carefully)
   */
  setCurrentTick(tick: number): void {
    this.currentTick = tick;
  }

  /**
   * Get all events
   */
  getAllEvents(): SimulationEvent[] {
    return [...this.events];
  }

  /**
   * Get events for specific tick range
   */
  getEventsForTicks(startTick: number, endTick: number): SimulationEvent[] {
    return this.events.filter(event => 
      event.tick >= startTick && event.tick <= endTick
    );
  }

  /**
   * Get events for specific chunk
   */
  getEventsForChunk(chunkId: string): SimulationEvent[] {
    return this.events.filter(event => event.chunkId === chunkId);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: EventType): SimulationEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get player events
   */
  getPlayerEvents(playerId?: string): SimulationEvent[] {
    const playerEventTypes = [
      EventType.PLAYER_PLANT,
      EventType.PLAYER_HYBRIDIZE,
      EventType.PLAYER_IRRIGATE,
      EventType.PLAYER_CLEANSE,
      EventType.PLAYER_RITUAL
    ];

    return this.events.filter(event => {
      const isPlayerEvent = playerEventTypes.includes(event.type);
      return playerId ? (isPlayerEvent && event.playerId === playerId) : isPlayerEvent;
    });
  }

  /**
   * Start replay mode from beginning
   */
  startReplay(): void {
    this.replayMode = true;
    this.replayIndex = 0;
    this.currentTick = 0;
  }

  /**
   * Start replay from specific tick
   */
  startReplayFromTick(tick: number): void {
    this.replayMode = true;
    this.replayIndex = this.events.findIndex(event => event.tick >= tick);
    if (this.replayIndex === -1) {
      this.replayIndex = this.events.length;
    }
    this.currentTick = tick;
  }

  /**
   * Get next event during replay
   */
  getNextReplayEvent(): SimulationEvent | null {
    if (!this.replayMode || this.replayIndex >= this.events.length) {
      return null;
    }

    const event = this.events[this.replayIndex];
    if (event.tick <= this.currentTick) {
      this.replayIndex++;
      return event;
    }

    return null;
  }

  /**
   * Stop replay mode
   */
  stopReplay(): void {
    this.replayMode = false;
    this.replayIndex = 0;
  }

  /**
   * Check if in replay mode
   */
  isReplaying(): boolean {
    return this.replayMode;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.currentTick = 0;
    this.replayMode = false;
    this.replayIndex = 0;
  }

  /**
   * Export journal to JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      events: this.events,
      currentTick: this.currentTick,
      exportTimestamp: Date.now()
    }, null, 2);
  }

  /**
   * Import journal from JSON
   */
  importFromJSON(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      this.events = data.events || [];
      this.currentTick = data.currentTick || 0;
      this.replayMode = false;
      this.replayIndex = 0;
    } catch (error) {
      console.error('Failed to import journal:', error);
      throw new Error('Invalid journal JSON format');
    }
  }

  /**
   * Get journal statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    tickRange: { min: number; max: number };
    playerEventCount: number;
    systemEventCount: number;
  } {
    const eventsByType: Record<string, number> = {};
    let minTick = Infinity;
    let maxTick = -Infinity;
    let playerEventCount = 0;
    let systemEventCount = 0;

    const playerEventTypes = [
      EventType.PLAYER_PLANT,
      EventType.PLAYER_HYBRIDIZE,
      EventType.PLAYER_IRRIGATE,
      EventType.PLAYER_CLEANSE,
      EventType.PLAYER_RITUAL
    ];

    this.events.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      // Track tick range
      minTick = Math.min(minTick, event.tick);
      maxTick = Math.max(maxTick, event.tick);
      
      // Count player vs system events
      if (playerEventTypes.includes(event.type)) {
        playerEventCount++;
      } else {
        systemEventCount++;
      }
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      tickRange: { min: minTick === Infinity ? 0 : minTick, max: maxTick === -Infinity ? 0 : maxTick },
      playerEventCount,
      systemEventCount
    };
  }

  /**
   * Validate journal integrity
   */
  validateIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check tick ordering
    for (let i = 1; i < this.events.length; i++) {
      if (this.events[i].tick < this.events[i-1].tick) {
        errors.push(`Tick ordering violation at index ${i}: ${this.events[i].tick} < ${this.events[i-1].tick}`);
      }
    }
    
    // Check for required fields
    this.events.forEach((event, index) => {
      if (typeof event.tick !== 'number') {
        errors.push(`Missing tick at index ${index}`);
      }
      if (typeof event.timestamp !== 'number') {
        errors.push(`Missing timestamp at index ${index}`);
      }
      if (!event.type) {
        errors.push(`Missing type at index ${index}`);
      }
      if (event.data === undefined) {
        errors.push(`Missing data at index ${index}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
