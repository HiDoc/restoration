/**
 * ChunkAnalyzer - Analyzes chunk state and provides cause-effect insights
 * Helps players understand limiting factors and suggests interventions
 */

import type { WorldChunk } from './WorldChunk';

export interface ChunkAnalysis {
  chunkId: string;
  insights: Insight[];
  recommendations: Recommendation[];
  trends: TrendIndicators;
}

export interface Insight {
  observation: string;
  likelyCause: string;
  suggestedAction: string;
  confidence: 'high' | 'medium' | 'low';
  severity: 'critical' | 'warning' | 'info';
}

export interface Recommendation {
  action: 'plant' | 'irrigate' | 'cleanse';
  reason: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TrendIndicators {
  vitality: 'improving' | 'stable' | 'declining';
  moisture: 'increasing' | 'stable' | 'decreasing';
  pollution: 'rising' | 'stable' | 'falling';
  speciesCount: 'growing' | 'stable' | 'shrinking';
}

export class ChunkAnalyzer {
  /**
   * Analyze a chunk and generate insights
   */
  static analyzeChunk(chunk: WorldChunk, historicalData?: any): ChunkAnalysis {
    const insights: Insight[] = [];
    const recommendations: Recommendation[] = [];

    // Analyze vitality
    if (chunk.biomeState.vitality < 0.3) {
      insights.push(...this.analyzeVitality(chunk));
      recommendations.push(...this.recommendForLowVitality(chunk));
    }

    // Analyze moisture
    if (chunk.biomeState.moisture < 0.3) {
      insights.push({
        observation: `Low moisture (${Math.round(chunk.biomeState.moisture * 100)}%)`,
        likelyCause: 'Insufficient water availability for species survival',
        suggestedAction: 'Use Irrigate intervention to increase moisture',
        confidence: 'high',
        severity: 'warning'
      });
      recommendations.push({
        action: 'irrigate',
        reason: 'Moisture below optimal range for most species',
        expectedImpact: 'Increased species health and reproductive success',
        priority: 'high'
      });
    }

    // Analyze pollution
    if (chunk.biomeState.pollution > 0.6) {
      insights.push({
        observation: `High pollution (${Math.round(chunk.biomeState.pollution * 100)}%)`,
        likelyCause: 'Toxic contamination stressing species',
        suggestedAction: 'Use Cleanse intervention to reduce pollution',
        confidence: 'high',
        severity: 'critical'
      });
      recommendations.push({
        action: 'cleanse',
        reason: 'Pollution levels toxic to most species',
        expectedImpact: 'Immediate health improvement and mortality reduction',
        priority: 'high'
      });
    }

    // Analyze species count
    if (chunk.species.size === 0) {
      insights.push({
        observation: 'No species present',
        likelyCause: 'Environmental conditions unsuitable or no seed sources nearby',
        suggestedAction: 'Plant pioneer species to establish ecosystem',
        confidence: 'high',
        severity: 'critical'
      });
      recommendations.push({
        action: 'plant',
        reason: 'Empty chunk needs species introduction',
        expectedImpact: 'Ecosystem establishment and potential succession',
        priority: 'high'
      });
    } else if (chunk.species.size < 3) {
      insights.push({
        observation: `Low biodiversity (${chunk.species.size} species)`,
        likelyCause: 'Limited environmental niches or poor conditions',
        suggestedAction: 'Improve environmental conditions or introduce compatible species',
        confidence: 'medium',
        severity: 'info'
      });
    }

    // Analyze temperature extremes
    const temp = chunk.climateState.temperature;
    if (temp < 10 || temp > 30) {
      insights.push({
        observation: `Extreme temperature (${Math.round(temp)}°C)`,
        likelyCause: 'Climate conditions outside optimal range',
        suggestedAction: 'Consider species adapted to extreme temperatures',
        confidence: 'medium',
        severity: 'warning'
      });
    }

    // Calculate trends (simplified without historical data)
    const trends = this.calculateTrends(chunk, historicalData);

    return {
      chunkId: chunk.id,
      insights,
      recommendations,
      trends
    };
  }

