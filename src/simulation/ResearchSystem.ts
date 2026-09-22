/**
 * Research and discovery system for progressive species revelation
 * Tracks observations, unlocks traits, and triggers educational milestones
 */

import { WorldChunk, SpeciesInstance } from './WorldChunk';
import { EventJournal } from './EventJournal';

/**
 * Progressive trait categories unlocked through observation
 */
export enum TraitCategory {
  BASIC = 'basic',                   // Visible immediately: name, appearance
  ENVIRONMENTAL = 'environmental',   // 10 observations: temp/moisture/light ranges
  REPRODUCTIVE = 'reproductive',     // 25 observations: pollination, seeds
  ECOLOGICAL = 'ecological',         // 50 observations: succession, interactions
  GENETIC = 'genetic'                // 100 observations: genetic traits, mutations
}

/**
 * How a species was discovered
 */
export enum DiscoveryMethod {
  INITIAL = 'initial',               // Starting species
  ENVIRONMENTAL = 'environmental',   // Appeared due to conditions
  SUCCESSION = 'succession',         // Emerged through succession
  INTERVENTION = 'intervention',     // Player-introduced
  HYBRID = 'hybrid'                  // Cross-breeding discovery
}

/**
 * Species discovery event
 */
export interface SpeciesDiscovery {
  speciesId: string;
  firstSeenTick: number;
  discoveryConditions: string;       // Human-readable context
  unlockMethod: DiscoveryMethod;
  chunkId?: string;                  // Where discovered
}

/**
 * Achievement progress tracking
 */
export interface AchievementProgress {
  achievementId: string;
  progress: number;                  // 0-1 completion
  unlocked: boolean;
  unlockedAtTick?: number;
}

/**
 * Research question to guide player experimentation
 */
export interface ResearchQuestion {
  id: string;
  question: string;
  hint: string;
  educationalGoal: string;
  difficulty: number;                // 1-5
  active: boolean;
  completedAtTick?: number;
}

/**
 * Core research state (minimal storage)
 */
export interface ResearchState {
  // Species discovery
  discoveredSpecies: Set<string>;
  speciesObservations: Map<string, number>;
  discoveries: Map<string, SpeciesDiscovery>;

  // Trait research (progressive detail)
  researchedTraits: Map<string, Set<TraitCategory>>;

  // Achievements and learning
  achievements: Map<string, AchievementProgress>;
  activeQuestions: ResearchQuestion[];
  researchNotes: Map<string, string[]>;

  // Statistics
  totalObservations: number;
  researchStartTick: number;
}

/**
 * Observation thresholds for trait unlocking
 */
const TRAIT_UNLOCK_THRESHOLDS = {
  [TraitCategory.BASIC]: 0,          // Immediate
  [TraitCategory.ENVIRONMENTAL]: 10,
  [TraitCategory.REPRODUCTIVE]: 25,
  [TraitCategory.ECOLOGICAL]: 50,
  [TraitCategory.GENETIC]: 100,
};

/**
 * Research and discovery system
 * Single Responsibility: Track observations and unlock progressive knowledge
 */
export class ResearchSystem {
  private state: ResearchState;
  private eventJournal: EventJournal;

  constructor(eventJournal: EventJournal, startTick: number = 0) {
    this.eventJournal = eventJournal;
    this.state = {
      discoveredSpecies: new Set(),
      speciesObservations: new Map(),
      discoveries: new Map(),
      researchedTraits: new Map(),
      achievements: new Map(),
      activeQuestions: [],
      researchNotes: new Map(),
      totalObservations: 0,
      researchStartTick: startTick,
    };
  }

  /**
   * Get current research state (read-only)
   */
  getState(): Readonly<ResearchState> {
    return this.state;
  }

  /**
   * Observe a species in a chunk (called during simulation tick)
   */
  observeSpecies(
    speciesId: string,
    chunk: WorldChunk,
    currentTick: number,
    _instance?: SpeciesInstance
  ): void {
    // First-time discovery
    if (!this.state.discoveredSpecies.has(speciesId)) {
      this.discoverSpecies(speciesId, chunk, currentTick, DiscoveryMethod.ENVIRONMENTAL);
    }

    // Increment observation count
    const count = (this.state.speciesObservations.get(speciesId) ?? 0) + 1;
    this.state.speciesObservations.set(speciesId, count);
    this.state.totalObservations++;

    // Check for trait category unlocks
    this.checkTraitUnlocks(speciesId, count);
  }

  /**
   * Discover a new species
   */
  private discoverSpecies(
    speciesId: string,
    chunk: WorldChunk,
    tick: number,
    method: DiscoveryMethod
  ): void {
    this.state.discoveredSpecies.add(speciesId);

    // Generate discovery context
    const conditions = this.generateDiscoveryContext(chunk);

    const discovery: SpeciesDiscovery = {
      speciesId,
      firstSeenTick: tick,
      discoveryConditions: conditions,
      unlockMethod: method,
      chunkId: chunk.id,
    };

    this.state.discoveries.set(speciesId, discovery);

    // Initialize trait research (BASIC is always unlocked)
    this.state.researchedTraits.set(speciesId, new Set([TraitCategory.BASIC]));

    // Log discovery event
    this.eventJournal.recordEvent(
      'species_discovered' as any,
      { speciesId, method, conditions },
      chunk.id
    );
  }

  /**
   * Check and unlock trait categories based on observation count
   */
  private checkTraitUnlocks(speciesId: string, observationCount: number): void {
    const unlockedTraits = this.state.researchedTraits.get(speciesId);
    if (!unlockedTraits) return;

    for (const [category, threshold] of Object.entries(TRAIT_UNLOCK_THRESHOLDS)) {
      if (observationCount >= threshold && !unlockedTraits.has(category as TraitCategory)) {
        unlockedTraits.add(category as TraitCategory);
        // Could emit event for UI notification
      }
    }
  }

