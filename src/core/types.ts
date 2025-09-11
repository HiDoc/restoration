export interface Creature {
  id: string;
  name: string;
  essence: EssenceType;
  stats: CreatureStats;
  growthPattern: GrowthPattern;
  moves: string[];
  evolution?: EvolutionCondition;
  lore: string;
}

export interface CreatureStats {
  potency: number;
  stability: number;
  speed: number;
  affinity: number;
}

export enum EssenceType {
  Fire = 'fire',
  Verdant = 'verdant',
  Salt = 'salt',
  Lunar = 'lunar',
  Ether = 'ether',
  Stone = 'stone',
  Void = 'void'
}

export enum GrowthPattern {
  Spread = 'spread',
  Burst = 'burst',
  Cone = 'cone',
  Line = 'line',
  Cross = 'cross'
}

export interface EvolutionCondition {
  type: 'fusion' | 'ritual' | 'milestone';
  requirement: string;
  result: string;
}

export interface BiomeState {
  vitality: number;
  diversity: number;
  corruption: number;
  essence: EssenceType[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Chunk {
  position: Position;
  biome: BiomeState;
  creatures: Creature[];
}