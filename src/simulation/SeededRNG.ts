/**
 * Deterministic seeded random number generator using LCG algorithm
 * Ensures reproducible simulations from a single master seed
 */
export class SeededRNG {
  private state: number;
  private readonly a = 1664525;  // LCG multiplier
  private readonly c = 1013904223; // LCG increment
  private readonly m = Math.pow(2, 32); // LCG modulus

  constructor(seed: number) {
    this.state = seed >>> 0; // Ensure 32-bit unsigned integer
  }

  /**
   * Generate next random number [0, 1)
   */
  next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  /**
   * Generate random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean with given probability
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot choose from empty array');
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Generate Gaussian/normal distribution using Box-Muller transform
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Get current RNG state for debugging/validation
   */
  getState(): number {
    return this.state;
  }

  /**
   * Set RNG state (use carefully!)
   */
  setState(state: number): void {
    this.state = state >>> 0;
  }

  /**
   * Create a sub-RNG with derived seed
   */
  createSubRNG(seedModifier: number): SeededRNG {
    const subSeed = (this.state ^ seedModifier) >>> 0;
    return new SeededRNG(subSeed);
  }

  /**
   * Generate hash of current state for validation
   */
  getHash(): number {
    // Simple hash function for state validation
    let hash = this.state;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = (hash >> 16) ^ hash;
    return hash >>> 0;
  }
}

/**
 * Global RNG manager for simulation determinism
 */
export class RNGManager {
  private static instance: RNGManager;
  private masterRNG: SeededRNG;
  private subRNGs: Map<string, SeededRNG> = new Map();
  private eventLog: Array<{ timestamp: number; event: string; state: number }> = [];

  private constructor(masterSeed: number) {
    this.masterRNG = new SeededRNG(masterSeed);
  }

  static initialize(masterSeed: number): RNGManager {
    RNGManager.instance = new RNGManager(masterSeed);
    return RNGManager.instance;
  }

  static getInstance(): RNGManager {
    if (!RNGManager.instance) {
      throw new Error('RNGManager not initialized. Call initialize() first.');
    }
    return RNGManager.instance;
  }

  /**
   * Get or create a sub-RNG for a specific domain
   */
  getRNG(domain: string): SeededRNG {
    if (!this.subRNGs.has(domain)) {
      const subSeed = this.masterRNG.nextInt(0, 0xFFFFFFFF);
      this.subRNGs.set(domain, new SeededRNG(subSeed));
      this.logEvent(`Created sub-RNG for domain: ${domain}`, subSeed);
    }
    return this.subRNGs.get(domain)!;
  }

  /**
   * Get the master RNG (use sparingly!)
   */
  getMasterRNG(): SeededRNG {
    return this.masterRNG;
  }

  /**
   * Log RNG events for debugging
   */
  private logEvent(event: string, state: number): void {
    this.eventLog.push({
      timestamp: Date.now(),
      event,
      state
    });
    
    // Keep log size manageable
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-500);
    }
  }

  /**
   * Generate state hash for validation
   */
  generateStateHash(): string {
    const masterHash = this.masterRNG.getHash();
    const subHashes = Array.from(this.subRNGs.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([domain, rng]) => `${domain}:${rng.getHash()}`)
      .join('|');
    
    return `master:${masterHash}|subs:${subHashes}`;
  }

  /**
   * Export current state for save/load
   */
  exportState(): {
    masterState: number;
    subRNGStates: Record<string, number>;
    stateHash: string;
  } {
    const subRNGStates: Record<string, number> = {};
    this.subRNGs.forEach((rng, domain) => {
      subRNGStates[domain] = rng.getState();
    });

    return {
      masterState: this.masterRNG.getState(),
      subRNGStates,
      stateHash: this.generateStateHash()
    };
  }

  /**
   * Import state from save/load
   */
  importState(state: {
    masterState: number;
    subRNGStates: Record<string, number>;
    stateHash: string;
  }): void {
    this.masterRNG.setState(state.masterState);
    
    this.subRNGs.clear();
    Object.entries(state.subRNGStates).forEach(([domain, rngState]) => {
      const rng = new SeededRNG(0);
      rng.setState(rngState);
      this.subRNGs.set(domain, rng);
    });

    // Validate state integrity
    const currentHash = this.generateStateHash();
    if (currentHash !== state.stateHash) {
      console.warn(`RNG state hash mismatch. Expected: ${state.stateHash}, Got: ${currentHash}`);
    }
  }

  /**
   * Get event log for debugging
   */
  getEventLog(): Array<{ timestamp: number; event: string; state: number }> {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }
}