  /**
   * Generate human-readable discovery context
   */
  private generateDiscoveryContext(chunk: WorldChunk): string {
    const biome = chunk.biomeState;
    const climate = chunk.climateState;
    const season = this.getSeasonName(chunk);

    const conditions: string[] = [];

    // Moisture condition
    if (biome.moisture > 0.7) conditions.push('high moisture');
    else if (biome.moisture < 0.3) conditions.push('dry conditions');

    // Temperature
    if (climate.temperature < 10) conditions.push('cool temperatures');
    else if (climate.temperature > 25) conditions.push('warm temperatures');

    // Light
    if (climate.light > 0.8) conditions.push('full sun');
    else if (climate.light < 0.3) conditions.push('shade');

    // Succession stage
    if (biome.succession < 0.3) conditions.push('pioneer habitat');
    else if (biome.succession > 0.7) conditions.push('mature ecosystem');

    const conditionStr = conditions.length > 0 ? conditions.join(', ') : 'typical conditions';
    return `Found in ${season}, ${conditionStr}`;
  }

  /**
   * Get season name from chunk (placeholder - would integrate with WeatherSystem)
   */
  private getSeasonName(chunk: WorldChunk): string {
    // This would ideally come from the WeatherSystem
    // For now, infer from temperature
    const temp = chunk.climateState.temperature;
    if (temp < 5) return 'winter';
    if (temp < 15) return 'spring';
    if (temp < 25) return 'summer';
    return 'autumn';
  }

  /**
   * Get research progress for a species (0-1)
   */
  getResearchProgress(speciesId: string): number {
    const unlockedTraits = this.state.researchedTraits.get(speciesId);
    if (!unlockedTraits) return 0;

    const totalCategories = Object.keys(TraitCategory).length;
    return unlockedTraits.size / totalCategories;
  }

  /**
   * Check if a trait category is unlocked for a species
   */
  hasUnlockedTrait(speciesId: string, category: TraitCategory): boolean {
    const unlockedTraits = this.state.researchedTraits.get(speciesId);
    return unlockedTraits?.has(category) ?? false;
  }

  /**
   * Get observation count for a species
   */
  getObservationCount(speciesId: string): number {
    return this.state.speciesObservations.get(speciesId) ?? 0;
  }

  /**
   * Add a research note for a species
   */
  addResearchNote(speciesId: string, note: string): void {
    const notes = this.state.researchNotes.get(speciesId) ?? [];
    notes.push(note);
    this.state.researchNotes.set(speciesId, notes);
  }

  /**
   * Manually discover a species (for initial/intervention discoveries)
   */
  manualDiscovery(
    speciesId: string,
    tick: number,
    method: DiscoveryMethod = DiscoveryMethod.INITIAL
  ): void {
    if (this.state.discoveredSpecies.has(speciesId)) return;

    // Create minimal discovery record
    const discovery: SpeciesDiscovery = {
      speciesId,
      firstSeenTick: tick,
      discoveryConditions: method === DiscoveryMethod.INITIAL
        ? 'Starting species'
        : 'Manually introduced',
      unlockMethod: method,
    };

    this.state.discoveredSpecies.add(speciesId);
    this.state.discoveries.set(speciesId, discovery);
    this.state.researchedTraits.set(speciesId, new Set([TraitCategory.BASIC]));
    this.state.speciesObservations.set(speciesId, 0);
  }

  /**
   * Get all discovered species IDs
   */
  getDiscoveredSpecies(): string[] {
    return Array.from(this.state.discoveredSpecies);
  }

  /**
   * Get discovery details for a species
   */
  getDiscovery(speciesId: string): SpeciesDiscovery | undefined {
    return this.state.discoveries.get(speciesId);
  }

  /**
   * Export state for save/load
   */
  exportState(): SerializableResearchState {
    return {
      discoveredSpecies: Array.from(this.state.discoveredSpecies),
      speciesObservations: Array.from(this.state.speciesObservations.entries()),
      discoveries: Array.from(this.state.discoveries.entries()),
      researchedTraits: Array.from(this.state.researchedTraits.entries()).map(
        ([id, traits]) => [id, Array.from(traits)]
      ),
      achievements: Array.from(this.state.achievements.entries()),
      activeQuestions: this.state.activeQuestions,
      researchNotes: Array.from(this.state.researchNotes.entries()),
      totalObservations: this.state.totalObservations,
      researchStartTick: this.state.researchStartTick,
    };
  }

  /**
   * Import state from save
   */
  importState(serialized: SerializableResearchState): void {
    this.state.discoveredSpecies = new Set(serialized.discoveredSpecies);
    this.state.speciesObservations = new Map(serialized.speciesObservations);
    this.state.discoveries = new Map(serialized.discoveries);
    this.state.researchedTraits = new Map(
      serialized.researchedTraits.map(([id, traits]) => [id, new Set(traits)])
    );
    this.state.achievements = new Map(serialized.achievements);
    this.state.activeQuestions = serialized.activeQuestions;
    this.state.researchNotes = new Map(serialized.researchNotes);
    this.state.totalObservations = serialized.totalObservations;
    this.state.researchStartTick = serialized.researchStartTick;
  }
}

/**
 * Serializable version of research state (for save/load)
 */
export interface SerializableResearchState {
  discoveredSpecies: string[];
  speciesObservations: [string, number][];
  discoveries: [string, SpeciesDiscovery][];
  researchedTraits: [string, TraitCategory[]][];
  achievements: [string, AchievementProgress][];
  activeQuestions: ResearchQuestion[];
  researchNotes: [string, string[]][];
  totalObservations: number;
  researchStartTick: number;
}
