/**
 * Hybridization System - Handles cross-species breeding and hybrid creation
 *
 * Features:
 * - Cross-pollination between compatible species
 * - Genetic trait inheritance from both parents
 * - Hybridization tree tracking
 * - Compatibility rules based on taxonomy
 * - Hybrid vigor and outbreeding depression mechanics
 */

import { SeededRNG, RNGManager } from './SeededRNG';
import { SpeciesDefinition, SpeciesRegistry, SpeciesCategory } from './SpeciesRegistry';
import { GeneticSystem, GeneticProfile, GeneticTrait } from './GeneticSystem';
import { WorldChunk, SpeciesInstance, PhenologyStage } from './WorldChunk';

export interface HybridizationEvent {
  id: string;
  parentAId: string;
  parentBId: string;
  parentAName: string;
  parentBName: string;
  hybridId: string;
  hybridName: string;
  tick: number;
  chunkId: string;
  compatibility: number;
  success: boolean;
  generation: number; // Generation number in hybridization tree
}

export interface HybridLineage {
  speciesId: string;
  speciesName: string;
  parentA?: string;
  parentB?: string;
  generation: number; // 0 = base species, 1+ = hybrid generations
  children: string[]; // Species IDs that have this as a parent
  isHybrid: boolean;
  hybridizationEvents: string[]; // Event IDs
  created: number; // Tick when first created
}

export interface CompatibilityRule {
  categoryA: SpeciesCategory;
  categoryB: SpeciesCategory;
  baseCompatibility: number; // [0-1]
  viabilityPenalty: number; // Reduction in offspring survival
  fertilityPenalty: number; // Reduction in hybrid reproduction
}

export interface HybridTraits {
  parentAContribution: number; // [0-1] How much comes from parent A vs B
  dominantTraits: string[]; // Trait IDs that are dominant
  novelTraits: string[]; // Emergent traits not in either parent
  hybridVigor: number; // [-1 to 1] Positive = vigor, negative = depression
  fertility: number; // [0-1] Ability to reproduce
}

export class HybridizationSystem {
  private rng: SeededRNG;
  private speciesRegistry: SpeciesRegistry;
  private geneticSystem: GeneticSystem;

  // Tracking
  private hybridizationEvents: Map<string, HybridizationEvent> = new Map();
  private lineageTree: Map<string, HybridLineage> = new Map();
  private hybridSpecies: Map<string, SpeciesDefinition> = new Map();

  // Compatibility matrix
  private compatibilityRules: CompatibilityRule[] = [
    // Same category - high compatibility
    { categoryA: SpeciesCategory.GRASS, categoryB: SpeciesCategory.GRASS, baseCompatibility: 0.9, viabilityPenalty: 0.05, fertilityPenalty: 0.1 },
    { categoryA: SpeciesCategory.HERB, categoryB: SpeciesCategory.HERB, baseCompatibility: 0.85, viabilityPenalty: 0.1, fertilityPenalty: 0.15 },
    { categoryA: SpeciesCategory.SHRUB, categoryB: SpeciesCategory.SHRUB, baseCompatibility: 0.8, viabilityPenalty: 0.1, fertilityPenalty: 0.2 },
    { categoryA: SpeciesCategory.TREE, categoryB: SpeciesCategory.TREE, baseCompatibility: 0.75, viabilityPenalty: 0.15, fertilityPenalty: 0.25 },

    // Related categories - medium compatibility
    { categoryA: SpeciesCategory.GRASS, categoryB: SpeciesCategory.HERB, baseCompatibility: 0.6, viabilityPenalty: 0.25, fertilityPenalty: 0.4 },
    { categoryA: SpeciesCategory.HERB, categoryB: SpeciesCategory.SHRUB, baseCompatibility: 0.5, viabilityPenalty: 0.35, fertilityPenalty: 0.5 },
    { categoryA: SpeciesCategory.SHRUB, categoryB: SpeciesCategory.TREE, baseCompatibility: 0.4, viabilityPenalty: 0.4, fertilityPenalty: 0.6 },

    // Distant categories - low compatibility
    { categoryA: SpeciesCategory.GRASS, categoryB: SpeciesCategory.SHRUB, baseCompatibility: 0.2, viabilityPenalty: 0.6, fertilityPenalty: 0.8 },
    { categoryA: SpeciesCategory.GRASS, categoryB: SpeciesCategory.TREE, baseCompatibility: 0.05, viabilityPenalty: 0.8, fertilityPenalty: 0.95 },
    { categoryA: SpeciesCategory.HERB, categoryB: SpeciesCategory.TREE, baseCompatibility: 0.1, viabilityPenalty: 0.7, fertilityPenalty: 0.9 },

    // Special categories
    { categoryA: SpeciesCategory.FERN, categoryB: SpeciesCategory.FERN, baseCompatibility: 0.7, viabilityPenalty: 0.2, fertilityPenalty: 0.3 },
    { categoryA: SpeciesCategory.MOSS, categoryB: SpeciesCategory.MOSS, baseCompatibility: 0.8, viabilityPenalty: 0.15, fertilityPenalty: 0.2 },
    { categoryA: SpeciesCategory.VINE, categoryB: SpeciesCategory.VINE, baseCompatibility: 0.75, viabilityPenalty: 0.15, fertilityPenalty: 0.25 },
  ];

