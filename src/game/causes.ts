/**
 * How the engine's limiting factors read: as a noun for what killed plants ("mostly from drought") and as the
 * state of a plant it limits ("struggling: too dry").
 */
export const CAUSES: Record<string, { noun: string; state: string }> = {
  drought: { noun: 'drought', state: 'too dry' },
  waterlogging: { noun: 'waterlogging', state: 'waterlogged' },
  cold: { noun: 'cold', state: 'too cold' },
  heat: { noun: 'heat', state: 'too hot' },
  shade: { noun: 'shade', state: 'too shaded' },
  pollution: { noun: 'pollution', state: 'polluted' },
  soil_ph: { noun: 'the wrong soil', state: 'wrong soil pH' },
  crowding: { noun: 'crowding', state: 'crowded' },
  no_pollinator: { noun: 'a lack of pollinators', state: 'no pollinator visits' },
  old_age: { noun: 'old age', state: 'ageing' },
  environmental_stress: { noun: 'harsh conditions', state: 'struggling' },
}

/** The most frequent value, or undefined for an empty list. */
export function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>()
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}
