import type { SimulationEngine } from '@/simulation/SimulationEngine'

/** The meadow a new game opens on: grass, clover and bluebell under a few hawthorns, enough to draw animals. */
export const STARTING_MEADOW = ['common_grass', 'white_clover', 'wild_bluebell', 'hawthorn']

/** Established plants of the starting meadow in the centre, with their seed already in the soil. */
export function plantStartingMeadow(engine: SimulationEngine): void {
  engine.applyScenarioConditions({ establishedSpecies: STARTING_MEADOW, initialSpecies: STARTING_MEADOW })
}