  constructor(rngManager?: RNGManager) {
    this.rng = rngManager ? rngManager.getRNG('hybridization') : RNGManager.getInstance().getRNG('hybridization');
    this.speciesRegistry = SpeciesRegistry.getInstance();
    this.geneticSystem = new GeneticSystem(rngManager || RNGManager.getInstance());

    this.initializeBaseSpeciesLineages();
  }

  /**
   * Initialize lineage entries for all base species
   */
  private initializeBaseSpeciesLineages(): void {
    const allSpecies = this.speciesRegistry.getAllSpecies();

    allSpecies.forEach(species => {
      if (!this.lineageTree.has(species.id)) {
        this.lineageTree.set(species.id, {
          speciesId: species.id,
          speciesName: species.name,
          generation: 0,
          children: [],
          isHybrid: false,
          hybridizationEvents: [],
          created: 0
        });
      }
    });
  }

  /**
   * Calculate compatibility between two species
   */
  calculateCompatibility(speciesA: SpeciesDefinition, speciesB: SpeciesDefinition): number {
    // Same species cannot hybridize
    if (speciesA.id === speciesB.id) return 0;

    // Find compatibility rule
    const rule = this.compatibilityRules.find(r =>
      (r.categoryA === speciesA.category && r.categoryB === speciesB.category) ||
      (r.categoryA === speciesB.category && r.categoryB === speciesA.category)
    );

    if (!rule) return 0.05; // Very low default compatibility

    let compatibility = rule.baseCompatibility;

    // Environmental similarity bonus
    const tempOverlap = this.calculateRangeOverlap(
      speciesA.temperatureRange,
      speciesB.temperatureRange
    );
    const moistureOverlap = this.calculateRangeOverlap(
      speciesA.moistureRange,
      speciesB.moistureRange
    );

    compatibility *= (0.5 + tempOverlap * 0.3 + moistureOverlap * 0.2);

    // Pollination mechanism compatibility
    if (speciesA.pollination === speciesB.pollination) {
      compatibility *= 1.2;
    } else if (
      (speciesA.pollination === 'insect' && speciesB.pollination === 'bird') ||
      (speciesA.pollination === 'bird' && speciesB.pollination === 'insect')
    ) {
      compatibility *= 1.1; // Biotic pollinators are somewhat compatible
    } else if (speciesA.pollination === 'wind' || speciesB.pollination === 'wind') {
      compatibility *= 0.7; // Wind pollination less likely to cross
    }

    return Math.max(0, Math.min(1, compatibility));
  }

