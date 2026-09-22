import { describe, expect, it } from 'vitest';
import { advanceDailyIncome } from '@/simulation/GameplayEconomy';

describe('daily intervention income', () => {
  const stats = { simDays: 1, avgVitality: 0.7, avgPollution: 0.1, uniqueSpecies: 2 };

  it('pays once per completed simulated day, including after restoring saved state', () => {
    const earned = advanceDailyIncome(0, stats, 'normal');
    expect(earned.points).toBeGreaterThan(0);
    const restored = JSON.parse(JSON.stringify(earned));
    expect(advanceDailyIncome(restored.lastDayCounted, stats, 'normal').points).toBe(0);
    expect(advanceDailyIncome(restored.lastDayCounted, { ...stats, simDays: 1.9 }, 'normal').points).toBe(0);
    expect(advanceDailyIncome(restored.lastDayCounted, { ...stats, simDays: 3 }, 'normal').points).toBe(earned.points * 2);
  });

  it('bounds income and rewards diversity without runaway population bonuses', () => {
    const healthy = { ...stats, avgVitality: 1, avgPollution: 0, uniqueSpecies: 1000 };
    expect(advanceDailyIncome(0, healthy, 'normal').points).toBe(8);
    expect(advanceDailyIncome(0, { ...stats, uniqueSpecies: 0 }, 'normal').points).toBe(0);
    expect(advanceDailyIncome(0, { ...stats, uniqueSpecies: 5 }, 'normal').points)
      .toBeGreaterThan(advanceDailyIncome(0, { ...stats, uniqueSpecies: 1 }, 'normal').points);
    expect(advanceDailyIncome(0, stats, 'easy').points).toBeGreaterThan(advanceDailyIncome(0, stats, 'hard').points);
  });
});