  /**
   * Analyze low vitality causes
   */
  private static analyzeVitality(chunk: WorldChunk): Insight[] {
    const insights: Insight[] = [];

    insights.push({
      observation: `Critical vitality (${Math.round(chunk.biomeState.vitality * 100)}%)`,
      likelyCause: this.identifyVitalityLimitingFactor(chunk),
      suggestedAction: this.suggestVitalityImprovement(chunk),
      confidence: 'high',
      severity: 'critical'
    });

    return insights;
  }

  /**
   * Identify the primary limiting factor for vitality
   */
  private static identifyVitalityLimitingFactor(chunk: WorldChunk): string {
    const factors = [];

    if (chunk.biomeState.moisture < 0.3) factors.push('low moisture');
    if (chunk.biomeState.pollution > 0.6) factors.push('high pollution');
    if (chunk.biomeState.soil < 0.3) factors.push('nutrient depletion');
    if (chunk.climateState.light < 0.3) factors.push('insufficient light');

    if (factors.length === 0) {
      return 'Multiple species stressed by suboptimal conditions';
    }

    return `Primary constraint: ${factors.join(', ')}`;
  }

  /**
   * Suggest improvement actions for low vitality
   */
  private static suggestVitalityImprovement(chunk: WorldChunk): string {
    if (chunk.biomeState.moisture < 0.3) return 'Irrigate to increase moisture';
    if (chunk.biomeState.pollution > 0.6) return 'Cleanse to reduce pollution';
    if (chunk.species.size === 0) return 'Plant pioneer species';
    return 'Monitor conditions and consider environmental adjustments';
  }

  /**
   * Generate recommendations for low vitality chunks
   */
  private static recommendForLowVitality(chunk: WorldChunk): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (chunk.biomeState.moisture < 0.4) {
      recommendations.push({
        action: 'irrigate',
        reason: 'Moisture stress limiting species survival',
        expectedImpact: 'Rapid vitality recovery and improved growth',
        priority: 'high'
      });
    }

    if (chunk.biomeState.pollution > 0.5) {
      recommendations.push({
        action: 'cleanse',
        reason: 'Pollution causing widespread health decline',
        expectedImpact: 'Toxicity reduction, health improvement',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Calculate trend indicators (simplified without historical data)
   */
  private static calculateTrends(chunk: WorldChunk, _historicalData?: any): TrendIndicators {
    // Without historical data, use current state heuristics
    return {
      vitality: chunk.biomeState.vitality > 0.6 ? 'stable' : chunk.biomeState.vitality > 0.4 ? 'declining' : 'declining',
      moisture: chunk.biomeState.moisture > 0.5 ? 'stable' : 'decreasing',
      pollution: chunk.biomeState.pollution > 0.5 ? 'rising' : 'stable',
      speciesCount: chunk.species.size > 5 ? 'growing' : chunk.species.size > 2 ? 'stable' : 'shrinking'
    };
  }

  /**
   * Get limiting factors for species
   */
  static getLimitingFactors(chunk: WorldChunk): string[] {
    const factors: string[] = [];

    if (chunk.biomeState.moisture < 0.3) {
      factors.push(`Moisture too low (${Math.round(chunk.biomeState.moisture * 100)}%, needs 30%+)`);
    }

    if (chunk.climateState.temperature < 15 || chunk.climateState.temperature > 25) {
      factors.push(`Temperature suboptimal (${Math.round(chunk.climateState.temperature)}°C, prefer 15-25°C)`);
    }

    if (chunk.biomeState.pollution > 0.6) {
      factors.push(`Pollution toxic (${Math.round(chunk.biomeState.pollution * 100)}%, needs <60%)`);
    }

    if (chunk.biomeState.soil < 0.3) {
      factors.push(`Nutrients depleted (${Math.round(chunk.biomeState.soil * 100)}%, needs 30%+)`);
    }

    return factors;
  }
}