  /**
   * Calculate overlap between two ranges
   */
  private calculateRangeOverlap(rangeA: { min: number; max: number }, rangeB: { min: number; max: number }): number {
    const overlapStart = Math.max(rangeA.min, rangeB.min);
    const overlapEnd = Math.min(rangeA.max, rangeB.max);

    if (overlapStart >= overlapEnd) return 0;

    const overlapSize = overlapEnd - overlapStart;
    const rangeASize = rangeA.max - rangeA.min;
    const rangeBSize = rangeB.max - rangeB.min;
    const avgSize = (rangeASize + rangeBSize) / 2;

    return Math.min(1, overlapSize / avgSize);
  }

  /**
   * Attempt hybridization between two species instances
   */
  attemptHybridization(
    parentA: SpeciesInstance,
    parentB: SpeciesInstance,
    chunk: WorldChunk,
    currentTick: number
  ): { success: boolean; hybridInstance?: SpeciesInstance; event: HybridizationEvent } {
    const speciesA = this.speciesRegistry.getSpecies(parentA.speciesId);
    const speciesB = this.speciesRegistry.getSpecies(parentB.speciesId);

    if (!speciesA || !speciesB) {
      return this.createFailedEvent(parentA, parentB, chunk, currentTick, 0);
    }

    // Calculate compatibility
    const compatibility = this.calculateCompatibility(speciesA, speciesB);

    // Environmental factors
    const envQuality = this.calculateEnvironmentalQuality(chunk, speciesA, speciesB);

    // Final success probability
    const successProb = compatibility * envQuality * (0.7 + this.rng.nextFloat(0, 0.3));

    const success = this.rng.next() < successProb;

    if (!success) {
      return this.createFailedEvent(parentA, parentB, chunk, currentTick, compatibility);
    }

    // Create hybrid
    const hybrid = this.createHybridSpecies(speciesA, speciesB, parentA, parentB, currentTick);
    const hybridInstance = this.createHybridInstance(hybrid, parentA, parentB, chunk);

    // Record event
    const event = this.recordHybridizationEvent(
      parentA,
      parentB,
      hybrid,
      chunk,
      currentTick,
      compatibility,
      true
    );

    return { success: true, hybridInstance, event };
  }

