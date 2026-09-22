interface IncomeStatistics {
  simDays: number;
  avgVitality: number;
  avgPollution: number;
  uniqueSpecies: number;
}

/** Pay once per simulated day. Population size alone never increases income. */
export function advanceDailyIncome(
  lastDayCounted: number,
  stats: IncomeStatistics,
  difficulty: 'easy' | 'normal' | 'hard',
): { points: number; lastDayCounted: number } {
  const day = Math.floor(stats.simDays);
  if (day <= lastDayCounted) return { points: 0, lastDayCounted };
  const health = Math.max(0, Math.min(1, stats.avgVitality));
  const cleanliness = 1 - Math.max(0, Math.min(1, stats.avgPollution));
  const diversity = Math.min(5, Math.max(0, stats.uniqueSpecies));
  const base = diversity > 0 ? Math.max(1, Math.min(8, Math.round(health * 4 + cleanliness * 2 + diversity * 0.4))) : 0;
  const multiplier = difficulty === 'easy' ? 1.2 : difficulty === 'hard' ? 0.8 : 1;
  return { points: Math.round(base * multiplier) * (day - lastDayCounted), lastDayCounted: day };
}