  /**
   * Create a hybrid species definition from two parents
   */
  private createHybridSpecies(
    speciesA: SpeciesDefinition,
    speciesB: SpeciesDefinition,
    _instanceA: SpeciesInstance,
    _instanceB: SpeciesInstance,
    currentTick: number
  ): SpeciesDefinition {
    const hybridId = `hybrid_${speciesA.id}_${speciesB.id}_${currentTick}`;

    // Check if this hybrid already exists
    if (this.hybridSpecies.has(hybridId)) {
      return this.hybridSpecies.get(hybridId)!;
    }

    // Calculate hybrid vigor or outbreeding depression
    const compatibility = this.calculateCompatibility(speciesA, speciesB);
    const hybridVigor = this.calculateHybridVigor(compatibility);

    // Intermediate trait values with some variance
    const hybrid: SpeciesDefinition = {
      id: hybridId,
      name: `${speciesA.name} × ${speciesB.name}`,
      category: this.inheritCategory(speciesA, speciesB),

      // Averaged traits with hybrid vigor modifier
      maxBiomass: this.averageWithVigor(speciesA.maxBiomass, speciesB.maxBiomass, hybridVigor),
      growthRate: this.averageWithVigor(speciesA.growthRate, speciesB.growthRate, hybridVigor),
      lifespanTicks: Math.round(this.averageWithVigor(speciesA.lifespanTicks, speciesB.lifespanTicks, hybridVigor * 0.5)),
      reproductionThreshold: this.average(speciesA.reproductionThreshold, speciesB.reproductionThreshold),
      reproductionNeed: this.average(speciesA.reproductionNeed, speciesB.reproductionNeed),
      seedProduction: Math.round(this.averageWithVigor(speciesA.seedProduction, speciesB.seedProduction, hybridVigor * 0.3)),

      // Expanded environmental tolerances (hybrid advantage)
      temperatureRange: {
        min: Math.min(speciesA.temperatureRange.min, speciesB.temperatureRange.min),
        max: Math.max(speciesA.temperatureRange.max, speciesB.temperatureRange.max)
      },
      moistureRange: {
        min: Math.min(speciesA.moistureRange.min, speciesB.moistureRange.min),
        max: Math.max(speciesA.moistureRange.max, speciesB.moistureRange.max)
      },
      lightRequirement: this.average(speciesA.lightRequirement, speciesB.lightRequirement),
      shadeToleranceMax: Math.max(speciesA.shadeToleranceMax, speciesB.shadeToleranceMax),
      pHRange: {
        min: Math.min(speciesA.pHRange.min, speciesB.pHRange.min),
        max: Math.max(speciesA.pHRange.max, speciesB.pHRange.max)
      },

      // Inherited categorical traits
      rootDepth: this.inheritDiscrete([speciesA.rootDepth, speciesB.rootDepth]),
      pollination: this.inheritDiscrete([speciesA.pollination, speciesB.pollination]),
      succession: this.inheritDiscrete([speciesA.succession, speciesB.succession]),
      canopyLayer: this.inheritDiscrete([speciesA.canopyLayer, speciesB.canopyLayer]),

      // Combined traits
      traits: [...(speciesA.traits || []), ...(speciesB.traits || [])],

      // Combined resistances
      resistances: this.mergeArrays(speciesA.resistances || [], speciesB.resistances || []),

      // Visual properties - blend
      visualProps: {
        color: this.blendColors(speciesA.visualProps.color, speciesB.visualProps.color),
        size: this.average(speciesA.visualProps.size, speciesB.visualProps.size),
        shape: this.inheritDiscrete([speciesA.visualProps.shape, speciesB.visualProps.shape]),
        seasonalChanges: speciesA.visualProps.seasonalChanges || speciesB.visualProps.seasonalChanges
      },

      // Hybrid rarity
      rarity: this.calculateHybridRarity(speciesA, speciesB) as any,

      // Biome preferences - combined
      preferredBiomes: this.mergeArrays(speciesA.preferredBiomes || [], speciesB.preferredBiomes || []),
      nativeRegions: this.mergeArrays(speciesA.nativeRegions || [], speciesB.nativeRegions || []),

      // Dispersal range
      dispersalRange: this.averageWithVigor(speciesA.dispersalRange, speciesB.dispersalRange, hybridVigor * 0.2),
    };

    // Store hybrid
    this.hybridSpecies.set(hybridId, hybrid);

    // Update lineage tree
    this.updateLineageTree(hybrid, speciesA.id, speciesB.id, currentTick);

    return hybrid;
  }

  /**
   * Create a hybrid species instance
   */
  private createHybridInstance(
    hybrid: SpeciesDefinition,
    parentA: SpeciesInstance,
    parentB: SpeciesInstance,
    _chunk: WorldChunk
  ): SpeciesInstance {
    // Position near parents
    const x = (parentA.x + parentB.x) / 2 + this.rng.nextFloat(-0.05, 0.05);
    const y = (parentA.y + parentB.y) / 2 + this.rng.nextFloat(-0.05, 0.05);

    const instance: SpeciesInstance = {
      id: `hybrid_inst_${Date.now()}_${Math.random()}`,
      speciesId: hybrid.id,
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      biomass: 0.01,
      age: 0,
      phenologyStage: PhenologyStage.SEED,
      health: 0.9, // Hybrids often start vigorous
      reproductiveOutput: 0,
      reproductiveUrge: 0,
      lastReproductionAttempt: 0
    };

    // Create hybrid genetics
    instance.genetics = this.createHybridGenetics(parentA, parentB, hybrid);

    return instance;
  }

  /**
   * Create genetic profile for hybrid
   */
  private createHybridGenetics(
    parentA: SpeciesInstance,
    parentB: SpeciesInstance,
    hybrid: SpeciesDefinition
  ): GeneticProfile {
    const traits = new Map<string, GeneticTrait>();

    // Merge parent genetics
    const parentAGenetics = parentA.genetics;
    const parentBGenetics = parentB.genetics;

    if (parentAGenetics && parentBGenetics) {
      // Combine traits from both parents
      const allTraitIds = new Set([
        ...Array.from(parentAGenetics.traits.keys()),
        ...Array.from(parentBGenetics.traits.keys())
      ]);

      allTraitIds.forEach(traitId => {
        const traitA = parentAGenetics.traits.get(traitId);
        const traitB = parentBGenetics.traits.get(traitId);

        if (traitA && traitB) {
          // Both parents have this trait - blend based on dominance
          const dominanceA = traitA.dominance;
          const dominanceB = traitB.dominance;
          const totalDominance = dominanceA + dominanceB;

          const blendFactor = totalDominance > 0 ? dominanceA / totalDominance : 0.5;

          traits.set(traitId, {
            ...traitA,
            value: traitA.value * blendFactor + traitB.value * (1 - blendFactor),
            baseValue: traitA.baseValue * blendFactor + traitB.baseValue * (1 - blendFactor),
            mutationRate: Math.max(traitA.mutationRate, traitB.mutationRate) * 1.1, // Hybrids mutate more
            dominance: (dominanceA + dominanceB) / 2
          });
        } else if (traitA) {
          // Only parent A has this trait
          traits.set(traitId, { ...traitA, dominance: traitA.dominance * 0.7 });
        } else if (traitB) {
          // Only parent B has this trait
          traits.set(traitId, { ...traitB, dominance: traitB.dominance * 0.7 });
        }
      });

      // Chance for novel trait (transgressive segregation)
      if (this.rng.next() < 0.1) {
        // Create a novel trait
        const novelTrait: GeneticTrait = {
          id: `novel_${Date.now()}`,
          name: 'Novel Hybrid Trait',
          value: this.rng.nextFloat(0.5, 1.5),
          baseValue: 1.0,
          mutationRate: 0.15,
          variance: 0.5,
          dominance: 0.8,
          beneficial: this.rng.next() < 0.6 // 60% chance beneficial
        };
        traits.set(novelTrait.id, novelTrait);
      }
    } else {
      // Initialize base genetics if parents don't have genetics
      return this.geneticSystem.initializeGenetics(hybrid);
    }

    const generation = Math.max(
      parentAGenetics?.generation || 0,
      parentBGenetics?.generation || 0
    ) + 1;

    return {
      traits,
      generation,
      mutations: [
        ...(parentAGenetics?.mutations || []),
        ...(parentBGenetics?.mutations || []),
        `Hybrid Generation ${generation}`
      ],
      adaptationScore: 0.5 // Reset adaptation score
    };
  }

  /**
   * Calculate hybrid vigor or depression
   */
  private calculateHybridVigor(compatibility: number): number {
    // Heterosis (hybrid vigor) peaks at moderate genetic distance
    // Too close = inbreeding depression, too far = outbreeding depression

    const optimalDistance = 0.6; // Sweet spot for vigor
    const distance = 1 - compatibility; // Inverse of compatibility

    const distanceFromOptimal = Math.abs(distance - optimalDistance);
    const vigor = Math.max(-0.3, Math.min(0.3,
      0.3 - distanceFromOptimal * 0.8 + this.rng.nextFloat(-0.1, 0.1)
    ));

    return vigor;
  }

  /**
   * Calculate environmental quality for hybridization
   */
  private calculateEnvironmentalQuality(chunk: WorldChunk, speciesA: SpeciesDefinition, speciesB: SpeciesDefinition): number {
    const temp = chunk.climateState.temperature;
    const moisture = chunk.biomeState.moisture;
    const vitality = chunk.biomeState.vitality;

    // Both species must be in acceptable conditions
    const tempOkA = temp >= speciesA.temperatureRange.min && temp <= speciesA.temperatureRange.max;
    const tempOkB = temp >= speciesB.temperatureRange.min && temp <= speciesB.temperatureRange.max;
    const moistOkA = moisture >= speciesA.moistureRange.min && moisture <= speciesA.moistureRange.max;
    const moistOkB = moisture >= speciesB.moistureRange.min && moisture <= speciesB.moistureRange.max;

    if (!tempOkA || !tempOkB || !moistOkA || !moistOkB) return 0.1; // Very low chance if conditions poor

    return 0.5 + vitality * 0.5;
  }

  /**
   * Helper functions for trait inheritance
   */
  private average(a: number, b: number): number {
    return (a + b) / 2;
  }

  private averageWithVigor(a: number, b: number, vigor: number): number {
    const avg = (a + b) / 2;
    return avg * (1 + vigor);
  }

  private inheritDiscrete<T>(options: T[]): T {
    return options[this.rng.nextInt(0, options.length - 1)];
  }

  private inheritCategory(speciesA: SpeciesDefinition, speciesB: SpeciesDefinition): SpeciesCategory {
    // Inherit category from larger parent typically
    if (speciesA.maxBiomass > speciesB.maxBiomass) {
      return speciesA.category;
    } else {
      return speciesB.category;
    }
  }

  private mergeArrays<T>(arrA: T[], arrB: T[]): T[] {
    return Array.from(new Set([...arrA, ...arrB]));
  }

  private blendColors(colorA: string, colorB: string): string {
    // Simple color blending - average hex values
    const hexA = colorA.replace('#', '');
    const hexB = colorB.replace('#', '');

    const r1 = parseInt(hexA.substr(0, 2), 16);
    const g1 = parseInt(hexA.substr(2, 2), 16);
    const b1 = parseInt(hexA.substr(4, 2), 16);

    const r2 = parseInt(hexB.substr(0, 2), 16);
    const g2 = parseInt(hexB.substr(2, 2), 16);
    const b2 = parseInt(hexB.substr(4, 2), 16);

    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private calculateHybridRarity(speciesA: SpeciesDefinition, speciesB: SpeciesDefinition): string {
    // Hybrids are generally rarer than parents
    const rarityValues = { common: 0, uncommon: 1, rare: 2, very_rare: 3, legendary: 4 };
    const rarityA = rarityValues[speciesA.rarity as keyof typeof rarityValues] || 0;
    const rarityB = rarityValues[speciesB.rarity as keyof typeof rarityValues] || 0;
    const avgRarity = Math.ceil((rarityA + rarityB) / 2) + 1; // One tier rarer

    const rarityNames = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
    return rarityNames[Math.min(4, avgRarity)];
  }

  /**
   * Update lineage tree
   */
  private updateLineageTree(hybrid: SpeciesDefinition, parentAId: string, parentBId: string, tick: number): void {
    const parentALineage = this.lineageTree.get(parentAId);
    const parentBLineage = this.lineageTree.get(parentBId);

    const generation = Math.max(
      parentALineage?.generation || 0,
      parentBLineage?.generation || 0
    ) + 1;

    // Create lineage entry for hybrid
    this.lineageTree.set(hybrid.id, {
      speciesId: hybrid.id,
      speciesName: hybrid.name,
      parentA: parentAId,
      parentB: parentBId,
      generation,
      children: [],
      isHybrid: true,
      hybridizationEvents: [],
      created: tick
    });

    // Update parent lineages
    if (parentALineage) {
      parentALineage.children.push(hybrid.id);
    }
    if (parentBLineage) {
      parentBLineage.children.push(hybrid.id);
    }
  }

  /**
   * Record hybridization event
   */
  private recordHybridizationEvent(
    parentA: SpeciesInstance,
    parentB: SpeciesInstance,
    hybrid: SpeciesDefinition,
    chunk: WorldChunk,
    tick: number,
    compatibility: number,
    success: boolean
  ): HybridizationEvent {
    const speciesA = this.speciesRegistry.getSpecies(parentA.speciesId);
    const speciesB = this.speciesRegistry.getSpecies(parentB.speciesId);

    const lineage = this.lineageTree.get(hybrid.id);

    const event: HybridizationEvent = {
      id: `hybrid_event_${tick}_${this.rng.next()}`,
      parentAId: parentA.speciesId,
      parentBId: parentB.speciesId,
      parentAName: speciesA?.name || parentA.speciesId,
      parentBName: speciesB?.name || parentB.speciesId,
      hybridId: hybrid.id,
      hybridName: hybrid.name,
      tick,
      chunkId: chunk.id,
      compatibility,
      success,
      generation: lineage?.generation || 1
    };

    this.hybridizationEvents.set(event.id, event);

    // Add to lineage
    if (lineage) {
      lineage.hybridizationEvents.push(event.id);
    }

    return event;
  }

  /**
   * Create failed event
   */
  private createFailedEvent(
    parentA: SpeciesInstance,
    parentB: SpeciesInstance,
    chunk: WorldChunk,
    tick: number,
    compatibility: number
  ): { success: false; event: HybridizationEvent } {
    const speciesA = this.speciesRegistry.getSpecies(parentA.speciesId);
    const speciesB = this.speciesRegistry.getSpecies(parentB.speciesId);

    const event: HybridizationEvent = {
      id: `failed_hybrid_${tick}_${this.rng.next()}`,
      parentAId: parentA.speciesId,
      parentBId: parentB.speciesId,
      parentAName: speciesA?.name || parentA.speciesId,
      parentBName: speciesB?.name || parentB.speciesId,
      hybridId: '',
      hybridName: '',
      tick,
      chunkId: chunk.id,
      compatibility,
      success: false,
      generation: 0
    };

    return { success: false, event };
  }

  /**
   * Get lineage tree for a species
   */
  getLineageTree(speciesId: string): HybridLineage | undefined {
    return this.lineageTree.get(speciesId);
  }

  /**
   * Get all descendants of a species
   */
  getDescendants(speciesId: string, maxDepth: number = 10): string[] {
    const descendants: string[] = [];
    const queue: { id: string; depth: number }[] = [{ id: speciesId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) continue;

      const lineage = this.lineageTree.get(current.id);
      if (lineage) {
        lineage.children.forEach(childId => {
          descendants.push(childId);
          queue.push({ id: childId, depth: current.depth + 1 });
        });
      }
    }

    return descendants;
  }

  /**
   * Get all ancestors of a species
   */
  getAncestors(speciesId: string): string[] {
    const ancestors: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [speciesId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const lineage = this.lineageTree.get(current);
      if (lineage) {
        if (lineage.parentA) {
          ancestors.push(lineage.parentA);
          queue.push(lineage.parentA);
        }
        if (lineage.parentB) {
          ancestors.push(lineage.parentB);
          queue.push(lineage.parentB);
        }
      }
    }

    return ancestors;
  }

  /**
   * Get hybridization statistics
   */
  getStatistics(): {
    totalHybrids: number;
    totalEvents: number;
    successfulEvents: number;
    averageGeneration: number;
    maxGeneration: number;
  } {
    const hybrids = Array.from(this.lineageTree.values()).filter(l => l.isHybrid);
    const events = Array.from(this.hybridizationEvents.values());

    return {
      totalHybrids: hybrids.length,
      totalEvents: events.length,
      successfulEvents: events.filter(e => e.success).length,
      averageGeneration: hybrids.length > 0
        ? hybrids.reduce((sum, h) => sum + h.generation, 0) / hybrids.length
        : 0,
      maxGeneration: hybrids.length > 0
        ? Math.max(...hybrids.map(h => h.generation))
        : 0
    };
  }

  /**
   * Export state for save/load
   */
  exportState(): any {
    return {
      hybridizationEvents: Array.from(this.hybridizationEvents.entries()),
      lineageTree: Array.from(this.lineageTree.entries()),
      hybridSpecies: Array.from(this.hybridSpecies.entries()),
      rngState: this.rng.getState()
    };
  }

  /**
   * Import state for save/load
   */
  importState(state: any): void {
    this.hybridizationEvents.clear();
    state.hybridizationEvents.forEach(([id, event]: [string, HybridizationEvent]) => {
      this.hybridizationEvents.set(id, event);
    });

    this.lineageTree.clear();
    state.lineageTree.forEach(([id, lineage]: [string, HybridLineage]) => {
      this.lineageTree.set(id, lineage);
    });

    this.hybridSpecies.clear();
    state.hybridSpecies.forEach(([id, species]: [string, SpeciesDefinition]) => {
      this.hybridSpecies.set(id, species);
    });

    this.rng.setState(state.rngState);
  }
}
